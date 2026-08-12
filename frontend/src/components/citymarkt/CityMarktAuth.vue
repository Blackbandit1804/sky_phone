<script setup lang="ts">
import AppProfileAuth from '@/components/account/AppProfileAuth.vue'
import { usePhoneStore } from '@/stores/phone'

defineProps<{
  avatarUrl: string | null
  email: string
  error: string
  mode: 'login' | 'register'
  pending: boolean
  username: string
}>()
const emit = defineEmits<{
  camera: []
  gallery: []
  submit: []
  'update:mode': [value: 'login' | 'register']
  'update:username': [value: string]
}>()

const phone = usePhoneStore()
</script>

<template>
  <AppProfileAuth
    :avatar-url="avatarUrl"
    :body="phone.t('Apps.citymarkt.authBody')"
    :camera-label="phone.t('Apps.citymarkt.takePhoto')"
    :email="email"
    :email-label="phone.t('Apps.citymarkt.profileEmail')"
    :error="error"
    :eyebrow="phone.t('Apps.citymarkt.authEyebrow')"
    :gallery-label="phone.t('Apps.citymarkt.chooseGallery')"
    :login-label="phone.t('Apps.citymarkt.login')"
    :mode="mode"
    :pending="pending"
    :register-label="phone.t('Apps.citymarkt.register')"
    :title="phone.t('Apps.citymarkt.authTitle')"
    :username="username"
    :username-label="phone.t('Apps.citymarkt.authUsername')"
    @camera="emit('camera')"
    @gallery="emit('gallery')"
    @submit="emit('submit')"
    @update:mode="emit('update:mode', $event)"
    @update:username="emit('update:username', $event)"
  />
</template>
