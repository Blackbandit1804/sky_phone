<script setup lang="ts">
import {
  BellRing,
  Bluetooth,
  Camera,
  Check,
  EyeOff,
  KeyRound,
  Images,
  Monitor,
  PanelsTopLeft,
  Moon,
  Plane,
  RotateCcw,
  Settings,
  Signal,
  Smartphone,
  Sun,
  UserRound,
  Volume2,
  Wifi,
} from 'lucide-vue-next'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  type ComponentPublicInstance,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { PHONE_FRAME_COLORS } from '@/config/appearance'
import {
  getPhoneAppLabel,
  isLaunchablePhoneApp,
  PHONE_APPS,
} from '@/config/apps'
import { usePhoneStore } from '@/stores/phone'
import { useMessageMediaStore } from '@/stores/messageMedia'
import PhonePasscode from '@/components/PhonePasscode.vue'
import { useAccountStore } from '@/stores/account'
import { useAppAuthStore } from '@/stores/app-auth'
import type {
  LaunchablePhoneAppDefinition,
  LaunchablePhoneAppId,
} from '@/types/apps'
import {
  filterMailAddressInput,
  MAIL_ADDRESS_INPUT_MAX_LENGTH,
} from '@/utils/mail'
import { nuiCall } from '@/utils/nui'
import { formatPhoneNumber } from '@/utils/phone'
import {
  SkyAppPage,
  SkyBlock,
  SkyButton,
  SkyDialog,
  SkyDialogButton,
  SkyField,
  SkyLink,
  SkyNavbar,
  SkyProgress,
  SkyScrollArea,
  SkySearchbar,
  SkySegmented,
  SkySegmentedButton,
  SkySettingsGroup,
  SkySettingsIcon,
  SkySettingsRangeRow,
  SkySettingsRow,
  SkySpinner,
  SkyToast,
} from '@/ui'
import {
  APPEARANCE_MODE_IDS,
  GRAPHICS_MODE_IDS,
  NOTIFICATION_SOUND_IDS,
  PHONE_FRAME_IDS,
  PHONE_SCALE_MAX,
  PHONE_SCALE_MIN,
  PHONE_SCALE_STEP,
  RINGTONE_IDS,
  WALLPAPER_IDS,
  type AppearanceMode,
  type GraphicsMode,
  type NotificationSoundId,
  type PhoneFrameId,
  type RingtoneId,
  type WallpaperHistoryEntry,
} from '@/utils/preferences'

type SettingsView =
  | 'root'
  | 'account'
  | 'security'
  | 'notifications'
  | 'notification-detail'
  | 'sounds'
  | 'connectivity'
  | 'focus'
  | 'general'
  | 'appearance'
  | 'wallpaper'
type RootToggleKey =
  | 'airplaneMode'
  | 'streamerMode'
  | 'focusMode'
  | 'wifiEnabled'
  | 'bluetoothEnabled'
  | 'cellularEnabled'
type SubmenuView = Exclude<SettingsView, 'root' | 'notification-detail'>
type PasscodeFlow =
  | 'set-new'
  | 'set-confirm'
  | 'change-current'
  | 'change-new'
  | 'change-confirm'
  | 'disable'
  | null

const FACTORY_RESET_DURATION_MS = 60_000

const phone = usePhoneStore()
const mediaPicker = useMessageMediaStore()
const route = useRoute()
const router = useRouter()
const isDevelopment = import.meta.env.DEV
const account = useAccountStore()
const appAuth = useAppAuthStore()
const query = ref('')
const activeView = ref<SettingsView>('root')
const selectedNotificationAppId = ref<LaunchablePhoneAppId>('calculator')
const settingsPage = ref<ComponentPublicInstance | null>(null)
const framePickerOpened = ref(false)
const accountMode = ref<'login' | 'register'>('login')
const accountEmail = ref('')
const accountPassword = ref('')
const accountConfirm = ref('')
const accountSubmitting = ref(false)
const accountToast = ref('')
const passcodeBusy = ref(false)
const passcodeCurrent = ref('')
const passcodeError = ref('')
const passcodeFirst = ref('')
const passcodeFlow = ref<PasscodeFlow>(null)
const passcodeLength = ref<4 | 6>(6)
const passcodeResetKey = ref(0)
const removeDeviceImei = ref('')
const removeDevicePassword = ref('')
const removeDeviceOpened = ref(false)
const resetOpened = ref(false)
const simEjectOpened = ref(false)
const factoryResetting = ref(false)
const factoryResetProgress = ref(0)
const selectedFrameColor = computed(
  () => PHONE_FRAME_COLORS[phone.preferences.settings.frame],
)
let factoryResetAnimationFrame: number | undefined

const wallpaperHistory = computed(
  () => phone.preferences.settings.wallpaperHistory,
)

const toggleRows = [
  {
    key: 'airplaneMode' as const,
    icon: Plane,
    iconColor: '#ff9500',
  },
  {
    key: 'streamerMode' as const,
    icon: EyeOff,
    iconColor: '#af52de',
  },
]
const serviceRows = [
  {
    key: 'notifications',
    view: 'notifications' as const,
    icon: BellRing,
    iconColor: '#ff3b30',
  },
  {
    key: 'sounds',
    view: 'sounds' as const,
    icon: Volume2,
    iconColor: '#ff2d55',
  },
]
const preferenceRows = [
  {
    key: 'connectivity',
    view: 'connectivity' as const,
    icon: Wifi,
    iconColor: '#007aff',
  },
  {
    key: 'focus',
    view: 'focus' as const,
    icon: Moon,
    iconColor: '#5856d6',
  },
  {
    key: 'security',
    view: 'security' as const,
    icon: KeyRound,
    iconColor: '#34c759',
  },
  {
    key: 'general',
    view: 'general' as const,
    icon: Settings,
    iconColor: '#8e8e93',
  },
  {
    key: 'appearance',
    view: 'appearance' as const,
    icon: Sun,
    iconColor: '#007aff',
  },
  {
    key: 'wallpaper',
    view: 'wallpaper' as const,
    icon: Monitor,
    iconColor: '#32ade6',
  },
]

function openSkyUiKitchenSink(): void {
  if (!isDevelopment) return
  void router.push({ name: 'development-sky-ui' })
}

function openWallpaperMedia(app: 'photos' | 'camera'): void {
  mediaPicker.begin(
    'settings:wallpaper',
    'photo',
    '/apps/settings?wallpaper=1',
    1,
  )
  void router.push({
    path: `/apps/${app}`,
    query: { mediaAttachment: 'photo' },
  })
}

function wallpaperPreviewStyle(
  entry: WallpaperHistoryEntry,
): Record<string, string> | undefined {
  if (entry.wallpaper !== 'custom' || !entry.imageUrl) return undefined
  return { '--phone-wallpaper-image': `url(${JSON.stringify(entry.imageUrl)})` }
}

function selectWallpaperHistory(entry: WallpaperHistoryEntry): void {
  phone.setWallpaper(entry.wallpaper, entry.imageUrl)
}

const connectivityRows = [
  {
    key: 'wifi',
    preferenceKey: 'wifiEnabled' as const,
    icon: Wifi,
    iconColor: '#007aff',
  },
  {
    key: 'bluetooth',
    preferenceKey: 'bluetoothEnabled' as const,
    icon: Bluetooth,
    iconColor: '#007aff',
  },
  {
    key: 'cellular',
    preferenceKey: 'cellularEnabled' as const,
    icon: Signal,
    iconColor: '#34c759',
  },
]

const normalizedQuery = computed(() => query.value.trim().toLowerCase())
const visibleToggleRows = computed(() =>
  toggleRows.filter((row) => matchesSearch(row.key)),
)
const visibleServiceRows = computed(() =>
  serviceRows.filter((row) => matchesSearch(row.key)),
)
const visiblePreferenceRows = computed(() =>
  preferenceRows.filter((row) => matchesSearch(row.key)),
)
const notificationApps = computed(() =>
  PHONE_APPS.filter(isLaunchablePhoneApp).sort(
    (left, right) => left.gridOrder - right.gridOrder,
  ),
)
const selectedNotificationApp = computed(
  () =>
    notificationApps.value.find(
      (app) => app.id === selectedNotificationAppId.value,
    ) ?? notificationApps.value[0],
)
const activeTitle = computed(() => {
  if (activeView.value === 'account') {
    return phone.t('Apps.settings.accountName')
  }
  if (activeView.value === 'notification-detail') {
    return selectedNotificationApp.value
      ? getPhoneAppLabel(selectedNotificationApp.value, phone.t)
      : phone.t('Apps.settings.notifications')
  }
  return phone.t(`Apps.settings.${activeView.value}`)
})
const passcodeTitle = computed(() => {
  if (passcodeFlow.value === 'set-confirm') {
    return phone.t('Apps.settings.passcode.confirmNew')
  }
  if (
    passcodeFlow.value === 'change-current' ||
    passcodeFlow.value === 'disable'
  ) {
    return phone.t('Apps.settings.passcode.enterCurrent')
  }
  if (passcodeFlow.value === 'change-confirm') {
    return phone.t('Apps.settings.passcode.confirmNew')
  }
  return phone.t('Apps.settings.passcode.enterNew')
})

function matchesSearch(key: string): boolean {
  return (
    !normalizedQuery.value ||
    phone
      .t(`Apps.settings.${key}`)
      .toLowerCase()
      .includes(normalizedQuery.value)
  )
}

function openView(view: SubmenuView): void {
  if (view === 'security') {
    passcodeLength.value = phone.security.length ?? 6
  }
  activeView.value = view
  scrollPageToTop()
}

function openNotificationApp(app: LaunchablePhoneAppDefinition): void {
  selectedNotificationAppId.value = app.id
  activeView.value = 'notification-detail'
  scrollPageToTop()
}

function goBack(): void {
  framePickerOpened.value = false
  activeView.value =
    activeView.value === 'notification-detail' ? 'notifications' : 'root'
  scrollPageToTop()
}

function scrollPageToTop(): void {
  void nextTick(() => {
    const pageElement = settingsPage.value?.$el as HTMLElement | undefined
    pageElement?.scrollTo({ top: 0 })
  })
}

function setRootSetting(key: RootToggleKey, value: boolean): void {
  phone.setPreference(key, value)
}

function resetPasscodeInput(): void {
  passcodeError.value = ''
  passcodeResetKey.value += 1
}

function beginSetPasscode(): void {
  passcodeLength.value = phone.security.length ?? passcodeLength.value
  passcodeFirst.value = ''
  passcodeCurrent.value = ''
  passcodeFlow.value = 'set-new'
  resetPasscodeInput()
}

function beginChangePasscode(): void {
  passcodeFirst.value = ''
  passcodeCurrent.value = ''
  passcodeFlow.value = 'change-current'
  resetPasscodeInput()
}

function beginDisablePasscode(): void {
  passcodeLength.value = phone.security.length ?? 6
  passcodeCurrent.value = ''
  passcodeFlow.value = 'disable'
  resetPasscodeInput()
}

function cancelPasscodeFlow(): void {
  if (passcodeBusy.value) return
  passcodeFlow.value = null
  passcodeFirst.value = ''
  passcodeCurrent.value = ''
  resetPasscodeInput()
}

function passcodeRequestError(error?: string): string {
  if (error === 'invalid_passcode') {
    return phone.t('Apps.settings.passcode.incorrect')
  }
  if (error === 'passcode_locked') {
    return phone.t('Apps.settings.passcode.locked')
  }
  if (error === 'rate_limited') {
    return phone.t('Apps.settings.passcode.rateLimited')
  }
  return phone.t('Apps.settings.passcode.failed')
}

async function submitSettingsPasscode(passcode: string): Promise<void> {
  if (passcodeBusy.value || !passcodeFlow.value) return

  if (passcodeFlow.value === 'set-new') {
    passcodeFirst.value = passcode
    passcodeFlow.value = 'set-confirm'
    resetPasscodeInput()
    return
  }
  if (passcodeFlow.value === 'change-current') {
    passcodeCurrent.value = passcode
    passcodeFlow.value = 'change-new'
    resetPasscodeInput()
    return
  }
  if (passcodeFlow.value === 'change-new') {
    passcodeFirst.value = passcode
    passcodeFlow.value = 'change-confirm'
    resetPasscodeInput()
    return
  }
  if (
    (passcodeFlow.value === 'set-confirm' ||
      passcodeFlow.value === 'change-confirm') &&
    passcode !== passcodeFirst.value
  ) {
    passcodeError.value = phone.t('Apps.settings.passcode.mismatch')
    passcodeResetKey.value += 1
    return
  }

  passcodeBusy.value = true
  const response =
    passcodeFlow.value === 'set-confirm'
      ? await phone.setPasscode(passcode)
      : passcodeFlow.value === 'change-confirm'
        ? await phone.changePasscode(passcodeCurrent.value, passcode)
        : await phone.disablePasscode(passcode)
  passcodeBusy.value = false
  if (!response.success) {
    passcodeError.value = passcodeRequestError(response.error)
    if (
      passcodeFlow.value === 'change-confirm' &&
      response.error === 'invalid_passcode'
    ) {
      passcodeFlow.value = 'change-current'
      passcodeCurrent.value = ''
      passcodeFirst.value = ''
    }
    passcodeResetKey.value += 1
    return
  }

  accountToast.value = phone.t(
    passcodeFlow.value === 'disable'
      ? 'Apps.settings.passcode.disabled'
      : 'Apps.settings.passcode.saved',
  )
  cancelPasscodeFlow()
}

function updateNumberPreference(
  key:
    | 'notificationDurationSeconds'
    | 'notificationVolume'
    | 'phoneScale'
    | 'ringtoneVolume'
    | 'screenBrightness',
  value: number,
): void {
  phone.setPreference(key, value)
}

function selectAppearanceMode(mode: AppearanceMode): void {
  phone.setPreference('appearanceMode', mode)
}

function selectGraphicsMode(mode: GraphicsMode): void {
  phone.setPreference('graphicsMode', mode)
}

function selectFrame(frame: PhoneFrameId): void {
  phone.setPreference('frame', frame)
  framePickerOpened.value = false
}

function selectRingtone(ringtone: RingtoneId): void {
  phone.setPreference('ringtone', ringtone)
}

function selectNotificationSound(sound: NotificationSoundId): void {
  phone.setPreference('notificationSound', sound)
}

function updateAccountEmail(event: Event): void {
  const input = event.target as HTMLInputElement
  const original = input.value
  const selectionStart = input.selectionStart ?? original.length
  const filtered = filterMailAddressInput(original)

  if (filtered !== original) {
    const nextSelection = filterMailAddressInput(
      original.slice(0, selectionStart),
    ).length
    input.value = filtered
    input.setSelectionRange(nextSelection, nextSelection)
  }

  accountEmail.value = filtered
}

function accountError(error?: string): string {
  const known = [
    'invalid_email',
    'invalid_password',
    'invalid_credentials',
    'email_taken',
    'rate_limited',
    'current_device',
    'device_not_found',
  ]
  return phone.t(
    `Apps.settings.accountErrors.${error && known.includes(error) ? error : 'default'}`,
  )
}

async function submitAccount(): Promise<void> {
  if (
    accountMode.value === 'register' &&
    accountPassword.value !== accountConfirm.value
  ) {
    accountToast.value = phone.t('Apps.mail.passwordsMismatch')
    return
  }
  accountSubmitting.value = true
  const response =
    accountMode.value === 'login'
      ? await account.login(accountEmail.value, accountPassword.value)
      : await account.register(accountEmail.value, accountPassword.value)
  accountSubmitting.value = false
  if (!response.success) accountToast.value = accountError(response.error)
  else {
    accountPassword.value = ''
    accountConfirm.value = ''
  }
}

async function logoutAccount(): Promise<void> {
  if (!(await account.logout())) accountToast.value = accountError()
  else appAuth.clear()
}

function requestRemoveDevice(imei: string): void {
  removeDeviceImei.value = imei
  removeDevicePassword.value = ''
  removeDeviceOpened.value = true
}

async function confirmRemoveDevice(): Promise<void> {
  const response = await account.removeDevice(
    removeDeviceImei.value,
    removeDevicePassword.value,
  )
  if (!response.success) accountToast.value = accountError(response.error)
  else removeDeviceOpened.value = false
}

async function confirmFactoryReset(): Promise<void> {
  resetOpened.value = false
  factoryResetting.value = true
  factoryResetProgress.value = 0
  const startedAt = performance.now()

  const animateProgress = (now: number): void => {
    factoryResetProgress.value = Math.min(
      100,
      ((now - startedAt) / FACTORY_RESET_DURATION_MS) * 100,
    )
    if (factoryResetProgress.value < 100) {
      factoryResetAnimationFrame = requestAnimationFrame(animateProgress)
    }
  }
  factoryResetAnimationFrame = requestAnimationFrame(animateProgress)

  const [success] = await Promise.all([
    account.factoryReset(),
    new Promise<void>((resolve) =>
      window.setTimeout(resolve, FACTORY_RESET_DURATION_MS),
    ),
  ])

  if (factoryResetAnimationFrame !== undefined) {
    cancelAnimationFrame(factoryResetAnimationFrame)
    factoryResetAnimationFrame = undefined
  }
  factoryResetProgress.value = 100
  factoryResetting.value = false
  if (!success) accountToast.value = accountError()
  else appAuth.hydrate(undefined, '')
}

async function confirmSimEject(): Promise<void> {
  const response = await nuiCall('sim:eject')
  simEjectOpened.value = false
  if (!response.success) {
    accountToast.value = phone.t(
      `Apps.phone.errors.${response.error ?? 'default'}`,
    )
  }
}

onMounted(() => {
  if (route.query.wallpaper === '1') activeView.value = 'wallpaper'

  const selectedPhoto = mediaPicker.consume('settings:wallpaper')
  if (selectedPhoto) phone.setWallpaper('custom', selectedPhoto.url)
})

onBeforeUnmount(() => {
  if (factoryResetAnimationFrame !== undefined) {
    cancelAnimationFrame(factoryResetAnimationFrame)
  }
})
</script>

<template>
  <SkyAppPage
    class="settings-app"
    accent="#0a84ff"
    accent-soft="rgba(10, 132, 255, 0.16)"
    :dark="phone.isDarkMode"
    :label="phone.t('Apps.settings.name')"
  >
    <SkyNavbar
      :title="
        activeView === 'root' ? phone.t('Apps.settings.name') : activeTitle
      "
      :variant="activeView === 'root' ? 'large' : 'compact'"
      :show-back="activeView !== 'root'"
      back-appearance="surface"
      :back-label="phone.t('Apps.settings.back')"
      @back="goBack"
    >
      <template v-if="activeView === 'account' && !account.email" #right>
        <SkyLink
          @click="accountMode = accountMode === 'login' ? 'register' : 'login'"
        >
          {{
            phone.t(
              accountMode === 'login'
                ? 'Apps.mail.registerLink'
                : 'Apps.mail.login',
            )
          }}
        </SkyLink>
      </template>
    </SkyNavbar>

    <SkyScrollArea
      ref="settingsPage"
      class="settings-content"
      :class="{ 'settings-content--subpage': activeView !== 'root' }"
    >
      <template v-if="activeView === 'root'">
        <div class="settings-search" role="search">
          <SkySearchbar
            v-model="query"
            :clear-label="phone.t('Common.clear')"
            :label="phone.t('Apps.settings.searchPlaceholder')"
            :placeholder="phone.t('Apps.settings.searchPlaceholder')"
          />
        </div>

        <SkySettingsGroup :aria-label="phone.t('Apps.settings.accountName')">
          <SkySettingsRow
            kind="navigation"
            :title="phone.t('Apps.settings.accountName')"
            :description="phone.t('Apps.settings.accountDetail')"
            @activate="openView('account')"
          >
            <template #leading>
              <SkySettingsIcon color="#8e8e93">
                <UserRound aria-hidden="true" />
              </SkySettingsIcon>
            </template>
          </SkySettingsRow>
        </SkySettingsGroup>

        <SkySettingsGroup
          v-if="visibleToggleRows.length"
          :aria-label="phone.t('Apps.settings.name')"
        >
          <SkySettingsRow
            v-for="row in visibleToggleRows"
            :key="row.key"
            kind="toggle"
            :model-value="phone.preferences.settings[row.key]"
            :title="phone.t('Apps.settings.' + row.key)"
            @update:model-value="setRootSetting(row.key, $event)"
          >
            <template #leading>
              <SkySettingsIcon :color="row.iconColor">
                <component :is="row.icon" aria-hidden="true" />
              </SkySettingsIcon>
            </template>
          </SkySettingsRow>
        </SkySettingsGroup>

        <SkySettingsGroup
          v-if="visibleServiceRows.length"
          :aria-label="phone.t('Apps.settings.notifications')"
        >
          <SkySettingsRow
            v-for="row in visibleServiceRows"
            :key="row.key"
            kind="navigation"
            :title="phone.t('Apps.settings.' + row.key)"
            @activate="openView(row.view)"
          >
            <template #leading>
              <SkySettingsIcon :color="row.iconColor">
                <component :is="row.icon" aria-hidden="true" />
              </SkySettingsIcon>
            </template>
          </SkySettingsRow>
        </SkySettingsGroup>

        <SkySettingsGroup
          v-if="visiblePreferenceRows.length"
          :aria-label="phone.t('Apps.settings.name')"
        >
          <SkySettingsRow
            v-for="row in visiblePreferenceRows"
            :key="row.key"
            kind="navigation"
            :title="phone.t('Apps.settings.' + row.key)"
            :value="
              row.key === 'security' || row.key === 'focus'
                ? phone.t(
                    (row.key === 'security' && phone.security.enabled) ||
                      (row.key === 'focus' &&
                        phone.preferences.settings.focusMode)
                      ? 'Apps.settings.on'
                      : 'Apps.settings.off',
                  )
                : undefined
            "
            @activate="openView(row.view)"
          >
            <template #leading>
              <SkySettingsIcon :color="row.iconColor">
                <component :is="row.icon" aria-hidden="true" />
              </SkySettingsIcon>
            </template>
          </SkySettingsRow>
        </SkySettingsGroup>

        <SkySettingsGroup
          v-if="isDevelopment && matchesSearch('development')"
          :title="phone.t('Apps.settings.development')"
        >
          <SkySettingsRow
            kind="navigation"
            :title="phone.t('Apps.settings.skyUiKitchenSink')"
            :description="phone.t('Apps.settings.skyUiKitchenSinkDescription')"
            @activate="openSkyUiKitchenSink"
          >
            <template #leading>
              <SkySettingsIcon color="#5856d6">
                <PanelsTopLeft aria-hidden="true" />
              </SkySettingsIcon>
            </template>
          </SkySettingsRow>
        </SkySettingsGroup>
      </template>

      <template v-else-if="activeView === 'account'">
        <template v-if="!account.email">
          <SkyBlock class="settings-copy">
            {{
              phone.t(
                accountMode === 'login'
                  ? 'Apps.settings.accountLoginBody'
                  : 'Apps.mail.passwordWarning',
              )
            }}
          </SkyBlock>

          <SkySettingsGroup :aria-label="phone.t('Apps.settings.accountName')">
            <SkyField
              id="sky-cloud-email"
              :model-value="accountEmail"
              :label="
                phone.t(
                  accountMode === 'login'
                    ? 'Apps.mail.email'
                    : 'Apps.mail.localPart',
                )
              "
              autocomplete="username"
              autocapitalize="none"
              autocorrect="off"
              input-mode="email"
              :maxlength="MAIL_ADDRESS_INPUT_MAX_LENGTH"
              pattern="[A-Za-z0-9@._-]*"
              :spellcheck="false"
              :clear-button="accountMode === 'login'"
              :clear-label="phone.t('Common.clear')"
              @input="updateAccountEmail"
              @clear="accountEmail = ''"
            >
              <template v-if="accountMode === 'register'" #trailing>
                <span class="settings-account-suffix">@ifruit.com</span>
              </template>
            </SkyField>
            <SkyField
              id="sky-cloud-password"
              v-model="accountPassword"
              type="password"
              :label="phone.t('Apps.mail.password')"
              autocomplete="current-password"
            />
            <SkyField
              v-if="accountMode === 'register'"
              id="sky-cloud-confirm-password"
              v-model="accountConfirm"
              type="password"
              :label="phone.t('Apps.mail.confirmPassword')"
              autocomplete="new-password"
            />
          </SkySettingsGroup>

          <div class="settings-primary-action">
            <SkyButton
              block
              large
              :disabled="accountSubmitting"
              @click="submitAccount"
            >
              <SkySpinner v-if="accountSubmitting" :size="18" />
              <template v-else>
                {{
                  phone.t(
                    accountMode === 'login'
                      ? 'Apps.mail.login'
                      : 'Apps.mail.register',
                  )
                }}
              </template>
            </SkyButton>
          </div>
        </template>

        <template v-else>
          <SkySettingsGroup :aria-label="account.email">
            <SkySettingsRow
              :title="account.email"
              :description="phone.t('Apps.settings.accountCloudDetail')"
            >
              <template #leading>
                <SkySettingsIcon color="#0a84ff">
                  <UserRound aria-hidden="true" />
                </SkySettingsIcon>
              </template>
            </SkySettingsRow>
          </SkySettingsGroup>

          <SkySettingsGroup :title="phone.t('Apps.settings.linkedDevices')">
            <template v-for="device in account.devices" :key="device.imei">
              <SkySettingsRow
                :title="device.device_name"
                :description="device.imei"
                :value="
                  device.current
                    ? phone.t('Apps.settings.thisDevice')
                    : undefined
                "
              >
                <template #leading>
                  <Smartphone :size="20" aria-hidden="true" />
                </template>
              </SkySettingsRow>
              <SkySettingsRow
                v-if="!device.current"
                kind="action"
                tone="danger"
                :title="phone.t('Apps.settings.removeDevice')"
                @activate="requestRemoveDevice(device.imei)"
              />
            </template>
          </SkySettingsGroup>

          <SkySettingsGroup :aria-label="phone.t('Apps.settings.signOut')">
            <SkySettingsRow
              kind="action"
              tone="danger"
              :title="phone.t('Apps.settings.signOut')"
              @activate="logoutAccount"
            />
          </SkySettingsGroup>
        </template>
      </template>

      <template v-else-if="activeView === 'security'">
        <SkyBlock class="settings-copy">
          {{ phone.t('Apps.settings.passcode.description') }}
        </SkyBlock>

        <template v-if="!phone.security.enabled">
          <SkySettingsGroup
            :title="phone.t('Apps.settings.passcode.codeLength')"
          >
            <li class="settings-segmented-row">
              <SkySegmented
                :aria-label="phone.t('Apps.settings.passcode.codeLength')"
              >
                <SkySegmentedButton
                  :active="passcodeLength === 6"
                  @click="passcodeLength = 6"
                >
                  {{ phone.t('Apps.settings.passcode.sixDigit') }}
                </SkySegmentedButton>
                <SkySegmentedButton
                  :active="passcodeLength === 4"
                  @click="passcodeLength = 4"
                >
                  {{ phone.t('Apps.settings.passcode.fourDigit') }}
                </SkySegmentedButton>
              </SkySegmented>
            </li>
          </SkySettingsGroup>

          <SkySettingsGroup
            :aria-label="phone.t('Apps.settings.passcode.turnOn')"
          >
            <SkySettingsRow
              kind="action"
              :title="phone.t('Apps.settings.passcode.turnOn')"
              @activate="beginSetPasscode"
            />
          </SkySettingsGroup>
        </template>

        <template v-else>
          <SkySettingsGroup
            :aria-label="phone.t('Apps.settings.passcode.status')"
          >
            <SkySettingsRow
              :title="phone.t('Apps.settings.passcode.status')"
              :value="phone.t('Apps.settings.on')"
            />
            <SkySettingsRow
              :title="phone.t('Apps.settings.passcode.codeLength')"
              :value="
                phone.t(
                  phone.security.length === 4
                    ? 'Apps.settings.passcode.fourDigit'
                    : 'Apps.settings.passcode.sixDigit',
                )
              "
            />
          </SkySettingsGroup>

          <SkySettingsGroup
            :title="phone.t('Apps.settings.passcode.codeLength')"
          >
            <li class="settings-segmented-row">
              <SkySegmented
                :aria-label="phone.t('Apps.settings.passcode.codeLength')"
              >
                <SkySegmentedButton
                  :active="passcodeLength === 6"
                  @click="passcodeLength = 6"
                >
                  {{ phone.t('Apps.settings.passcode.sixDigit') }}
                </SkySegmentedButton>
                <SkySegmentedButton
                  :active="passcodeLength === 4"
                  @click="passcodeLength = 4"
                >
                  {{ phone.t('Apps.settings.passcode.fourDigit') }}
                </SkySegmentedButton>
              </SkySegmented>
            </li>
          </SkySettingsGroup>

          <SkySettingsGroup :aria-label="phone.t('Apps.settings.security')">
            <SkySettingsRow
              kind="action"
              :title="phone.t('Apps.settings.passcode.change')"
              @activate="beginChangePasscode"
            />
            <SkySettingsRow
              kind="action"
              tone="danger"
              :title="phone.t('Apps.settings.passcode.turnOff')"
              @activate="beginDisablePasscode"
            />
          </SkySettingsGroup>
        </template>
      </template>

      <template v-else-if="activeView === 'notifications'">
        <SkySettingsGroup :aria-label="phone.t('Apps.settings.notifications')">
          <SkySettingsRow
            v-for="app in notificationApps"
            :key="app.id"
            kind="navigation"
            :title="getPhoneAppLabel(app, phone.t)"
            :value="
              phone.t(
                phone.preferences.settings.notifications[app.id].enabled
                  ? 'Apps.settings.on'
                  : 'Apps.settings.off',
              )
            "
            @activate="openNotificationApp(app)"
          >
            <template #leading>
              <img
                class="settings-app-icon"
                :src="app.iconImage"
                alt=""
                draggable="false"
              />
            </template>
          </SkySettingsRow>
        </SkySettingsGroup>
      </template>

      <template
        v-else-if="
          activeView === 'notification-detail' && selectedNotificationApp
        "
      >
        <SkySettingsGroup
          :aria-label="getPhoneAppLabel(selectedNotificationApp, phone.t)"
        >
          <SkySettingsRow
            :title="getPhoneAppLabel(selectedNotificationApp, phone.t)"
          >
            <template #leading>
              <img
                class="settings-app-icon"
                :src="selectedNotificationApp.iconImage"
                alt=""
                draggable="false"
              />
            </template>
          </SkySettingsRow>
        </SkySettingsGroup>

        <SkySettingsGroup :aria-label="phone.t('Apps.settings.notifications')">
          <SkySettingsRow
            kind="toggle"
            :model-value="
              phone.preferences.settings.notifications[
                selectedNotificationApp.id
              ].enabled
            "
            :title="phone.t('Apps.settings.allowNotifications')"
            @update:model-value="
              phone.setAppNotification(
                selectedNotificationApp.id,
                'enabled',
                $event,
              )
            "
          />
          <SkySettingsRow
            kind="toggle"
            :disabled="
              !phone.preferences.settings.notifications[
                selectedNotificationApp.id
              ].enabled
            "
            :model-value="
              phone.preferences.settings.notifications[
                selectedNotificationApp.id
              ].sounds
            "
            :title="phone.t('Apps.settings.notificationSounds')"
            @update:model-value="
              phone.setAppNotification(
                selectedNotificationApp.id,
                'sounds',
                $event,
              )
            "
          />
        </SkySettingsGroup>
      </template>

      <template v-else-if="activeView === 'sounds'">
        <SkySettingsGroup :aria-label="phone.t('Apps.settings.sounds')">
          <SkySettingsRangeRow
            :model-value="phone.preferences.settings.ringtoneVolume"
            :title="phone.t('Apps.settings.ringtoneVolume')"
            :value-label="phone.preferences.settings.ringtoneVolume + '%'"
            :aria-value-text="phone.preferences.settings.ringtoneVolume + '%'"
            :min="0"
            :max="100"
            @update:model-value="
              updateNumberPreference('ringtoneVolume', $event)
            "
          />
          <SkySettingsRangeRow
            :model-value="phone.preferences.settings.notificationVolume"
            :title="phone.t('Apps.settings.notificationVolume')"
            :value-label="phone.preferences.settings.notificationVolume + '%'"
            :aria-value-text="
              phone.preferences.settings.notificationVolume + '%'
            "
            :min="0"
            :max="100"
            @update:model-value="
              updateNumberPreference('notificationVolume', $event)
            "
          />
        </SkySettingsGroup>

        <SkySettingsGroup :title="phone.t('Apps.settings.ringtone')">
          <SkySettingsRow
            v-for="ringtone in RINGTONE_IDS"
            :key="ringtone"
            kind="choice"
            :selected="phone.preferences.settings.ringtone === ringtone"
            :title="phone.t('Apps.settings.ringtones.' + ringtone)"
            @activate="selectRingtone(ringtone)"
          />
        </SkySettingsGroup>

        <SkySettingsGroup :title="phone.t('Apps.settings.notificationSound')">
          <SkySettingsRow
            v-for="sound in NOTIFICATION_SOUND_IDS"
            :key="sound"
            kind="choice"
            :selected="phone.preferences.settings.notificationSound === sound"
            :title="phone.t('Apps.settings.notificationSoundsList.' + sound)"
            @activate="selectNotificationSound(sound)"
          />
        </SkySettingsGroup>
      </template>

      <template v-else-if="activeView === 'connectivity'">
        <SkySettingsGroup
          :title="phone.t('Apps.settings.connections')"
          :footer="phone.t('Apps.settings.connectivityDescription')"
        >
          <SkySettingsRow
            v-for="row in connectivityRows"
            :key="row.key"
            kind="toggle"
            :disabled="phone.preferences.settings.airplaneMode"
            :model-value="phone.preferences.settings[row.preferenceKey]"
            :title="phone.t('Apps.settings.' + row.key)"
            @update:model-value="setRootSetting(row.preferenceKey, $event)"
          >
            <template #leading>
              <SkySettingsIcon :color="row.iconColor">
                <component :is="row.icon" aria-hidden="true" />
              </SkySettingsIcon>
            </template>
          </SkySettingsRow>
        </SkySettingsGroup>
      </template>

      <template v-else-if="activeView === 'focus'">
        <SkySettingsGroup
          :footer="phone.t('Apps.settings.focusDescription')"
          :aria-label="phone.t('Apps.settings.focusMode')"
        >
          <SkySettingsRow
            kind="toggle"
            :model-value="phone.preferences.settings.focusMode"
            :title="phone.t('Apps.settings.focusMode')"
            @update:model-value="setRootSetting('focusMode', $event)"
          >
            <template #leading>
              <SkySettingsIcon color="#5856d6">
                <Moon aria-hidden="true" />
              </SkySettingsIcon>
            </template>
          </SkySettingsRow>
        </SkySettingsGroup>
      </template>

      <template v-else-if="activeView === 'general'">
        <SkySettingsGroup
          :aria-label="phone.t('Apps.settings.notificationDuration')"
        >
          <SkySettingsRangeRow
            :model-value="
              phone.preferences.settings.notificationDurationSeconds
            "
            :title="phone.t('Apps.settings.notificationDuration')"
            :value-label="
              phone.t('Apps.settings.seconds', {
                seconds: String(
                  phone.preferences.settings.notificationDurationSeconds,
                ),
              })
            "
            :aria-value-text="
              phone.t('Apps.settings.seconds', {
                seconds: String(
                  phone.preferences.settings.notificationDurationSeconds,
                ),
              })
            "
            :min="3"
            :max="30"
            :step="1"
            @update:model-value="
              updateNumberPreference('notificationDurationSeconds', $event)
            "
          />
        </SkySettingsGroup>

        <SkySettingsGroup :title="phone.t('Apps.settings.about')">
          <SkySettingsRow
            :title="phone.t('Apps.settings.deviceName')"
            :value="phone.t('Apps.settings.deviceNameValue')"
          />
          <SkySettingsRow
            :title="phone.t('Apps.settings.softwareVersion')"
            value="0.1.0"
          />
          <SkySettingsRow
            :title="phone.t('Apps.settings.language')"
            :value="phone.t('Apps.settings.languageValue')"
          />
          <SkySettingsRow
            :title="phone.t('Apps.settings.localStorage')"
            :value="phone.t('Apps.settings.localStorageValue')"
          />
        </SkySettingsGroup>

        <SkySettingsGroup :title="phone.t('Apps.settings.deviceInformation')">
          <SkySettingsRow
            :title="phone.t('Apps.settings.imei')"
            :value="phone.device?.imei ?? '—'"
          />
          <SkySettingsRow
            :title="phone.t('Apps.settings.simNumber')"
            :value="
              phone.device?.sim
                ? formatPhoneNumber(phone.device.sim.number)
                : phone.t('Apps.settings.noSim')
            "
          />
          <SkySettingsRow
            v-if="phone.device?.sim?.removable"
            :title="phone.t('Apps.settings.simType')"
            :value="
              phone.t(
                phone.device.sim.type === 'registered'
                  ? 'Apps.settings.registeredSim'
                  : 'Apps.settings.anonymousSim',
              )
            "
          />
          <SkySettingsRow
            v-if="phone.device?.sim?.removable"
            kind="action"
            tone="danger"
            :title="phone.t('Apps.settings.ejectSim')"
            @activate="simEjectOpened = true"
          />
          <SkySettingsRow
            kind="action"
            tone="danger"
            :title="phone.t('Apps.settings.factoryReset')"
            @activate="resetOpened = true"
          >
            <template #leading>
              <RotateCcw :size="18" aria-hidden="true" />
            </template>
          </SkySettingsRow>
        </SkySettingsGroup>
      </template>

      <template v-else-if="activeView === 'appearance'">
        <SkySettingsGroup :title="phone.t('Apps.settings.graphicsMode')">
          <SkySettingsRow
            v-for="mode in GRAPHICS_MODE_IDS"
            :key="mode"
            kind="choice"
            :selected="phone.preferences.settings.graphicsMode === mode"
            :title="phone.t('Apps.settings.' + mode + 'Mode')"
            :description="phone.t('Apps.settings.' + mode + 'ModeDescription')"
            @activate="selectGraphicsMode(mode)"
          />
        </SkySettingsGroup>

        <SkySettingsGroup :title="phone.t('Apps.settings.appearanceMode')">
          <SkySettingsRow
            v-for="mode in APPEARANCE_MODE_IDS"
            :key="mode"
            kind="choice"
            :selected="phone.preferences.settings.appearanceMode === mode"
            :title="phone.t('Apps.settings.' + mode)"
            @activate="selectAppearanceMode(mode)"
          />
        </SkySettingsGroup>

        <SkySettingsGroup
          :aria-label="phone.t('Apps.settings.screenBrightness')"
        >
          <SkySettingsRangeRow
            :model-value="phone.preferences.settings.screenBrightness"
            :title="phone.t('Apps.settings.screenBrightness')"
            :value-label="phone.preferences.settings.screenBrightness + '%'"
            :aria-value-text="phone.preferences.settings.screenBrightness + '%'"
            :min="10"
            :max="100"
            @update:model-value="
              updateNumberPreference('screenBrightness', $event)
            "
          />
        </SkySettingsGroup>

        <SkySettingsGroup :aria-label="phone.t('Apps.settings.phoneScale')">
          <SkySettingsRangeRow
            :model-value="phone.preferences.settings.phoneScale"
            :title="phone.t('Apps.settings.phoneScale')"
            :value-label="phone.preferences.settings.phoneScale + '%'"
            :aria-value-text="phone.preferences.settings.phoneScale + '%'"
            :min="PHONE_SCALE_MIN"
            :max="PHONE_SCALE_MAX"
            :step="PHONE_SCALE_STEP"
            @update:model-value="updateNumberPreference('phoneScale', $event)"
          />
        </SkySettingsGroup>

        <SkySettingsGroup :title="phone.t('Apps.settings.phoneFrame')">
          <SkySettingsRow
            kind="navigation"
            :title="phone.t('Apps.settings.phoneFrame')"
            @activate="framePickerOpened = true"
          >
            <template #trailing>
              <span
                class="settings-frame-swatch"
                :style="{ background: selectedFrameColor }"
                aria-hidden="true"
              />
            </template>
          </SkySettingsRow>
        </SkySettingsGroup>
      </template>

      <template v-else-if="activeView === 'wallpaper'">
        <section class="settings-wallpaper-actions">
          <button type="button" @click="openWallpaperMedia('photos')">
            <span class="settings-wallpaper-actions__icon" aria-hidden="true">
              <Images />
            </span>
            <span>
              <strong>{{
                phone.t('Apps.settings.wallpaperFromPhotos')
              }}</strong>
              <small>{{
                phone.t('Apps.settings.wallpaperFromPhotosDescription')
              }}</small>
            </span>
          </button>
          <button type="button" @click="openWallpaperMedia('camera')">
            <span class="settings-wallpaper-actions__icon" aria-hidden="true">
              <Camera />
            </span>
            <span>
              <strong>{{
                phone.t('Apps.settings.wallpaperFromCamera')
              }}</strong>
              <small>{{
                phone.t('Apps.settings.wallpaperFromCameraDescription')
              }}</small>
            </span>
          </button>
        </section>

        <section
          v-if="wallpaperHistory.length"
          class="settings-wallpaper-section"
        >
          <h2>{{ phone.t('Apps.settings.wallpaperHistory') }}</h2>
          <div class="settings-wallpaper-history">
            <button
              v-for="(entry, index) in wallpaperHistory"
              :key="`${entry.wallpaper}-${entry.imageUrl ?? index}`"
              type="button"
              :class="[
                `wallpaper--${entry.wallpaper}`,
                {
                  'settings-wallpaper-history__item--selected':
                    phone.preferences.settings.wallpaper === entry.wallpaper &&
                    phone.preferences.settings.wallpaperImageUrl ===
                      entry.imageUrl,
                },
              ]"
              :style="wallpaperPreviewStyle(entry)"
              :aria-label="
                entry.wallpaper === 'custom'
                  ? phone.t('Apps.settings.wallpaperCustom')
                  : phone.t('Apps.settings.wallpapers.' + entry.wallpaper)
              "
              @click="selectWallpaperHistory(entry)"
            >
              <Check
                v-if="
                  phone.preferences.settings.wallpaper === entry.wallpaper &&
                  phone.preferences.settings.wallpaperImageUrl ===
                    entry.imageUrl
                "
                aria-hidden="true"
              />
            </button>
          </div>
        </section>

        <section class="settings-wallpaper-section">
          <h2>{{ phone.t('Apps.settings.wallpaperPicker') }}</h2>
          <div class="settings-wallpaper-grid">
            <button
              v-for="wallpaper in WALLPAPER_IDS"
              :key="wallpaper"
              type="button"
              class="settings-wallpaper-choice"
              :class="{
                'settings-wallpaper-choice--selected':
                  phone.preferences.settings.wallpaper === wallpaper,
              }"
              :aria-pressed="phone.preferences.settings.wallpaper === wallpaper"
              @click="phone.setWallpaper(wallpaper)"
            >
              <span
                class="settings-wallpaper-choice__preview"
                :class="`wallpaper--${wallpaper}`"
                aria-hidden="true"
              >
                <span class="settings-wallpaper-choice__screen"></span>
                <Check
                  v-if="phone.preferences.settings.wallpaper === wallpaper"
                />
              </span>
              <strong>{{
                phone.t('Apps.settings.wallpapers.' + wallpaper)
              }}</strong>
            </button>
          </div>
        </section>
      </template>
    </SkyScrollArea>

    <PhonePasscode
      v-if="passcodeFlow"
      :busy="passcodeBusy"
      :error="passcodeError"
      :length="passcodeLength"
      :reset-key="passcodeResetKey"
      :subtitle="phone.t('Apps.settings.passcode.screenSubtitle')"
      :title="passcodeTitle"
      @cancel="cancelPasscodeFlow"
      @complete="submitSettingsPasscode"
    />

    <div
      v-if="factoryResetting"
      class="settings-reset-overlay"
      aria-live="polite"
    >
      <div class="settings-reset-progress">
        <strong>{{ Math.floor(factoryResetProgress) }}%</strong>
        <SkyProgress
          :label="phone.t('Apps.settings.factoryResetProgress')"
          :progress="factoryResetProgress / 100"
        />
      </div>
      <h2>{{ phone.t('Apps.settings.factoryResetProgress') }}</h2>
      <p>{{ phone.t('Apps.settings.factoryResetWarning') }}</p>
    </div>

    <SkyDialog
      :opened="framePickerOpened"
      :title="phone.t('Apps.settings.phoneFrame')"
      @backdropclick="framePickerOpened = false"
      @escape="framePickerOpened = false"
    >
      <div
        class="settings-frame-grid"
        role="group"
        :aria-label="phone.t('Apps.settings.phoneFrame')"
      >
        <button
          v-for="frame in PHONE_FRAME_IDS"
          :key="frame"
          type="button"
          class="settings-frame-choice"
          :class="{
            'settings-frame-choice--selected':
              phone.preferences.settings.frame === frame,
          }"
          :aria-label="phone.t('Apps.settings.frames.' + frame)"
          :aria-pressed="phone.preferences.settings.frame === frame"
          @click="selectFrame(frame)"
        >
          <span
            class="settings-frame-choice__swatch"
            :style="{ background: PHONE_FRAME_COLORS[frame] }"
            aria-hidden="true"
          />
          <Check
            v-if="phone.preferences.settings.frame === frame"
            :size="17"
            aria-hidden="true"
          />
        </button>
      </div>
      <template #buttons>
        <SkyDialogButton @click="framePickerOpened = false">
          {{ phone.t('Common.cancel') }}
        </SkyDialogButton>
      </template>
    </SkyDialog>

    <SkyDialog
      :opened="removeDeviceOpened"
      :title="phone.t('Apps.settings.removeDevice')"
      :content="phone.t('Apps.settings.removeDeviceBody')"
      @backdropclick="removeDeviceOpened = false"
      @escape="removeDeviceOpened = false"
    >
      <SkySettingsGroup :aria-label="phone.t('Apps.mail.password')">
        <SkyField
          v-model="removeDevicePassword"
          type="password"
          :label="phone.t('Apps.mail.password')"
          autocomplete="current-password"
        />
      </SkySettingsGroup>
      <template #buttons>
        <SkyDialogButton @click="removeDeviceOpened = false">
          {{ phone.t('Common.cancel') }}
        </SkyDialogButton>
        <SkyDialogButton
          class="settings-dialog-button--danger"
          strong
          @click="confirmRemoveDevice"
        >
          {{ phone.t('Apps.settings.removeDevice') }}
        </SkyDialogButton>
      </template>
    </SkyDialog>

    <SkyDialog
      v-if="phone.device?.sim?.removable"
      :opened="simEjectOpened"
      :title="phone.t('Apps.settings.ejectSim')"
      :content="phone.t('Apps.settings.ejectSimBody')"
      @backdropclick="simEjectOpened = false"
      @escape="simEjectOpened = false"
    >
      <template #buttons>
        <SkyDialogButton @click="simEjectOpened = false">
          {{ phone.t('Common.cancel') }}
        </SkyDialogButton>
        <SkyDialogButton
          class="settings-dialog-button--danger"
          strong
          @click="confirmSimEject"
        >
          {{ phone.t('Apps.settings.ejectSim') }}
        </SkyDialogButton>
      </template>
    </SkyDialog>

    <SkyDialog
      :opened="resetOpened"
      :title="phone.t('Apps.settings.factoryReset')"
      :content="phone.t('Apps.settings.factoryResetBody')"
      @backdropclick="resetOpened = false"
      @escape="resetOpened = false"
    >
      <template #buttons>
        <SkyDialogButton @click="resetOpened = false">
          {{ phone.t('Common.cancel') }}
        </SkyDialogButton>
        <SkyDialogButton
          class="settings-dialog-button--danger"
          strong
          @click="confirmFactoryReset"
        >
          {{ phone.t('Common.reset') }}
        </SkyDialogButton>
      </template>
    </SkyDialog>

    <SkyToast
      :opened="Boolean(accountToast)"
      position="center"
      vertical-position="center"
      @click="accountToast = ''"
    >
      {{ accountToast }}
    </SkyToast>
  </SkyAppPage>
</template>

<style scoped>
.settings-search {
  margin-bottom: var(--sky-space-4);
}

.settings-content {
  padding-top: var(--sky-space-2);
}

.settings-content--subpage {
  padding-top: 0;
}

.settings-copy {
  margin: 0 var(--sky-space-1) var(--sky-space-4);
  color: var(--sky-muted);
  font-size: 13px;
  line-height: 18px;
}

.settings-primary-action {
  margin-bottom: var(--sky-space-5);
}

.settings-account-suffix {
  color: var(--sky-muted);
  font-size: 14px;
  white-space: nowrap;
}

.settings-segmented-row {
  min-width: 0;
  padding: var(--sky-space-2) var(--sky-space-3);
  list-style: none;
}

.settings-app-icon {
  width: 32px;
  height: 32px;
  display: block;
  object-fit: contain;
}

.settings-frame-swatch {
  width: 28px;
  height: 28px;
  display: block;
  flex: none;
  border: 1px solid var(--sky-hairline);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgb(0 0 0 / 18%);
}

.settings-wallpaper-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sky-space-2);
  margin-bottom: var(--sky-space-5);
}

.settings-wallpaper-actions > button {
  min-width: 0;
  min-height: 116px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sky-space-3);
  padding: var(--sky-space-4);
  border: 1px solid var(--sky-hairline);
  border-radius: 20px;
  background: var(--sky-surface);
  color: var(--sky-text);
  text-align: left;
  box-shadow: 0 8px 20px rgb(0 0 0 / 8%);
  cursor: pointer;
  transition:
    transform 150ms ease,
    background 150ms ease;
}

.settings-wallpaper-actions > button:hover {
  background: var(--sky-surface-muted);
}

.settings-wallpaper-actions > button:active {
  transform: scale(0.97);
}

.settings-wallpaper-actions > button:focus-visible,
.settings-wallpaper-history > button:focus-visible,
.settings-wallpaper-choice:focus-visible {
  outline: 2px solid var(--sky-app-accent);
  outline-offset: 2px;
}

.settings-wallpaper-actions__icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--sky-app-accent-soft);
  color: var(--sky-app-accent);
}

.settings-wallpaper-actions__icon > svg {
  width: 21px;
  height: 21px;
}

.settings-wallpaper-actions strong,
.settings-wallpaper-actions small {
  display: block;
}

.settings-wallpaper-actions strong {
  font-size: 14px;
  line-height: 18px;
}

.settings-wallpaper-actions small {
  margin-top: 3px;
  color: var(--sky-muted);
  font-size: 11px;
  line-height: 14px;
}

.settings-wallpaper-section {
  margin-bottom: var(--sky-space-5);
}

.settings-wallpaper-section > h2 {
  margin: 0 var(--sky-space-1) var(--sky-space-2);
  color: var(--sky-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.settings-wallpaper-history {
  display: flex;
  gap: var(--sky-space-2);
  overflow-x: auto;
  padding: 2px var(--sky-space-1) var(--sky-space-2);
  scrollbar-width: none;
}

.settings-wallpaper-history::-webkit-scrollbar {
  display: none;
}

.settings-wallpaper-history > button {
  width: 62px;
  height: 88px;
  position: relative;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 15px;
  background-position: center;
  background-size: cover;
  color: #ffffff;
  box-shadow: 0 5px 14px rgb(0 0 0 / 18%);
  cursor: pointer;
}

.settings-wallpaper-history > button::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid rgb(255 255 255 / 13%);
  border-radius: inherit;
  pointer-events: none;
}

.settings-wallpaper-history > button > svg {
  width: 21px;
  height: 21px;
  position: relative;
  z-index: 1;
  padding: 4px;
  border-radius: 50%;
  background: var(--sky-app-accent);
  stroke-width: 3;
}

.settings-wallpaper-history__item--selected {
  border-color: var(--sky-app-accent) !important;
}

.settings-wallpaper-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sky-space-3);
}

.settings-wallpaper-choice {
  min-width: 0;
  padding: 0 0 var(--sky-space-2);
  border: 0;
  border-radius: 21px;
  background: var(--sky-surface);
  color: var(--sky-text);
  text-align: left;
  box-shadow: 0 8px 20px rgb(0 0 0 / 8%);
  cursor: pointer;
  transition:
    transform 150ms ease,
    box-shadow 150ms ease;
}

.settings-wallpaper-choice:hover {
  box-shadow: 0 11px 24px rgb(0 0 0 / 13%);
}

.settings-wallpaper-choice:active {
  transform: scale(0.98);
}

.settings-wallpaper-choice__preview {
  aspect-ratio: 0.78;
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 21px 21px 14px 14px;
  background-position: center;
  background-size: cover;
}

.settings-wallpaper-choice__screen {
  width: 28%;
  height: 7px;
  position: absolute;
  top: 8px;
  left: 50%;
  border-radius: 999px;
  background: rgb(0 0 0 / 58%);
  transform: translateX(-50%);
}

.settings-wallpaper-choice__preview > svg {
  width: 26px;
  height: 26px;
  padding: 5px;
  border-radius: 50%;
  background: var(--sky-app-accent);
  color: #ffffff;
  stroke-width: 3;
}

.settings-wallpaper-choice > strong {
  display: block;
  overflow: hidden;
  padding: var(--sky-space-2) var(--sky-space-3) 0;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-wallpaper-choice--selected .settings-wallpaper-choice__preview {
  border-color: var(--sky-app-accent);
}

.settings-frame-grid {
  display: grid;
  grid-template-columns: repeat(3, 52px);
  justify-content: center;
  gap: var(--sky-space-2);
  margin-top: var(--sky-space-4);
}

.settings-frame-choice {
  width: 52px;
  height: 52px;
  position: relative;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--sky-radius-control);
  background: transparent;
  color: #ffffff;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.settings-frame-choice:focus-visible {
  outline: 2px solid var(--sky-app-accent);
  outline-offset: 1px;
}

.settings-frame-choice:active {
  background: var(--sky-app-accent-soft);
}

.settings-frame-choice__swatch {
  width: 40px;
  height: 40px;
  display: block;
  border: 1px solid var(--sky-hairline);
  border-radius: 50%;
  box-shadow: 0 1px 4px rgb(0 0 0 / 22%);
}

.settings-frame-choice > svg {
  position: absolute;
}

.settings-frame-choice--selected .settings-frame-choice__swatch {
  box-shadow:
    0 0 0 2px var(--sky-surface),
    0 0 0 4px var(--sky-app-accent);
}

.settings-reset-overlay {
  position: absolute;
  z-index: 100;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--sky-space-6);
  background: #000000;
  color: #ffffff;
  text-align: center;
}

.settings-reset-progress {
  width: min(240px, 80%);
}

.settings-reset-progress strong {
  display: block;
  margin-bottom: var(--sky-space-3);
  font-size: 28px;
  font-variant-numeric: tabular-nums;
}

.settings-reset-overlay h2 {
  margin: var(--sky-space-5) 0 0;
  font-size: 20px;
}

.settings-reset-overlay p {
  max-width: 270px;
  margin: var(--sky-space-2) 0 0;
  color: rgb(255 255 255 / 62%);
  font-size: 13px;
  line-height: 18px;
}

.settings-dialog-button--danger {
  color: var(--sky-danger);
}

@media (prefers-reduced-motion: reduce) {
  .settings-frame-choice,
  .settings-wallpaper-actions > button,
  .settings-wallpaper-choice {
    transition: none;
  }
}
</style>
