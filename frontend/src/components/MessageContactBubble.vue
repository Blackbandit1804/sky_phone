<script setup lang="ts">
import { kButton } from 'konsta/vue'
import {
  Check,
  ChevronRight,
  MessageCircle,
  UserRound,
  UserPlus,
} from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import type { SmsSharedContact } from '@/types/messages'

const props = defineProps<{
  addLabel: string
  contact: SmsSharedContact
  messageLabel: string
  saved: boolean
  savedLabel: string
}>()
const emit = defineEmits<{ message: []; save: [] }>()
const imageFailed = ref(false)
watch(
  () => props.contact.avatar_url,
  () => {
    imageFailed.value = false
  },
)
const displayName = computed(
  () => props.contact.name.trim() || props.contact.phone_number,
)
const showNumber = computed(() => Boolean(props.contact.name.trim()))
const initials = computed(() =>
  displayName.value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join(''),
)
</script>

<template>
  <div class="message-contact-card">
    <div class="message-contact-card__identity">
      <span class="message-contact-card__avatar">
        <img
          v-if="contact.avatar_url && !imageFailed"
          :src="contact.avatar_url"
          alt=""
          @error="imageFailed = true"
        />
        <b v-else-if="initials">{{ initials }}</b>
        <UserRound v-else :size="28" />
      </span>
      <div>
        <strong>{{ displayName }}</strong>
        <small v-if="contact.organization">{{ contact.organization }}</small>
        <small v-if="showNumber">({{ contact.phone_number }})</small>
      </div>
      <ChevronRight :size="20" class="message-contact-card__chevron" />
    </div>
    <div class="message-contact-card__actions">
      <k-button rounded tonal @click.stop="emit('message')">
        <MessageCircle :size="17" />
        {{ messageLabel }}
      </k-button>
      <k-button
        rounded
        tonal
        :disabled="saved"
        @click.stop="emit('save')"
      >
        <Check v-if="saved" :size="17" />
        <UserPlus v-else :size="17" />
        {{ saved ? savedLabel : addLabel }}
      </k-button>
    </div>
  </div>
</template>

<style scoped>
.message-contact-card {
  width: min(258px, 100%);
  width: min(258px, 72cqw);
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 48%);
  border-radius: 21px;
  color: #151517;
  background: linear-gradient(155deg, rgb(255 255 255 / 96%), #edf5ff);
  box-shadow: 0 8px 24px rgb(22 63 112 / 14%);
}

.message-contact-card__identity {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 11px;
  min-height: 82px;
  padding: 13px 12px;
}

.message-contact-card__avatar {
  width: 58px;
  height: 58px;
  overflow: hidden;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: white;
  background: linear-gradient(145deg, #64d2ff, #0a84ff);
  box-shadow: 0 4px 14px rgb(10 132 255 / 24%);
}

.message-contact-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message-contact-card__identity b {
  font-size: 18px;
}

.message-contact-card__identity div,
.message-contact-card__identity strong,
.message-contact-card__identity small {
  min-width: 0;
}

.message-contact-card__identity strong,
.message-contact-card__identity small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-contact-card__identity strong {
  font-size: 16px;
  line-height: 1.2;
}

.message-contact-card__identity small {
  margin-top: 3px;
  color: #6e6e73;
  font-size: 11.5px;
}

.message-contact-card__chevron {
  color: #8e8e93;
}

.message-contact-card__actions {
  display: grid;
  gap: 1px;
  padding: 8px;
  border-top: 1px solid rgb(60 60 67 / 12%);
  background: rgb(255 255 255 / 58%);
}

.message-contact-card__actions :deep(.button) {
  width: 100%;
  margin: 0;
  min-height: 36px;
  justify-content: flex-start;
  padding-inline: 14px;
  font-size: 13px;
}

:global(.phone-app.dark) .message-contact-card {
  color: #f7f7f7;
  border-color: rgb(255 255 255 / 10%);
  background: linear-gradient(155deg, #34363b, #242a33);
  box-shadow: 0 8px 24px rgb(0 0 0 / 24%);
}

:global(.phone-app.dark) .message-contact-card__identity small {
  color: #aeaeb2;
}

:global(.phone-app.dark) .message-contact-card__actions {
  border-top-color: rgb(255 255 255 / 10%);
  background: rgb(0 0 0 / 10%);
}
</style>
