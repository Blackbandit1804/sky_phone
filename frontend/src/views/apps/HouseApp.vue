<script setup lang="ts">
import {
  kButton,
  kCard,
  kDialog,
  kDialogButton,
  kGlass,
  kLink,
  kList,
  kListItem,
  kNavbar,
  kPage,
  kPreloader,
  kSheet,
  kToast,
} from 'konsta/vue'
import {
  Camera,
  CarFront,
  Check,
  ChevronRight,
  House,
  KeyRound,
  LocateFixed,
  Lock,
  LockOpen,
  Plus,
  Router,
  UserRound,
  UsersRound,
  WifiOff,
  X,
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useHousingStore } from '@/stores/housing'
import { usePhoneStore } from '@/stores/phone'
import type {
  HousingKey,
  HousingKeyCandidate,
  HousingProperty,
} from '@/types/housing'

const phone = usePhoneStore()
const housing = useHousingStore()
const selectedPropertyId = ref<string | null>(null)
const candidatesOpened = ref(false)
const revokeCandidate = ref<HousingKey | null>(null)
const toastOpened = ref(false)
const toastText = ref('')
const houseScroll = ref<HTMLElement | null>(null)
const isRefreshing = ref(false)
const pullDistance = ref(0)

const pullThreshold = 56
let pullStartY = 0
let isPulling = false
let wheelRefreshTimeout: ReturnType<typeof setTimeout> | undefined

const properties = computed(() => housing.overview?.properties ?? [])
const ownedCount = computed(
  () =>
    properties.value.filter((property) => property.access === 'owner').length,
)
const sharedCount = computed(() => properties.value.length - ownedCount.value)
const selectedProperty = computed(
  () =>
    properties.value.find(
      (property) => property.id === selectedPropertyId.value,
    ) ?? null,
)

function translatedError(error: string): string {
  const key = `Apps.house.errors.${error}`
  const translated = phone.t(key)
  return translated === key ? phone.t('Apps.house.errors.default') : translated
}

function showToast(message: string): void {
  toastText.value = message
  toastOpened.value = true
  window.setTimeout(() => {
    toastOpened.value = false
  }, 2400)
}

function isPending(action: string, property: HousingProperty): boolean {
  return housing.pendingAction === `${action}:${property.id}`
}

async function refresh(): Promise<void> {
  if (isRefreshing.value) return
  isRefreshing.value = true
  pullDistance.value = pullThreshold
  await housing.load()
  isRefreshing.value = false
  pullDistance.value = 0
}

function atTop(): boolean {
  return (houseScroll.value?.scrollTop ?? 0) <= 0
}

function startPull(event: TouchEvent): void {
  if (!atTop() || isRefreshing.value) return
  pullStartY = event.touches[0]?.clientY ?? 0
  isPulling = true
}

function movePull(event: TouchEvent): void {
  if (!isPulling || isRefreshing.value) return
  const distance = (event.touches[0]?.clientY ?? pullStartY) - pullStartY
  if (distance <= 0) {
    pullDistance.value = 0
    return
  }
  pullDistance.value = Math.min(pullThreshold + 20, distance * 0.45)
}

function finishPull(): void {
  if (!isPulling && pullDistance.value === 0) return
  isPulling = false
  if (pullDistance.value >= pullThreshold) {
    void refresh()
    return
  }
  pullDistance.value = 0
}

function pullWithWheel(event: WheelEvent): void {
  if (!atTop() || isRefreshing.value || event.deltaY >= 0) return
  pullDistance.value = Math.min(
    pullThreshold + 20,
    pullDistance.value + Math.abs(event.deltaY) * 0.18,
  )
  if (wheelRefreshTimeout) clearTimeout(wheelRefreshTimeout)
  wheelRefreshTimeout = setTimeout(finishPull, 130)
}

async function runCommand(
  action: 'open_cctv' | 'set_waypoint' | 'toggle_lock',
  property: HousingProperty,
): Promise<void> {
  if (!(await housing.command(action, property.id))) {
    showToast(translatedError(housing.error))
    return
  }
  const successKeys = {
    open_cctv: 'cameraStarting',
    set_waypoint: 'waypointSuccess',
    toggle_lock: 'lockSuccess',
  } as const
  showToast(phone.t(`Apps.house.${successKeys[action]}`))
}

async function openKeyCandidates(property: HousingProperty): Promise<void> {
  candidatesOpened.value = true
  if (!(await housing.loadKeyCandidates(property.id))) {
    showToast(translatedError(housing.error))
  }
}

async function grantKey(candidate: HousingKeyCandidate): Promise<void> {
  const property = selectedProperty.value
  if (!property) return
  if (
    !(await housing.command('grant_key', property.id, { target: candidate.id }))
  ) {
    showToast(translatedError(housing.error))
    return
  }
  candidatesOpened.value = false
  showToast(phone.t('Apps.house.keyGranted'))
}

async function revokeKey(): Promise<void> {
  const property = selectedProperty.value
  const key = revokeCandidate.value
  if (!property || !key) return
  if (
    !(await housing.command('revoke_key', property.id, {
      identifier: key.identifier,
    }))
  ) {
    showToast(translatedError(housing.error))
    return
  }
  revokeCandidate.value = null
  showToast(phone.t('Apps.house.keyRevoked'))
}

function accessLabel(property: HousingProperty): string {
  return phone.t(
    property.access === 'owner' ? 'Apps.house.owner' : 'Apps.house.keyholder',
  )
}

onMounted(() => {
  void housing.load()
})

onBeforeUnmount(() => {
  if (wheelRefreshTimeout) clearTimeout(wheelRefreshTimeout)
})
</script>

<template>
  <k-page component="main" class="house-page !pt-[44px] !pb-[25px]">
    <k-navbar
      class="house-navbar"
      :subtitle="phone.t('Apps.house.subtitle')"
      :title="phone.t('Apps.house.name')"
    />

    <div v-if="housing.isLoading && !housing.overview" class="house-state">
      <k-preloader />
      <span>{{ phone.t('Common.loading') }}</span>
    </div>

    <div v-else-if="!housing.overview" class="house-state">
      <span class="house-state__icon"><WifiOff :size="30" /></span>
      <strong>{{ phone.t('Apps.house.unavailable') }}</strong>
      <p>{{ translatedError(housing.error) }}</p>
      <k-button rounded @click="housing.load()">
        {{ phone.t('Apps.house.tryAgain') }}
      </k-button>
    </div>

    <div v-else-if="!housing.overview.available" class="house-state">
      <span class="house-state__icon"><Router :size="31" /></span>
      <strong>{{ phone.t('Apps.house.offline') }}</strong>
      <p>{{ phone.t('Apps.house.offlineBody') }}</p>
      <k-button rounded @click="housing.load()">
        {{ phone.t('Apps.house.tryAgain') }}
      </k-button>
    </div>

    <div
      v-else
      ref="houseScroll"
      class="house-scroll"
      @touchend="finishPull"
      @touchmove.passive="movePull"
      @touchstart.passive="startPull"
      @wheel="pullWithWheel"
    >
      <div
        class="house-pull-refresh"
        :class="{ 'is-visible': pullDistance > 0 }"
        :style="{ transform: `translateY(${pullDistance - pullThreshold}px)` }"
        aria-live="polite"
      >
        <k-preloader />
      </div>
      <k-glass :highlight="false" class="house-hero">
        <div class="house-hero__title">
          <span>
            <small>{{ phone.t('Apps.house.myHomes') }}</small>
            <strong>{{ properties.length }}</strong>
          </span>
          <i><House :size="28" /></i>
        </div>
        <div class="house-summary">
          <span
            ><b>{{ ownedCount }}</b
            >{{ phone.t('Apps.house.owned') }}</span
          >
          <span
            ><b>{{ sharedCount }}</b
            >{{ phone.t('Apps.house.shared') }}</span
          >
          <span
            ><b>{{ properties.filter((property) => property.locked).length }}</b
            >{{ phone.t('Apps.house.locked') }}</span
          >
        </div>
      </k-glass>

      <section v-if="properties.length" class="house-properties">
        <h2>{{ phone.t('Apps.house.properties') }}</h2>
        <k-glass
          v-for="property in properties"
          :key="property.id"
          :highlight="false"
          component="button"
          type="button"
          class="house-property"
          :aria-label="`${phone.t('Apps.house.openDetails')}: ${property.name}`"
          @click="selectedPropertyId = property.id"
        >
          <span class="house-property__icon"><House :size="31" /></span>
          <span class="house-property__content">
            <strong>{{ property.name }}</strong>
            <small><UserRound :size="12" />{{ accessLabel(property) }}</small>
            <span class="house-property__chips">
              <i
                v-if="property.capabilities.lock"
                :class="{ 'is-locked': property.locked }"
              >
                <Lock v-if="property.locked" :size="11" />
                <LockOpen v-else :size="11" />
                {{
                  phone.t(
                    property.locked
                      ? 'Apps.house.locked'
                      : 'Apps.house.unlocked',
                  )
                }}
              </i>
              <i v-if="property.capabilities.cctv"
                ><Camera :size="11" />{{ phone.t('Apps.house.camera') }}</i
              >
              <i v-if="property.garage?.enabled"
                ><CarFront :size="11" />{{ property.garage.storedVehicles }}</i
              >
            </span>
          </span>
          <ChevronRight :size="18" />
        </k-glass>
      </section>

      <k-card v-else class="house-empty">
        <House :size="38" />
        <strong>{{ phone.t('Apps.house.empty') }}</strong>
        <p>{{ phone.t('Apps.house.emptyBody') }}</p>
      </k-card>

      <p class="house-provider">
        {{
          phone.t('Apps.house.provider', {
            system: housing.overview.provider ?? '',
          })
        }}
      </p>
    </div>

    <k-sheet
      :opened="Boolean(selectedProperty)"
      @backdropclick="selectedPropertyId = null"
    >
      <section v-if="selectedProperty" class="house-detail">
        <k-link
          component="button"
          icon-only
          class="house-detail__close"
          :aria-label="phone.t('Common.close')"
          :link-props="{ type: 'button' }"
          @click="selectedPropertyId = null"
        >
          <X :size="18" />
        </k-link>

        <span class="house-detail__mark"><House :size="46" /></span>
        <small>{{ accessLabel(selectedProperty) }}</small>
        <h2>{{ selectedProperty.name }}</h2>
        <span
          v-if="selectedProperty.capabilities.lock"
          class="house-detail__status"
          :class="{ 'is-locked': selectedProperty.locked }"
        >
          <Lock v-if="selectedProperty.locked" :size="14" />
          <LockOpen v-else :size="14" />
          {{
            phone.t(
              selectedProperty.locked
                ? 'Apps.house.locked'
                : 'Apps.house.unlocked',
            )
          }}
        </span>

        <k-button
          v-if="selectedProperty.capabilities.lock"
          large
          rounded
          class="house-lock-button"
          :disabled="isPending('toggle_lock', selectedProperty)"
          @click="runCommand('toggle_lock', selectedProperty)"
        >
          <LockOpen v-if="selectedProperty.locked" :size="19" />
          <Lock v-else :size="19" />
          {{
            phone.t(
              selectedProperty.locked
                ? 'Apps.house.unlocked'
                : 'Apps.house.locked',
            )
          }}
        </k-button>

        <h3>{{ phone.t('Apps.house.actions') }}</h3>
        <div class="house-actions">
          <k-glass
            :highlight="false"
            component="button"
            type="button"
            :disabled="isPending('set_waypoint', selectedProperty)"
            @click="runCommand('set_waypoint', selectedProperty)"
          >
            <LocateFixed :size="23" />
            <span>{{ phone.t('Apps.house.setWaypoint') }}</span>
          </k-glass>
          <k-glass
            :highlight="false"
            component="button"
            type="button"
            :disabled="
              !selectedProperty.capabilities.cctv ||
              isPending('open_cctv', selectedProperty)
            "
            @click="runCommand('open_cctv', selectedProperty)"
          >
            <Camera :size="23" />
            <span>{{ phone.t('Apps.house.viewCamera') }}</span>
          </k-glass>
        </div>

        <k-list inset strong class="house-facts">
          <k-list-item
            :title="phone.t('Apps.house.access')"
            :after="accessLabel(selectedProperty)"
          >
            <template #media><UserRound :size="17" /></template>
          </k-list-item>
          <k-list-item
            :title="phone.t('Apps.house.camera')"
            :after="
              phone.t(
                selectedProperty.capabilities.cctv
                  ? 'Apps.house.cameraAvailable'
                  : 'Apps.house.cameraUnavailable',
              )
            "
          >
            <template #media><Camera :size="17" /></template>
          </k-list-item>
          <k-list-item
            v-if="selectedProperty.garage"
            :title="phone.t('Apps.house.garage')"
            :subtitle="
              phone.t('Apps.house.storedVehicles', {
                count: String(selectedProperty.garage.storedVehicles),
              })
            "
            :after="
              phone.t(
                selectedProperty.garage.enabled
                  ? 'Apps.house.garageEnabled'
                  : 'Apps.house.garageDisabled',
              )
            "
          >
            <template #media><CarFront :size="17" /></template>
          </k-list-item>
        </k-list>

        <section v-if="selectedProperty.capabilities.keys" class="house-keys">
          <header>
            <span
              ><small>{{ phone.t('Apps.house.access') }}</small
              ><strong>{{ phone.t('Apps.house.keys') }}</strong></span
            >
            <k-button
              rounded
              small
              inline
              @click="openKeyCandidates(selectedProperty)"
            >
              <Plus :size="15" />{{ phone.t('Apps.house.addKey') }}
            </k-button>
          </header>
          <k-list v-if="selectedProperty.keys?.length" inset strong>
            <k-list-item
              v-for="key in selectedProperty.keys"
              :key="key.identifier"
              :title="key.name"
              :subtitle="
                phone.t(
                  key.online ? 'Apps.house.onlineKey' : 'Apps.house.offlineKey',
                )
              "
            >
              <template #media><KeyRound :size="17" /></template>
              <template #after>
                <k-button
                  clear
                  rounded
                  small
                  :disabled="key.revocable === false"
                  @click.stop="revokeCandidate = key"
                >
                  {{ phone.t('Apps.house.revokeKey') }}
                </k-button>
              </template>
            </k-list-item>
          </k-list>
          <k-card v-else class="house-keys__empty">
            <KeyRound :size="25" />
            <strong>{{ phone.t('Apps.house.noKeys') }}</strong>
            <p>{{ phone.t('Apps.house.noKeysBody') }}</p>
          </k-card>
        </section>
      </section>
    </k-sheet>

    <k-sheet
      :opened="candidatesOpened"
      @backdropclick="candidatesOpened = false"
    >
      <section class="house-candidates">
        <k-link
          component="button"
          icon-only
          :aria-label="phone.t('Common.close')"
          :link-props="{ type: 'button' }"
          @click="candidatesOpened = false"
          ><X :size="18"
        /></k-link>
        <UsersRound :size="34" />
        <h2>{{ phone.t('Apps.house.chooseResident') }}</h2>
        <p>{{ phone.t('Apps.house.chooseResidentBody') }}</p>
        <div
          v-if="housing.isLoadingCandidates"
          class="house-candidates__loading"
        >
          <k-preloader />
        </div>
        <k-list v-else-if="housing.candidates.length" inset strong>
          <k-list-item
            v-for="candidate in housing.candidates"
            :key="candidate.id"
            link
            chevron
            :title="candidate.name"
            @click="grantKey(candidate)"
          >
            <template #media><UserRound :size="17" /></template>
          </k-list-item>
        </k-list>
        <k-card v-else class="house-keys__empty">
          <UsersRound :size="25" />
          <strong>{{ phone.t('Apps.house.noCandidates') }}</strong>
          <p>{{ phone.t('Apps.house.noCandidatesBody') }}</p>
        </k-card>
      </section>
    </k-sheet>

    <k-dialog
      :opened="Boolean(revokeCandidate)"
      @backdropclick="revokeCandidate = null"
    >
      <template #title>{{ phone.t('Apps.house.revokeTitle') }}</template>
      <p v-if="revokeCandidate" class="house-revoke-copy">
        {{ phone.t('Apps.house.revokeBody', { name: revokeCandidate.name }) }}
      </p>
      <template #buttons>
        <k-dialog-button @click="revokeCandidate = null">{{
          phone.t('Apps.house.cancel')
        }}</k-dialog-button>
        <k-dialog-button strong @click="revokeKey"
          ><Check :size="15" />{{
            phone.t('Apps.house.confirm')
          }}</k-dialog-button
        >
      </template>
    </k-dialog>

    <k-toast
      :opened="toastOpened"
      position="center"
      @click="toastOpened = false"
    >
      {{ toastText }}
    </k-toast>
  </k-page>
</template>

<style scoped>
.house-page {
  --house-accent: #f47a38;
  --house-accent-soft: #ffb054;
  --house-bg: #f3f3f7;
  --house-panel: rgb(255 255 255/0.84);
  --house-text: #161619;
  --house-muted: #72727a;
  background:
    radial-gradient(circle at 15% 4%, #ffd39b 0, transparent 32%),
    linear-gradient(165deg, #f4e9dd 0, #f3f3f7 47%, #e8edf3 100%);
  color: var(--house-text);
}
:global(.phone-app.dark .house-page) {
  --house-bg: #101114;
  --house-panel: rgb(39 39 43/0.78);
  --house-text: #fafafa;
  --house-muted: #aaaab2;
  background:
    radial-gradient(circle at 15% 4%, #7a3b1f 0, transparent 34%),
    linear-gradient(165deg, #26201d 0, #111216 48%, #171d25 100%);
}
.house-navbar {
  --k-navbar-bg-color: transparent;
}
.house-scroll {
  position: relative;
  height: 100%;
  padding: 9px 13px 34px;
  overflow-x: hidden;
  overflow-y: auto;
}
.house-pull-refresh {
  position: absolute;
  z-index: 4;
  top: 4px;
  right: 0;
  left: 0;
  display: flex;
  justify-content: center;
  color: var(--house-accent);
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}
.house-pull-refresh.is-visible {
  opacity: 1;
}
.house-state {
  height: 100%;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.house-state__icon {
  width: 64px;
  height: 64px;
  margin-bottom: 13px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  background: var(--house-panel);
  color: var(--house-accent);
  box-shadow: 0 12px 30px #5b2f1822;
}
.house-state strong {
  font-size: 18px;
}
.house-state p {
  max-width: 250px;
  margin: 6px 0 17px;
  color: var(--house-muted);
  font-size: 10px;
  line-height: 1.45;
}
.house-hero {
  padding: 16px;
  border: 1px solid #fff8;
  border-radius: 24px;
  background: linear-gradient(
    135deg,
    rgb(255 255 255/0.85),
    rgb(255 247 239/0.52)
  );
  box-shadow: 0 14px 34px #7338121c;
}
:global(.phone-app.dark .house-hero) {
  border-color: #ffffff17;
  background: linear-gradient(135deg, #ffffff1d, #ff8a4210);
}
.house-hero__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.house-hero__title small,
.house-hero__title strong {
  display: block;
}
.house-hero__title small {
  color: var(--house-muted);
  font-size: 9px;
  font-weight: 750;
  text-transform: uppercase;
}
.house-hero__title strong {
  font-size: 34px;
  line-height: 1;
}
.house-hero__title i {
  width: 51px;
  height: 51px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(
    145deg,
    var(--house-accent-soft),
    var(--house-accent)
  );
  color: #fff;
  box-shadow: 0 9px 18px #c64c2535;
}
.house-summary {
  margin-top: 15px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
}
.house-summary span {
  padding: 8px;
  border-radius: 13px;
  background: #fff8;
  color: var(--house-muted);
  font-size: 8px;
}
:global(.phone-app.dark .house-summary span) {
  background: #ffffff0c;
}
.house-summary b {
  display: block;
  color: var(--house-text);
  font-size: 16px;
}
.house-properties h2 {
  margin: 19px 3px 9px;
  font-size: 16px;
}
.house-property {
  width: 100%;
  margin-bottom: 8px;
  padding: 11px;
  border: 1px solid #ffffff80;
  border-radius: 19px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--house-panel);
  color: var(--house-text);
  text-align: left;
  box-shadow: 0 8px 20px #24252b12;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background-color 140ms ease,
    box-shadow 140ms ease,
    opacity 100ms ease;
}
:global(.phone-app.dark .house-property) {
  border-color: #ffffff12;
}
.house-property__icon {
  width: 47px;
  height: 47px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, #ffb45d, #f26d35);
  color: #fff;
}
.house-property__content {
  min-width: 0;
  flex: 1;
}
.house-property__content > strong {
  display: block;
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.house-property__content > small {
  margin: 2px 0 6px;
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--house-muted);
  font-size: 8px;
}
.house-property__chips {
  display: flex;
  gap: 4px;
}
.house-property__chips i {
  padding: 3px 6px;
  border-radius: 99px;
  display: flex;
  align-items: center;
  gap: 3px;
  background: #e8f8ed;
  color: #267c42;
  font-size: 7px;
  font-style: normal;
  font-weight: 750;
}
.house-property__chips i.is-locked {
  background: #fff0e7;
  color: #c8522b;
}
:global(.phone-app.dark .house-property__chips i) {
  background: #2a4b35;
  color: #8ce1a7;
}
:global(.phone-app.dark .house-property__chips i.is-locked) {
  background: #5a3023;
  color: #ffb392;
}
.house-empty,
.house-keys__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: var(--house-muted);
}
.house-empty {
  margin-top: 18px;
  padding: 35px 20px;
}
.house-empty strong,
.house-keys__empty strong {
  margin-top: 7px;
  color: var(--house-text);
}
.house-empty p,
.house-keys__empty p {
  margin: 4px 0;
  font-size: 9px;
}
.house-provider {
  margin: 16px 0 0;
  color: var(--house-muted);
  font-size: 8px;
  text-align: center;
}
.house-detail-sheet,
.house-candidates-sheet {
  --k-sheet-bg-color: var(--house-bg);
  height: 88%;
  overflow: hidden;
  border-radius: 28px 28px 0 0;
}
.house-detail {
  height: 100%;
  padding: 18px 14px 40px;
  overflow-y: auto;
  text-align: center;
}
.house-detail__close {
  position: absolute;
  z-index: 2;
  top: 13px;
  right: 14px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--house-panel);
}
.house-detail__mark {
  width: 83px;
  height: 83px;
  margin: 9px auto 8px;
  border-radius: 27px;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, #ffb75f, #ef6b34);
  color: #fff;
  box-shadow: 0 15px 30px #b5452538;
}
.house-detail > small {
  color: var(--house-accent);
  font-size: 8px;
  font-weight: 850;
  text-transform: uppercase;
}
.house-detail h2 {
  margin: 2px 0 7px;
  font-size: 21px;
}
.house-detail__status {
  width: max-content;
  margin: 0 auto 13px;
  padding: 5px 9px;
  border-radius: 99px;
  display: flex;
  align-items: center;
  gap: 5px;
  background: #e8f8ed;
  color: #267c42;
  font-size: 9px;
  font-weight: 800;
}
.house-detail__status.is-locked {
  background: #fff0e7;
  color: #c8522b;
}
.house-lock-button {
  --k-button-bg-color: var(--house-accent);
  width: 100%;
  margin-bottom: 18px;
}
.house-detail h3 {
  margin: 0 0 8px;
  text-align: left;
  font-size: 13px;
}
.house-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}
.house-actions button {
  min-height: 76px;
  border: 1px solid #ffffff6b;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px;
  background: var(--house-panel);
  color: var(--house-text);
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background-color 140ms ease,
    box-shadow 140ms ease,
    opacity 100ms ease;
}
.house-actions svg {
  color: var(--house-accent);
}
.house-actions button:disabled {
  cursor: default;
  opacity: 0.42;
}
@media (hover: hover) and (pointer: fine) {
  .house-property:hover,
  .house-actions button:not(:disabled):hover {
    border-color: #f47a3870;
    background-color: rgb(255 255 255/0.94);
    box-shadow: 0 10px 24px #7b3a1c1c;
  }
  :global(.phone-app.dark .house-property:hover),
  :global(.phone-app.dark .house-actions button:not(:disabled):hover) {
    background-color: rgb(49 45 44/0.96);
  }
}
.house-property:active,
.house-actions button:not(:disabled):active {
  opacity: 0.78;
}
.house-facts {
  margin: 14px 0 !important;
  text-align: left;
}
.house-keys {
  text-align: left;
}
.house-keys header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.house-keys header small,
.house-keys header strong {
  display: block;
}
.house-keys header small {
  color: var(--house-muted);
  font-size: 8px;
}
.house-keys header strong {
  font-size: 14px;
}
.house-keys__empty {
  padding: 18px;
}
.house-candidates {
  height: 100%;
  padding: 19px 14px 35px;
  overflow-y: auto;
  text-align: center;
}
.house-candidates > button {
  position: absolute;
  right: 14px;
  top: 13px;
}
.house-candidates > svg {
  margin-top: 7px;
  color: var(--house-accent);
}
.house-candidates h2 {
  margin: 6px 0 3px;
}
.house-candidates > p {
  margin: 0 auto 12px;
  max-width: 250px;
  color: var(--house-muted);
  font-size: 9px;
}
.house-candidates__loading {
  padding: 35px;
}
.house-revoke-copy {
  padding: 0 16px;
  color: var(--house-muted);
  font-size: 11px;
}
</style>
