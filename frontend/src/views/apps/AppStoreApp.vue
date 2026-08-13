<script setup lang="ts">
import { Gamepad2, Grid2X2, Search } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getPhoneAppLabel,
  isLaunchablePhoneApp,
  PHONE_APPS,
} from '@/config/apps'
import { useAppStoreStore } from '@/stores/app-store'
import { usePhoneStore } from '@/stores/phone'
import type {
  LaunchablePhoneAppDefinition,
  LaunchablePhoneAppId,
} from '@/types/apps'
import {
  SkyAppPage,
  SkyNavbar,
  SkyPillNavigation,
  SkyScrollArea,
  SkySearchbar,
  SkySegmented,
  SkySegmentedButton,
  SkySpinner,
} from '@/ui'

const phone = usePhoneStore()
const appStore = useAppStoreStore()
const router = useRouter()
const tab = ref<'apps' | 'games' | 'search'>('apps')
const query = ref('')
const installedDuringVisit = ref<LaunchablePhoneAppId[]>([])
const tabs = [
  { id: 'apps', icon: Grid2X2 },
  { id: 'games', icon: Gamepad2 },
  { id: 'search', icon: Search },
] as const
const activeTabIndex = computed(() =>
  tabs.findIndex((item) => item.id === tab.value),
)
const catalog = computed(() =>
  PHONE_APPS.filter((app): app is LaunchablePhoneAppDefinition => {
    if (!isLaunchablePhoneApp(app) || app.id === 'app-store') {
      return false
    }

    const installed = appStore.isInstalled(app.id)
    return (
      !installed ||
      appStore.homeLayout.hidden.includes(app.id) ||
      installedDuringVisit.value.includes(app.id)
    )
  }).sort((a, b) => a.gridOrder - b.gridOrder),
)
const shownApps = computed(() => {
  if (tab.value === 'games') {
    return catalog.value.filter((app) => app.category === 'games')
  }
  if (tab.value === 'apps') {
    return catalog.value.filter((app) => app.category !== 'games')
  }

  const search = query.value.trim().toLocaleLowerCase(phone.lang)
  if (!search) return catalog.value
  return catalog.value.filter((app) =>
    getPhoneAppLabel(app, phone.t)
      .toLocaleLowerCase(phone.lang)
      .includes(search),
  )
})

function appAction(
  app: LaunchablePhoneAppDefinition,
): 'get' | 'installing' | 'open' {
  if (appStore.installingApps[app.id]) return 'installing'

  const installed = appStore.isInstalled(app.id)
  if (
    installed &&
    !appStore.homeLayout.hidden.includes(app.id) &&
    installedDuringVisit.value.includes(app.id)
  ) {
    return 'open'
  }

  return 'get'
}

function handleApp(app: LaunchablePhoneAppDefinition): void {
  if (appAction(app) === 'open') {
    void router.push(app.route)
    return
  }

  if (!installedDuringVisit.value.includes(app.id)) {
    installedDuringVisit.value.push(app.id)
  }
  appStore.installApp(app.id)
}
</script>

<template>
  <SkyAppPage
    class="app-store-page"
    accent="#0a84ff"
    accent-soft="rgba(10, 132, 255, 0.16)"
    :dark="phone.isDarkMode"
    :label="phone.t('Apps.appStore.name')"
  >
    <SkyNavbar
      transparent
      :title="phone.t('Apps.appStore.name')"
      variant="large"
    >
      <template v-if="tab === 'search'" #subnavbar>
        <SkySearchbar
          v-model="query"
          :clear-label="phone.t('Common.clear')"
          :label="phone.t('Apps.appStore.searchPlaceholder')"
          :placeholder="phone.t('Apps.appStore.searchPlaceholder')"
        />
      </template>
    </SkyNavbar>

    <SkyScrollArea class="store-scroll" with-tabbar>
      <section class="store-list">
        <article v-for="app in shownApps" :key="app.id">
          <img
            class="store-icon"
            :src="app.iconImage"
            alt=""
            draggable="false"
          />
          <div>
            <strong>{{ getPhoneAppLabel(app, phone.t) }}</strong>
            <small>{{ phone.t(`Home.groups.${app.category}`) }}</small>
          </div>
          <button
            type="button"
            :disabled="appStore.installingApps[app.id]"
            :aria-label="`${getPhoneAppLabel(app, phone.t)} ${phone.t(
              `Apps.appStore.${appAction(app)}`,
            )}`"
            @click="handleApp(app)"
          >
            <SkySpinner
              v-if="appStore.installingApps[app.id]"
              class="store-installing"
            />
            <template v-else>
              {{ phone.t(`Apps.appStore.${appAction(app)}`) }}
            </template>
          </button>
        </article>
        <p v-if="shownApps.length === 0" class="store-empty">
          {{ phone.t('Home.noApps') }}
        </p>
      </section>
    </SkyScrollArea>

    <SkyPillNavigation
      class="app-store-navigation"
      layout="full"
      :label="phone.t('Apps.appStore.name')"
    >
      <SkySegmented
        strong
        rounded
        navigation
        :active-index="activeTabIndex"
        :aria-label="phone.t('Apps.appStore.name')"
        :data-active-tab="tab"
        :item-count="tabs.length"
      >
        <SkySegmentedButton
          v-for="item in tabs"
          :key="item.id"
          :active="tab === item.id"
          :aria-label="phone.t(`Apps.appStore.tabs.${item.id}`)"
          @click="tab = item.id"
        >
          <span class="app-store-navigation__item">
            <component
              :is="item.icon"
              :size="20"
              :stroke-width="2"
              aria-hidden="true"
            />
            <span>{{ phone.t(`Apps.appStore.tabs.${item.id}`) }}</span>
          </span>
        </SkySegmentedButton>
      </SkySegmented>
    </SkyPillNavigation>
  </SkyAppPage>
</template>

<style scoped>
.app-store-page {
  padding: 0;
  background: var(--sky-bg);
  color: var(--sky-text);
}

.store-scroll {
  min-height: 0;
  flex: 1 1 auto;
  padding-top: 0;
  padding-right: calc(var(--sky-page-gutter) + var(--sky-safe-area-right));
  padding-left: calc(var(--sky-page-gutter) + var(--sky-safe-area-left));
  overflow-y: auto;
}

.store-list {
  padding: 0;
}

.store-list article {
  border-color: var(--sky-hairline);
}

.store-list small,
.store-empty {
  color: var(--sky-muted);
}

.store-list article > button {
  min-height: var(--sky-touch-target);
  color: var(--sky-app-accent);
  background: var(--sky-surface-muted);
}

.store-installing {
  color: var(--sky-app-accent);
}

.app-store-navigation__item {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 2px;
  line-height: 1;
}
</style>
