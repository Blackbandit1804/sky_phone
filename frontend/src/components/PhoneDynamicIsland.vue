<script setup lang="ts">
import { Phone, PhoneOff } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import { useCallsStore } from '@/stores/calls'
import { usePhoneStore } from '@/stores/phone'
import { SkyButton } from '@/ui'

const emit = defineEmits<{ accepted: [] }>()
const calls = useCallsStore()
const phone = usePhoneStore()
const pendingAction = ref<'answer' | 'decline' | null>(null)

const incomingCall = computed(() => {
  const call = calls.activeCall
  return call?.direction === 'incoming' && call.state === 'ringing'
    ? call
    : null
})

const callerLabel = computed(() => {
  const number = incomingCall.value?.otherNumber ?? ''
  return (
    calls.contacts.find((contact) => contact.phone_number === number)?.name ||
    number
  )
})

async function answer(): Promise<void> {
  if (pendingAction.value || !incomingCall.value) return
  pendingAction.value = 'answer'
  const response = await calls.answer()
  pendingAction.value = null
  if (response.success) emit('accepted')
}

async function decline(): Promise<void> {
  if (pendingAction.value || !incomingCall.value) return
  pendingAction.value = 'decline'
  await calls.decline()
  pendingAction.value = null
}
</script>

<template>
  <Transition name="phone-dynamic-island">
    <aside
      v-if="incomingCall"
      class="phone-dynamic-island sky-ui-provider sky-ui-provider--dark"
      :aria-label="phone.t('Apps.phone.incoming')"
      role="region"
    >
      <div class="phone-dynamic-island__caller">
        <span>{{ phone.t('Apps.phone.incoming') }}</span>
        <strong>{{ callerLabel }}</strong>
      </div>
      <div class="phone-dynamic-island__actions">
        <SkyButton
          :aria-label="phone.t('Apps.phone.decline')"
          :disabled="pendingAction !== null"
          icon-only
          rounded
          variant="danger"
          @click="decline"
        >
          <PhoneOff aria-hidden="true" />
        </SkyButton>
        <SkyButton
          :aria-label="phone.t('Apps.phone.answer')"
          :disabled="pendingAction !== null"
          icon-only
          rounded
          class="phone-dynamic-island__answer"
          @click="answer"
        >
          <Phone aria-hidden="true" />
        </SkyButton>
      </div>
    </aside>
  </Transition>
</template>
