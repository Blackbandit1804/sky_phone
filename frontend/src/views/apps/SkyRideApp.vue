<script setup lang="ts">
import {
  kBadge,
  kBlock,
  kBlockHeader,
  kBlockTitle,
  kButton,
  kCard,
  kChip,
  kDialog,
  kDialogButton,
  kFab,
  kIcon,
  kLink,
  kList,
  kListInput,
  kListItem,
  kNavbar,
  kPage,
  kPreloader,
  kSegmented,
  kSegmentedButton,
  kSheet,
  kTabbar,
  kTabbarLink,
  kToast,
  kToggle,
  kToolbarPane,
} from 'konsta/vue'
import {
  Bell,
  BriefcaseBusiness,
  CarFront,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Crosshair,
  History,
  House,
  MapPin,
  MessageCircle,
  Minus,
  Navigation,
  Phone,
  Plus,
  Power,
  Route,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  X,
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import {
  defaultCayoStyle,
  defaultMainlandStyle,
  defaultMapCoordinates,
  defaultMapPercentToWorld,
  defaultMapWorldToPercent,
} from '@/features/map/defaultMapGeometry'
import { useCallsStore } from '@/stores/calls'
import { usePhoneStore } from '@/stores/phone'
import { useSkyRideStore } from '@/stores/skyride'
import type {
  SkyRideChangedMessage,
  SkyRideCoordinates,
  SkyRideCustomFareInput,
  SkyRideDistanceUnit,
  SkyRideFareMode,
  SkyRideLocation,
  SkyRideMode,
  SkyRideQuoteOption,
  SkyRideRide,
  SkyRideRideStatus,
} from '@/types/skyride'
import { isTrustedRootMessageSource } from '@/utils/windowMessages'

type SkyRideTab = 'home' | 'rides' | 'activity' | 'messages' | 'profile'
type LocationTarget = 'pickup' | 'destination'

const phone = usePhoneStore()
const skyride = useSkyRideStore()
const calls = useCallsStore()
const router = useRouter()

const activeTab = ref<SkyRideTab>('home')
const mode = ref<SkyRideMode>('rider')
const pickup = ref<SkyRideLocation | null>(null)
const destination = ref<SkyRideLocation | null>(null)
const currentCoordinates = ref<SkyRideCoordinates | null>(null)
const locationTarget = ref<LocationTarget | null>(null)
const mapPickTarget = ref<LocationTarget | null>(null)
const mapDraft = ref<SkyRideLocation | null>(null)
const mapElement = ref<HTMLElement | null>(null)
const mapStageElement = ref<HTMLElement | null>(null)
const mapViewport = ref({ scale: 1.15, x: 0, y: 0 })
const mapPointer = ref<{
  id: number
  moved: boolean
  originX: number
  originY: number
  startX: number
  startY: number
} | null>(null)
const selectedQuoteId = ref<string | null>(null)
const fareMode = ref<SkyRideFareMode>('calculated')
const customFareInput = ref('')
const cancelDialogOpened = ref(false)
const rating = ref(0)
const tip = ref(0)
const ratingComment = ref('')
const toastText = ref('')
let toastTimer: number | undefined

const tabs = [
  { icon: House, id: 'home' as const },
  { icon: Route, id: 'rides' as const },
  { icon: Bell, id: 'activity' as const },
  { icon: MessageCircle, id: 'messages' as const },
  { icon: UserRound, id: 'profile' as const },
]
const dangerButtonColors = {
  tonalBgIos: 'bg-[#ff453a]/15 active:bg-[#ff453a]/25',
  tonalBgMaterial: 'bg-[#ff453a]/15 active:bg-[#ff453a]/25',
  tonalTextIos: 'text-[#ff453a]',
  tonalTextMaterial: 'text-[#ff453a]',
}
const mapControlColors = {
  activeBgIos: '',
  activeBgMaterial: '',
  bgIos: '',
  bgMaterial: '',
  textIos: 'text-current',
  textMaterial: 'text-current',
}
const quickDestinationButtonColors = {
  tonalBgIos: '',
  tonalBgMaterial: '',
  tonalTextIos: 'text-current',
  tonalTextMaterial: 'text-current',
}

const displayedPickup = computed(
  () => skyride.activeRide?.pickup ?? pickup.value,
)
const displayedDestination = computed(
  () => skyride.activeRide?.destination ?? destination.value,
)
const mapRoute = computed(() => {
  if (!displayedPickup.value || !displayedDestination.value) return null
  return {
    destination: defaultMapWorldToPercent(displayedDestination.value.coords),
    pickup: defaultMapWorldToPercent(displayedPickup.value.coords),
  }
})
const selectedQuote = computed(() =>
  skyride.quote?.options.find(
    (option) => option.quoteId === selectedQuoteId.value,
  ),
)
const canRequestSelectedQuote = computed(() => {
  const option = selectedQuote.value
  if (!option) return false
  if (fareMode.value === 'calculated') {
    return option.fareMode === 'calculated'
  }
  return (
    option.fareMode === 'custom' &&
    Number(customFareInput.value) === option.price
  )
})
const mapStageStyle = computed(() => ({
  '--map-marker-scale': String(1 / Math.pow(mapViewport.value.scale, 1.35)),
  aspectRatio: String(
    defaultMapCoordinates.width / defaultMapCoordinates.height,
  ),
  transform: `translate(-50%, -50%) translate3d(${mapViewport.value.x}px, ${mapViewport.value.y}px, 0) scale(${mapViewport.value.scale})`,
}))
const activeContact = computed(() =>
  mode.value === 'driver'
    ? skyride.activeRide?.passenger
    : skyride.activeRide?.driver,
)
const canCancelRide = computed(() =>
  [
    'searching',
    'accepted',
    'driver_arriving',
    'arrived',
    'in_progress',
  ].includes(skyride.activeRide?.status ?? ''),
)
const driverAction = computed<'arrive' | 'start' | 'complete' | null>(() => {
  const status = skyride.activeRide?.status
  if (status === 'accepted' || status === 'driver_arriving') return 'arrive'
  if (status === 'arrived') return 'start'
  if (status === 'in_progress') return 'complete'
  return null
})
const ratingRide = computed(() => skyride.pendingRating)
const mapImageUrl = `${import.meta.env.BASE_URL}img/maps/gtav-map.svg`
const cayoMapImageUrl = `${import.meta.env.BASE_URL}img/maps/cayo-perico.svg`

function showToast(message: string): void {
  if (toastTimer) window.clearTimeout(toastTimer)
  toastText.value = message
  toastTimer = window.setTimeout(() => {
    toastText.value = ''
    toastTimer = undefined
  }, 2200)
}

function errorText(error?: string): string {
  const key = error ?? 'request_failed'
  const translated = phone.t(`Apps.skyride.errors.${key}`)
  return translated === `Apps.skyride.errors.${key}`
    ? phone.t('Apps.skyride.errors.request_failed')
    : translated
}

function locationLabel(location: SkyRideLocation | null): string {
  if (!location) return phone.t('Apps.skyride.notSelected')
  if (!location.id) return location.label
  const key = `Apps.skyride.quickLocations.${location.id}`
  const translated = phone.t(key)
  return translated === key ? phone.t('Apps.skyride.savedPlace') : translated
}

function paymentMethodLabel(method: string): string {
  const key = `Apps.skyride.paymentMethods.${method}`
  const translated = phone.t(key)
  return translated === key
    ? phone.t('Apps.skyride.paymentMethods.default')
    : translated
}

function formatMoney(amount: number, currency: string): string {
  if (/^[A-Z]{3}$/.test(currency)) {
    return new Intl.NumberFormat(phone.lang, {
      currency,
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(amount)
  }
  return `${currency}${new Intl.NumberFormat(phone.lang, {
    maximumFractionDigits: 0,
  }).format(amount)}`
}

function formatQuoteDistance(
  distance: number,
  unit: SkyRideDistanceUnit,
): string {
  return phone.t(
    unit === 'mile'
      ? 'Apps.skyride.distanceMiles'
      : 'Apps.skyride.distanceKilometers',
    {
      distance: distance.toLocaleString(phone.lang, {
        maximumFractionDigits: 1,
      }),
    },
  )
}

function formatDistanceRate(option: SkyRideQuoteOption): string {
  const unitKey =
    skyride.quote?.distanceUnit === 'mile' ? 'perMile' : 'perKilometer'
  return phone.t(`Apps.skyride.${unitKey}`, {
    price: formatMoney(option.pricePerDistanceUnit, option.currency),
  })
}

function formatDuration(durationSeconds: number): string {
  return phone.t('Apps.skyride.durationMinutes', {
    minutes: Math.max(1, Math.round(durationSeconds / 60)).toLocaleString(
      phone.lang,
    ),
  })
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(phone.lang, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(timestamp * 1000))
}

function statusLabel(status: SkyRideRideStatus): string {
  return phone.t(`Apps.skyride.status.${status}`)
}

function vehicleLabel(ride: SkyRideRide): string {
  const model = ride.driver?.vehicle.model.trim() ?? ''
  return model && !/^-?\d+$/.test(model)
    ? model
    : phone.t('Apps.skyride.vehicle')
}

function updateRatingComment(event: Event): void {
  ratingComment.value = (event.target as HTMLInputElement).value
}

function markerStyle(location: SkyRideLocation | null): Record<string, string> {
  if (!location) return {}
  const point = defaultMapWorldToPercent(location.coords)
  return {
    left: `${Math.min(1, Math.max(0, point.x)) * 100}%`,
    top: `${Math.min(1, Math.max(0, point.y)) * 100}%`,
  }
}

function openLocationPicker(target: LocationTarget): void {
  if (skyride.activeRide) return
  locationTarget.value = target
}

function chooseLocation(location: SkyRideLocation): void {
  const target = locationTarget.value
  if (!target) return
  if (target === 'pickup') pickup.value = { ...location }
  else destination.value = { ...location }
  locationTarget.value = null
  skyride.clearQuote()
}

function chooseQuickDestination(location: SkyRideLocation): void {
  destination.value = { ...location }
  skyride.clearQuote()
}

async function useCurrentLocation(): Promise<void> {
  const target = locationTarget.value
  if (!target) return
  const response = await skyride.getPlayerCoordinates()
  if (!response.success || !response.data) {
    showToast(errorText(response.error))
    return
  }
  currentCoordinates.value = response.data.coords
  chooseLocation({
    coords: response.data.coords,
    label: phone.t('Apps.skyride.currentLocation'),
  })
}

function beginMapPick(): void {
  mapPickTarget.value = locationTarget.value
  mapDraft.value = null
  locationTarget.value = null
}

function clampMapViewport(x: number, y: number, scale: number) {
  const bounds = mapElement.value?.getBoundingClientRect()
  const stage = mapStageElement.value
  if (!bounds || !stage) return { x: 0, y: 0 }
  const maximumX = Math.max(0, (stage.offsetWidth * scale - bounds.width) / 2)
  const maximumY = Math.max(0, (stage.offsetHeight * scale - bounds.height) / 2)
  return {
    x: Math.min(maximumX, Math.max(-maximumX, x)),
    y: Math.min(maximumY, Math.max(-maximumY, y)),
  }
}

function setMapDraftAt(clientX: number, clientY: number): void {
  if (!mapPickTarget.value) return
  const bounds = mapElement.value?.getBoundingClientRect()
  const stage = mapStageElement.value
  if (!bounds || !stage) return
  const localX =
    (clientX - bounds.left - bounds.width / 2 - mapViewport.value.x) /
      mapViewport.value.scale +
    stage.offsetWidth / 2
  const localY =
    (clientY - bounds.top - bounds.height / 2 - mapViewport.value.y) /
      mapViewport.value.scale +
    stage.offsetHeight / 2
  const percent = {
    x: Math.min(1, Math.max(0, localX / stage.offsetWidth)),
    y: Math.min(1, Math.max(0, localY / stage.offsetHeight)),
  }
  const coords = defaultMapPercentToWorld(percent)
  mapDraft.value = {
    coords: {
      x: Math.round(coords.x * 10) / 10,
      y: Math.round(coords.y * 10) / 10,
      z: currentCoordinates.value?.z ?? 0,
    },
    label: phone.t('Apps.skyride.mapPoint'),
  }
}

function beginMapPan(event: PointerEvent): void {
  if (event.button !== 0) return
  mapPointer.value = {
    id: event.pointerId,
    moved: false,
    originX: mapViewport.value.x,
    originY: mapViewport.value.y,
    startX: event.clientX,
    startY: event.clientY,
  }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function moveMap(event: PointerEvent): void {
  const pointer = mapPointer.value
  if (!pointer || pointer.id !== event.pointerId) return
  const deltaX = event.clientX - pointer.startX
  const deltaY = event.clientY - pointer.startY
  if (Math.hypot(deltaX, deltaY) > 4) pointer.moved = true
  const clamped = clampMapViewport(
    pointer.originX + deltaX,
    pointer.originY + deltaY,
    mapViewport.value.scale,
  )
  mapViewport.value = { ...mapViewport.value, ...clamped }
}

function endMapPan(event: PointerEvent): void {
  const pointer = mapPointer.value
  if (!pointer || pointer.id !== event.pointerId) return
  if (!pointer.moved) setMapDraftAt(event.clientX, event.clientY)
  mapPointer.value = null
  const target = event.currentTarget as HTMLElement
  if (target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
}

function zoomMap(delta: number, focalPoint?: { x: number; y: number }): void {
  const previous = mapViewport.value
  const scale = Math.min(5, Math.max(1, previous.scale + delta))
  let x = previous.x
  let y = previous.y
  const bounds = mapElement.value?.getBoundingClientRect()
  if (focalPoint && bounds && scale !== previous.scale) {
    const scaleRatio = scale / previous.scale
    const offsetX = focalPoint.x - bounds.left - bounds.width / 2 - previous.x
    const offsetY = focalPoint.y - bounds.top - bounds.height / 2 - previous.y
    x -= offsetX * (scaleRatio - 1)
    y -= offsetY * (scaleRatio - 1)
  }
  const clamped = clampMapViewport(x, y, scale)
  mapViewport.value = { scale, ...clamped }
}

function handleMapWheel(event: WheelEvent): void {
  zoomMap(event.deltaY < 0 ? 0.28 : -0.28, {
    x: event.clientX,
    y: event.clientY,
  })
}

async function focusMapOnRoute(): Promise<void> {
  await nextTick()
  const bounds = mapElement.value?.getBoundingClientRect()
  const stage = mapStageElement.value
  if (!bounds || !stage) return
  const route = mapRoute.value
  const fallback = displayedPickup.value
    ? defaultMapWorldToPercent(displayedPickup.value.coords)
    : { x: 0.37, y: 0.47 }
  const center = route
    ? {
        x: (route.pickup.x + route.destination.x) / 2,
        y: (route.pickup.y + route.destination.y) / 2,
      }
    : fallback
  const spanX = route ? Math.abs(route.pickup.x - route.destination.x) : 0
  const spanY = route ? Math.abs(route.pickup.y - route.destination.y) : 0
  const scale = route
    ? Math.min(
        2.65,
        Math.max(
          1.05,
          Math.min(
            (bounds.width * 0.68) / (Math.max(spanX, 0.05) * stage.offsetWidth),
            (bounds.height * 0.56) /
              (Math.max(spanY, 0.05) * stage.offsetHeight),
          ),
        ),
      )
    : 1.15
  const clamped = clampMapViewport(
    (0.5 - center.x) * stage.offsetWidth * scale,
    (0.5 - center.y) * stage.offsetHeight * scale,
    scale,
  )
  mapViewport.value = { scale, ...clamped }
}

function resetMapViewport(): void {
  void focusMapOnRoute()
}

function confirmMapPick(): void {
  const target = mapPickTarget.value
  const location = mapDraft.value
  if (!target || !location) return
  if (target === 'pickup') pickup.value = location
  else destination.value = location
  mapPickTarget.value = null
  mapDraft.value = null
  skyride.clearQuote()
}

function cancelMapPick(): void {
  mapPickTarget.value = null
  mapDraft.value = null
}

async function createQuote(customFare?: SkyRideCustomFareInput): Promise<void> {
  if (!pickup.value || !destination.value) return
  const preferredService =
    customFare?.serviceClass ?? selectedQuote.value?.serviceClass
  const response = await skyride.createQuote(
    pickup.value,
    destination.value,
    customFare,
  )
  if (!response.success || !response.data) {
    showToast(errorText(response.error))
    return
  }
  const option =
    response.data.options.find(
      (candidate) =>
        candidate.available && candidate.serviceClass === preferredService,
    ) ?? response.data.options.find((candidate) => candidate.available)
  selectedQuoteId.value = option?.quoteId ?? null
  fareMode.value = option?.fareMode ?? 'calculated'
  customFareInput.value = option ? String(option.price) : ''
}

async function requestRide(
  option: SkyRideQuoteOption | undefined,
): Promise<void> {
  if (!option) return
  const response = await skyride.requestRide(option)
  if (!response.success) showToast(errorText(response.error))
}

function selectQuoteOption(option: SkyRideQuoteOption): void {
  if (!option.available) return
  selectedQuoteId.value = option.quoteId
  fareMode.value = option.fareMode
  customFareInput.value = String(option.price)
}

function selectFareMode(nextMode: SkyRideFareMode): void {
  fareMode.value = nextMode
  const option = selectedQuote.value
  if (!option) return
  customFareInput.value = String(
    nextMode === 'custom' && option.fareMode === 'custom'
      ? option.price
      : option.calculatedPrice,
  )
}

function updateCustomFareInput(event: Event): void {
  customFareInput.value = (event.target as HTMLInputElement).value
}

async function applyCustomFare(): Promise<void> {
  const option = selectedQuote.value
  const price = Number(customFareInput.value)
  if (
    !option ||
    !Number.isInteger(price) ||
    price < option.minimumCustomPrice ||
    price > option.maximumCustomPrice
  ) {
    showToast(errorText('invalid_custom_fare'))
    return
  }
  await createQuote({ price, serviceClass: option.serviceClass })
}

async function applyCalculatedFare(): Promise<void> {
  if (selectedQuote.value?.fareMode === 'calculated') {
    selectFareMode('calculated')
    return
  }
  fareMode.value = 'calculated'
  await createQuote()
}

async function toggleDriverStatus(): Promise<void> {
  const response = await skyride.setDriverStatus(!skyride.driverOnline)
  if (!response.success) showToast(errorText(response.error))
}

async function acceptRide(ride: SkyRideRide): Promise<void> {
  const response = await skyride.performRideAction('accept', ride.id)
  if (!response.success) showToast(errorText(response.error))
}

async function performDriverAction(): Promise<void> {
  const ride = skyride.activeRide
  const action = driverAction.value
  if (!ride || !action) return
  const response = await skyride.performRideAction(action, ride.id)
  if (!response.success) showToast(errorText(response.error))
}

async function confirmCancel(): Promise<void> {
  const ride = skyride.activeRide
  if (!ride) return
  const response = await skyride.cancelRide(ride.id, 'changed_mind')
  if (!response.success) showToast(errorText(response.error))
  cancelDialogOpened.value = false
}

async function setRideWaypoint(): Promise<void> {
  const ride = skyride.activeRide
  if (!ride) return
  const location =
    mode.value === 'driver' && ride.status !== 'in_progress'
      ? ride.pickup
      : ride.destination
  const response = await skyride.setWaypoint(location.coords)
  showToast(
    response.success
      ? phone.t('Apps.skyride.waypointSet')
      : errorText(response.error),
  )
}

async function callActiveContact(): Promise<void> {
  const number = activeContact.value?.phoneNumber
  if (!number) return
  const response = await calls.dial(number)
  if (!response.success) showToast(errorText(response.error))
}

function openMessages(): void {
  void router.push('/apps/messages')
}

async function submitRating(): Promise<void> {
  const ride = ratingRide.value
  if (!ride || rating.value < 1) return
  const response = await skyride.rateRide(
    ride.id,
    rating.value,
    tip.value,
    ratingComment.value.trim(),
  )
  if (!response.success) {
    showToast(errorText(response.error))
    return
  }
  rating.value = 0
  tip.value = 0
  ratingComment.value = ''
  showToast(phone.t('Apps.skyride.ratingSaved'))
}

function dismissRating(): void {
  skyride.pendingRating = null
  rating.value = 0
  tip.value = 0
  ratingComment.value = ''
}

function selectTab(tab: SkyRideTab): void {
  activeTab.value = tab
  if (tab === 'rides' || tab === 'activity') void skyride.loadHistory()
}

function handleSkyRideMessage(event: MessageEvent<unknown>): void {
  if (!isTrustedRootMessageSource(event.source, window)) return
  if (typeof event.data !== 'object' || event.data === null) return
  const message = event.data as Partial<SkyRideChangedMessage>
  if (message.type !== 'skyride:changed' || !message.data) return
  skyride.applyUpdate(message.data)
}

watch(
  () => skyride.driverEligible,
  (eligible) => {
    if (!eligible) mode.value = 'rider'
  },
)

watch(
  () => skyride.activeRide,
  (ride) => {
    if (!ride || !skyride.profile) return
    mode.value = ride.passenger?.id === skyride.profile.id ? 'rider' : 'driver'
  },
)

watch(mapRoute, () => void focusMapOnRoute(), { deep: true })

onMounted(async () => {
  window.addEventListener('message', handleSkyRideMessage)
  await skyride.bootstrap()
  const response = await skyride.getPlayerCoordinates()
  if (response.success && response.data) {
    currentCoordinates.value = response.data.coords
    if (!pickup.value) {
      pickup.value = {
        coords: response.data.coords,
        label: phone.t('Apps.skyride.currentLocation'),
      }
    }
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleSkyRideMessage)
  if (toastTimer) window.clearTimeout(toastTimer)
})
</script>

<template>
  <k-page
    component="main"
    class="skyride-app pb-safe-24"
    :class="{ 'skyride-app--dark': phone.isDarkMode }"
    :colors="{ bgIos: 'bg-transparent' }"
  >
    <div class="skyride-ambient" aria-hidden="true"></div>
    <k-navbar
      class="skyride-navbar"
      :title="phone.t('Apps.skyride.name')"
      :subtitle="phone.t(`Apps.skyride.mode.${mode}`)"
    />

    <k-block
      v-if="skyride.isLoading && !skyride.profile"
      class="skyride-loading"
    >
      <k-preloader />
      <span>{{ phone.t('Apps.skyride.loading') }}</span>
    </k-block>

    <k-card
      v-else-if="!skyride.profile"
      :content-wrap="false"
      class="skyride-unavailable"
    >
      <CarFront :size="36" aria-hidden="true" />
      <strong>{{ phone.t('Apps.skyride.unavailable') }}</strong>
      <p>{{ errorText(skyride.error) }}</p>
      <k-button rounded @click="skyride.bootstrap()">
        {{ phone.t('Apps.skyride.tryAgain') }}
      </k-button>
    </k-card>

    <template v-else>
      <div class="skyride-mode">
        <k-segmented v-if="skyride.driverEligible" rounded strong>
          <k-segmented-button
            :active="mode === 'rider'"
            :disabled="Boolean(skyride.activeRide)"
            @click="mode = 'rider'"
          >
            {{ phone.t('Apps.skyride.mode.rider') }}
          </k-segmented-button>
          <k-segmented-button
            :active="mode === 'driver'"
            :disabled="Boolean(skyride.activeRide)"
            @click="mode = 'driver'"
          >
            {{ phone.t('Apps.skyride.mode.driver') }}
          </k-segmented-button>
        </k-segmented>
      </div>

      <div class="skyride-scroll">
        <template v-if="activeTab === 'home'">
          <section
            ref="mapElement"
            class="skyride-map"
            :class="{
              'is-dragging': mapPointer,
              'is-picking': mapPickTarget,
            }"
            :aria-label="phone.t('Apps.skyride.map')"
            @pointerdown="beginMapPan"
            @pointermove="moveMap"
            @pointerup="endMapPan"
            @pointercancel="endMapPan"
            @wheel.prevent="handleMapWheel"
          >
            <div
              ref="mapStageElement"
              class="skyride-map__stage"
              :style="mapStageStyle"
            >
              <div class="skyride-map__canvas" aria-hidden="true">
                <img
                  :src="mapImageUrl"
                  alt=""
                  :style="defaultMainlandStyle"
                  decoding="async"
                  draggable="false"
                />
                <img
                  :src="cayoMapImageUrl"
                  alt=""
                  :style="defaultCayoStyle"
                  decoding="async"
                  draggable="false"
                />
              </div>
              <svg
                v-if="mapRoute"
                class="skyride-route-line"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <line
                  :x1="mapRoute.pickup.x * 100"
                  :y1="mapRoute.pickup.y * 100"
                  :x2="mapRoute.destination.x * 100"
                  :y2="mapRoute.destination.y * 100"
                />
              </svg>
              <span
                v-if="displayedPickup"
                class="skyride-map-marker is-pickup"
                :style="markerStyle(displayedPickup)"
              >
                <span></span>
              </span>
              <span
                v-if="displayedDestination"
                class="skyride-map-marker is-destination"
                :style="markerStyle(displayedDestination)"
              >
                <MapPin :size="24" aria-hidden="true" />
              </span>
              <span
                v-if="mapDraft"
                class="skyride-map-marker is-draft"
                :style="markerStyle(mapDraft)"
              >
                <MapPin :size="27" aria-hidden="true" />
              </span>
            </div>

            <div
              v-if="mapPickTarget"
              class="skyride-map-picker"
              @click.stop
              @pointerdown.stop
              @pointermove.stop
              @pointerup.stop
            >
              <strong>{{
                phone.t(`Apps.skyride.pickOnMap.${mapPickTarget}`)
              }}</strong>
              <span>{{ phone.t('Apps.skyride.tapMapHint') }}</span>
              <div>
                <k-button small rounded outline @click="cancelMapPick">
                  {{ phone.t('Common.cancel') }}
                </k-button>
                <k-button
                  small
                  rounded
                  :disabled="!mapDraft"
                  @click="confirmMapPick"
                >
                  {{ phone.t('Common.use') }}
                </k-button>
              </div>
            </div>

            <div
              v-if="!mapPickTarget"
              class="skyride-map-controls"
              @pointerdown.stop
              @pointerup.stop
            >
              <k-fab
                component="button"
                type="button"
                class="skyride-map-control"
                :colors="mapControlColors"
                :aria-label="phone.t('Apps.skyride.zoomIn')"
                @click.stop="zoomMap(0.35)"
              >
                <template #icon>
                  <Plus :size="17" aria-hidden="true" />
                </template>
              </k-fab>
              <k-fab
                component="button"
                type="button"
                class="skyride-map-control"
                :colors="mapControlColors"
                :aria-label="phone.t('Apps.skyride.zoomOut')"
                @click.stop="zoomMap(-0.35)"
              >
                <template #icon>
                  <Minus :size="17" aria-hidden="true" />
                </template>
              </k-fab>
              <k-fab
                component="button"
                type="button"
                class="skyride-map-control"
                :colors="mapControlColors"
                :aria-label="phone.t('Apps.skyride.resetMap')"
                @click.stop="resetMapViewport"
              >
                <template #icon>
                  <Crosshair :size="17" aria-hidden="true" />
                </template>
              </k-fab>
            </div>
          </section>

          <section v-if="mode === 'rider'" class="skyride-home-panel">
            <template v-if="!skyride.activeRide">
              <k-block-header inset component="header" class="skyride-heading">
                <div>
                  <span>{{ phone.t('Apps.skyride.riderEyebrow') }}</span>
                  <h1>{{ phone.t('Apps.skyride.whereTo') }}</h1>
                </div>
                <k-icon class="skyride-heading__icon">
                  <Navigation :size="20" aria-hidden="true" />
                </k-icon>
              </k-block-header>

              <k-list inset strong class="skyride-location-list">
                <k-list-item
                  link
                  :title="phone.t('Apps.skyride.pickup')"
                  :subtitle="locationLabel(pickup)"
                  @click="openLocationPicker('pickup')"
                >
                  <template #media><span class="skyride-dot"></span></template>
                </k-list-item>
                <k-list-item
                  link
                  :title="phone.t('Apps.skyride.destination')"
                  :subtitle="locationLabel(destination)"
                  @click="openLocationPicker('destination')"
                >
                  <template #media><MapPin :size="19" /></template>
                </k-list-item>
              </k-list>

              <template v-if="!skyride.quote">
                <k-block-title class="skyride-custom-block-title">{{
                  phone.t('Apps.skyride.quickDestinations')
                }}</k-block-title>
                <k-block class="skyride-quick-grid">
                  <k-button
                    v-for="location in skyride.quickLocations.slice(0, 4)"
                    :key="location.id ?? location.label"
                    large
                    rounded
                    tonal
                    class="skyride-quick-card"
                    :colors="quickDestinationButtonColors"
                    @click="chooseQuickDestination(location)"
                  >
                    <component
                      :is="location.id === 'work' ? BriefcaseBusiness : MapPin"
                      :size="18"
                      aria-hidden="true"
                    />
                    <span>{{ locationLabel(location) }}</span>
                  </k-button>
                </k-block>

                <k-button
                  large
                  rounded
                  class="skyride-primary"
                  :disabled="!pickup || !destination || skyride.isActionPending"
                  @click="createQuote()"
                >
                  <k-preloader v-if="skyride.isActionPending" />
                  <template v-else>
                    {{ phone.t('Apps.skyride.viewRides') }}
                    <ChevronRight :size="18" aria-hidden="true" />
                  </template>
                </k-button>
              </template>

              <template v-else>
                <div class="skyride-quote-summary">
                  <k-chip outline class="skyride-quote-chip">{{
                    formatQuoteDistance(
                      skyride.quote.distance,
                      skyride.quote.distanceUnit,
                    )
                  }}</k-chip>
                  <k-chip outline class="skyride-quote-chip">{{
                    formatDuration(skyride.quote.durationSeconds)
                  }}</k-chip>
                  <k-link
                    component="button"
                    :link-props="{ type: 'button' }"
                    @click="skyride.clearQuote()"
                  >
                    {{ phone.t('Apps.skyride.change') }}
                  </k-link>
                </div>
                <k-list inset strong class="skyride-service-list">
                  <k-list-item
                    v-for="option in skyride.quote.options"
                    :key="option.quoteId"
                    :link="option.available"
                    :aria-disabled="!option.available"
                    :class="{
                      'is-selected': selectedQuoteId === option.quoteId,
                      'is-unavailable': !option.available,
                    }"
                    :title="
                      phone.t(
                        `Apps.skyride.services.${option.serviceClass}.name`,
                      )
                    "
                    :subtitle="
                      phone.t('Apps.skyride.serviceMeta', {
                        eta: option.etaMinutes.toLocaleString(phone.lang),
                        seats: option.seats.toLocaleString(phone.lang),
                      })
                    "
                    @click="selectQuoteOption(option)"
                  >
                    <template #media>
                      <span class="skyride-service-icon">
                        <CarFront :size="22" aria-hidden="true" />
                      </span>
                    </template>
                    <template #after>
                      <strong>{{
                        formatMoney(option.price, option.currency)
                      }}</strong>
                      <Check
                        v-if="selectedQuoteId === option.quoteId"
                        :size="16"
                      />
                    </template>
                  </k-list-item>
                </k-list>
                <k-card
                  v-if="selectedQuote"
                  :content-wrap="false"
                  class="skyride-fare-card"
                >
                  <div class="skyride-fare-card__heading">
                    <span class="skyride-fare-card__icon">
                      <CircleDollarSign :size="19" aria-hidden="true" />
                    </span>
                    <div>
                      <small>{{ phone.t('Apps.skyride.fare') }}</small>
                      <strong>{{
                        formatMoney(selectedQuote.price, selectedQuote.currency)
                      }}</strong>
                    </div>
                    <span>{{ formatDistanceRate(selectedQuote) }}</span>
                  </div>
                  <k-segmented rounded strong>
                    <k-segmented-button
                      :active="fareMode === 'calculated'"
                      @click="applyCalculatedFare"
                    >
                      {{ phone.t('Apps.skyride.calculatedFare') }}
                    </k-segmented-button>
                    <k-segmented-button
                      :active="fareMode === 'custom'"
                      @click="selectFareMode('custom')"
                    >
                      {{ phone.t('Apps.skyride.customFare') }}
                    </k-segmented-button>
                  </k-segmented>
                  <div
                    v-if="fareMode === 'calculated'"
                    class="skyride-fare-breakdown"
                  >
                    <span>{{
                      phone.t('Apps.skyride.calculatedFareBody')
                    }}</span>
                    <strong>{{
                      formatMoney(
                        selectedQuote.calculatedPrice,
                        selectedQuote.currency,
                      )
                    }}</strong>
                  </div>
                  <div v-else class="skyride-custom-fare">
                    <k-list inset strong>
                      <k-list-input
                        input-id="skyride-custom-fare"
                        outline
                        type="number"
                        inputmode="numeric"
                        step="1"
                        :label="phone.t('Apps.skyride.customFare')"
                        :min="selectedQuote.minimumCustomPrice"
                        :max="selectedQuote.maximumCustomPrice"
                        :value="customFareInput"
                        :info="
                          phone.t('Apps.skyride.customFareRange', {
                            maximum: formatMoney(
                              selectedQuote.maximumCustomPrice,
                              selectedQuote.currency,
                            ),
                            minimum: formatMoney(
                              selectedQuote.minimumCustomPrice,
                              selectedQuote.currency,
                            ),
                          })
                        "
                        @input="updateCustomFareInput"
                      />
                    </k-list>
                    <k-button
                      small
                      rounded
                      :disabled="skyride.isActionPending"
                      @click="applyCustomFare"
                    >
                      {{ phone.t('Apps.skyride.applyCustomFare') }}
                    </k-button>
                  </div>
                </k-card>
                <k-button
                  large
                  rounded
                  class="skyride-primary"
                  :disabled="
                    !canRequestSelectedQuote || skyride.isActionPending
                  "
                  @click="requestRide(selectedQuote)"
                >
                  <k-preloader v-if="skyride.isActionPending" />
                  <template v-else>
                    {{ phone.t('Apps.skyride.requestRide') }}
                    <ChevronRight :size="18" aria-hidden="true" />
                  </template>
                </k-button>
              </template>
            </template>

            <template v-else>
              <k-card :content-wrap="false" class="skyride-ride-status-card">
                <span
                  class="skyride-status-icon"
                  :class="'is-' + skyride.activeRide.status"
                >
                  <k-preloader
                    v-if="skyride.activeRide.status === 'searching'"
                  />
                  <CheckCircle2 v-else :size="22" aria-hidden="true" />
                </span>
                <div>
                  <small>{{ phone.t('Apps.skyride.rideStatus') }}</small>
                  <h1>{{ statusLabel(skyride.activeRide.status) }}</h1>
                  <p>
                    {{
                      phone.t(
                        `Apps.skyride.statusBody.${skyride.activeRide.status}`,
                      )
                    }}
                  </p>
                </div>
              </k-card>

              <k-card
                v-if="skyride.activeRide.driver"
                :content-wrap="false"
                class="skyride-person-card"
              >
                <div class="skyride-avatar">
                  <img
                    v-if="skyride.activeRide.driver.avatarUrl"
                    :src="skyride.activeRide.driver.avatarUrl"
                    alt=""
                  />
                  <UserRound v-else :size="22" aria-hidden="true" />
                </div>
                <div class="skyride-person-card__body">
                  <strong>{{ skyride.activeRide.driver.name }}</strong>
                  <span>
                    <Star :size="13" fill="currentColor" aria-hidden="true" />
                    {{
                      skyride.activeRide.driver.rating.toLocaleString(
                        phone.lang,
                      )
                    }}
                    · {{ vehicleLabel(skyride.activeRide) }}
                  </span>
                  <b>{{ skyride.activeRide.driver.vehicle.plate }}</b>
                </div>
                <div class="skyride-contact-actions">
                  <k-button
                    small
                    rounded
                    outline
                    :disabled="!skyride.activeRide.driver.phoneNumber"
                    :aria-label="phone.t('Apps.skyride.call')"
                    @click="callActiveContact"
                  >
                    <Phone :size="17" aria-hidden="true" />
                  </k-button>
                  <k-button
                    small
                    rounded
                    outline
                    :aria-label="phone.t('Apps.skyride.message')"
                    @click="openMessages"
                  >
                    <MessageCircle :size="17" aria-hidden="true" />
                  </k-button>
                </div>
              </k-card>

              <k-card :content-wrap="false" class="skyride-trip-card">
                <div class="skyride-route-stop">
                  <span class="skyride-dot"></span>
                  <div>
                    <small>{{ phone.t('Apps.skyride.pickup') }}</small>
                    <strong>{{
                      locationLabel(skyride.activeRide.pickup)
                    }}</strong>
                  </div>
                </div>
                <i></i>
                <div class="skyride-route-stop">
                  <MapPin :size="18" aria-hidden="true" />
                  <div>
                    <small>{{ phone.t('Apps.skyride.destination') }}</small>
                    <strong>{{
                      locationLabel(skyride.activeRide.destination)
                    }}</strong>
                  </div>
                </div>
                <div class="skyride-trip-meta">
                  <span>{{
                    phone.t(
                      `Apps.skyride.services.${skyride.activeRide.serviceClass}.name`,
                    )
                  }}</span>
                  <strong>{{
                    formatMoney(
                      skyride.activeRide.price,
                      skyride.activeRide.currency,
                    )
                  }}</strong>
                </div>
              </k-card>

              <div class="skyride-active-actions">
                <k-button rounded outline @click="setRideWaypoint">
                  <Navigation :size="17" aria-hidden="true" />
                  {{ phone.t('Apps.skyride.navigate') }}
                </k-button>
                <k-button
                  v-if="canCancelRide"
                  rounded
                  tonal
                  :colors="dangerButtonColors"
                  @click="cancelDialogOpened = true"
                >
                  {{ phone.t('Apps.skyride.cancelRide') }}
                </k-button>
              </div>
              <k-block class="skyride-safety-note">
                <ShieldCheck :size="18" aria-hidden="true" />
                <span>{{ phone.t('Apps.skyride.safetyNote') }}</span>
              </k-block>
            </template>
          </section>

          <section v-else class="skyride-home-panel skyride-driver-home">
            <k-card :content-wrap="false" class="skyride-driver-status">
              <div
                class="skyride-driver-status__icon"
                :class="{ 'is-online': skyride.driverOnline }"
              >
                <Power :size="21" aria-hidden="true" />
              </div>
              <div>
                <strong>{{
                  phone.t(
                    `Apps.skyride.driver.${skyride.driverOnline ? 'online' : 'offline'}`,
                  )
                }}</strong>
                <span>{{
                  phone.t(
                    `Apps.skyride.driver.${skyride.driverOnline ? 'onlineBody' : 'offlineBody'}`,
                  )
                }}</span>
              </div>
              <k-toggle
                :checked="skyride.driverOnline"
                :disabled="
                  skyride.isActionPending || Boolean(skyride.activeRide)
                "
                :aria-label="phone.t('Apps.skyride.driver.toggleStatus')"
                @change="toggleDriverStatus"
              />
            </k-card>

            <template v-if="skyride.activeRide">
              <k-card :content-wrap="false" class="skyride-ride-status-card">
                <span class="skyride-status-icon"><CarFront :size="22" /></span>
                <div>
                  <small>{{ phone.t('Apps.skyride.rideStatus') }}</small>
                  <h1>{{ statusLabel(skyride.activeRide.status) }}</h1>
                  <p>
                    {{
                      phone.t(
                        `Apps.skyride.driver.statusBody.${skyride.activeRide.status}`,
                      )
                    }}
                  </p>
                </div>
              </k-card>
              <k-card
                v-if="skyride.activeRide.passenger"
                :content-wrap="false"
                class="skyride-person-card"
              >
                <div class="skyride-avatar">
                  <img
                    v-if="skyride.activeRide.passenger.avatarUrl"
                    :src="skyride.activeRide.passenger.avatarUrl"
                    alt=""
                  />
                  <UserRound v-else :size="22" aria-hidden="true" />
                </div>
                <div class="skyride-person-card__body">
                  <small>{{ phone.t('Apps.skyride.passenger') }}</small>
                  <strong>{{ skyride.activeRide.passenger.name }}</strong>
                  <span
                    ><Star :size="13" fill="currentColor" />
                    {{
                      skyride.activeRide.passenger.rating.toLocaleString(
                        phone.lang,
                      )
                    }}</span
                  >
                </div>
                <div class="skyride-contact-actions">
                  <k-button
                    small
                    rounded
                    outline
                    :disabled="!skyride.activeRide.passenger.phoneNumber"
                    @click="callActiveContact"
                  >
                    <Phone :size="17" aria-hidden="true" />
                  </k-button>
                  <k-button small rounded outline @click="openMessages">
                    <MessageCircle :size="17" aria-hidden="true" />
                  </k-button>
                </div>
              </k-card>
              <k-card :content-wrap="false" class="skyride-trip-card">
                <div class="skyride-route-stop">
                  <span class="skyride-dot"></span>
                  <div>
                    <small>{{ phone.t('Apps.skyride.pickup') }}</small
                    ><strong>{{
                      locationLabel(skyride.activeRide.pickup)
                    }}</strong>
                  </div>
                </div>
                <i></i>
                <div class="skyride-route-stop">
                  <MapPin :size="18" />
                  <div>
                    <small>{{ phone.t('Apps.skyride.destination') }}</small
                    ><strong>{{
                      locationLabel(skyride.activeRide.destination)
                    }}</strong>
                  </div>
                </div>
                <div class="skyride-trip-meta">
                  <span>{{
                    phone.t(
                      `Apps.skyride.services.${skyride.activeRide.serviceClass}.name`,
                    )
                  }}</span>
                  <strong>{{
                    formatMoney(
                      skyride.activeRide.price,
                      skyride.activeRide.currency,
                    )
                  }}</strong>
                </div>
              </k-card>
              <div class="skyride-driver-actions">
                <k-button rounded outline @click="setRideWaypoint">
                  <Navigation :size="17" />
                  {{ phone.t('Apps.skyride.navigate') }}
                </k-button>
                <k-button
                  v-if="driverAction"
                  rounded
                  :disabled="skyride.isActionPending"
                  @click="performDriverAction"
                >
                  <k-preloader v-if="skyride.isActionPending" />
                  <template v-else>{{
                    phone.t(`Apps.skyride.driver.actions.${driverAction}`)
                  }}</template>
                </k-button>
              </div>
            </template>

            <template v-else>
              <div class="skyride-driver-metrics">
                <k-card :content-wrap="false">
                  <CircleDollarSign :size="19" />
                  <strong>{{
                    formatMoney(
                      skyride.profile.earningsToday ?? 0,
                      skyride.profile.currency,
                    )
                  }}</strong>
                  <span>{{ phone.t('Apps.skyride.driver.today') }}</span>
                </k-card>
                <k-card :content-wrap="false">
                  <Star :size="19" />
                  <strong>{{
                    skyride.profile.rating.toLocaleString(phone.lang)
                  }}</strong>
                  <span>{{ phone.t('Apps.skyride.rating') }}</span>
                </k-card>
              </div>
              <k-block-title class="skyride-custom-block-title">{{
                phone.t('Apps.skyride.driver.requests')
              }}</k-block-title>
              <div
                v-if="skyride.driverOnline && skyride.availableRequests.length"
                class="skyride-request-list"
              >
                <k-card
                  v-for="request in skyride.availableRequests"
                  :key="request.id"
                  class="skyride-request-card"
                >
                  <div class="skyride-request-card__top">
                    <span class="skyride-service-icon"
                      ><CarFront :size="20"
                    /></span>
                    <div>
                      <strong>{{
                        phone.t(
                          `Apps.skyride.services.${request.serviceClass}.name`,
                        )
                      }}</strong>
                      <span>{{ formatDate(request.createdAt) }}</span>
                    </div>
                    <b>{{ formatMoney(request.price, request.currency) }}</b>
                  </div>
                  <div class="skyride-request-route">
                    <span>{{ locationLabel(request.pickup) }}</span>
                    <ChevronRight :size="15" />
                    <span>{{ locationLabel(request.destination) }}</span>
                  </div>
                  <k-button
                    rounded
                    :disabled="skyride.isActionPending"
                    @click="acceptRide(request)"
                  >
                    {{ phone.t('Apps.skyride.driver.accept') }}
                  </k-button>
                </k-card>
              </div>
              <k-card v-else :content-wrap="false" class="skyride-empty-card">
                <Power v-if="!skyride.driverOnline" :size="28" />
                <Clock3 v-else :size="28" />
                <strong>{{
                  phone.t(
                    `Apps.skyride.driver.${skyride.driverOnline ? 'noRequests' : 'goOnline'}`,
                  )
                }}</strong>
                <p>
                  {{
                    phone.t(
                      `Apps.skyride.driver.${skyride.driverOnline ? 'noRequestsBody' : 'goOnlineBody'}`,
                    )
                  }}
                </p>
              </k-card>
            </template>
          </section>
        </template>

        <template v-else-if="activeTab === 'rides'">
          <section class="skyride-section-screen">
            <k-block-header
              inset
              component="header"
              class="skyride-screen-title"
            >
              <History :size="25" aria-hidden="true" />
              <div>
                <h1>{{ phone.t('Apps.skyride.rides') }}</h1>
                <p>{{ phone.t('Apps.skyride.ridesBody') }}</p>
              </div>
            </k-block-header>
            <k-block v-if="skyride.history.length" class="skyride-history-list">
              <k-card
                v-for="ride in skyride.history"
                :key="ride.id"
                outline
                header-divider
                footer-divider
                content-wrap-padding="px-4 py-2"
                class="skyride-history-card"
              >
                <template #header>
                  <div class="skyride-history-card__header">
                    <span class="skyride-service-icon"
                      ><CarFront :size="19"
                    /></span>
                    <div>
                      <strong>{{
                        phone.t(
                          `Apps.skyride.services.${ride.serviceClass}.name`,
                        )
                      }}</strong
                      ><span>{{ formatDate(ride.createdAt) }}</span>
                    </div>
                    <k-badge>{{ statusLabel(ride.status) }}</k-badge>
                  </div>
                </template>
                <div class="skyride-history-route">
                  <span>{{ locationLabel(ride.pickup) }}</span
                  ><ChevronRight :size="15" /><span>{{
                    locationLabel(ride.destination)
                  }}</span>
                </div>
                <template #footer>
                  <div class="skyride-history-card__footer">
                    <span>{{
                      ride.driver?.name ??
                      ride.passenger?.name ??
                      phone.t('Apps.skyride.ride')
                    }}</span
                    ><strong>{{
                      formatMoney(ride.finalPrice ?? ride.price, ride.currency)
                    }}</strong>
                  </div>
                </template>
              </k-card>
            </k-block>
            <k-card
              v-else
              outline
              :content-wrap="false"
              class="skyride-empty-card"
              ><History :size="29" /><strong>{{
                phone.t('Apps.skyride.noRides')
              }}</strong>
              <p>{{ phone.t('Apps.skyride.noRidesBody') }}</p></k-card
            >
          </section>
        </template>

        <template v-else-if="activeTab === 'activity'">
          <section class="skyride-section-screen">
            <k-block-header
              inset
              component="header"
              class="skyride-screen-title"
            >
              <Bell :size="25" />
              <div>
                <h1>{{ phone.t('Apps.skyride.activity') }}</h1>
                <p>{{ phone.t('Apps.skyride.activityBody') }}</p>
              </div>
            </k-block-header>
            <k-list
              v-if="skyride.history.length"
              inset
              strong
              class="skyride-activity-list"
            >
              <k-list-item
                v-for="ride in skyride.history"
                :key="ride.id"
                :title="statusLabel(ride.status)"
                :subtitle="`${locationLabel(ride.destination)} · ${formatDate(ride.updatedAt)}`"
                :after="
                  formatMoney(ride.finalPrice ?? ride.price, ride.currency)
                "
              >
                <template #media
                  ><span class="skyride-activity-icon"
                    ><CheckCircle2 :size="18" /></span
                ></template>
              </k-list-item>
            </k-list>
            <k-card
              v-else
              outline
              :content-wrap="false"
              class="skyride-empty-card"
              ><Bell :size="29" /><strong>{{
                phone.t('Apps.skyride.noActivity')
              }}</strong>
              <p>{{ phone.t('Apps.skyride.noActivityBody') }}</p></k-card
            >
          </section>
        </template>

        <template v-else-if="activeTab === 'messages'">
          <section class="skyride-section-screen">
            <k-block-header
              inset
              component="header"
              class="skyride-screen-title"
            >
              <MessageCircle :size="25" />
              <div>
                <h1>{{ phone.t('Apps.skyride.messages') }}</h1>
                <p>{{ phone.t('Apps.skyride.messagesBody') }}</p>
              </div>
            </k-block-header>
            <k-card
              v-if="activeContact"
              :content-wrap="false"
              class="skyride-message-contact"
            >
              <div class="skyride-avatar">
                <img
                  v-if="activeContact.avatarUrl"
                  :src="activeContact.avatarUrl"
                  alt=""
                /><UserRound v-else :size="22" />
              </div>
              <div>
                <strong>{{ activeContact.name }}</strong
                ><span
                  ><Star :size="13" fill="currentColor" />
                  {{ activeContact.rating.toLocaleString(phone.lang) }}</span
                >
              </div>
              <ChevronRight :size="18" />
            </k-card>
            <k-block v-if="activeContact" class="skyride-contact-buttons">
              <k-button
                rounded
                outline
                :disabled="!activeContact.phoneNumber"
                @click="callActiveContact"
                ><Phone :size="17" />
                {{ phone.t('Apps.skyride.call') }}</k-button
              >
              <k-button rounded @click="openMessages"
                ><MessageCircle :size="17" />
                {{ phone.t('Apps.skyride.openMessages') }}</k-button
              >
            </k-block>
            <k-card
              v-else
              outline
              :content-wrap="false"
              class="skyride-empty-card"
              ><MessageCircle :size="29" /><strong>{{
                phone.t('Apps.skyride.noMessages')
              }}</strong>
              <p>{{ phone.t('Apps.skyride.noMessagesBody') }}</p>
              <k-button rounded @click="openMessages">{{
                phone.t('Apps.skyride.openMessages')
              }}</k-button></k-card
            >
          </section>
        </template>

        <template v-else>
          <section class="skyride-section-screen skyride-profile">
            <div class="skyride-profile-hero">
              <div class="skyride-profile-avatar">
                <img
                  v-if="skyride.profile.avatarUrl"
                  :src="skyride.profile.avatarUrl"
                  alt=""
                /><UserRound v-else :size="32" />
              </div>
              <h1>{{ skyride.profile.name }}</h1>
              <span
                ><Star :size="15" fill="currentColor" />
                {{ skyride.profile.rating.toLocaleString(phone.lang) }}</span
              >
            </div>
            <k-card outline :content-wrap="false" class="skyride-profile-stats">
              <div>
                <strong>{{
                  skyride.profile.completedRides.toLocaleString(phone.lang)
                }}</strong
                ><span>{{ phone.t('Apps.skyride.completedRides') }}</span>
              </div>
              <div>
                <strong>{{
                  skyride.profile.cancelledRides.toLocaleString(phone.lang)
                }}</strong
                ><span>{{ phone.t('Apps.skyride.cancelledRides') }}</span>
              </div>
              <div>
                <strong>{{
                  skyride.profile.acceptanceRate === null
                    ? phone.t('Apps.skyride.notAvailable')
                    : `${skyride.profile.acceptanceRate}%`
                }}</strong
                ><span>{{ phone.t('Apps.skyride.acceptance') }}</span>
              </div>
            </k-card>
            <k-block-title>{{ phone.t('Apps.skyride.account') }}</k-block-title>
            <k-list inset strong>
              <k-list-item
                :title="phone.t('Apps.skyride.paymentMethod')"
                :after="
                  paymentMethodLabel(skyride.profile.defaultPaymentMethod)
                "
                ><template #media><CircleDollarSign :size="18" /></template
              ></k-list-item>
              <k-list-item
                :title="phone.t('Apps.skyride.safety')"
                :subtitle="phone.t('Apps.skyride.safetyBody')"
                ><template #media><ShieldCheck :size="18" /></template
              ></k-list-item>
              <k-list-item
                v-if="skyride.driverEligible"
                :title="phone.t('Apps.skyride.driverMode')"
                :subtitle="phone.t('Apps.skyride.driverModeBody')"
                ><template #media><CarFront :size="18" /></template
                ><template #after
                  ><k-toggle
                    :checked="mode === 'driver'"
                    :disabled="Boolean(skyride.activeRide)"
                    :aria-label="phone.t('Apps.skyride.driverMode')"
                    @change="
                      mode = mode === 'driver' ? 'rider' : 'driver'
                    " /></template
              ></k-list-item>
            </k-list>
            <k-block class="skyride-member-note"
              ><Sparkles :size="17" /><span>{{
                phone.t('Apps.skyride.memberSince', {
                  date: formatDate(skyride.profile.memberSince),
                })
              }}</span></k-block
            >
          </section>
        </template>
      </div>

      <k-tabbar
        component="nav"
        icons
        labels
        inner-class="skyride-tabbar__inner"
        class="bottom-0 left-0 fixed skyride-tabbar"
        :aria-label="phone.t('Apps.skyride.navigation')"
      >
        <k-toolbar-pane class="skyride-tab-pane">
          <k-tabbar-link
            v-for="tab in tabs"
            :key="tab.id"
            component="button"
            :active="activeTab === tab.id"
            :link-props="{ type: 'button' }"
            @click="selectTab(tab.id)"
          >
            <template #label>{{
              phone.t(`Apps.skyride.tabs.${tab.id}`)
            }}</template>
            <template #icon
              ><k-icon><component :is="tab.icon" class="w-6 h-6" /></k-icon
            ></template>
          </k-tabbar-link>
        </k-toolbar-pane>
      </k-tabbar>
    </template>

    <k-sheet
      :opened="Boolean(locationTarget)"
      @backdropclick="locationTarget = null"
    >
      <section
        v-if="locationTarget"
        class="skyride-sheet__content"
        role="dialog"
        aria-modal="true"
        :aria-label="phone.t(`Apps.skyride.chooseLocation.${locationTarget}`)"
      >
        <div class="skyride-sheet__handle" aria-hidden="true"></div>
        <div class="skyride-sheet__title">
          <div>
            <span>{{ phone.t('Apps.skyride.location') }}</span>
            <h2>
              {{ phone.t(`Apps.skyride.chooseLocation.${locationTarget}`) }}
            </h2>
          </div>
          <k-link
            component="button"
            :link-props="{ type: 'button' }"
            :aria-label="phone.t('Common.close')"
            @click="locationTarget = null"
            ><X :size="20"
          /></k-link>
        </div>
        <k-list inset strong>
          <k-list-item
            link
            :title="phone.t('Apps.skyride.currentLocation')"
            :subtitle="phone.t('Apps.skyride.useGps')"
            @click="useCurrentLocation"
            ><template #media><Crosshair :size="19" /></template
          ></k-list-item>
          <k-list-item
            link
            :title="phone.t('Apps.skyride.chooseOnMap')"
            :subtitle="phone.t('Apps.skyride.chooseOnMapBody')"
            @click="beginMapPick"
            ><template #media><MapPin :size="19" /></template
          ></k-list-item>
        </k-list>
        <k-block-title>{{ phone.t('Apps.skyride.savedPlaces') }}</k-block-title>
        <k-list inset strong>
          <k-list-item
            v-for="location in skyride.quickLocations"
            :key="location.id ?? location.label"
            link
            :title="locationLabel(location)"
            @click="chooseLocation(location)"
            ><template #media
              ><component
                :is="location.id === 'work' ? BriefcaseBusiness : MapPin"
                :size="18" /></template
          ></k-list-item>
        </k-list>
      </section>
    </k-sheet>

    <k-sheet :opened="Boolean(ratingRide)" @backdropclick="dismissRating">
      <section
        v-if="ratingRide"
        class="skyride-sheet__content skyride-rating"
        role="dialog"
        aria-modal="true"
        :aria-label="phone.t('Apps.skyride.rateRide')"
      >
        <div class="skyride-sheet__handle" aria-hidden="true"></div>
        <div class="skyride-rating__success"><CheckCircle2 :size="30" /></div>
        <h2>{{ phone.t('Apps.skyride.rideComplete') }}</h2>
        <p>{{ phone.t('Apps.skyride.rateRideBody') }}</p>
        <div
          class="skyride-rating-stars"
          :aria-label="phone.t('Apps.skyride.rating')"
        >
          <k-button
            v-for="value in 5"
            :key="value"
            small
            rounded
            clear
            class="skyride-rating-star"
            :class="{ 'is-active': value <= rating }"
            :aria-pressed="value <= rating"
            :aria-label="
              phone.t('Apps.skyride.ratingValue', { rating: value.toString() })
            "
            @click="rating = value"
          >
            <Star :size="28" fill="currentColor" />
          </k-button>
        </div>
        <span class="skyride-rating-label">{{
          phone.t('Apps.skyride.tip')
        }}</span>
        <div class="skyride-tip-options">
          <k-button
            v-for="value in [0, 5, 10, 20]"
            :key="value"
            small
            rounded
            :outline="tip !== value"
            @click="tip = value"
            >{{
              value === 0
                ? phone.t('Apps.skyride.noTip')
                : formatMoney(value, ratingRide.currency)
            }}</k-button
          >
        </div>
        <k-list inset strong
          ><k-list-input
            input-id="skyride-rating-comment"
            outline
            :label="phone.t('Apps.skyride.comment')"
            :placeholder="phone.t('Apps.skyride.commentPlaceholder')"
            :value="ratingComment"
            maxlength="180"
            @input="updateRatingComment"
        /></k-list>
        <k-button
          large
          rounded
          :disabled="rating < 1 || skyride.isActionPending"
          @click="submitRating"
          ><k-preloader v-if="skyride.isActionPending" /><template v-else>{{
            phone.t('Apps.skyride.submitRating')
          }}</template></k-button
        >
        <k-link
          component="button"
          :link-props="{ type: 'button' }"
          @click="dismissRating"
          >{{ phone.t('Apps.skyride.notNow') }}</k-link
        >
      </section>
    </k-sheet>

    <k-dialog
      :opened="cancelDialogOpened"
      @backdropclick="cancelDialogOpened = false"
    >
      <div class="skyride-dialog">
        <h2>{{ phone.t('Apps.skyride.cancelTitle') }}</h2>
        <p>{{ phone.t('Apps.skyride.cancelBody') }}</p>
      </div>
      <template #buttons
        ><k-dialog-button @click="cancelDialogOpened = false">{{
          phone.t('Common.cancel')
        }}</k-dialog-button
        ><k-dialog-button strong @click="confirmCancel">{{
          phone.t('Apps.skyride.cancelRide')
        }}</k-dialog-button></template
      >
    </k-dialog>

    <k-toast :opened="Boolean(toastText)" position="center">{{
      toastText
    }}</k-toast>
  </k-page>
</template>

<style scoped>
.skyride-app {
  --ride-accent: #f5c518;
  --ride-accent-strong: #725600;
  --ride-bg: #f4f4f7;
  --ride-card: rgba(255, 255, 255, 0.88);
  --ride-card-strong: #fff;
  --ride-border: rgba(26, 26, 28, 0.09);
  --ride-text: #171719;
  --ride-muted: #707078;
  --ride-map: #07131f;
  position: relative;
  height: 100%;
  overflow: hidden;
  color: var(--ride-text);
  background: var(--ride-bg);
}

.skyride-app--dark {
  --ride-accent-strong: #f5c518;
  --ride-bg: #08090b;
  --ride-card: rgba(29, 30, 33, 0.9);
  --ride-card-strong: #1c1d20;
  --ride-border: rgba(255, 255, 255, 0.09);
  --ride-text: #f7f7f8;
  --ride-muted: #a2a2aa;
  --ride-map: #050a10;
}

.skyride-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(
      circle at 82% 10%,
      rgba(245, 197, 24, 0.16),
      transparent 28%
    ),
    linear-gradient(180deg, rgba(245, 197, 24, 0.04), transparent 32%);
}

.skyride-navbar {
  --k-safe-area-top: 56px;
  z-index: 22;
  position: relative;
  color: var(--ride-text);
}

.skyride-mode {
  z-index: 21;
  position: relative;
  min-height: 9px;
  padding: 4px 16px 7px;
}

.skyride-mode > :deep(*) {
  width: 100%;
}

.skyride-scroll {
  position: absolute;
  z-index: 2;
  inset: 148px 0 72px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.skyride-scroll::-webkit-scrollbar {
  display: none;
}

.skyride-loading,
.skyride-unavailable {
  position: absolute;
  z-index: 4;
  inset: 92px 24px 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  text-align: center;
}

.skyride-unavailable {
  padding: 24px;
  border: 1px solid var(--ride-border);
  border-radius: 22px;
  background: var(--ride-card);
}

.skyride-loading span,
.skyride-unavailable p {
  color: var(--ride-muted);
}

.skyride-unavailable strong {
  font-size: 20px;
}

.skyride-unavailable p {
  margin: 0;
  font-size: 13px;
}

.skyride-map {
  position: relative;
  height: 238px;
  overflow: hidden;
  background: var(--ride-map);
  border-block: 1px solid var(--ride-border);
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.skyride-map.is-picking {
  cursor: crosshair;
}

.skyride-map.is-dragging {
  cursor: grabbing;
}

.skyride-map__stage {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 50%;
  width: max(120%, 120vh);
  height: auto;
  transform-origin: 50% 50%;
  will-change: transform;
}

.skyride-map__canvas {
  position: absolute;
  inset: 0;
  filter: saturate(0.72) brightness(0.58) contrast(1.14);
  opacity: 1;
}

.skyride-app--dark .skyride-map__canvas {
  filter: saturate(0.68) brightness(0.42) contrast(1.22);
  opacity: 1;
}

.skyride-map__canvas img {
  position: absolute;
  object-fit: fill;
  image-rendering: auto;
  backface-visibility: hidden;
  user-select: none;
  pointer-events: none;
}

.skyride-route-line {
  position: absolute;
  z-index: 3;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.skyride-route-line line {
  stroke: var(--ride-accent);
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-dasharray: 3 2;
  vector-effect: non-scaling-stroke;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
}

.skyride-map-marker {
  position: absolute;
  z-index: 5;
  transform: translate(-50%, -50%) scale(var(--map-marker-scale, 1));
  transform-origin: 50% 50%;
  color: #121212;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.35));
}

.skyride-map-marker.is-pickup > span {
  display: block;
  width: 15px;
  height: 15px;
  border: 4px solid #fff;
  border-radius: 50%;
  background: #151515;
  box-shadow: 0 0 0 3px rgba(21, 21, 21, 0.28);
}

.skyride-map-marker.is-destination,
.skyride-map-marker.is-draft {
  color: var(--ride-accent-strong);
  transform: translate(-50%, -85%) scale(var(--map-marker-scale, 1));
  transform-origin: 50% 85%;
}

.skyride-map-marker.is-draft {
  color: #0a84ff;
}

.skyride-map-controls {
  position: absolute;
  z-index: 8;
  right: 14px;
  bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.skyride-map-control {
  display: grid;
  width: 38px;
  height: 38px;
  min-height: 38px;
  padding: 0;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 50%;
  color: var(--ride-text);
  background: var(--ride-card);
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.skyride-map-control:active {
  transform: scale(0.94);
  background: var(--ride-card-strong);
}

.skyride-map-control :deep(.size-6) {
  width: 18px;
  height: 18px;
}

.skyride-map-picker {
  position: absolute;
  z-index: 9;
  left: 14px;
  right: 14px;
  bottom: 12px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2px 12px;
  align-items: center;
  padding: 11px 12px;
  border: 1px solid var(--ride-border);
  border-radius: 18px;
  background: var(--ride-card);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.skyride-map-picker strong {
  font-size: 13px;
}

.skyride-map-picker > span {
  grid-column: 1;
  color: var(--ride-muted);
  font-size: 11px;
}

.skyride-map-picker > div {
  grid-area: 1 / 2 / span 2 / 3;
  display: flex;
  gap: 6px;
}

.skyride-home-panel,
.skyride-section-screen {
  position: relative;
  z-index: 4;
  padding: 18px 14px 24px;
}

.skyride-home-panel {
  min-height: 320px;
  margin-top: -16px;
  border-radius: 24px 24px 0 0;
  background: var(--ride-bg);
}

.skyride-heading,
.skyride-screen-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  padding: 0 4px 12px;
}

.skyride-heading span,
.skyride-screen-title p,
.skyride-ride-status-card p {
  margin: 0;
  color: var(--ride-muted);
  font-size: 12px;
}

.skyride-heading h1,
.skyride-ride-status-card h1,
.skyride-screen-title h1 {
  margin: 2px 0 0;
  font-size: 23px;
  line-height: 1.08;
  letter-spacing: -0.5px;
}

.skyride-heading__icon,
.skyride-status-icon {
  display: grid;
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 15px;
  color: #111;
  background: var(--ride-accent);
  box-shadow: none;
}

.skyride-status-icon.is-searching {
  color: var(--ride-accent-strong);
  background: rgba(245, 197, 24, 0.14);
  box-shadow: none;
}

.skyride-location-list,
.skyride-service-list,
.skyride-activity-list,
.skyride-sheet__content :deep(.k-list),
.skyride-profile :deep(.k-list) {
  margin-block: 0 14px;
}

.skyride-location-list :deep(li),
.skyride-service-list :deep(li),
.skyride-activity-list :deep(li),
.skyride-profile :deep(li),
.skyride-sheet__content :deep(li) {
  background: var(--ride-card-strong);
}

.skyride-dot {
  display: block;
  width: 11px;
  height: 11px;
  border: 3px solid var(--ride-accent);
  border-radius: 50%;
  background: #171719;
}

.skyride-quick-grid,
.skyride-driver-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin: 0 2px 16px;
  padding: 0;
}

.skyride-custom-block-title {
  margin: 18px 4px 10px !important;
  padding: 0 !important;
}

.skyride-quick-card,
.skyride-driver-metrics :deep(.k-card),
.skyride-person-card,
.skyride-trip-card,
.skyride-driver-status,
.skyride-request-card,
.skyride-history-card,
.skyride-message-contact,
.skyride-empty-card,
.skyride-fare-card,
.skyride-ride-status-card {
  margin: 0;
  border: 1px solid var(--ride-border);
  color: var(--ride-text);
  background: var(--ride-card);
  box-shadow: 0 7px 23px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.skyride-ride-status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 15px;
  background:
    linear-gradient(135deg, rgba(245, 197, 24, 0.12), transparent 58%),
    var(--ride-card);
}

.skyride-ride-status-card > div {
  min-width: 0;
}

.skyride-ride-status-card small {
  color: var(--ride-accent-strong);
  font-size: 9px;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: 0.9px;
}

.skyride-ride-status-card h1 {
  margin: 2px 0;
  font-size: 20px;
  line-height: 1.05;
}

.skyride-ride-status-card p {
  line-height: 1.3;
}

.skyride-quick-card {
  display: flex;
  width: 100%;
  min-height: 68px;
  align-items: center;
  justify-content: flex-start;
  gap: 9px;
  padding: 12px;
  color: inherit;
  text-align: left;
}

.skyride-quick-card svg,
.skyride-driver-metrics svg {
  color: var(--ride-accent-strong);
}

.skyride-quick-card span {
  display: -webkit-box;
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.18;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.skyride-primary {
  width: calc(100% - 4px);
  margin: 4px 2px 0;
}

.skyride-primary :deep(svg) {
  margin-left: 4px;
}

.skyride-quote-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 5px 12px;
  color: var(--ride-muted);
  font-size: 12px;
}

.skyride-quote-chip {
  min-width: 0;
  padding-inline: 8px;
  color: var(--ride-muted);
  font-size: 10px;
}

.skyride-quote-summary :deep(button) {
  margin-left: auto;
}

.skyride-service-list :deep(li.is-selected) {
  box-shadow: inset 3px 0 var(--ride-accent);
}

.skyride-service-list :deep(li.is-unavailable) {
  cursor: default;
  opacity: 0.45;
}

.skyride-service-list :deep(.k-list-item-after) {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ride-text);
}

.skyride-fare-card {
  margin: 0 0 13px;
  padding: 14px;
}

.skyride-fare-card__heading {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  margin-bottom: 11px;
}

.skyride-fare-card__icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 12px;
  color: #151515;
  background: var(--ride-accent);
}

.skyride-fare-card__heading > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.skyride-fare-card__heading small,
.skyride-fare-card__heading > span:last-child,
.skyride-fare-breakdown span {
  color: var(--ride-muted);
  font-size: 10px;
}

.skyride-fare-card__heading strong {
  font-size: 17px;
}

.skyride-fare-card__heading > span:last-child {
  max-width: 96px;
  text-align: right;
}

.skyride-fare-card > :deep(.k-segmented) {
  width: 100%;
}

.skyride-fare-breakdown {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 11px;
  padding: 10px 11px;
  border-radius: 12px;
  background: var(--ride-border);
}

.skyride-custom-fare {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.skyride-custom-fare :deep(.k-list) {
  margin: 0;
}

.skyride-custom-fare > :deep(button) {
  width: 100%;
}

.skyride-service-icon,
.skyride-activity-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 12px;
  color: #151515;
  background: var(--ride-accent);
}

.skyride-person-card,
.skyride-message-contact {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 16px;
}

.skyride-avatar,
.skyride-profile-avatar {
  display: grid;
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  place-items: center;
  overflow: hidden;
  border: 2px solid var(--ride-accent);
  border-radius: 50%;
  color: var(--ride-muted);
  background: var(--ride-bg);
}

.skyride-avatar img,
.skyride-profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.skyride-person-card__body,
.skyride-message-contact > div:nth-child(2) {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.skyride-person-card__body > span,
.skyride-message-contact > div:nth-child(2) span {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--ride-muted);
  font-size: 12px;
}

.skyride-person-card__body b {
  width: fit-content;
  margin-top: 2px;
  padding: 2px 6px;
  border-radius: 5px;
  color: var(--ride-text);
  background: var(--ride-border);
  font-size: 10px;
  letter-spacing: 0.8px;
}

.skyride-contact-actions,
.skyride-active-actions,
.skyride-driver-actions,
.skyride-contact-buttons {
  display: flex;
  gap: 8px;
}

.skyride-contact-actions {
  flex: 0 0 auto;
  margin-left: auto;
}

.skyride-contact-actions :deep(button) {
  width: 36px;
  min-width: 36px;
  flex: 0 0 36px;
  padding-inline: 0;
}

.skyride-trip-card {
  margin-bottom: 12px;
  padding: 16px;
}

.skyride-route-stop {
  display: flex;
  align-items: center;
  gap: 11px;
}

.skyride-route-stop > svg {
  flex: 0 0 18px;
  color: var(--ride-accent-strong);
}

.skyride-route-stop > div {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}

.skyride-route-stop small,
.skyride-person-card small {
  color: var(--ride-muted);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.skyride-route-stop strong {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skyride-trip-card > i {
  display: block;
  width: 1px;
  height: 17px;
  margin: 1px 0 1px 5px;
  border-left: 1px dashed var(--ride-muted);
}

.skyride-trip-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 13px;
  padding-top: 11px;
  border-top: 1px solid var(--ride-border);
  color: var(--ride-muted);
  font-size: 12px;
}

.skyride-trip-meta strong {
  color: var(--ride-text);
  font-size: 14px;
}

.skyride-active-actions > *,
.skyride-driver-actions > *,
.skyride-contact-buttons > * {
  flex: 1;
}

.skyride-active-actions :deep(button),
.skyride-driver-actions :deep(button),
.skyride-contact-buttons :deep(button) {
  gap: 6px;
}

.skyride-safety-note,
.skyride-member-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 2px 0;
  color: var(--ride-muted);
  font-size: 11px;
  line-height: 1.35;
}

.skyride-safety-note svg,
.skyride-member-note svg {
  flex: 0 0 auto;
  color: var(--ride-accent-strong);
}

.skyride-driver-status {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 11px;
  margin-bottom: 14px;
  padding: 16px;
}

.skyride-driver-status__icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 14px;
  color: var(--ride-muted);
  background: var(--ride-border);
}

.skyride-driver-status__icon.is-online {
  color: #151515;
  background: var(--ride-accent);
}

.skyride-driver-status > div:nth-child(2) {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.skyride-driver-status span,
.skyride-driver-metrics span,
.skyride-request-card span,
.skyride-history-card span {
  color: var(--ride-muted);
  font-size: 11px;
}

.skyride-driver-metrics :deep(.k-card) {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 16px;
}

.skyride-driver-metrics strong {
  margin-top: 3px;
  font-size: 19px;
}

.skyride-request-list,
.skyride-history-list {
  display: grid;
  gap: 10px;
}

.skyride-history-list {
  margin: 0;
  padding: 0;
}

.skyride-request-card__top,
.skyride-history-card__header {
  display: flex;
  align-items: center;
  gap: 9px;
}

.skyride-request-card__top > div,
.skyride-history-card__header > div {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.skyride-request-route,
.skyride-history-route {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  margin: 12px 0;
  padding: 9px;
  border-radius: 11px;
  background: var(--ride-border);
}

.skyride-request-route span,
.skyride-history-route span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skyride-request-route span:last-child,
.skyride-history-route span:last-child {
  text-align: right;
}

.skyride-empty-card {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 7px;
  padding: 27px 16px;
  text-align: center;
}

.skyride-empty-card svg {
  color: var(--ride-accent-strong);
}

.skyride-empty-card p {
  max-width: 250px;
  margin: 0;
  color: var(--ride-muted);
  font-size: 12px;
  line-height: 1.45;
}

.skyride-screen-title {
  justify-content: flex-start;
  margin: 0 0 8px;
}

.skyride-screen-title > svg {
  color: var(--ride-accent-strong);
}

.skyride-history-card__footer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.skyride-message-contact > svg {
  color: var(--ride-muted);
}

.skyride-contact-buttons {
  margin: 10px 0 0;
  padding: 0;
}

.skyride-profile-hero {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 8px 0 18px;
}

.skyride-profile-avatar {
  width: 78px;
  height: 78px;
  border-width: 3px;
  box-shadow: 0 0 0 5px rgba(245, 197, 24, 0.13);
}

.skyride-profile-hero h1 {
  margin: 12px 0 3px;
  font-size: 22px;
}

.skyride-profile-hero > span {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--ride-accent-strong);
  font-weight: 700;
}

.skyride-profile-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-bottom: 17px;
  padding: 13px 4px;
  border: 1px solid var(--ride-border);
  border-radius: 17px;
  background: var(--ride-card);
  box-shadow: 0 7px 23px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.skyride-profile-stats > div {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-direction: column;
  gap: 2px;
  padding-inline: 4px;
  text-align: center;
}

.skyride-profile-stats > div + div {
  border-left: 1px solid var(--ride-border);
}

.skyride-profile-stats strong {
  font-size: 16px;
}

.skyride-profile-stats span {
  color: var(--ride-muted);
  font-size: 9px;
  line-height: 1.15;
}

.skyride-tabbar {
  z-index: 25;
  color: var(--ride-text);
  border-top: 1px solid var(--ride-border);
  background: var(--ride-card);
  backdrop-filter: blur(26px);
  -webkit-backdrop-filter: blur(26px);
}

.skyride-tabbar :deep(.k-tabbar-link-label) {
  font-size: 9px;
  line-height: 1.1;
}

.skyride-tabbar :deep(.skyride-tabbar__inner) {
  width: 100% !important;
  max-width: none !important;
  gap: 0 !important;
}

.skyride-tab-pane {
  width: 100% !important;
  max-width: none !important;
  gap: 0 !important;
}

.skyride-tab-pane :deep(> .k-link) {
  flex: 1 1 20%;
  min-width: 0 !important;
  padding-inline: 4px !important;
  border-radius: 999px;
  outline: none;
}

.skyride-sheet__content {
  max-height: 74vh;
  overflow-y: auto;
  padding: 8px 14px calc(24px + env(safe-area-inset-bottom));
  color: var(--ride-text);
  background: var(--ride-bg);
  border-radius: 26px 26px 0 0;
}

.skyride-sheet__handle {
  width: 38px;
  height: 5px;
  margin: 0 auto 14px;
  border-radius: 9px;
  background: var(--ride-muted);
  opacity: 0.65;
}

.skyride-sheet__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 4px 13px;
}

.skyride-sheet__title span,
.skyride-rating-label {
  color: var(--ride-muted);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.skyride-sheet__title h2,
.skyride-rating h2 {
  margin: 2px 0 0;
  font-size: 21px;
}

.skyride-rating {
  display: flex;
  align-items: center;
  flex-direction: column;
  text-align: center;
}

.skyride-rating__success {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  border-radius: 20px;
  color: #151515;
  background: var(--ride-accent);
}

.skyride-rating p {
  max-width: 270px;
  margin: 4px 0 12px;
  color: var(--ride-muted);
  font-size: 12px;
}

.skyride-rating-stars {
  display: flex;
  gap: 5px;
  margin-bottom: 17px;
}

.skyride-rating-star {
  width: 34px;
  min-width: 34px;
  height: 34px;
  padding: 2px;
  color: var(--ride-border);
}

.skyride-rating-star.is-active {
  color: var(--ride-accent);
}

.skyride-tip-options {
  display: flex;
  gap: 6px;
  margin: 8px 0 12px;
}

.skyride-rating :deep(.k-list) {
  width: 100%;
}

.skyride-rating > :deep(button) {
  width: 100%;
}

.skyride-rating > :deep(a),
.skyride-rating > :deep(.k-link) {
  margin-top: 11px;
}

.skyride-dialog {
  padding: 20px 20px 8px;
  color: var(--ride-text);
  text-align: center;
}

.skyride-dialog h2 {
  margin: 0 0 7px;
  font-size: 18px;
}

.skyride-dialog p {
  margin: 0;
  color: var(--ride-muted);
  font-size: 13px;
  line-height: 1.4;
}

.skyride-app :deep(.bg-primary) {
  color: #141414;
  background-color: var(--ride-accent);
}

.skyride-app :deep(.text-primary) {
  color: var(--ride-accent-strong);
}

.skyride-app--dark :deep(.text-primary) {
  color: var(--ride-accent);
}

@media (max-height: 730px) {
  .skyride-map {
    height: 198px;
  }

  .skyride-home-panel,
  .skyride-section-screen {
    padding-top: 14px;
  }
}
</style>
