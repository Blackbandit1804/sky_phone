<script setup lang="ts">
import { kNotification } from 'konsta/vue'
import { computed } from 'vue'

import { getPhoneApp } from '@/config/apps'
import type { PhoneNotification } from '@/stores/notifications'
import { usePhoneStore } from '@/stores/phone'

const props = defineProps<{
  notification: PhoneNotification | null
}>()
const emit = defineEmits<{
  close: []
  open: [notification: PhoneNotification]
}>()
const phone = usePhoneStore()
const icon = computed(() =>
  props.notification
    ? getPhoneApp(props.notification.appId)?.iconImage
    : undefined,
)

function openNotification(event: MouseEvent): void {
  if (
    !props.notification?.route ||
    (event.target as HTMLElement).closest('button')
  ) {
    return
  }
  emit('open', props.notification)
}
</script>

<template>
  <k-notification
    :opened="!!notification"
    :title="notification?.title"
    :subtitle="notification?.subtitle"
    :text="notification?.text"
    :title-right-text="phone.t('Notifications.now')"
    button="close"
    class="phone-notification"
    :class="{ 'is-actionable': !!notification?.route }"
    @close="emit('close')"
    @click="openNotification"
  >
    <template v-if="icon" #icon>
      <img :src="icon" alt="" class="phone-notification__icon" />
    </template>
    <template #button>
      <span class="sr-only">{{ phone.t('Common.close') }}</span>
    </template>
  </k-notification>
</template>
