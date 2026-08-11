<script setup lang="ts">
import {
  kBadge,
  kBlockTitle,
  kButton,
  kCard,
  kDialog,
  kDialogButton,
  kIcon,
  kLink,
  kList,
  kListInput,
  kListItem,
  kNavbar,
  kPage,
  kPreloader,
  kSheet,
  kTabbar,
  kTabbarLink,
  kToast,
  kToggle,
  kToolbarPane,
} from 'konsta/vue'
import {
  AlertTriangle,
  Check,
  CircleDot,
  Copy,
  Crown,
  Crosshair,
  Eye,
  EyeOff,
  Flag,
  Info,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Navigation,
  Plus,
  Radio,
  RefreshCw,
  Route,
  Settings2,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  UserRound,
  X,
  Zap,
} from 'lucide-vue-next'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'
import { useRouter } from 'vue-router'

import {
  defaultCayoStyle,
  defaultMainlandStyle,
  defaultMapCoordinates,
  defaultMapPercentToWorld,
  defaultMapWorldToPercent,
  type MapPoint,
} from '@/features/map/defaultMapGeometry'
import { useCrewLinkStore } from '@/stores/crewlink'
import { useEasyShareStore } from '@/stores/easyshare'
import { usePhoneStore } from '@/stores/phone'
import type {
  CrewLinkColour,
  CrewLinkMember,
  CrewLinkNearbyPlayer,
  CrewLinkPing,
  CrewLinkPingType,
  CrewLinkRole,
} from '@/types/crewlink'
import { copyText } from '@/utils/clipboard'
import { nuiCall } from '@/utils/nui'

type CrewLinkTab = 'map' | 'group' | 'pings' | 'profile'
type CrewLinkSheet =
  | 'create-group'
  | 'join-group'
  | 'nearby'
  | 'ping'
  | 'edit-group'
  | 'member'
  | null

const phone = usePhoneStore()
const crew = useCrewLinkStore()
const router = useRouter()
const mainlandMapUrl = `${import.meta.env.BASE_URL}img/maps/gtav-map.svg`
const cayoMapUrl = `${import.meta.env.BASE_URL}img/maps/cayo-perico.svg`
const activeTab = ref<CrewLinkTab>('map')
const sheet = ref<CrewLinkSheet>(null)
const username = ref('')
const groupName = ref('')
const groupColour = ref<CrewLinkColour>('cyan')
const inviteCode = ref('')
const pingType = ref<CrewLinkPingType>('meeting')
const pingLabel = ref('')
const pingAtMapCenter = ref(false)
const nearbyPlayers = ref<CrewLinkNearbyPlayer[]>([])
const selectedMember = ref<CrewLinkMember | null>(null)
const selectedPing = ref<CrewLinkPing | null>(null)
const formError = ref('')
const toastText = ref('')
const pendingGroupSetting = ref<'allowMemberPings' | 'overheadAllowed' | null>(null)
const pendingVisibility = ref<'mapVisible' | 'overheadVisible' | null>(null)
const confirmAction = ref<'delete-group' | 'leave-group' | 'remove-member' | 'transfer-owner' | null>(null)
const zoom = ref(1.45)
const pan = ref<MapPoint>({ x: 0, y: 0 })
const viewportRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLElement | null>(null)
const isPointerDown = ref(false)
const pointerStart = { x: 0, y: 0, panX: 0, panY: 0 }
let liveTimer: number | undefined
let toastTimer: number | undefined
let pointerFrame: number | undefined

const colours: Array<{ id: CrewLinkColour; value: string }> = [
  { id: 'cyan', value: '#27d9ed' },
  { id: 'blue', value: '#2790ff' },
  { id: 'violet', value: '#8b5cf6' },
  { id: 'orange', value: '#ff9f43' },
  { id: 'green', value: '#36d17c' },
  { id: 'rose', value: '#ff5f86' },
]
const roleIcons: Record<CrewLinkRole, typeof Crown> = {
  owner: Crown,
  coordinator: ShieldCheck,
  moderator: Shield,
  member: UserRound,
  guest: Eye,
}
const pingIcons: Record<CrewLinkPingType, typeof MapPin> = {
  meeting: Users,
  danger: AlertTriangle,
  help: Zap,
  target: Crosshair,
  info: Info,
}
const pingColours: Record<CrewLinkPingType, string> = {
  meeting: '#27d9ed',
  danger: '#ff4d67',
  help: '#ffb020',
  target: '#8b5cf6',
  info: '#3198ff',
}
const roleLevels: Record<CrewLinkRole, number> = {
  guest: 1,
  member: 2,
  moderator: 3,
  coordinator: 4,
  owner: 5,
}
const editableRoles: CrewLinkRole[] = [
  'coordinator',
  'moderator',
  'member',
  'guest',
]

const activeGroup = computed(() => crew.activeGroup)
const ownMember = computed(() =>
  activeGroup.value?.members.find((member) => member.id === crew.profile?.id),
)
const onlineMembers = computed(
  () => activeGroup.value?.members.filter((member) => member.online) ?? [],
)
const visibleMapMembers = computed(
  () => onlineMembers.value.filter((member) => Boolean(member.coords)),
)
const canCoordinate = computed(
  () => roleLevels[activeGroup.value?.role ?? 'guest'] >= roleLevels.coordinator,
)
const canModerate = computed(
  () => roleLevels[activeGroup.value?.role ?? 'guest'] >= roleLevels.moderator,
)
const canPing = computed(
  () =>
    canModerate.value || Boolean(activeGroup.value?.allowMemberPings),
)
const canvasStyle = computed(() => ({
  aspectRatio: String(
    defaultMapCoordinates.width / defaultMapCoordinates.height,
  ),
  transform: `translate(-50%, -50%) translate(${pan.value.x}px, ${pan.value.y}px) scale(${zoom.value})`,
  width: 'max(128%, 128vh)',
}))
const activeColour = computed(
  () =>
    colours.find((colour) => colour.id === activeGroup.value?.colour)?.value ??
    colours[0].value,
)
const activeCrewStyle = computed(() => ({
  '--crew': activeColour.value,
  '--crew-aura': `${activeColour.value}8c`,
  '--crew-glow': `${activeColour.value}61`,
  '--crew-ring': `${activeColour.value}47`,
}))
const mapCenterCoords = computed(() => {
  const viewport = viewportRef.value?.getBoundingClientRect()
  const canvas = canvasRef.value?.getBoundingClientRect()
  if (!viewport || !canvas) return null
  return defaultMapPercentToWorld({
    x: Math.min(
      1,
      Math.max(0, (viewport.left + viewport.width / 2 - canvas.left) / canvas.width),
    ),
    y: Math.min(
      1,
      Math.max(0, (viewport.top + viewport.height / 2 - canvas.top) / canvas.height),
    ),
  })
})

function t(path: string, replacements: Record<string, string> = {}): string {
  return phone.t(`Apps.crewlink.${path}`, replacements)
}

function errorText(code?: string): string {
  const key = code ?? crew.error ?? 'request_failed'
  const translated = t(`errors.${key}`)
  return translated === `Apps.crewlink.errors.${key}`
    ? t('errors.request_failed')
    : translated
}

function showToast(message: string): void {
  if (toastTimer) window.clearTimeout(toastTimer)
  toastText.value = message
  toastTimer = window.setTimeout(() => {
    toastText.value = ''
  }, 2400)
}

function shareProfile(): void {
  const profile = crew.profile
  if (!profile) return
  useEasyShareStore().open({
    appId: 'crewlink',
    copyText: `@${profile.username}`,
    id: profile.id,
    kind: 'profile',
    link: `skyphone://crewlink/profile/${profile.id}`,
    subtitle: activeGroup.value?.name,
    title: `@${profile.username}`,
  })
}

function updateValue(
  target: 'username' | 'groupName' | 'inviteCode' | 'pingLabel',
  event: Event,
): void {
  const value = (event.target as HTMLInputElement).value
  if (target === 'username') username.value = value
  else if (target === 'groupName') groupName.value = value
  else if (target === 'inviteCode') inviteCode.value = value
  else pingLabel.value = value
  formError.value = ''
}

function colourValue(colour: CrewLinkColour): string {
  return colours.find((candidate) => candidate.id === colour)?.value ?? colours[0].value
}

function roleLabel(role: CrewLinkRole): string {
  return t(`roles.${role}`)
}

function memberInitials(member: CrewLinkMember): string {
  return member.username.slice(0, 2).toUpperCase()
}

function markerStyle(coords: MapPoint, offset = '-50%'): Record<string, string> {
  const point = defaultMapWorldToPercent(coords)
  return {
    left: `${point.x * 100}%`,
    top: `${point.y * 100}%`,
    transform: `translate(-50%, ${offset}) scale(${1 / zoom.value})`,
  }
}

function memberStatus(member: CrewLinkMember): string {
  if (!member.online) return t('status.offline')
  if (!member.coords) return t('status.hidden')
  return t('status.live')
}

function expiresIn(timestamp: number): string {
  const seconds = Math.max(0, Math.ceil((timestamp - Date.now()) / 1000))
  if (seconds >= 60) return t('expiresMinutes', { count: String(Math.ceil(seconds / 60)) })
  return t('expiresSeconds', { count: String(seconds) })
}

function openSheet(next: CrewLinkSheet): void {
  sheet.value = next
  formError.value = ''
  if (next === 'create-group') {
    groupName.value = ''
    groupColour.value = 'cyan'
  } else if (next === 'join-group') {
    inviteCode.value = ''
  } else if (next === 'ping') {
    pingType.value = 'meeting'
    pingLabel.value = ''
    pingAtMapCenter.value = false
  } else if (next === 'edit-group' && activeGroup.value) {
    groupName.value = activeGroup.value.name
    groupColour.value = activeGroup.value.colour
  }
}

function closeSheet(): void {
  if (crew.isLoading) return
  sheet.value = null
  selectedMember.value = null
  formError.value = ''
}

async function createProfile(): Promise<void> {
  const response = await crew.createProfile(username.value.trim())
  if (!response.success) {
    formError.value = errorText(response.error)
    return
  }
  showToast(t('profileCreated'))
}

async function createGroup(): Promise<void> {
  const response = await crew.createGroup(groupName.value.trim(), groupColour.value)
  if (!response.success) {
    formError.value = errorText(response.error)
    return
  }
  closeSheet()
  activeTab.value = 'map'
  showToast(t('groupCreated'))
}

async function joinGroup(): Promise<void> {
  const response = await crew.joinCode(inviteCode.value.trim().toUpperCase())
  if (!response.success) {
    formError.value = errorText(response.error)
    return
  }
  closeSheet()
  activeTab.value = 'map'
  showToast(t('joinedGroup'))
}

async function switchGroup(groupId: string): Promise<void> {
  if (groupId === activeGroup.value?.id) return
  const response = await crew.setActive(groupId)
  if (!response.success) showToast(errorText(response.error))
  else {
    await nextTick()
    fitOnlineMembers()
    showToast(t('activeGroupChanged'))
  }
}

async function saveProfile(): Promise<void> {
  if (!crew.profile) return
  const response = await crew.updateProfile(
    username.value.trim(),
    crew.profile.mapVisible,
    crew.profile.overheadVisible,
  )
  if (!response.success) formError.value = errorText(response.error)
  else showToast(t('profileSaved'))
}

async function updateVisibility(
  key: 'mapVisible' | 'overheadVisible',
): Promise<void> {
  if (!crew.profile || pendingVisibility.value) return
  const previous = crew.profile[key]
  crew.profile[key] = !previous
  pendingVisibility.value = key
  const response = await crew.updateProfile(
    crew.profile.username,
    crew.profile.mapVisible,
    crew.profile.overheadVisible,
  )
  pendingVisibility.value = null
  if (!response.success) {
    if (crew.profile) crew.profile[key] = previous
    showToast(errorText(response.error))
  }
}

async function saveGroup(): Promise<void> {
  if (!activeGroup.value) return
  const response = await crew.updateGroup(
    activeGroup.value.id,
    groupName.value.trim(),
    groupColour.value,
    activeGroup.value.allowMemberPings,
    activeGroup.value.overheadAllowed,
  )
  if (!response.success) {
    formError.value = errorText(response.error)
    return
  }
  closeSheet()
  showToast(t('groupSaved'))
}

async function toggleGroupSetting(
  key: 'allowMemberPings' | 'overheadAllowed',
): Promise<void> {
  if (!activeGroup.value || pendingGroupSetting.value) return
  const groupId = activeGroup.value.id
  const previous = activeGroup.value[key]
  activeGroup.value[key] = !previous
  pendingGroupSetting.value = key
  const response = await crew.updateGroup(
    groupId,
    activeGroup.value.name,
    activeGroup.value.colour,
    activeGroup.value.allowMemberPings,
    activeGroup.value.overheadAllowed,
  )
  pendingGroupSetting.value = null
  if (!response.success) {
    if (activeGroup.value?.id === groupId) activeGroup.value[key] = previous
    showToast(errorText(response.error))
  }
}

function togglePingAtMapCenter(): void {
  pingAtMapCenter.value = !pingAtMapCenter.value
}

function copyInviteCode(): void {
  if (!activeGroup.value?.inviteCode) return
  showToast(
    copyText(activeGroup.value.inviteCode)
      ? t('codeCopied')
      : errorText(),
  )
}

async function rotateInviteCode(): Promise<void> {
  if (!activeGroup.value) return
  const response = await crew.rotateCode(activeGroup.value.id)
  if (!response.success) showToast(errorText(response.error))
  else {
    await crew.bootstrap()
    showToast(t('codeRotated'))
  }
}

async function loadNearby(): Promise<void> {
  openSheet('nearby')
  nearbyPlayers.value = []
  const response = await crew.nearby()
  if (!response.success) formError.value = errorText(response.error)
  else nearbyPlayers.value = response.data ?? []
}

async function inviteNearby(player: CrewLinkNearbyPlayer): Promise<void> {
  const response = await crew.inviteNearby(player.source)
  if (!response.success) {
    formError.value = errorText(response.error)
    return
  }
  nearbyPlayers.value = nearbyPlayers.value.filter(
    (candidate) => candidate.source !== player.source,
  )
  showToast(t('inviteSent', { username: player.username }))
}

async function respondInvitation(id: string, accepted: boolean): Promise<void> {
  const response = await crew.respondInvite(id, accepted)
  if (!response.success) showToast(errorText(response.error))
  else {
    if (accepted) {
      closeSheet()
      activeTab.value = 'map'
    }
    showToast(t(accepted ? 'inviteAccepted' : 'inviteDeclined'))
  }
}

function selectMember(member: CrewLinkMember): void {
  if (member.id === crew.profile?.id) return
  selectedMember.value = member
  openSheet('member')
}

async function setMemberRole(role: CrewLinkRole): Promise<void> {
  if (!activeGroup.value || !selectedMember.value) return
  if (selectedMember.value.role === role) return
  const response = await crew.updateMember(
    activeGroup.value.id,
    selectedMember.value.id,
    role,
  )
  if (!response.success) showToast(errorText(response.error))
  else {
    closeSheet()
    showToast(t('roleUpdated'))
  }
}

async function performConfirmedAction(): Promise<void> {
  const action = confirmAction.value
  confirmAction.value = null
  if (!activeGroup.value) return
  let response
  if (action === 'delete-group') response = await crew.deleteGroup(activeGroup.value.id)
  else if (action === 'leave-group') response = await crew.leave(activeGroup.value.id)
  else if (action === 'remove-member' && selectedMember.value) {
    response = await crew.removeMember(activeGroup.value.id, selectedMember.value.id)
  } else if (action === 'transfer-owner' && selectedMember.value) {
    response = await crew.transferOwner(activeGroup.value.id, selectedMember.value.id)
  }
  if (!response?.success) showToast(errorText(response?.error))
  else {
    closeSheet()
    await crew.bootstrap()
    showToast(t(`${action}Done`))
  }
}

function cancelConfirmation(): void {
  confirmAction.value = null
}

async function createPing(): Promise<void> {
  const center = pingAtMapCenter.value ? mapCenterCoords.value : null
  const response = await crew.createPing(
    pingType.value,
    pingLabel.value.trim(),
    center ? { x: center.x, y: center.y, z: 0 } : undefined,
  )
  if (!response.success) {
    formError.value = errorText(response.error)
    return
  }
  closeSheet()
  activeTab.value = 'map'
  await crew.refreshLive()
  showToast(t('pingCreated'))
}

async function removePing(ping: CrewLinkPing): Promise<void> {
  const response = await crew.removePing(ping.id)
  if (!response.success) showToast(errorText(response.error))
  else {
    selectedPing.value = null
    await crew.refreshLive()
    showToast(t('pingRemoved'))
  }
}

async function routeTo(coords: { x: number; y: number; z: number }): Promise<void> {
  const response = await nuiCall('map:setWaypoint', { coords })
  showToast(t(response.success ? 'routeSet' : 'errors.request_failed'))
}

function centerOn(coords: MapPoint): void {
  const viewport = viewportRef.value?.getBoundingClientRect()
  const canvas = canvasRef.value
  if (!viewport || !canvas) return
  const point = defaultMapWorldToPercent(coords)
  const nextZoom = 3.8
  zoom.value = nextZoom
  pan.value = {
    x: (0.5 - point.x) * canvas.offsetWidth * nextZoom,
    y: (0.5 - point.y) * canvas.offsetHeight * nextZoom,
  }
}

function fitOnlineMembers(): void {
  const viewport = viewportRef.value
  const canvas = canvasRef.value
  const points = visibleMapMembers.value.map((member) =>
    defaultMapWorldToPercent(member.coords!),
  )
  if (!viewport || !canvas || !points.length) return

  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))
  const horizontalSpan = Math.max(80, (maxX - minX) * canvas.offsetWidth)
  const verticalSpan = Math.max(80, (maxY - minY) * canvas.offsetHeight)
  const nextZoom = Math.max(
    1.25,
    Math.min(
      5,
      (viewport.clientWidth - 90) / horizontalSpan,
      (viewport.clientHeight - 120) / verticalSpan,
    ),
  )
  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  }

  zoom.value = nextZoom
  pan.value = {
    x: (0.5 - center.x) * canvas.offsetWidth * nextZoom,
    y: (0.5 - center.y) * canvas.offsetHeight * nextZoom,
  }
}

function centerOwnLocation(): void {
  const own = ownMember.value?.coords
  if (own) centerOn(own)
  else showToast(t('locationUnavailable'))
}

function changeZoom(direction: -1 | 1): void {
  zoom.value = Math.max(0.85, Math.min(8, zoom.value * (direction > 0 ? 1.32 : 0.76)))
}

function onPointerDown(event: PointerEvent): void {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  isPointerDown.value = true
  pointerStart.x = event.clientX
  pointerStart.y = event.clientY
  pointerStart.panX = pan.value.x
  pointerStart.panY = pan.value.y
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!isPointerDown.value) return
  const deltaX = event.clientX - pointerStart.x
  const deltaY = event.clientY - pointerStart.y
  if (pointerFrame) cancelAnimationFrame(pointerFrame)
  pointerFrame = requestAnimationFrame(() => {
    pointerFrame = undefined
    pan.value = {
      x: pointerStart.panX + deltaX,
      y: pointerStart.panY + deltaY,
    }
  })
}

function onPointerUp(): void {
  isPointerDown.value = false
}

function onWheel(event: WheelEvent): void {
  event.preventDefault()
  changeZoom(event.deltaY > 0 ? -1 : 1)
}

function onCrewLinkMessage(event: MessageEvent): void {
  if (event.data?.type === 'crewlink:changed') void crew.bootstrap()
}

onMounted(async () => {
  await crew.bootstrap()
  username.value = crew.profile?.username ?? ''
  await nextTick()
  fitOnlineMembers()
  liveTimer = window.setInterval(() => void crew.refreshLive(), 3000)
  window.addEventListener('message', onCrewLinkMessage)
})

onBeforeUnmount(() => {
  if (liveTimer) window.clearInterval(liveTimer)
  if (toastTimer) window.clearTimeout(toastTimer)
  if (pointerFrame) cancelAnimationFrame(pointerFrame)
  window.removeEventListener('message', onCrewLinkMessage)
})
</script>

<template>
  <k-page class="crewlink" :class="{ 'crewlink--dark': phone.isDarkMode }">
    <template v-if="crew.isLoading && !crew.profile && !crew.error">
      <div class="crewlink-loading">
        <span class="crewlink-logo"><Radio /></span>
        <k-preloader />
        <p>{{ t('connecting') }}</p>
      </div>
    </template>

    <template v-else-if="crew.error === 'not_authenticated'">
      <div class="crewlink-onboarding">
        <span class="crewlink-logo"><Users /></span>
        <small>{{ t('privateNetwork') }}</small>
        <h1>{{ t('signInTitle') }}</h1>
        <p>{{ t('signInBody') }}</p>
        <k-button large rounded @click="router.push('/apps/settings')">
          {{ t('openSettings') }}
        </k-button>
      </div>
    </template>

    <template v-else-if="!crew.profile">
      <div class="crewlink-onboarding crewlink-onboarding--profile">
        <div class="crewlink-orbits" aria-hidden="true">
          <i></i><i></i><i></i><span><Radio /></span>
        </div>
        <small>{{ t('welcomeEyebrow') }}</small>
        <h1>{{ t('welcomeTitle') }}</h1>
        <p>{{ t('welcomeBody') }}</p>
        <k-list inset strong class="crewlink-form-list">
          <k-list-input
            input-id="crewlink-username"
            :label="t('username')"
            :placeholder="t('usernamePlaceholder')"
            :value="username"
            maxlength="20"
            outline
            @input="updateValue('username', $event)"
            @keydown.enter="createProfile"
          />
        </k-list>
        <p v-if="formError" class="crewlink-error" role="alert">{{ formError }}</p>
        <k-button large rounded :disabled="crew.isLoading" @click="createProfile">
          <k-preloader v-if="crew.isLoading" />
          <template v-else>{{ t('createProfile') }}</template>
        </k-button>
        <small class="crewlink-privacy"><ShieldCheck />{{ t('privacyNote') }}</small>
      </div>
    </template>

    <template v-else>
      <k-navbar v-if="activeGroup" class="crewlink-navbar" :title="t('name')" />

      <main class="crewlink-content" :class="{ 'crewlink-content--empty': !activeGroup }">
        <section v-if="!activeGroup" class="crewlink-group-gate">
          <button type="button" @click="openSheet('create-group')">
            <span><Plus /></span>
            <strong>{{ t('createGroup') }}</strong>
          </button>
          <button type="button" @click="openSheet('join-group')">
            <span><UserPlus /></span>
            <strong>{{ t('joinGroup') }}</strong>
          </button>
        </section>

        <template v-else>
          <section v-show="activeTab === 'map'" class="crewlink-map-tab">
            <div class="crewlink-map-summary">
              <div>
                <span class="crewlink-live-dot"></span>
                <strong>{{ onlineMembers.length }}</strong>
                <small>{{ t('onlineNow') }}</small>
              </div>
              <div class="crewlink-online-faces">
                <span
                  v-for="member in onlineMembers.slice(0, 4)"
                  :key="member.id"
                  :style="{ borderColor: activeColour }"
                >{{ memberInitials(member) }}</span>
                <i v-if="onlineMembers.length > 4">+{{ onlineMembers.length - 4 }}</i>
              </div>
            </div>

            <div
              ref="viewportRef"
              class="crewlink-map"
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerUp"
              @wheel="onWheel"
            >
              <div ref="canvasRef" class="crewlink-map__canvas" :style="canvasStyle">
                <img
                :src="mainlandMapUrl"
                  alt=""
                  class="crewlink-map__mainland"
                  :style="defaultMainlandStyle"
                  draggable="false"
                />
                <img
                :src="cayoMapUrl"
                  alt=""
                  class="crewlink-map__cayo"
                  :style="defaultCayoStyle"
                  draggable="false"
                />
                <button
                  v-for="member in visibleMapMembers"
                  :key="member.id"
                  type="button"
                  class="crewlink-member-marker"
                  :class="{ 'is-self': member.id === crew.profile?.id }"
                  :style="{ ...markerStyle(member.coords!), ...activeCrewStyle }"
                  @pointerdown.stop
                  @click.stop="selectedMember = member"
                >
                  <span>{{ memberInitials(member) }}</span>
                  <small>{{ member.username }}</small>
                </button>
                <button
                  v-for="ping in activeGroup.pings"
                  :key="ping.id"
                  type="button"
                  class="crewlink-ping-marker"
                  :style="{ ...markerStyle(ping.coords, '-100%'), '--ping': pingColours[ping.type] }"
                  @pointerdown.stop
                  @click.stop="selectedPing = ping"
                >
                  <component :is="pingIcons[ping.type]" />
                  <small>{{ ping.label }}</small>
                </button>
              </div>
              <div v-if="pingAtMapCenter" class="crewlink-map-crosshair"><Crosshair /></div>
              <div class="crewlink-map-controls">
                <button type="button" :aria-label="t('zoomIn')" @click="changeZoom(1)">+</button>
                <button type="button" :aria-label="t('zoomOut')" @click="changeZoom(-1)">−</button>
                <button type="button" :aria-label="t('myLocation')" @click="centerOwnLocation"><LocateFixed /></button>
                <button type="button" :aria-label="`${t('members')} · ${t('map')}`" @click="fitOnlineMembers"><Users /></button>
              </div>
              <div class="crewlink-map-legend">
                <span><i class="is-live"></i>{{ t('status.live') }}</span>
                <span><i class="is-hidden"></i>{{ t('status.hidden') }}</span>
              </div>
            </div>

            <div class="crewlink-map-actions">
              <button type="button" @click="activeTab = 'group'">
                <Users /><span><strong>{{ activeGroup.memberCount }} {{ t(activeGroup.memberCount === 1 ? 'member' : 'members') }}</strong><small>{{ t('openCrew') }}</small></span>
              </button>
              <button type="button" :disabled="!canPing" @click="openSheet('ping')">
                <MapPin /><span><strong>{{ t('newPing') }}</strong><small>{{ t('shareLocation') }}</small></span>
              </button>
            </div>
          </section>

          <section v-show="activeTab === 'group'" class="crewlink-scroll-tab">
            <div class="crewlink-group-hero" :style="activeCrewStyle">
              <div class="crewlink-group-hero__signal"><Radio /></div>
              <small>{{ t('activeCrew') }}</small>
              <h1>{{ activeGroup.name }}</h1>
              <p>{{ t(activeGroup.memberCount === 1 ? 'groupSummarySingle' : 'groupSummary', { online: String(onlineMembers.length), total: String(activeGroup.memberCount) }) }}</p>
              <div>
                <k-badge class="crewlink-group-badge">{{ roleLabel(activeGroup.role) }}</k-badge>
                <k-badge class="crewlink-group-badge">{{ t('private') }}</k-badge>
              </div>
            </div>

            <div class="crewlink-quick-actions">
              <button v-if="canModerate" type="button" @click="loadNearby"><UserPlus /><span>{{ t('nearby') }}</span></button>
              <button v-if="activeGroup.inviteCode" type="button" @click="copyInviteCode"><Copy /><span>{{ t('copyCode') }}</span></button>
              <button v-if="canCoordinate" type="button" @click="openSheet('edit-group')"><Settings2 /><span>{{ t('manage') }}</span></button>
            </div>

            <template v-if="crew.invitations.length">
              <k-block-title>{{ t('pendingInvitations') }}</k-block-title>
              <div class="crewlink-invitations crewlink-invitations--inline">
                <k-card v-for="invite in crew.invitations" :key="invite.id">
                  <div class="crewlink-invite-card">
                    <i :style="{ background: colourValue(invite.colour) }"><Users /></i>
                    <div><strong>{{ invite.groupName }}</strong><span>{{ t('invitedBy', { username: invite.inviterUsername }) }}</span></div>
                    <button type="button" @click="respondInvitation(invite.id, false)"><X /></button>
                    <button type="button" class="is-accept" @click="respondInvitation(invite.id, true)"><Check /></button>
                  </div>
                </k-card>
              </div>
            </template>

            <k-block-title class="crewlink-members-title">{{ t(activeGroup.memberCount === 1 ? 'member' : 'members') }}</k-block-title>
            <k-list inset strong class="crewlink-member-list">
              <k-list-item
                v-for="member in activeGroup.members"
                :key="member.id"
                :link="member.id !== crew.profile?.id && canModerate"
                @click="selectMember(member)"
              >
                <template #title><span class="crewlink-member-title">{{ member.username }}</span></template>
                <template #subtitle><span class="crewlink-member-subtitle">{{ roleLabel(member.role) }} · {{ memberStatus(member) }}</span></template>
                <template #media>
                  <span class="crewlink-avatar" :style="{ '--crew': activeColour }">{{ memberInitials(member) }}<i :class="{ 'is-online': member.online }"></i></span>
                </template>
                <template #after>
                  <component :is="roleIcons[member.role]" :size="17" :class="`role-${member.role}`" />
                </template>
              </k-list-item>
            </k-list>
          </section>

          <section v-show="activeTab === 'pings'" class="crewlink-scroll-tab crewlink-pings-tab">
            <div class="crewlink-section-header">
              <span><MapPin /></span>
              <div><small>{{ t('liveCoordination') }}</small><h1>{{ t('pings') }}</h1></div>
              <button v-if="canPing" type="button" @click="openSheet('ping')"><Plus /></button>
            </div>
            <div v-if="activeGroup.pings.length" class="crewlink-ping-list">
              <k-card v-for="ping in activeGroup.pings" :key="ping.id" :content-wrap="false">
                <article>
                  <i :style="{ background: pingColours[ping.type] }"><component :is="pingIcons[ping.type]" /></i>
                  <div><small>{{ t(`pingTypes.${ping.type}`) }} · {{ expiresIn(ping.expiresAt) }}</small><strong>{{ ping.label }}</strong><span>{{ t('sharedBy', { username: ping.creatorUsername }) }}</span></div>
                  <button type="button" :aria-label="t('setRoute')" @click="routeTo(ping.coords)"><Navigation /></button>
                  <button v-if="ping.creatorProfileId === crew.profile?.id || canModerate" type="button" :aria-label="phone.t('Common.delete')" @click="removePing(ping)"><Trash2 /></button>
                </article>
              </k-card>
            </div>
            <div v-else class="crewlink-empty-state">
              <span><CircleDot /></span><h2>{{ t('noPings') }}</h2><p>{{ t('noPingsBody') }}</p>
            </div>
          </section>

          <section v-show="activeTab === 'profile'" class="crewlink-scroll-tab">
            <div class="crewlink-profile-card" :style="{ '--crew': activeColour }">
              <span>{{ crew.profile.username.slice(0, 2).toUpperCase() }}</span>
              <div><small>{{ t('yourCrewLinkId') }}</small><h1>@{{ crew.profile.username }}</h1><p>{{ activeGroup.name }} · {{ roleLabel(activeGroup.role) }}</p></div>
            </div>

            <k-list inset strong>
              <k-list-item
                link
                link-component="button"
                :title="phone.t('Apps.easyShare.shareProfile')"
                @click="shareProfile"
              >
                <template #media><Share2 :size="20" /></template>
              </k-list-item>
            </k-list>

            <k-block-title>{{ t('privacyVisibility') }}</k-block-title>
            <k-list inset strong>
              <k-list-item :title="t('shareOnMap')" :subtitle="t('shareOnMapBody')">
                <template #media><MapIcon :size="20" /></template>
                <template #after><k-toggle :checked="crew.profile.mapVisible" :disabled="pendingVisibility !== null" @click.stop.prevent="updateVisibility('mapVisible')" /></template>
              </k-list-item>
              <k-list-item :title="t('overheadLabels')" :subtitle="t('overheadLabelsBody')">
                <template #media><Eye :size="20" /></template>
                <template #after><k-toggle :checked="crew.profile.overheadVisible" :disabled="pendingVisibility !== null" @click.stop.prevent="updateVisibility('overheadVisible')" /></template>
              </k-list-item>
            </k-list>

            <k-block-title>{{ t('yourGroups') }}</k-block-title>
            <k-list inset strong>
              <k-list-item
                v-for="group in crew.groups"
                :key="group.id"
                :title="group.name"
                :subtitle="`${group.memberCount} ${t('members')} · ${roleLabel(group.role)}`"
                link
                @click="switchGroup(group.id)"
              >
                <template #media><span class="crewlink-group-dot" :style="{ background: colourValue(group.colour) }"><Users /></span></template>
                <template #after><Check v-if="group.id === activeGroup.id" :size="18" :style="{ color: colourValue(group.colour) }" /></template>
              </k-list-item>
              <k-list-item :title="t('createAnotherGroup')" link @click="openSheet('create-group')"><template #media><Plus :size="20" /></template></k-list-item>
              <k-list-item :title="t('joinWithCode')" link @click="openSheet('join-group')"><template #media><UserPlus :size="20" /></template></k-list-item>
            </k-list>

            <k-block-title>{{ t('account') }}</k-block-title>
            <k-list inset strong>
              <k-list-item :title="t('username')" :subtitle="`@${crew.profile.username}`" link @click="username = crew.profile!.username; formError = ''; sheet = 'member'">
                <template #media><UserRound :size="20" /></template>
              </k-list-item>
              <k-list-item :title="t('externalApi')" :subtitle="t('externalApiBody')"><template #media><Sparkles :size="20" /></template></k-list-item>
              <k-list-item :title="activeGroup.isOwner ? t('deleteGroup') : t('leaveGroup')" class="crewlink-danger-row" link @click="confirmAction = activeGroup.isOwner ? 'delete-group' : 'leave-group'">
                <template #media><Trash2 :size="20" /></template>
              </k-list-item>
            </k-list>
          </section>
        </template>
      </main>

      <k-tabbar
        v-if="activeGroup"
        component="nav"
        icons
        labels
        class="bottom-0 left-0 fixed crewlink-tabbar"
        inner-class="crewlink-tabbar__inner"
        :aria-label="t('navigation')"
      >
        <k-toolbar-pane class="crewlink-tabbar__pane">
          <k-tabbar-link component="button" :active="activeTab === 'map'" :link-props="{ type: 'button' }" @click="activeTab = 'map'"><template #label>{{ t('map') }}</template><template #icon><k-icon><MapIcon /></k-icon></template></k-tabbar-link>
          <k-tabbar-link component="button" :active="activeTab === 'group'" :link-props="{ type: 'button' }" @click="activeTab = 'group'"><template #label>{{ t('crew') }}</template><template #icon><k-icon><Users /></k-icon></template></k-tabbar-link>
          <k-tabbar-link component="button" :active="activeTab === 'pings'" :link-props="{ type: 'button' }" @click="activeTab = 'pings'">
            <template #label>{{ t('pings') }}</template>
            <template #icon>
              <k-icon>
                <span class="crewlink-pings-icon">
                  <MapPin />
                  <k-badge v-if="activeGroup.pings.length" small class="crewlink-pings-badge">{{ activeGroup.pings.length }}</k-badge>
                </span>
              </k-icon>
            </template>
          </k-tabbar-link>
          <k-tabbar-link component="button" :active="activeTab === 'profile'" :link-props="{ type: 'button' }" @click="activeTab = 'profile'"><template #label>{{ t('profile') }}</template><template #icon><k-icon><UserRound /></k-icon></template></k-tabbar-link>
        </k-toolbar-pane>
      </k-tabbar>
    </template>

    <k-sheet :opened="Boolean(sheet)" class="crewlink-sheet" @backdropclick="closeSheet">
      <section v-if="sheet" class="crewlink-sheet__content" role="dialog" aria-modal="true">
        <k-link component="button" class="crewlink-sheet__close" :link-props="{ type: 'button' }" :aria-label="phone.t('Common.close')" @click="closeSheet"><X /></k-link>

        <template v-if="sheet === 'create-group'">
          <span class="crewlink-sheet__icon"><Users /></span><h2>{{ t('createGroup') }}</h2><p>{{ t('createGroupBody') }}</p>
          <k-list inset strong class="crewlink-form-list"><k-list-input input-id="crewlink-group-name" :label="t('groupName')" :placeholder="t('groupNamePlaceholder')" :value="groupName" maxlength="32" outline @input="updateValue('groupName', $event)" /></k-list>
          <span class="crewlink-field-label">{{ t('groupColour') }}</span>
          <div class="crewlink-colours" role="radiogroup"><button v-for="colour in colours" :key="colour.id" type="button" role="radio" :aria-checked="groupColour === colour.id" :class="{ 'is-active': groupColour === colour.id }" :style="{ background: colour.value }" @click="groupColour = colour.id"><Check /></button></div>
          <p v-if="formError" class="crewlink-error">{{ formError }}</p>
          <k-button large rounded :disabled="crew.isLoading" @click="createGroup">{{ t('createCrew') }}</k-button>
        </template>

        <template v-else-if="sheet === 'join-group'">
          <span class="crewlink-sheet__icon"><UserPlus /></span><h2>{{ t('joinWithCode') }}</h2><p>{{ t('joinWithCodeBody') }}</p>
          <k-list inset strong class="crewlink-form-list"><k-list-input input-id="crewlink-invite-code" :label="t('inviteCode')" :placeholder="t('inviteCodePlaceholder')" :value="inviteCode" maxlength="8" outline @input="updateValue('inviteCode', $event)" @keydown.enter="joinGroup" /></k-list>
          <p v-if="formError" class="crewlink-error">{{ formError }}</p>
          <k-button large rounded :disabled="crew.isLoading" @click="joinGroup">{{ t('joinCrew') }}</k-button>
          <template v-if="crew.invitations.length">
            <k-block-title class="crewlink-join-invitations-title">{{ t('pendingInvitations') }}</k-block-title>
            <div class="crewlink-invitations crewlink-invitations--join">
              <k-card v-for="invite in crew.invitations" :key="invite.id">
                <div class="crewlink-invite-card">
                  <i :style="{ background: colourValue(invite.colour) }"><Users /></i>
                  <div><strong>{{ invite.groupName }}</strong><span>{{ t('invitedBy', { username: invite.inviterUsername }) }}</span></div>
                  <button type="button" @click="respondInvitation(invite.id, false)"><X /></button>
                  <button type="button" class="is-accept" @click="respondInvitation(invite.id, true)"><Check /></button>
                </div>
              </k-card>
            </div>
          </template>
        </template>

        <template v-else-if="sheet === 'nearby'">
          <span class="crewlink-sheet__icon"><Radio /></span><h2>{{ t('peopleNearby') }}</h2><p>{{ t('peopleNearbyBody', { distance: String(crew.limits?.nearbyDistance ?? 5) }) }}</p>
          <k-preloader v-if="crew.isLoading" />
          <k-list v-else-if="nearbyPlayers.length" inset strong class="crewlink-nearby-list">
            <k-list-item
              v-for="player in nearbyPlayers"
              :key="player.source"
              class="crewlink-nearby-item"
              content-class="crewlink-nearby-item__content"
              media-class="crewlink-nearby-item__media"
              inner-class="crewlink-nearby-item__inner"
              title-wrap-class="crewlink-nearby-item__title"
              :title="player.username"
              :subtitle="t('metersAway', { distance: String(player.distance) })"
            >
              <template #media><span class="crewlink-avatar" :style="{ '--crew': activeColour }">{{ player.username.slice(0, 2).toUpperCase() }}</span></template>
              <template #after><k-button small rounded class="crewlink-nearby-invite" @click="inviteNearby(player)">{{ t('invite') }}</k-button></template>
            </k-list-item>
          </k-list>
          <div v-else class="crewlink-sheet-empty"><EyeOff /><strong>{{ t('nobodyNearby') }}</strong><span>{{ t('nobodyNearbyBody') }}</span></div>
          <p v-if="formError" class="crewlink-error">{{ formError }}</p>
          <k-button large rounded outline class="crewlink-nearby-rescan" @click="loadNearby"><RefreshCw />{{ t('scanAgain') }}</k-button>
        </template>

        <template v-else-if="sheet === 'ping'">
          <span class="crewlink-sheet__icon"><MapPin /></span><h2 class="crewlink-ping-title">{{ t('newPing') }}</h2><p class="crewlink-ping-description">{{ t('newPingBody') }}</p>
          <div class="crewlink-ping-types"><button v-for="(_, type) in pingIcons" :key="type" type="button" :class="{ 'is-active': pingType === type }" :style="{ '--ping': pingColours[type], '--ping-glow': `${pingColours[type]}2e` }" @click="pingType = type"><component :is="pingIcons[type]" /><span>{{ t(`pingTypes.${type}`) }}</span></button></div>
          <k-list inset strong class="crewlink-form-list crewlink-ping-form"><k-list-input input-id="crewlink-ping-label" input-class="crewlink-ping-label-input" :label="t('pingLabel')" :placeholder="t('pingLabelPlaceholder')" :value="pingLabel" maxlength="48" outline @input="updateValue('pingLabel', $event)" /></k-list>
          <k-list inset strong class="crewlink-ping-location-list"><k-list-item><template #media><Crosshair :size="22" /></template><template #title><span class="crewlink-ping-location-copy"><strong>{{ t('placeOnMap') }}</strong><small>{{ t('placeOnMapBody') }}</small></span></template><template #after><k-toggle :checked="pingAtMapCenter" @click.stop.prevent="togglePingAtMapCenter" /></template></k-list-item></k-list>
          <p v-if="formError" class="crewlink-error">{{ formError }}</p>
          <k-button large rounded class="crewlink-share-ping" :disabled="crew.isLoading" @click="createPing"><Flag />{{ t('sharePing') }}</k-button>
        </template>

        <template v-else-if="sheet === 'edit-group' && activeGroup">
          <span class="crewlink-sheet__icon"><Settings2 /></span><h2>{{ t('manageCrew') }}</h2><p>{{ t('manageCrewBody') }}</p>
          <k-list inset strong class="crewlink-form-list"><k-list-input input-id="crewlink-edit-name" :label="t('groupName')" :value="groupName" maxlength="32" outline @input="updateValue('groupName', $event)" /></k-list>
          <span class="crewlink-field-label">{{ t('groupColour') }}</span><div class="crewlink-colours"><button v-for="colour in colours" :key="colour.id" type="button" :class="{ 'is-active': groupColour === colour.id }" :style="{ background: colour.value }" @click="groupColour = colour.id"><Check /></button></div>
          <k-list inset strong>
            <k-list-item :title="t('memberPings')" :subtitle="t('memberPingsBody')"><template #after><k-toggle :checked="activeGroup.allowMemberPings" :disabled="pendingGroupSetting !== null" @click.stop.prevent="toggleGroupSetting('allowMemberPings')" /></template></k-list-item>
            <k-list-item :title="t('allowOverhead')" :subtitle="t('allowOverheadBody')"><template #after><k-toggle :checked="activeGroup.overheadAllowed" :disabled="pendingGroupSetting !== null" @click.stop.prevent="toggleGroupSetting('overheadAllowed')" /></template></k-list-item>
          </k-list>
          <k-card v-if="activeGroup.inviteCode"><div class="crewlink-code-card"><small>{{ t('inviteCode') }}</small><strong>{{ activeGroup.inviteCode }}</strong><button type="button" @click="copyInviteCode"><Copy /></button><button type="button" @click="rotateInviteCode"><RefreshCw /></button></div></k-card>
          <p v-if="formError" class="crewlink-error">{{ formError }}</p><k-button large rounded @click="saveGroup">{{ phone.t('Common.save') }}</k-button>
        </template>

        <template v-else-if="sheet === 'member' && selectedMember">
          <span class="crewlink-sheet__avatar" :style="{ '--crew': activeColour }">{{ memberInitials(selectedMember) }}</span><h2>@{{ selectedMember.username }}</h2><p>{{ roleLabel(selectedMember.role) }} · {{ memberStatus(selectedMember) }}</p>
          <k-block-title class="crewlink-role-title">{{ t('assignRole') }}</k-block-title>
          <k-list inset strong class="crewlink-role-list">
            <k-list-item
              v-for="role in editableRoles"
              :key="role"
              class="crewlink-role-item"
              content-class="crewlink-role-item__content"
              media-class="crewlink-role-item__media"
              inner-class="crewlink-role-item__inner"
              title-wrap-class="crewlink-role-item__title"
              :title="roleLabel(role)"
              :subtitle="t(`roleDescriptions.${role}`)"
              :link="role !== selectedMember.role"
              @click="setMemberRole(role)"
            >
              <template #media><component :is="roleIcons[role]" :size="20" /></template>
              <template #after><Check v-if="role === selectedMember.role" :size="18" /></template>
            </k-list-item>
          </k-list>
          <div class="crewlink-member-actions">
            <k-button v-if="activeGroup?.isOwner" large rounded outline @click="confirmAction = 'transfer-owner'"><Crown />{{ t('transferOwnership') }}</k-button>
            <k-button large rounded tonal class="crewlink-danger-button" @click="confirmAction = 'remove-member'"><Trash2 />{{ t('removeMember') }}</k-button>
          </div>
        </template>

        <template v-else-if="sheet === 'member' && !selectedMember && crew.profile">
          <span class="crewlink-sheet__icon"><UserRound /></span><h2>{{ t('editUsername') }}</h2><p>{{ t('editUsernameBody') }}</p>
          <k-list inset strong class="crewlink-form-list"><k-list-input input-id="crewlink-edit-username" :label="t('username')" :value="username" maxlength="20" outline @input="updateValue('username', $event)" @keydown.enter="saveProfile" /></k-list>
          <p v-if="formError" class="crewlink-error">{{ formError }}</p><k-button large rounded @click="saveProfile">{{ phone.t('Common.save') }}</k-button>
        </template>
      </section>
    </k-sheet>

    <k-sheet :opened="Boolean(selectedMember && !sheet)" class="crewlink-sheet" @backdropclick="selectedMember = null">
      <section v-if="selectedMember" class="crewlink-sheet__content crewlink-member-preview">
        <k-link component="button" class="crewlink-sheet__close" :link-props="{ type: 'button' }" @click="selectedMember = null"><X /></k-link>
        <span class="crewlink-sheet__avatar" :style="{ '--crew': activeColour }">{{ memberInitials(selectedMember) }}</span><h2>@{{ selectedMember.username }}</h2><p>{{ roleLabel(selectedMember.role) }} · {{ memberStatus(selectedMember) }}</p>
        <k-button v-if="selectedMember.coords" large rounded @click="routeTo(selectedMember.coords); selectedMember = null"><Route />{{ t('setRoute') }}</k-button>
      </section>
    </k-sheet>

    <k-sheet :opened="Boolean(selectedPing)" class="crewlink-sheet" @backdropclick="selectedPing = null">
      <section v-if="selectedPing" class="crewlink-sheet__content crewlink-member-preview">
        <k-link component="button" class="crewlink-sheet__close" :link-props="{ type: 'button' }" @click="selectedPing = null"><X /></k-link>
        <span class="crewlink-sheet__icon" :style="{ background: pingColours[selectedPing.type] }"><component :is="pingIcons[selectedPing.type]" /></span><small>{{ t(`pingTypes.${selectedPing.type}`) }}</small><h2>{{ selectedPing.label }}</h2><p>{{ t('sharedBy', { username: selectedPing.creatorUsername }) }} · {{ expiresIn(selectedPing.expiresAt) }}</p>
        <k-button large rounded @click="routeTo(selectedPing.coords); selectedPing = null"><Navigation />{{ t('setRoute') }}</k-button>
      </section>
    </k-sheet>

    <k-dialog :opened="Boolean(confirmAction)" @backdropclick="cancelConfirmation">
      <template #title>{{ t(`confirm.${confirmAction}.title`) }}</template>
      <p>{{ t(`confirm.${confirmAction}.body`) }}</p>
      <template #buttons><k-dialog-button class="crewlink-dialog-cancel" type="button" :aria-label="phone.t('Common.cancel')" @click="cancelConfirmation">{{ phone.t('Common.cancel') }}</k-dialog-button><k-dialog-button strong type="button" @click="performConfirmedAction">{{ t('confirmAction') }}</k-dialog-button></template>
    </k-dialog>

    <k-toast :opened="Boolean(toastText)" position="center">{{ toastText }}</k-toast>
  </k-page>
</template>

<style scoped>
.crewlink { --cl-bg: #f2f6fa; --cl-surface: rgba(255,255,255,.84); --cl-text: #102034; --cl-muted: #6e7c8d; --k-safe-area-top:46px; --k-safe-area-bottom:25px; position:relative; height:100%; background: var(--cl-bg); color: var(--cl-text); overflow: hidden; }
.crewlink--dark { --cl-bg: #071018; --cl-surface: rgba(17,29,40,.88); --cl-text: #f3f8fb; --cl-muted: #8fa2b3; }
.crewlink :deep(.page-content) { background: transparent; }
.crewlink-navbar { --k-navbar-bg-color: rgba(248,252,255,.78); position:absolute; z-index:20; inset:0 0 auto; backdrop-filter: blur(20px) saturate(1.3); }
.crewlink--dark .crewlink-navbar { --k-navbar-bg-color: rgba(7,16,24,.8); }
.crewlink-content { position:absolute; inset:94px 0 calc(80px + var(--k-safe-area-bottom)); overflow:hidden; }
.crewlink-content--empty { inset:var(--k-safe-area-top) 0 var(--k-safe-area-bottom); }
.crewlink-scroll-tab { height:100%; overflow-y:auto; padding:14px 11px 34px; }
.crewlink-loading,.crewlink-onboarding { height:100%; padding:52px 30px 32px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:12px; background:radial-gradient(circle at 50% 32%,rgba(39,217,237,.18),transparent 36%); }
.crewlink-logo { width:78px; height:78px; border-radius:26px; display:grid; place-items:center; color:white; background:linear-gradient(145deg,#28dbe9,#1d88ff 58%,#7050ef); box-shadow:0 18px 42px rgba(20,137,213,.3); }
.crewlink-logo svg { width:38px; height:38px; }
.crewlink-onboarding small { color:#168cbb; font-size:11px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
.crewlink-onboarding h1 { margin:0; font-size:27px; line-height:1.05; }
.crewlink-onboarding p { margin:0 0 10px; color:var(--cl-muted); font-size:13px; line-height:1.5; }
.crewlink-onboarding :deep(.button) { width:100%; }
.crewlink-orbits { width:170px; height:170px; position:relative; margin-bottom:4px; }
.crewlink-orbits i { position:absolute; inset:8px; border:1px solid rgba(39,217,237,.22); border-radius:50%; animation:cl-pulse 2.8s infinite; }
.crewlink-orbits i:nth-child(2){inset:31px;animation-delay:.3s}.crewlink-orbits i:nth-child(3){inset:55px;animation-delay:.6s}
.crewlink-orbits span { position:absolute; inset:69px; border-radius:18px; display:grid; place-items:center; color:white; background:linear-gradient(145deg,#2ce4ed,#257cff); box-shadow:0 10px 35px rgba(31,162,228,.4); }
.crewlink-form-list { width:100%; margin:4px 0; }
.crewlink-privacy { display:flex; gap:5px; align-items:center; color:var(--cl-muted)!important; letter-spacing:0!important; text-transform:none!important; font-weight:500!important; }
.crewlink-privacy svg { width:14px; }
.crewlink-group-gate { height:100%; padding:24px; display:grid; grid-template-columns:1fr 1fr; align-content:center; gap:12px; background:radial-gradient(circle at 50% 48%,rgba(39,217,237,.16),transparent 48%); }
.crewlink-group-gate button { min-width:0; aspect-ratio:1; padding:16px 8px; border:1px solid rgba(39,160,215,.14); border-radius:24px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; color:var(--cl-text); background:var(--cl-surface); box-shadow:0 14px 32px rgba(11,43,65,.1); }
.crewlink-group-gate button span { width:52px; height:52px; border-radius:18px; display:grid; place-items:center; color:white; background:linear-gradient(145deg,#2bdde9,#2e7eff); box-shadow:0 10px 24px rgba(30,150,220,.28); }
.crewlink-group-gate button:last-child span { background:linear-gradient(145deg,#8b5cf6,#387eff); }
.crewlink-group-gate button svg { width:25px; height:25px; }
.crewlink-group-gate button strong { font-size:12px; line-height:1.25; }
.crewlink-invitations { width:100%; margin-top:18px; text-align:left; }
.crewlink-join-invitations-title{margin:18px 0 8px!important;text-align:left}.crewlink-invitations--join{display:grid;gap:7px;margin:0}.crewlink-invitations--join :deep(.k-card){margin:0}
.crewlink-invite-card { display:grid; grid-template-columns:38px 1fr 31px 31px; gap:7px; align-items:center; }
.crewlink-invite-card>i { width:38px;height:38px;border-radius:13px;display:grid;place-items:center;color:white}.crewlink-invite-card>i svg{width:19px}.crewlink-invite-card div{display:flex;flex-direction:column}.crewlink-invite-card div span{font-size:10px;color:var(--cl-muted)}.crewlink-invite-card button{width:29px;height:29px;border:0;border-radius:10px;display:grid;place-items:center;color:#e94662;background:rgba(255,77,103,.12)}.crewlink-invite-card button.is-accept{color:#0aa66d;background:rgba(46,204,126,.14)}.crewlink-invite-card button svg{width:15px}
.crewlink-map-tab { height:100%; display:flex; flex-direction:column; background:#09131c; }
.crewlink-map-summary { height:64px; padding:8px 13px; display:flex; align-items:center; justify-content:space-between; color:white; background:linear-gradient(90deg,rgba(6,24,35,.96),rgba(15,41,56,.95)); }
.crewlink-map-summary>div:first-child{display:grid;grid-template-columns:10px auto auto;align-items:baseline;gap:7px}.crewlink-map-summary strong{font-size:26px;line-height:30px}.crewlink-map-summary small{font-size:14px;font-weight:600;line-height:18px;color:#c0ced8;white-space:nowrap}.crewlink-live-dot{width:9px;height:9px;border-radius:50%;background:#35dc80;box-shadow:0 0 0 4px rgba(53,220,128,.16)}
.crewlink-online-faces{display:flex;align-items:center}.crewlink-online-faces span{width:27px;height:27px;margin-left:-6px;border:2px solid;border-radius:50%;display:grid;place-items:center;background:#203347;color:white;font-size:8px;font-weight:800}.crewlink-online-faces i{font-size:9px;margin-left:5px;color:#9cb0bf}
.crewlink-map { position:relative; flex:1; overflow:hidden; touch-action:none; background:#d8e0e4; cursor:grab; }.crewlink-map:active{cursor:grabbing}
.crewlink-map__canvas{position:absolute;left:50%;top:50%;transform-origin:center;will-change:transform}.crewlink-map__mainland,.crewlink-map__cayo{position:absolute;object-fit:fill;pointer-events:none;user-select:none}
.crewlink-member-marker,.crewlink-ping-marker{position:absolute;border:0;background:transparent;z-index:4;display:flex;flex-direction:column;align-items:center;transform-origin:center bottom;cursor:pointer}.crewlink-member-marker>span{width:31px;height:31px;border:3px solid white;border-radius:50%;display:grid;place-items:center;color:white;background:var(--crew);box-shadow:0 4px 12px rgba(0,0,0,.35);font-size:9px;font-weight:900}.crewlink-member-marker.is-self>span{box-shadow:0 0 0 5px var(--crew-ring),0 4px 12px rgba(0,0,0,.3)}.crewlink-member-marker small,.crewlink-ping-marker small{padding:2px 5px;margin-top:2px;border-radius:6px;color:white;background:rgba(4,14,23,.82);font-size:7px;font-weight:700;white-space:nowrap}
.crewlink-ping-marker>svg{width:28px;height:28px;padding:6px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);color:white;background:var(--ping);box-shadow:0 4px 12px rgba(0,0,0,.35)}.crewlink-ping-marker>svg :deep(*){transform:rotate(45deg);transform-origin:center}
.crewlink-map-controls{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.18)}.crewlink-map-controls button{width:34px;height:34px;border:0;border-bottom:1px solid rgba(0,0,0,.1);background:rgba(255,255,255,.9);color:#183044;font-size:19px;display:grid;place-items:center}.crewlink-map-controls svg{width:16px}.crewlink-map-legend{position:absolute;left:10px;bottom:10px;padding:6px 8px;border-radius:10px;display:flex;gap:9px;background:rgba(8,20,30,.78);backdrop-filter:blur(10px);color:white;font-size:8px}.crewlink-map-legend span{display:flex;align-items:center;gap:4px}.crewlink-map-legend i{width:6px;height:6px;border-radius:50%;background:#35dc80}.crewlink-map-legend i.is-hidden{background:#8998a4}.crewlink-map-crosshair{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#ff4d67}.crewlink-map-crosshair svg{width:32px;height:32px;filter:drop-shadow(0 2px 4px white)}
.crewlink-map-actions{height:76px;padding:8px 10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#0c1822}.crewlink-map-actions button{border:1px solid rgba(255,255,255,.08);border-radius:15px;display:flex;align-items:center;gap:10px;padding:9px 11px;color:white;background:rgba(255,255,255,.06);text-align:left}.crewlink-map-actions button:disabled{opacity:.4}.crewlink-map-actions svg{width:23px;height:23px;flex:none;color:#28d9e8}.crewlink-map-actions span{display:flex;min-width:0;flex-direction:column;gap:2px}.crewlink-map-actions strong{font-size:15px;line-height:18px;white-space:nowrap}.crewlink-map-actions small{font-size:12px;line-height:15px;color:#a4b4c0;white-space:nowrap}
.crewlink-group-hero{padding:22px;border-radius:25px;color:white;background:radial-gradient(circle at 82% 18%,var(--crew-aura),transparent 35%),linear-gradient(145deg,#0b2433,#0b1825);box-shadow:0 15px 35px rgba(6,20,31,.2)}.crewlink-group-hero__signal{width:48px;height:48px;border-radius:16px;display:grid;place-items:center;background:var(--crew);box-shadow:0 0 28px var(--crew-glow)}.crewlink-group-hero__signal svg{width:26px}.crewlink-group-hero>small{display:block;margin-top:17px;font-size:12px;font-weight:600;line-height:16px;letter-spacing:.12em;text-transform:uppercase;color:#b5c6d0}.crewlink-group-hero h1{margin:5px 0;font-size:29px;line-height:34px}.crewlink-group-hero p{margin:0 0 14px;font-size:14px;line-height:18px;color:#d0dbe1}.crewlink-group-hero>div:last-child{display:flex;gap:7px}.crewlink-group-hero :deep(.crewlink-group-badge){min-height:24px;padding:4px 8px;font-size:13px}
.crewlink-quick-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:13px 0 11px}.crewlink-quick-actions button{min-height:64px;border:0;border-radius:15px;padding:11px 5px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;color:var(--cl-text);background:var(--cl-surface);font-size:12px;font-weight:600;line-height:15px;box-shadow:0 3px 12px rgba(15,40,60,.06)}.crewlink-quick-actions svg{width:22px;height:22px;color:#138fc0}.crewlink-invitations--inline{margin:0}.crewlink-members-title{height:auto!important;min-height:34px;padding-top:8px!important;padding-bottom:6px!important;font-size:16px!important;font-weight:700!important;color:var(--cl-text)!important}.crewlink-member-list :deep(.k-list-item){min-height:70px}.crewlink-member-title{font-size:18px;font-weight:700;line-height:22px}.crewlink-member-subtitle{font-size:14px;line-height:18px;color:var(--cl-muted)}.crewlink-avatar{position:relative;width:43px;height:43px;border-radius:15px;display:grid;place-items:center;color:white;background:linear-gradient(145deg,var(--crew),#273e55);font-size:12px;font-weight:900}.crewlink-avatar i{position:absolute;right:-2px;bottom:-2px;width:11px;height:11px;border:2px solid white;border-radius:50%;background:#8998a4}.crewlink-avatar i.is-online{background:#35d880}.role-owner{color:#ffb020}.role-coordinator{color:#8b5cf6}.role-moderator{color:#2d9cff}.role-member{color:#22b77a}.role-guest{color:#8998a4}
.crewlink-section-header{display:flex;align-items:center;gap:13px;margin:5px 2px 16px}.crewlink-section-header>span{width:52px;height:52px;border-radius:17px;display:grid;place-items:center;color:white;background:linear-gradient(145deg,#27d9ed,#287cff)}.crewlink-section-header>span svg{width:26px;height:26px}.crewlink-section-header div{flex:1}.crewlink-section-header small{font-size:13px;font-weight:700;line-height:16px;color:#29b8e8;text-transform:uppercase;letter-spacing:.09em}.crewlink-section-header h1{margin:2px 0 0;font-size:29px;line-height:34px}.crewlink-section-header button{width:42px;height:42px;border:0;border-radius:14px;display:grid;place-items:center;color:white;background:#168dc2}.crewlink-section-header button svg{width:22px;height:22px}.crewlink-pings-tab{padding-top:12px}.crewlink-pings-tab .crewlink-section-header{margin-bottom:12px}.crewlink-ping-list{display:flex;flex-direction:column;gap:8px}.crewlink-ping-list :deep(.k-card){margin:0}.crewlink-ping-list article{display:grid;grid-template-columns:47px 1fr 32px 32px;gap:9px;align-items:center;padding:11px}.crewlink-ping-list article>i{width:47px;height:47px;border-radius:16px;display:grid;place-items:center;color:white}.crewlink-ping-list article>i svg{width:23px}.crewlink-ping-list article>div{display:flex;flex-direction:column;gap:2px;min-width:0}.crewlink-ping-list small{font-size:11px;line-height:14px;color:var(--cl-muted);text-transform:uppercase}.crewlink-ping-list strong{font-size:15px;line-height:19px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.crewlink-ping-list span{font-size:12px;line-height:15px;color:var(--cl-muted)}.crewlink-ping-list button{border:0;background:transparent;color:#238fbd;display:grid;place-items:center}.crewlink-ping-list button:last-child{color:#ed5268}.crewlink-ping-list button svg{width:20px}.crewlink-empty-state{padding:68px 22px;text-align:center;display:flex;flex-direction:column;align-items:center}.crewlink-empty-state>span{width:70px;height:70px;border-radius:23px;display:grid;place-items:center;color:#168dbd;background:rgba(39,191,230,.12)}.crewlink-empty-state>span svg{width:29px;height:29px}.crewlink-empty-state h2{margin:17px 0 7px;font-size:21px;line-height:26px}.crewlink-empty-state p{max-width:280px;margin:0;color:var(--cl-muted);font-size:14px;line-height:20px}
.crewlink-profile-card{display:flex;align-items:center;gap:13px;padding:17px;border-radius:23px;color:white;background:linear-gradient(145deg,var(--crew),#183a5a)}.crewlink-profile-card>span{width:54px;height:54px;border:3px solid rgba(255,255,255,.72);border-radius:19px;display:grid;place-items:center;font-size:15px;font-weight:900;background:rgba(8,25,40,.22)}.crewlink-profile-card div{min-width:0}.crewlink-profile-card small{font-size:8px;letter-spacing:.1em;text-transform:uppercase;opacity:.75}.crewlink-profile-card h1{margin:2px 0;font-size:19px}.crewlink-profile-card p{margin:0;font-size:10px;opacity:.82}.crewlink-group-dot{width:35px;height:35px;border-radius:13px;display:grid;place-items:center;color:white}.crewlink-group-dot svg{width:18px}.crewlink-danger-row{--k-list-item-title-text-color:#e44760}.crewlink-danger-button{color:#e44760!important}.crewlink-role-title{margin:16px 0 8px!important;padding-inline:4px!important}.crewlink-role-list{margin:0!important}.crewlink-role-list :deep(.crewlink-role-item__content){min-height:68px;align-items:center}.crewlink-role-list :deep(.crewlink-role-item__media){width:28px;margin-right:10px;justify-content:center;color:#9ca8b3}.crewlink-role-list :deep(.crewlink-role-item__inner){min-width:0;padding-top:9px;padding-bottom:9px;text-align:left}.crewlink-role-list :deep(.crewlink-role-item__title){min-height:22px;font-size:14px;line-height:18px}.crewlink-role-list :deep(.crewlink-role-item__title+div){max-width:230px;color:var(--cl-muted);font-size:10px;line-height:14px;text-align:left}.crewlink-role-list :deep(.crewlink-role-item__title svg){color:#aab5bf}.crewlink-member-actions{display:grid;gap:8px;margin-top:12px}.crewlink-member-actions :deep(.k-button){margin-top:0}
.crewlink-sheet__content{position:relative;max-height:82vh;overflow-y:auto;padding:26px 18px 24px;text-align:center;color:var(--cl-text);background:var(--cl-bg);border-radius:24px 24px 0 0}.crewlink-sheet__close{position:absolute;right:14px;top:12px;width:31px;height:31px;border-radius:50%;display:grid;place-items:center;color:var(--cl-muted);background:rgba(125,145,160,.15)}.crewlink-sheet__close svg{width:17px}.crewlink-sheet__icon,.crewlink-sheet__avatar{width:56px;height:56px;margin:0 auto 9px;border-radius:20px;display:grid;place-items:center;color:white;background:linear-gradient(145deg,#27d9ed,#287cff);box-shadow:0 10px 25px rgba(31,139,205,.22)}.crewlink-sheet__avatar{background:linear-gradient(145deg,var(--crew),#29415a);font-weight:900}.crewlink-sheet__icon svg{width:26px}.crewlink-sheet__content h2{margin:4px 0;font-size:23px;line-height:1.2}.crewlink-sheet__content>p{margin:0 10px 13px;color:var(--cl-muted);font-size:13px;line-height:1.45}.crewlink-sheet__content :deep(.button){width:100%;margin-top:9px;font-size:13px}.crewlink-nearby-list{margin:10px 0 0!important}.crewlink-nearby-list :deep(.crewlink-nearby-item__content){min-height:66px;align-items:center}.crewlink-nearby-list :deep(.crewlink-nearby-item__media){width:38px;margin-right:12px;justify-content:center}.crewlink-nearby-list :deep(.crewlink-nearby-item__inner){min-width:0;padding-top:9px;padding-bottom:9px;text-align:left}.crewlink-nearby-list :deep(.crewlink-nearby-item__title){min-height:22px;gap:8px;font-size:14px;line-height:18px}.crewlink-nearby-list :deep(.crewlink-nearby-item__title+div){color:var(--cl-muted);font-size:10px;line-height:14px;text-align:left}.crewlink-nearby-list :deep(.crewlink-nearby-invite){width:auto;margin-top:0;padding-inline:13px;flex:none}.crewlink-field-label{display:block;margin:8px 0;text-align:left;font-size:12px;font-weight:700;color:var(--cl-muted)}.crewlink-colours{display:flex;justify-content:center;gap:9px;margin:8px 0 14px}.crewlink-colours button{width:35px;height:35px;border:3px solid transparent;border-radius:50%;display:grid;place-items:center;color:white}.crewlink-colours button.is-active{border-color:white;box-shadow:0 0 0 2px currentColor}.crewlink-colours svg{width:15px;opacity:0}.crewlink-colours button.is-active svg{opacity:1}.crewlink-error{color:#df3e58!important;font-size:12px!important;margin:8px!important}.crewlink-sheet-empty{padding:25px;display:flex;flex-direction:column;align-items:center;gap:5px;color:var(--cl-muted)}.crewlink-sheet-empty svg{width:34px}.crewlink-sheet-empty strong{color:var(--cl-text)}.crewlink-sheet-empty span{font-size:11px}.crewlink-ping-title{font-size:25px!important;line-height:30px!important}.crewlink-sheet__content>.crewlink-ping-description{font-size:14px;line-height:19px}.crewlink-ping-types{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin:15px 0}.crewlink-ping-types button{min-width:0;border:1px solid transparent;border-radius:13px;padding:10px 2px;display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--cl-muted);background:var(--cl-surface);font-size:12px;font-weight:600;line-height:15px}.crewlink-ping-types button.is-active{border-color:var(--ping);color:var(--ping);box-shadow:0 3px 12px var(--ping-glow)}.crewlink-ping-types svg{width:22px;height:22px}.crewlink-ping-form :deep(.k-list-input .text-xs){font-size:14px!important;font-weight:600;line-height:18px}.crewlink-ping-form :deep(.crewlink-ping-label-input){font-size:16px!important;line-height:20px}.crewlink-ping-location-list :deep(.k-list-item){min-height:70px}.crewlink-ping-location-copy{display:flex;flex-direction:column;gap:3px;text-align:left}.crewlink-ping-location-copy strong{font-size:17px;line-height:21px}.crewlink-ping-location-copy small{max-width:205px;color:var(--cl-muted);font-size:14px;line-height:18px}.crewlink-sheet__content :deep(.crewlink-share-ping){font-size:16px}.crewlink-code-card{display:grid;grid-template-columns:1fr auto 30px 30px;align-items:center;gap:5px;text-align:left}.crewlink-code-card small{font-size:9px;color:var(--cl-muted)}.crewlink-code-card strong{font-family:monospace;letter-spacing:.12em}.crewlink-code-card button{border:0;background:transparent;color:#168dbd}.crewlink-code-card svg{width:16px}.crewlink-member-preview{padding-top:34px}.crewlink-tabbar{z-index:20}.crewlink-tabbar :deep(.crewlink-tabbar__inner){width:100%!important;max-width:none!important;padding-inline:4px!important}.crewlink-tabbar :deep(.crewlink-tabbar__pane){width:100%!important;max-width:none!important;gap:2px;padding:0}.crewlink-tabbar :deep(.crewlink-tabbar__pane>.k-link){min-width:0!important;max-width:none!important;flex:1 1 25%!important;padding-inline:2px!important}.crewlink-tabbar :deep(.k-tabbar-link-label){font-size:9px;line-height:11px}.crewlink-tabbar :deep(.k-icon){width:23px;height:23px}.crewlink-tabbar :deep(.badge){position:absolute;top:-3px;right:-7px;font-size:7px}
.crewlink-pings-icon{position:relative;width:23px;height:23px;display:grid;place-items:center}.crewlink-pings-icon>svg{width:23px;height:23px}.crewlink-tabbar :deep(.crewlink-pings-badge){position:absolute!important;z-index:2;top:-6px!important;right:-9px!important;min-width:15px;height:15px;padding:0 4px;border:2px solid #071018;border-radius:999px;font-size:7px;line-height:11px;pointer-events:none}
.crewlink-sheet__content :deep(.crewlink-nearby-rescan){margin-top:16px;margin-bottom:10px}
.crewlink :deep(.crewlink-dialog-cancel){color:#f3f8fb!important;background:#173247!important}
@keyframes cl-pulse{0%,100%{opacity:.25;transform:scale(.96)}50%{opacity:.75;transform:scale(1.02)}}
</style>
