<script setup lang="ts">
import {
  ArrowRight,
  Camera,
  Images,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-vue-next'
import {
  SkyButton as kButton,
  SkyField as kListInput,
  SkyGlass as kGlass,
  SkyList as kList,
  SkySegmented as kSegmented,
  SkySegmentedButton as kSegmentedButton,
  SkySpinner as kPreloader,
} from '@/ui'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    avatarUrl: string | null
    body: string
    cameraLabel: string
    email: string
    emailLabel: string
    error: string
    eyebrow: string
    galleryLabel: string
    loginLabel: string
    maxUsernameLength?: number
    minUsernameLength?: number
    mode: 'login' | 'register'
    pending: boolean
    registerLabel: string
    title: string
    username: string
    usernameLabel: string
    usernamePlaceholder?: string
  }>(),
  {
    maxUsernameLength: 40,
    minUsernameLength: 2,
    usernamePlaceholder: '',
  },
)
const emit = defineEmits<{
  camera: []
  gallery: []
  submit: []
  'update:mode': [value: 'login' | 'register']
  'update:username': [value: string]
}>()

const canSubmit = computed(() => {
  const length = props.username.trim().length
  return Boolean(
    props.email &&
      length >= props.minUsernameLength &&
      length <= props.maxUsernameLength,
  )
})
</script>

<template>
  <section class="app-profile-auth">
    <header class="app-profile-auth__hero">
      <span class="app-profile-auth__mark"><UserRound :size="23" /></span>
      <div>
        <small>{{ eyebrow }}</small>
        <h2>{{ title }}</h2>
      </div>
      <p>{{ body }}</p>
    </header>

    <k-glass class="app-profile-auth__card">
      <k-segmented raised class="app-profile-auth__mode">
        <k-segmented-button
          class="app-profile-auth__mode-button app-profile-auth__mode-button--login"
          :class="{
            'app-profile-auth__mode-button--active': mode === 'login',
          }"
          :active="mode === 'login'"
          @click="emit('update:mode', 'login')"
        >
          {{ loginLabel }}
        </k-segmented-button>
        <k-segmented-button
          class="app-profile-auth__mode-button app-profile-auth__mode-button--register"
          :class="{
            'app-profile-auth__mode-button--active': mode === 'register',
          }"
          :active="mode === 'register'"
          @click="emit('update:mode', 'register')"
        >
          {{ registerLabel }}
        </k-segmented-button>
      </k-segmented>

      <div v-if="mode === 'register'" class="app-profile-auth__photo">
        <span class="app-profile-auth__avatar">
          <img v-if="avatarUrl" :src="avatarUrl" alt="" />
          <UserRound v-else :size="28" />
          <i><Camera :size="11" /></i>
        </span>
        <div>
          <k-button rounded outline @click="emit('gallery')">
            <Images :size="15" />{{ galleryLabel }}
          </k-button>
          <k-button rounded outline @click="emit('camera')">
            <Camera :size="15" />{{ cameraLabel }}
          </k-button>
        </div>
      </div>

      <div class="app-profile-auth__identity">
        <span><Mail :size="17" /></span>
        <div>
          <small>{{ emailLabel }}</small>
          <strong>{{ email }}</strong>
        </div>
        <LockKeyhole :size="15" />
      </div>

      <k-list inset strong class="app-profile-auth__fields">
        <k-list-input
          input-id="app-profile-auth-username"
          :label="usernameLabel"
          :value="username"
          :maxlength="maxUsernameLength"
          :placeholder="usernamePlaceholder"
          autocomplete="username"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          outline
          @input="
            emit('update:username', ($event.target as HTMLInputElement).value)
          "
          @keydown.enter="emit('submit')"
        />
      </k-list>

      <div v-if="error" class="app-profile-auth__error" role="alert">
        {{ error }}
      </div>
      <k-button
        large
        rounded
        class="app-profile-auth__submit"
        :disabled="!canSubmit || pending"
        @click="emit('submit')"
      >
        <k-preloader v-if="pending" />
        <template v-else>
          <span>{{ mode === 'login' ? loginLabel : registerLabel }}</span>
          <ArrowRight :size="18" />
        </template>
      </k-button>
    </k-glass>
  </section>
</template>

<style scoped>
.app-profile-auth {
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
  padding: 12px 4px 18px;
  color: inherit;
  text-align: center;
}
.app-profile-auth__hero {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 0 11px;
  margin: 0 12px 14px;
  text-align: left;
}
.app-profile-auth__mark {
  display: grid;
  width: 46px;
  height: 46px;
  grid-row: 1 / span 2;
  place-items: center;
  border: 1px solid rgba(255, 214, 62, 0.46);
  border-color: color-mix(
    in srgb,
    var(--auth-accent, #ffd63e) 46%,
    transparent
  );
  border-radius: 15px;
  color: var(--auth-accent, var(--yellow, #ffd63e));
  background: rgba(255, 214, 62, 0.14);
  background: color-mix(in srgb, var(--auth-accent, #ffd63e) 14%, transparent);
  box-shadow: 0 10px 28px rgba(255, 214, 62, 0.16);
  box-shadow: 0 10px 28px
    color-mix(in srgb, var(--auth-accent, #ffd63e) 16%, transparent);
}
.app-profile-auth__hero small {
  color: var(--auth-accent, var(--yellow, #ffd63e));
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.app-profile-auth__hero h2 {
  margin: 3px 0 0;
  color: inherit;
  font-size: 20px;
  line-height: 1.08;
}
.app-profile-auth__hero p {
  grid-column: 2;
  margin: 6px 0 0;
  color: var(--muted, #9ba4aa);
  font-size: 11px;
  line-height: 1.35;
}
.app-profile-auth__card {
  position: relative;
  display: block;
  padding: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  background: var(--panel, #20262c);
  background: color-mix(in srgb, var(--panel, #20262c) 90%, transparent);
  box-shadow: 0 22px 50px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(22px) saturate(1.15);
}
.app-profile-auth__card::before {
  position: absolute;
  top: -80px;
  right: -55px;
  width: 170px;
  height: 150px;
  border-radius: 50%;
  background: rgba(255, 214, 62, 0.16);
  background: color-mix(in srgb, var(--auth-accent, #ffd63e) 16%, transparent);
  filter: blur(38px);
  content: '';
  pointer-events: none;
}
.app-profile-auth__mode {
  position: relative;
  z-index: 1;
  margin: 0 0 12px;
  padding: 3px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.16);
}
.app-profile-auth__mode :deep(.app-profile-auth__mode-button) {
  border-radius: 3px;
}
.app-profile-auth__mode
  :deep(
    .app-profile-auth__mode-button--login.app-profile-auth__mode-button--active
  ) {
  border-radius: 10px 3px 3px 10px;
}
.app-profile-auth__mode
  :deep(
    .app-profile-auth__mode-button--register.app-profile-auth__mode-button--active
  ) {
  border-radius: 3px 10px 10px 3px;
}
.app-profile-auth__photo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 2px 11px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.035);
  text-align: left;
}
.app-profile-auth__avatar {
  position: relative;
  display: grid;
  width: 66px;
  height: 66px;
  flex: none;
  place-items: center;
  border: 2px solid rgba(255, 214, 62, 0.58);
  border-color: color-mix(
    in srgb,
    var(--auth-accent, #ffd63e) 58%,
    transparent
  );
  border-radius: 50%;
  color: var(--auth-accent, var(--yellow, #ffd63e));
  background: var(--panel, #20262c);
  background: color-mix(
    in srgb,
    var(--auth-accent, #ffd63e) 10%,
    var(--panel, #20262c)
  );
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.22);
}
.app-profile-auth__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
.app-profile-auth__avatar i {
  position: absolute;
  right: -2px;
  bottom: -1px;
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 2px solid var(--panel, #20262c);
  border-radius: 50%;
  color: #fff;
  background: var(--auth-accent, #ffd63e);
}
.app-profile-auth__photo > div {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 6px;
}
.app-profile-auth__photo :deep(.sky-button) {
  min-height: 32px;
  justify-content: flex-start;
  gap: 6px;
  border-color: rgba(255, 255, 255, 0.12);
  color: inherit;
  background: rgba(255, 255, 255, 0.04);
  font-size: 11px;
}
.app-profile-auth__identity {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 9px;
  margin-bottom: 9px;
  padding: 9px 11px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.045);
  text-align: left;
}
.app-profile-auth__identity > span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 11px;
  color: var(--auth-accent, #ffd63e);
  background: rgba(255, 214, 62, 0.13);
  background: color-mix(in srgb, var(--auth-accent, #ffd63e) 13%, transparent);
}
.app-profile-auth__identity div {
  min-width: 0;
}
.app-profile-auth__identity small {
  display: block;
  margin-bottom: 1px;
  color: var(--muted, #9ba4aa);
  font-size: 9px;
}
.app-profile-auth__identity strong {
  display: block;
  overflow: hidden;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-profile-auth__identity > svg {
  color: var(--muted, #9ba4aa);
}
.app-profile-auth__fields {
  margin-top: 0;
  margin-right: 0;
  margin-bottom: 11px;
  margin-left: 0;
  color: inherit;
  background: rgba(255, 255, 255, 0.045) !important;
  text-align: left;
}
.app-profile-auth__fields :deep(.text-black) {
  color: inherit !important;
}
.app-profile-auth__fields :deep(.text-xs > div) {
  background: var(--panel, #20262c) !important;
  background: color-mix(
    in srgb,
    var(--panel, #20262c) 94%,
    transparent
  ) !important;
}
.app-profile-auth__error {
  margin: -2px 1px 10px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 105, 97, 0.22);
  border-radius: 11px;
  color: #ff6961;
  background: rgba(255, 105, 97, 0.08);
  font-size: 11px;
}
.app-profile-auth__submit {
  --sky-app-accent: var(--auth-accent, var(--yellow, #ffd63e));
  --sky-button-text: #fff;
  width: 100%;
  min-height: 44px;
  display: flex;
  justify-content: space-between;
  padding: 0 17px;
  color: #fff !important;
  background: var(--auth-accent, var(--yellow, #ffd63e)) !important;
  box-shadow: 0 10px 26px rgba(255, 214, 62, 0.25);
  box-shadow: 0 10px 26px
    color-mix(in srgb, var(--auth-accent, #ffd63e) 25%, transparent);
  font-weight: 750;
}
.app-profile-auth__submit:disabled {
  opacity: 0.46;
}
</style>
