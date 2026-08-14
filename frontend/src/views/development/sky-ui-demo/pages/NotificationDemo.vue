<script setup lang="ts">
import { BellRing } from 'lucide-vue-next'
import { onBeforeUnmount, reactive, ref } from 'vue'

import {
  SkyBlock,
  SkyButton,
  SkyDialog,
  SkyDialogButton,
  SkyIcon,
  SkyNotification,
} from '@/ui'

import SkyUiDemoPage from '../SkyUiDemoPage.vue'

type NotificationId =
  | 'notificationCallbackOnClose'
  | 'notificationCloseOnClick'
  | 'notificationFull'
  | 'notificationWithButton'

const opened = reactive<Record<NotificationId, boolean>>({
  notificationCallbackOnClose: false,
  notificationCloseOnClick: false,
  notificationFull: false,
  notificationWithButton: false,
})
const alertOpened = ref(false)
let autoCloseTimer: number | null = null

function clearAutoCloseTimer(): void {
  if (autoCloseTimer === null) return
  window.clearTimeout(autoCloseTimer)
  autoCloseTimer = null
}

function closeAllNotifications(): void {
  opened.notificationCallbackOnClose = false
  opened.notificationCloseOnClick = false
  opened.notificationFull = false
  opened.notificationWithButton = false
}

function openNotification(id: NotificationId): void {
  clearAutoCloseTimer()
  closeAllNotifications()
  opened[id] = true

  if (id === 'notificationFull') {
    autoCloseTimer = window.setTimeout(() => {
      opened.notificationFull = false
      autoCloseTimer = null
    }, 3000)
  }
}

function closeWithCallback(): void {
  opened.notificationCallbackOnClose = false
  alertOpened.value = true
}

onBeforeUnmount(clearAutoCloseTimer)
</script>

<template>
  <SkyUiDemoPage title="Notification">
    <SkyBlock class="sky-ui-demo-stack" inset strong>
      <p class="sky-ui-demo-copy">
        Sky UI comes with a Notifications component that allows you to show
        useful messages to users and request basic actions.
      </p>
      <SkyButton rounded @click="openNotification('notificationFull')">
        Full layout notification
      </SkyButton>
      <SkyButton rounded @click="openNotification('notificationWithButton')">
        With Close Button
      </SkyButton>
      <SkyButton rounded @click="openNotification('notificationCloseOnClick')">
        Click to Close
      </SkyButton>
      <SkyButton
        rounded
        @click="openNotification('notificationCallbackOnClose')"
      >
        Callback on Close
      </SkyButton>
    </SkyBlock>

    <template #fixed>
      <SkyNotification
        :opened="opened.notificationFull"
        role="alert"
        subtitle="This is a subtitle"
        text="This is a simple notification message"
        title="Sky UI"
        title-right-text="now"
      >
        <template #icon>
          <span class="sky-ui-demo-notification__icon">
            <SkyIcon :size="24"><BellRing /></SkyIcon>
          </span>
        </template>
      </SkyNotification>

      <SkyNotification
        close-label="Close notification"
        :opened="opened.notificationWithButton"
        subtitle="Notification with close button"
        text="Click (x) button to close me"
        title="Sky UI"
        @close="opened.notificationWithButton = false"
      >
        <template #icon>
          <span class="sky-ui-demo-notification__icon">
            <SkyIcon :size="24"><BellRing /></SkyIcon>
          </span>
        </template>
      </SkyNotification>

      <SkyNotification
        :opened="opened.notificationCloseOnClick"
        subtitle="Notification with close on click"
        text="Click me to close"
        title="Sky UI"
        title-right-text="now"
        @click="opened.notificationCloseOnClick = false"
      >
        <template #icon>
          <span class="sky-ui-demo-notification__icon">
            <SkyIcon :size="24"><BellRing /></SkyIcon>
          </span>
        </template>
      </SkyNotification>

      <SkyNotification
        :opened="opened.notificationCallbackOnClose"
        subtitle="Notification with close on click"
        text="Click me to close"
        title="Sky UI"
        title-right-text="now"
        @click="closeWithCallback"
      >
        <template #icon>
          <span class="sky-ui-demo-notification__icon">
            <SkyIcon :size="24"><BellRing /></SkyIcon>
          </span>
        </template>
      </SkyNotification>

      <SkyDialog
        content="Notification closed"
        :opened="alertOpened"
        title="Sky UI"
        @backdropclick="alertOpened = false"
        @escape="alertOpened = false"
      >
        <template #buttons>
          <SkyDialogButton strong @click="alertOpened = false"
            >Ok</SkyDialogButton
          >
        </template>
      </SkyDialog>
    </template>
  </SkyUiDemoPage>
</template>

<style scoped>
.sky-ui-demo-notification__icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--sky-app-accent-soft);
  color: var(--sky-app-accent);
}
</style>
