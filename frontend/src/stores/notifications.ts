import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { isPhoneAppId } from '@/config/apps'
import { usePhoneStore } from '@/stores/phone'
import type { LaunchablePhoneAppId } from '@/types/apps'
import { nuiCall } from '@/utils/nui'
import type { PhonePreferencesV1 } from '@/utils/preferences'
import { playPhoneTone, type PhoneToneId } from '@/utils/tones'

export type PhoneNotificationDevice = {
  imei: string
  name: string
  preferences: PhonePreferencesV1
}

export type PhoneNotificationInput = {
  appId: LaunchablePhoneAppId
  critical?: boolean
  device?: PhoneNotificationDevice
  persistent?: boolean
  sound?: PhoneToneId
  subtitle?: string
  text: string
  title: string
}

export type PhoneNotification = PhoneNotificationInput & {
  id: string
}

type PersistedPhoneNotification = Pick<
  PhoneNotification,
  'appId' | 'id' | 'subtitle' | 'text' | 'title'
>

type PersistedNotificationsV1 = {
  items: PersistedPhoneNotification[]
  version: 1
}

const timeoutHandles = new Map<string, ReturnType<typeof setTimeout>>()
const stopToneHandles = new Map<string, () => void>()
const persistenceQueues = new Map<string, Promise<void>>()

export const useNotificationsStore = defineStore('notifications', () => {
  const phone = usePhoneStore()
  const queue = ref<PhoneNotification[]>([])
  const deviceQueue = ref<PhoneNotification[]>([])
  const lockScreenQueues = ref<Record<string, PhoneNotification[]>>({})
  const current = computed(() => queue.value[0] ?? null)
  const devicePreviews = computed(() => {
    const devices = new Set<string>()
    return deviceQueue.value.filter((notification) => {
      const imei = notification.device?.imei
      if (!imei || devices.has(imei)) return false
      devices.add(imei)
      return true
    })
  })
  const isPeeking = computed(() => !!current.value && !phone.isOpen)
  const lockScreenNotifications = computed(() => {
    const imei = phone.device?.imei
    if (!imei) return []
    return [...(lockScreenQueues.value[imei] ?? [])].reverse()
  })
  const requiresAttention = computed(
    () =>
      !phone.isOpen &&
      (!!current.value?.persistent ||
        devicePreviews.value.some((notification) => notification.persistent)),
  )

  function persist(imei: string): void {
    const items = (lockScreenQueues.value[imei] ?? []).map(
      ({ appId, id, subtitle, text, title }) => ({
        appId,
        id,
        ...(subtitle ? { subtitle } : {}),
        text,
        title,
      }),
    )
    const previous = persistenceQueues.get(imei) ?? Promise.resolve()
    const queued = previous.then(async () => {
      const response = await nuiCall('notifications:save', {
        imei,
        payload: { items, version: 1 },
      })
      if (!response.success) {
        console.error(
          `[Phone notifications] Could not persist notifications for ${imei}: ${response.error ?? 'request_failed'}`,
        )
      }
    })
    const tracked = queued.finally(() => {
      if (persistenceQueues.get(imei) === tracked)
        persistenceQueues.delete(imei)
    })
    persistenceQueues.set(imei, tracked)
  }

  function hydrate(payload: unknown, imei: string): void {
    const stored: PhoneNotification[] = []
    if (payload !== undefined && payload !== null) {
      if (
        typeof payload !== 'object' ||
        (payload as Partial<PersistedNotificationsV1>).version !== 1 ||
        !Array.isArray((payload as Partial<PersistedNotificationsV1>).items)
      ) {
        console.error('[Phone notifications] Invalid persisted notification data.')
      } else {
        for (const item of (payload as PersistedNotificationsV1).items) {
          if (
            typeof item?.id !== 'string' ||
            typeof item?.appId !== 'string' ||
            !isPhoneAppId(item.appId) ||
            typeof item?.text !== 'string' ||
            typeof item?.title !== 'string' ||
            (item.subtitle !== undefined && typeof item.subtitle !== 'string')
          ) {
            console.error('[Phone notifications] Ignored an invalid persisted notification.')
            continue
          }
          stored.push({
            appId: item.appId,
            id: item.id,
            ...(item.subtitle ? { subtitle: item.subtitle } : {}),
            text: item.text,
            title: item.title,
          })
        }
      }
    }

    const merged = new Map<string, PhoneNotification>()
    for (const notification of stored) merged.set(notification.id, notification)
    for (const notification of lockScreenQueues.value[imei] ?? [])
      merged.set(notification.id, notification)
    lockScreenQueues.value[imei] = [...merged.values()]
    persist(imei)
  }

  function deactivate(id: string): void {
    const timeout = timeoutHandles.get(id)
    if (timeout) clearTimeout(timeout)
    timeoutHandles.delete(id)
    stopToneHandles.get(id)?.()
    stopToneHandles.delete(id)
  }

  function remember(notification: PhoneNotification): void {
    const imei = notification.device?.imei ?? phone.device?.imei
    if (!imei) return
    const notifications = lockScreenQueues.value[imei] ?? []
    notifications.push(notification)
    lockScreenQueues.value[imei] = notifications
    persist(imei)
  }

  function activate(notification: PhoneNotification): void {
    const preferences = notification.device?.preferences ?? phone.preferences
    const appPreferences =
      preferences.settings.notifications[notification.appId]
    if (appPreferences.sounds || notification.critical) {
      const sound = notification.sound ?? preferences.settings.notificationSound
      const volume = notification.critical
        ? preferences.settings.ringtoneVolume
        : preferences.settings.notificationVolume
      stopToneHandles.set(
        notification.id,
        playPhoneTone(sound, volume, !!notification.persistent),
      )
    }

    if (!notification.persistent) {
      timeoutHandles.set(
        notification.id,
        setTimeout(
          () => dismiss(notification.id),
          preferences.settings.notificationDurationSeconds * 1000,
        ),
      )
    }
  }

  function dismiss(id: string): void {
    const index = queue.value.findIndex(
      (notification) => notification.id === id,
    )
    const deviceIndex = deviceQueue.value.findIndex(
      (notification) => notification.id === id,
    )
    if (index < 0 && deviceIndex < 0) return
    deactivate(id)

    if (index >= 0) {
      const wasCurrent = index === 0
      queue.value.splice(index, 1)
      if (wasCurrent && current.value) activate(current.value)
      return
    }

    const imei = deviceQueue.value[deviceIndex].device?.imei
    const wasDeviceCurrent = !deviceQueue.value
      .slice(0, deviceIndex)
      .some((notification) => notification.device?.imei === imei)
    deviceQueue.value.splice(deviceIndex, 1)
    if (wasDeviceCurrent) {
      const next = deviceQueue.value.find(
        (notification) => notification.device?.imei === imei,
      )
      if (next) activate(next)
    }
  }

  function dismissCurrent(): void {
    if (current.value) dismiss(current.value.id)
  }

  function dismissFromLockScreen(id: string): void {
    dismiss(id)
    const imei = phone.device?.imei
    if (!imei) return
    const notifications = lockScreenQueues.value[imei]
    if (!notifications) return
    const index = notifications.findIndex((notification) => notification.id === id)
    if (index >= 0) notifications.splice(index, 1)
    persist(imei)
  }

  function clearLockScreen(): void {
    const imei = phone.device?.imei
    if (!imei) return
    for (const notification of [...(lockScreenQueues.value[imei] ?? [])])
      dismiss(notification.id)
    lockScreenQueues.value[imei] = []
    persist(imei)
  }

  function hideDevicePreview(imei: string): void {
    for (let index = deviceQueue.value.length - 1; index >= 0; index -= 1) {
      const notification = deviceQueue.value[index]
      if (notification.device?.imei !== imei) continue
      deactivate(notification.id)
      deviceQueue.value.splice(index, 1)
    }
  }

  function show(input: PhoneNotificationInput): string | null {
    const preferences = input.device?.preferences ?? phone.preferences
    const appPreferences = preferences.settings.notifications[input.appId]
    if (!appPreferences) {
      console.error(`[Phone notifications] Unknown app: ${input.appId}`)
      return null
    }
    if (!input.critical && preferences.settings.focusMode) return null
    if (!input.critical && !appPreferences.enabled) {
      return null
    }
    if (input.critical) {
      const pending = input.device
        ? deviceQueue.value.filter(
            (notification) => notification.device?.imei === input.device?.imei,
          )
        : queue.value
      for (const notification of [...pending]) dismiss(notification.id)
    }
    const notification: PhoneNotification = {
      ...input,
      id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    }
    remember(notification)
    if (notification.device) {
      const isFirstForDevice = !deviceQueue.value.some(
        (pending) => pending.device?.imei === notification.device?.imei,
      )
      deviceQueue.value.push(notification)
      if (isFirstForDevice) activate(notification)
    } else {
      queue.value.push(notification)
      if (queue.value.length === 1) activate(notification)
    }
    return notification.id
  }

  return {
    current,
    clearLockScreen,
    devicePreviews,
    dismiss,
    dismissCurrent,
    dismissFromLockScreen,
    hideDevicePreview,
    hydrate,
    isPeeking,
    lockScreenNotifications,
    queue,
    requiresAttention,
    show,
  }
})
