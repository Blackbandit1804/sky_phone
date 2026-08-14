<script setup lang="ts">
import {
  Camera,
  ChevronRight,
  Crown,
  Gamepad2,
  Grid2X2,
  Newspaper,
  Plane,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Trash2,
} from 'lucide-vue-next'
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type ComponentPublicInstance,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  DEFAULT_INSTALLED_PHONE_APP_IDS,
  getPhoneAppLabel,
  isExternalPhoneApp,
  isLaunchablePhoneApp,
  isPhoneAppRemovable,
  PHONE_APPS,
} from '@/config/apps'
import { useAppStoreStore } from '@/stores/app-store'
import { useEasyShareStore } from '@/stores/easyshare'
import { usePhoneStore } from '@/stores/phone'
import type { LaunchablePhoneAppDefinition } from '@/types/apps'
import {
  SkyAppPage,
  SkyDialog,
  SkyDialogButton,
  SkyNavbar,
  SkyPillNavigation,
  SkyScrollArea,
  SkySearchbar,
  SkySegmented,
  SkySegmentedButton,
  SkySpinner,
  SkySheet,
} from '@/ui'
import { getDailyHighlights } from '@/utils/appStoreHighlights'

import AppStoreDetail from './AppStoreDetail.vue'
import AppStoreAction from './AppStoreAction.vue'

const phone = usePhoneStore()
const appStore = useAppStoreStore()
const easyShare = useEasyShareStore()
const route = useRoute()
const router = useRouter()
const tab = ref<'today' | 'apps' | 'games' | 'search'>('today')
const query = ref('')
const openedAt = new Date()
const featuredSlide = ref(0)
const profileOpened = ref(false)
const uninstallCandidate = ref<LaunchablePhoneAppDefinition | null>(null)
const selectedApp = ref<LaunchablePhoneAppDefinition | null>(null)
const storeScroll = ref<ComponentPublicInstance | null>(null)
const profileDragOffset = ref(0)
const profileDragging = ref(false)
let profileDragPointerId: number | null = null
let profileDragStartTime = 0
let profileDragStartY = 0
let featuredTimer: ReturnType<typeof globalThis.setInterval> | null = null
const tabs = [
  { id: 'today', icon: Newspaper },
  { id: 'apps', icon: Grid2X2 },
  { id: 'games', icon: Gamepad2 },
  { id: 'search', icon: Search },
] as const
const searchDiscoverTiles = [
  { id: 'topApps', icon: Trophy, background: '#5d9ee8' },
  { id: 'topGames', icon: Crown, background: '#ee9347' },
  { id: 'bestApps', icon: Sparkles, background: '#58c85a' },
  { id: 'bestGames', icon: Gamepad2, background: '#7b5ce9' },
  { id: 'productivity', icon: Plane, background: '#4e91cf' },
  { id: 'photoVideo', icon: Camera, background: '#c28b36' },
] as const
const highlightPalettes = [
  { background: '#244cc8', glow: '#7da4ff' },
  { background: '#d54b38', glow: '#ffbd6f' },
  { background: '#087c78', glow: '#4ee4cb' },
  { background: '#783daf', glow: '#dca4ff' },
  { background: '#ae6c13', glow: '#ffd37d' },
] as const
const activeTabIndex = computed(() =>
  tabs.findIndex((item) => item.id === tab.value),
)
const profileName = computed(() => {
  const name = [phone.player.firstName, phone.player.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
  return name || phone.t('Apps.appStore.player')
})
const profileInitials = computed(() => {
  const initials = `${phone.player.firstName.trim().charAt(0)}${phone.player.lastName
    .trim()
    .charAt(0)}`
  return initials.toLocaleUpperCase(phone.lang) || 'P'
})
const todayDate = computed(() =>
  new Intl.DateTimeFormat(phone.lang, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(openedAt),
)
const currentRelease = `${openedAt.getFullYear()}-${String(openedAt.getMonth() + 1).padStart(2, '0')}-${String(openedAt.getDate()).padStart(2, '0')}`
const catalog = computed(() =>
  PHONE_APPS.filter((app): app is LaunchablePhoneAppDefinition => {
    if (!isLaunchablePhoneApp(app) || app.id === 'app-store') {
      return false
    }

    return !appStore.isInstalled(app.id)
  }).sort((a, b) => a.gridOrder - b.gridOrder),
)
const installedApps = computed(() =>
  PHONE_APPS.filter(
    (app): app is LaunchablePhoneAppDefinition =>
      isLaunchablePhoneApp(app) && appStore.isInstalled(app.id),
  ).sort((a, b) => a.gridOrder - b.gridOrder),
)
const installedGameCount = computed(
  () => installedApps.value.filter((app) => app.category === 'games').length,
)
const dailyCandidates = computed(() =>
  getDailyHighlights(
    PHONE_APPS.filter(
      (app): app is LaunchablePhoneAppDefinition =>
        isLaunchablePhoneApp(app) &&
        !isExternalPhoneApp(app) &&
        app.id !== 'app-store' &&
        !DEFAULT_INSTALLED_PHONE_APP_IDS.has(app.id) &&
        !appStore.isInstalled(app.id),
    ),
  ),
)
const dailyHighlights = computed(() => dailyCandidates.value.slice(0, 8))
const editorialHighlights = computed(() => dailyHighlights.value.slice(1, 3))
const topToday = computed(() => dailyHighlights.value.slice(3, 7))
const finalHighlight = computed(() => dailyHighlights.value[7])
const featuredCandidates = computed(() => {
  return dailyCandidates.value
    .filter((app) =>
      tab.value === 'games'
        ? app.category === 'games'
        : app.category !== 'games',
    )
    .slice(0, 6)
})
const featuredApp = computed(() => {
  if (!featuredCandidates.value.length) return null
  return featuredCandidates.value[
    featuredSlide.value % featuredCandidates.value.length
  ]
})
const hasSearchQuery = computed(() => Boolean(query.value.trim()))
const searchRecommendations = computed(() => dailyCandidates.value.slice(0, 3))
const searchDiscoverCards = computed(() => {
  if (!dailyCandidates.value.length) return []
  return searchDiscoverTiles.map((tile, index) => ({
    ...tile,
    app: dailyCandidates.value[(index + 3) % dailyCandidates.value.length]!,
  }))
})
const shownApps = computed(() => {
  if (tab.value === 'today') return []
  if (tab.value === 'games') {
    return catalog.value.filter((app) => app.category === 'games')
  }
  if (tab.value === 'apps') {
    return catalog.value.filter((app) => app.category !== 'games')
  }

  const search = query.value.trim().toLocaleLowerCase(phone.lang)
  if (!search) return []
  return catalog.value.filter((app) => {
    const searchable = [
      getPhoneAppLabel(app, phone.t),
      phone.t(`Home.groups.${app.category}`),
    ]
      .join(' ')
      .toLocaleLowerCase(phone.lang)
    return searchable.includes(search)
  })
})

watch(tab, () => {
  featuredSlide.value = 0
})

onMounted(() => {
  featuredTimer = globalThis.setInterval(() => {
    if (
      (tab.value === 'apps' || tab.value === 'games') &&
      featuredCandidates.value.length > 1
    ) {
      featuredSlide.value += 1
    }
  }, 6500)
})

onUnmounted(() => {
  if (featuredTimer) globalThis.clearInterval(featuredTimer)
})

function appAction(
  app: LaunchablePhoneAppDefinition,
): 'get' | 'installing' | 'open' {
  if (appStore.installingApps[app.id]) return 'installing'

  const installed = appStore.isInstalled(app.id)
  if (installed && !appStore.homeLayout.hidden.includes(app.id)) {
    return 'open'
  }

  return 'get'
}

function handleApp(app: LaunchablePhoneAppDefinition): void {
  if (appAction(app) === 'open') {
    void router.push(app.route)
    return
  }

  appStore.installApp(app.id)
}

function handleManagedApp(app: LaunchablePhoneAppDefinition): void {
  if (appStore.updatedAppReleases[app.id] !== currentRelease) {
    appStore.updateApp(app.id, currentRelease)
    return
  }

  closeProfile()
  void router.push(app.route)
}

function closeProfile(): void {
  profileOpened.value = false
  profileDragging.value = false
  profileDragPointerId = null
  profileDragOffset.value = 0
}

function beginProfileDrag(event: PointerEvent): void {
  if (!profileOpened.value || event.button !== 0) return
  profileDragPointerId = event.pointerId
  profileDragStartTime = performance.now()
  profileDragStartY = event.clientY
  profileDragOffset.value = 0
  profileDragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function moveProfileDrag(event: PointerEvent): void {
  if (!profileDragging.value || event.pointerId !== profileDragPointerId) return
  profileDragOffset.value = Math.max(0, event.clientY - profileDragStartY)
}

function endProfileDrag(event: PointerEvent): void {
  if (!profileDragging.value || event.pointerId !== profileDragPointerId) return
  const elapsed = Math.max(1, performance.now() - profileDragStartTime)
  const shouldClose =
    profileDragOffset.value >= 72 ||
    (profileDragOffset.value >= 24 && profileDragOffset.value / elapsed >= 0.55)
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
  profileDragging.value = false
  profileDragPointerId = null
  if (shouldClose) closeProfile()
  profileDragOffset.value = 0
}

function confirmUninstall(): void {
  if (!uninstallCandidate.value) return
  appStore.uninstallApp(uninstallCandidate.value.id)
  uninstallCandidate.value = null
}

function highlightStyle(index: number): Record<string, string> {
  const palette = highlightPalettes[index % highlightPalettes.length]
  return {
    '--store-highlight-background': palette.background,
    '--store-highlight-glow': palette.glow,
  }
}

function highlightTitle(app: LaunchablePhoneAppDefinition): string {
  const appName = getPhoneAppLabel(app, phone.t)
  return phone.t(
    app.category === 'games'
      ? 'Apps.appStore.today.playTitle'
      : 'Apps.appStore.today.discoverTitle',
    { app: appName },
  )
}

function categoryDescription(app: LaunchablePhoneAppDefinition): string {
  return phone.t('Apps.appStore.today.categoryDescription', {
    category: phone.t(`Home.groups.${app.category}`),
  })
}

function selectSearchDiscovery(app: LaunchablePhoneAppDefinition): void {
  query.value = getPhoneAppLabel(app, phone.t)
}

function openAppDetail(app: LaunchablePhoneAppDefinition): void {
  selectedApp.value = app
  void nextTick(() => {
    const scrollElement = storeScroll.value?.$el as HTMLElement | undefined
    scrollElement?.scrollTo({ top: 0 })
  })
}

function selectStoreTab(nextTab: (typeof tabs)[number]['id']): void {
  selectedApp.value = null
  tab.value = nextTab
}

function shareSelectedApp(): void {
  const app = selectedApp.value
  if (!app) return
  const appName = getPhoneAppLabel(app, phone.t)
  easyShare.open({
    appId: 'app-store',
    copyText: phone.t('Apps.appStore.details.shareCopy', { app: appName }),
    id: app.id,
    imageUrl: app.iconImage,
    kind: 'link',
    link: `skyphone://app-store/${app.id}`,
    meta: { appId: app.id },
    subtitle: phone.t(`Home.groups.${app.category}`),
    title: appName,
  })
}

watch(
  () => route.query.easyShareId,
  (sharedAppId) => {
    if (
      route.query.easyShareKind !== 'link' ||
      typeof sharedAppId !== 'string'
    ) {
      return
    }
    const app = PHONE_APPS.find(
      (candidate) =>
        candidate.id === sharedAppId && isLaunchablePhoneApp(candidate),
    )
    if (app && isLaunchablePhoneApp(app)) openAppDetail(app)
  },
  { immediate: true },
)
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
      v-if="!selectedApp"
      class="app-store-navbar"
      :scroll-el="null"
      transparent
      :title="phone.t(`Apps.appStore.tabs.${tab}`)"
      variant="large"
    >
      <template #right>
        <button
          type="button"
          class="app-store-profile"
          :aria-label="
            phone.t('Apps.appStore.profileLabel', { name: profileName })
          "
          @click="profileOpened = true"
        >
          {{ profileInitials }}
        </button>
      </template>
      <template v-if="tab === 'search'" #subnavbar>
        <SkySearchbar
          v-model="query"
          :clear-label="phone.t('Common.clear')"
          :label="phone.t('Apps.appStore.searchPlaceholder')"
          :placeholder="phone.t('Apps.appStore.searchPlaceholder')"
        />
      </template>
    </SkyNavbar>

    <SkyScrollArea
      ref="storeScroll"
      class="store-scroll"
      :class="{ 'store-scroll--detail': selectedApp }"
      with-tabbar
    >
      <AppStoreDetail
        v-if="selectedApp"
        :app="selectedApp"
        :action="appAction(selectedApp)"
        @action="handleApp(selectedApp)"
        @back="selectedApp = null"
        @share="shareSelectedApp"
      />
      <section v-else-if="tab === 'today'" class="store-today">
        <header class="store-today__edition">
          <div>
            <strong>{{ todayDate }}</strong>
            <span>{{ phone.t('Apps.appStore.today.freshDaily') }}</span>
          </div>
          <span class="store-today__edition-badge">
            <Sparkles :size="13" :stroke-width="2.4" aria-hidden="true" />
            {{ phone.t('Apps.appStore.today.dailyEdition') }}
          </span>
        </header>

        <article
          v-if="dailyHighlights[0]"
          class="store-highlight store-highlight--hero"
          :style="highlightStyle(0)"
        >
          <button
            type="button"
            class="store-highlight__detail-link"
            :aria-label="
              phone.t('Apps.appStore.details.openDetails', {
                app: getPhoneAppLabel(dailyHighlights[0], phone.t),
              })
            "
            @click="openAppDetail(dailyHighlights[0])"
          ></button>
          <div class="store-highlight__texture" aria-hidden="true"></div>
          <div class="store-highlight__copy">
            <p>
              <Sparkles :size="12" :stroke-width="2.5" aria-hidden="true" />
              {{ phone.t('Apps.appStore.today.featured') }}
            </p>
            <h2>{{ highlightTitle(dailyHighlights[0]) }}</h2>
            <span>
              {{
                phone.t('Apps.appStore.today.description', {
                  app: getPhoneAppLabel(dailyHighlights[0], phone.t),
                })
              }}
            </span>
          </div>
          <div class="store-highlight__art" aria-hidden="true">
            <span class="store-highlight__orbit"></span>
            <span
              class="store-highlight__spark store-highlight__spark--one"
            ></span>
            <span
              class="store-highlight__spark store-highlight__spark--two"
            ></span>
            <img :src="dailyHighlights[0].iconImage" alt="" draggable="false" />
          </div>
          <footer class="store-highlight__footer">
            <img :src="dailyHighlights[0].iconImage" alt="" draggable="false" />
            <div>
              <strong>{{
                getPhoneAppLabel(dailyHighlights[0], phone.t)
              }}</strong>
              <small>
                {{ categoryDescription(dailyHighlights[0]) }}
              </small>
            </div>
            <button
              type="button"
              :disabled="appStore.installingApps[dailyHighlights[0].id]"
              :aria-label="`${getPhoneAppLabel(dailyHighlights[0], phone.t)} ${phone.t(
                `Apps.appStore.${appAction(dailyHighlights[0])}`,
              )}`"
              @click.stop="handleApp(dailyHighlights[0])"
            >
              <AppStoreAction :action="appAction(dailyHighlights[0])" />
            </button>
          </footer>
        </article>

        <header class="store-today__section-heading">
          <div>
            <span>{{ phone.t('Apps.appStore.today.curatedForYou') }}</span>
            <h2>{{ phone.t('Apps.appStore.today.moreHighlights') }}</h2>
          </div>
          <Sparkles :size="20" :stroke-width="2" aria-hidden="true" />
        </header>
        <article
          v-for="(app, index) in editorialHighlights"
          :key="app.id"
          class="store-highlight store-highlight--compact"
          :class="{ 'store-highlight--reverse': index % 2 === 1 }"
          :style="highlightStyle(index + 1)"
        >
          <button
            type="button"
            class="store-highlight__detail-link"
            :aria-label="
              phone.t('Apps.appStore.details.openDetails', {
                app: getPhoneAppLabel(app, phone.t),
              })
            "
            @click="openAppDetail(app)"
          ></button>
          <div class="store-highlight__texture" aria-hidden="true"></div>
          <div class="store-highlight__copy">
            <p>
              <span class="store-highlight__story-number"
                >0{{ index + 1 }}</span
              >
              {{
                phone.t(
                  app.category === 'games'
                    ? 'Apps.appStore.today.gameHighlight'
                    : 'Apps.appStore.today.appHighlight',
                )
              }}
            </p>
            <h2>{{ highlightTitle(app) }}</h2>
            <span>{{ categoryDescription(app) }}</span>
          </div>
          <div class="store-highlight__art" aria-hidden="true">
            <span class="store-highlight__orbit"></span>
            <img :src="app.iconImage" alt="" draggable="false" />
          </div>
          <footer class="store-highlight__footer">
            <img :src="app.iconImage" alt="" draggable="false" />
            <div>
              <strong>{{ getPhoneAppLabel(app, phone.t) }}</strong>
              <small>{{ phone.t('Apps.appStore.today.editorsChoice') }}</small>
            </div>
            <button
              type="button"
              :disabled="appStore.installingApps[app.id]"
              :aria-label="`${getPhoneAppLabel(app, phone.t)} ${phone.t(
                `Apps.appStore.${appAction(app)}`,
              )}`"
              @click.stop="handleApp(app)"
            >
              <AppStoreAction :action="appAction(app)" />
            </button>
          </footer>
        </article>

        <section class="store-ranking">
          <header class="store-ranking__header">
            <span class="store-ranking__icon">
              <Trophy :size="18" :stroke-width="2.2" aria-hidden="true" />
            </span>
            <div>
              <h2>{{ phone.t('Apps.appStore.today.topToday') }}</h2>
              <p>{{ phone.t('Apps.appStore.today.topTodayDescription') }}</p>
            </div>
          </header>
          <ol>
            <li v-for="(app, index) in topToday" :key="app.id">
              <span class="store-ranking__position">{{ index + 1 }}</span>
              <button
                type="button"
                class="store-ranking__detail-link"
                :aria-label="
                  phone.t('Apps.appStore.details.openDetails', {
                    app: getPhoneAppLabel(app, phone.t),
                  })
                "
                @click="openAppDetail(app)"
              >
                <img :src="app.iconImage" alt="" draggable="false" />
                <span class="store-ranking__details">
                  <strong>{{ getPhoneAppLabel(app, phone.t) }}</strong>
                  <small>{{ categoryDescription(app) }}</small>
                </span>
              </button>
              <button
                type="button"
                :disabled="appStore.installingApps[app.id]"
                :aria-label="`${getPhoneAppLabel(app, phone.t)} ${phone.t(
                  `Apps.appStore.${appAction(app)}`,
                )}`"
                @click.stop="handleApp(app)"
              >
                <AppStoreAction :action="appAction(app)" />
              </button>
            </li>
          </ol>
        </section>

        <article
          v-if="finalHighlight"
          class="store-final-pick"
          :style="highlightStyle(4)"
        >
          <button
            type="button"
            class="store-highlight__detail-link"
            :aria-label="
              phone.t('Apps.appStore.details.openDetails', {
                app: getPhoneAppLabel(finalHighlight, phone.t),
              })
            "
            @click="openAppDetail(finalHighlight)"
          ></button>
          <div class="store-final-pick__glow" aria-hidden="true"></div>
          <div class="store-final-pick__heading">
            <span>{{ phone.t('Apps.appStore.today.oneMoreThing') }}</span>
            <strong>{{ highlightTitle(finalHighlight) }}</strong>
            <small>{{ categoryDescription(finalHighlight) }}</small>
          </div>
          <img :src="finalHighlight.iconImage" alt="" draggable="false" />
          <button
            type="button"
            :disabled="appStore.installingApps[finalHighlight.id]"
            :aria-label="`${getPhoneAppLabel(finalHighlight, phone.t)} ${phone.t(
              `Apps.appStore.${appAction(finalHighlight)}`,
            )}`"
            @click.stop="handleApp(finalHighlight)"
          >
            <AppStoreAction :action="appAction(finalHighlight)" />
          </button>
        </article>
      </section>

      <section
        v-else-if="tab === 'apps' || tab === 'games'"
        class="store-browse"
      >
        <Transition name="store-featured" mode="out-in">
          <article
            v-if="featuredApp"
            :key="featuredApp.id"
            class="store-browse-feature"
            :style="highlightStyle(featuredSlide + 1)"
          >
            <div class="store-browse-feature__texture" aria-hidden="true"></div>
            <div class="store-browse-feature__copy">
              <span>{{ phone.t('Apps.appStore.browse.availableNow') }}</span>
              <h2>
                {{
                  phone.t('Apps.appStore.browse.featureTitle', {
                    app: getPhoneAppLabel(featuredApp, phone.t),
                  })
                }}
              </h2>
              <p>{{ categoryDescription(featuredApp) }}</p>
            </div>
            <div class="store-browse-feature__art" aria-hidden="true">
              <span></span>
              <component
                :is="featuredApp.icon"
                :size="104"
                :stroke-width="1.1"
              />
              <img :src="featuredApp.iconImage" alt="" draggable="false" />
            </div>
            <footer>
              <img :src="featuredApp.iconImage" alt="" draggable="false" />
              <button
                type="button"
                class="store-browse-feature__details"
                @click="openAppDetail(featuredApp)"
              >
                <strong>{{ getPhoneAppLabel(featuredApp, phone.t) }}</strong>
                <small>{{ categoryDescription(featuredApp) }}</small>
              </button>
              <button
                type="button"
                :disabled="appStore.installingApps[featuredApp.id]"
                :aria-label="`${getPhoneAppLabel(featuredApp, phone.t)} ${phone.t(
                  `Apps.appStore.${appAction(featuredApp)}`,
                )}`"
                @click="handleApp(featuredApp)"
              >
                <AppStoreAction :action="appAction(featuredApp)" />
              </button>
            </footer>
          </article>
        </Transition>

        <div
          v-if="featuredCandidates.length > 1"
          class="store-browse__pages"
          :aria-label="phone.t('Apps.appStore.browse.featuredPages')"
        >
          <button
            v-for="(app, index) in featuredCandidates"
            :key="app.id"
            type="button"
            :class="{
              'is-active': featuredSlide % featuredCandidates.length === index,
            }"
            :aria-label="getPhoneAppLabel(app, phone.t)"
            @click="featuredSlide = index"
          ></button>
        </div>

        <header class="store-browse__list-heading">
          <div>
            <span>{{ phone.t('Apps.appStore.browse.handPicked') }}</span>
            <h2>
              {{
                phone.t(
                  tab === 'games'
                    ? 'Apps.appStore.browse.essentialGames'
                    : 'Apps.appStore.browse.essentialApps',
                )
              }}
            </h2>
          </div>
          <strong>{{ shownApps.length }}</strong>
        </header>

        <section class="store-list store-list--browse">
          <article v-for="app in shownApps" :key="app.id">
            <button
              type="button"
              class="store-list__detail-link"
              @click="openAppDetail(app)"
            >
              <img
                class="store-icon"
                :src="app.iconImage"
                alt=""
                draggable="false"
              />
              <span>
                <strong>{{ getPhoneAppLabel(app, phone.t) }}</strong>
                <small>{{ categoryDescription(app) }}</small>
              </span>
            </button>
            <button
              type="button"
              :disabled="appStore.installingApps[app.id]"
              :aria-label="`${getPhoneAppLabel(app, phone.t)} ${phone.t(
                `Apps.appStore.${appAction(app)}`,
              )}`"
              @click="handleApp(app)"
            >
              <AppStoreAction :action="appAction(app)" />
            </button>
          </article>
          <p v-if="shownApps.length === 0" class="store-empty">
            {{ phone.t('Home.noApps') }}
          </p>
        </section>
      </section>

      <section v-else class="store-search">
        <template v-if="!hasSearchQuery">
          <section class="store-search__section">
            <header class="store-search__heading">
              <h2>{{ phone.t('Apps.appStore.search.recommended') }}</h2>
              <ChevronRight :size="22" :stroke-width="2.5" aria-hidden="true" />
            </header>
            <div class="store-search__recommendations">
              <article
                v-for="(app, index) in searchRecommendations"
                :key="app.id"
                :class="{
                  'store-search__recommendation--promoted': index === 0,
                }"
              >
                <button
                  type="button"
                  class="store-search__detail-link"
                  @click="openAppDetail(app)"
                >
                  <img :src="app.iconImage" alt="" draggable="false" />
                  <span>
                    <strong>{{ getPhoneAppLabel(app, phone.t) }}</strong>
                    <small>{{ categoryDescription(app) }}</small>
                    <em v-if="index === 0">{{
                      phone.t('Apps.appStore.search.ad')
                    }}</em>
                  </span>
                </button>
                <button
                  type="button"
                  :disabled="appStore.installingApps[app.id]"
                  :aria-label="`${getPhoneAppLabel(app, phone.t)} ${phone.t(
                    `Apps.appStore.${appAction(app)}`,
                  )}`"
                  @click="handleApp(app)"
                >
                  <AppStoreAction :action="appAction(app)" />
                </button>
              </article>
            </div>
          </section>

          <section class="store-search__section store-search__discover">
            <header class="store-search__heading">
              <h2>{{ phone.t('Apps.appStore.search.discover') }}</h2>
              <ChevronRight :size="22" :stroke-width="2.5" aria-hidden="true" />
            </header>
            <div class="store-search__discover-grid">
              <button
                v-for="card in searchDiscoverCards"
                :key="card.id"
                type="button"
                :style="{ '--store-search-tile': card.background }"
                @click="selectSearchDiscovery(card.app)"
              >
                <component
                  :is="card.icon"
                  :size="40"
                  :stroke-width="1.4"
                  aria-hidden="true"
                />
                <span>{{ phone.t(`Apps.appStore.search.${card.id}`) }}</span>
                <small>{{ getPhoneAppLabel(card.app, phone.t) }}</small>
              </button>
            </div>
          </section>
        </template>

        <section v-else class="store-search__results">
          <header class="store-search__heading">
            <div>
              <h2>{{ phone.t('Apps.appStore.search.results') }}</h2>
              <span>{{ shownApps.length }}</span>
            </div>
          </header>
          <div class="store-list store-list--browse store-list--search-results">
            <article v-for="app in shownApps" :key="app.id">
              <button
                type="button"
                class="store-list__detail-link"
                @click="openAppDetail(app)"
              >
                <img
                  class="store-icon"
                  :src="app.iconImage"
                  alt=""
                  draggable="false"
                />
                <span>
                  <strong>{{ getPhoneAppLabel(app, phone.t) }}</strong>
                  <small>{{ categoryDescription(app) }}</small>
                </span>
              </button>
              <button
                type="button"
                :disabled="appStore.installingApps[app.id]"
                :aria-label="`${getPhoneAppLabel(app, phone.t)} ${phone.t(
                  `Apps.appStore.${appAction(app)}`,
                )}`"
                @click="handleApp(app)"
              >
                <AppStoreAction :action="appAction(app)" />
              </button>
            </article>
          </div>
          <p v-if="shownApps.length === 0" class="store-empty">
            {{ phone.t('Apps.appStore.search.noResults') }}
          </p>
        </section>
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
          @click="selectStoreTab(item.id)"
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

    <SkySheet
      :opened="profileOpened"
      class="app-store-account-sheet"
      :class="{ 'app-store-account-sheet--dragging': profileDragging }"
      :style="{
        '--store-account-drag-offset': `${profileDragOffset}px`,
      }"
      :aria-label="phone.t('Apps.appStore.account.title')"
      @backdropclick="closeProfile"
      @escape="closeProfile"
    >
      <section class="store-account">
        <button
          type="button"
          class="store-account__grabber"
          :aria-label="phone.t('Common.close')"
          @click="closeProfile"
          @pointercancel="endProfileDrag"
          @pointerdown="beginProfileDrag"
          @pointermove="moveProfileDrag"
          @pointerup="endProfileDrag"
        >
          <span aria-hidden="true"></span>
        </button>
        <header class="store-account__toolbar">
          <div>
            <span>{{ phone.t('Apps.appStore.account.account') }}</span>
            <h2>{{ phone.t('Apps.appStore.account.title') }}</h2>
          </div>
        </header>

        <section class="store-account__identity">
          <span>{{ profileInitials }}</span>
          <div>
            <strong>{{ profileName }}</strong>
            <small>{{ phone.t('Apps.appStore.account.skyAccount') }}</small>
          </div>
          <ShieldCheck :size="24" :stroke-width="1.8" aria-hidden="true" />
        </section>

        <dl class="store-account__summary">
          <div>
            <dt>{{ installedApps.length }}</dt>
            <dd>{{ phone.t('Apps.appStore.account.apps') }}</dd>
          </div>
          <div>
            <dt>{{ installedGameCount }}</dt>
            <dd>{{ phone.t('Apps.appStore.account.games') }}</dd>
          </div>
        </dl>

        <header class="store-account__section-heading">
          <div>
            <span>{{ phone.t('Apps.appStore.account.library') }}</span>
            <h3>{{ phone.t('Apps.appStore.account.myApps') }}</h3>
          </div>
          <strong>{{ installedApps.length }}</strong>
        </header>

        <div class="store-account__apps">
          <article v-for="app in installedApps" :key="app.id">
            <img :src="app.iconImage" alt="" draggable="false" />
            <div>
              <strong>{{ getPhoneAppLabel(app, phone.t) }}</strong>
              <small>{{ categoryDescription(app) }}</small>
            </div>
            <button
              type="button"
              class="store-account__primary-action"
              :disabled="appStore.updatingApps[app.id]"
              @click="handleManagedApp(app)"
            >
              <SkySpinner
                v-if="appStore.updatingApps[app.id]"
                class="store-installing"
              />
              <template
                v-else-if="
                  appStore.updatedAppReleases[app.id] !== currentRelease
                "
              >
                <RefreshCw :size="13" :stroke-width="2.5" aria-hidden="true" />
                {{ phone.t('Apps.appStore.account.update') }}
              </template>
              <template v-else>
                {{ phone.t('Apps.appStore.open') }}
              </template>
            </button>
            <button
              v-if="isPhoneAppRemovable(app)"
              type="button"
              class="store-account__remove"
              :aria-label="
                phone.t('Apps.appStore.account.uninstallApp', {
                  app: getPhoneAppLabel(app, phone.t),
                })
              "
              @click="uninstallCandidate = app"
            >
              <Trash2 :size="17" :stroke-width="2" aria-hidden="true" />
            </button>
          </article>
        </div>
      </section>
    </SkySheet>

    <SkyDialog
      :opened="Boolean(uninstallCandidate)"
      role="alertdialog"
      @backdropclick="uninstallCandidate = null"
      @escape="uninstallCandidate = null"
    >
      <template #title>
        {{ phone.t('Apps.appStore.account.uninstallTitle') }}
      </template>
      <p v-if="uninstallCandidate">
        {{
          phone.t('Apps.appStore.account.uninstallBody', {
            app: getPhoneAppLabel(uninstallCandidate, phone.t),
          })
        }}
      </p>
      <template #buttons>
        <SkyDialogButton @click="uninstallCandidate = null">
          {{ phone.t('Common.cancel') }}
        </SkyDialogButton>
        <SkyDialogButton strong @click="confirmUninstall">
          {{ phone.t('Apps.appStore.account.uninstall') }}
        </SkyDialogButton>
      </template>
    </SkyDialog>
  </SkyAppPage>
</template>

<style scoped>
.app-store-page {
  padding: 0;
  background: var(--sky-bg);
  color: var(--sky-text);
}

.app-store-page :deep(button:not(:disabled)) {
  transition:
    transform var(--sky-transition-fast) var(--sky-ease-out),
    filter var(--sky-transition-fast) var(--sky-ease-out),
    background-color var(--sky-transition-fast) var(--sky-ease-out),
    color var(--sky-transition-fast) var(--sky-ease-out);
}

.app-store-navbar {
  min-height: calc(
    var(--sky-safe-area-top) + var(--sky-navbar-height) +
      var(--sky-navbar-large-title-height) - 30px
  );
}

.app-store-navbar :deep(.sky-navbar__right) {
  z-index: 2;
  transform: translateY(calc(var(--sky-navbar-height) - 30px));
}

.app-store-navbar :deep(.sky-navbar__inner) {
  margin-bottom: 0;
}

.app-store-navbar :deep(.sky-navbar__title-container) {
  padding-right: calc(
    var(--sky-touch-target) + var(--sky-page-gutter) +
      var(--sky-safe-area-right)
  );
  transform: translateY(calc(0px - var(--sky-navbar-collapse-offset) - 30px));
}

.app-store-profile {
  width: var(--sky-touch-target);
  height: var(--sky-touch-target);
  display: grid;
  place-items: center;
  border: 0;
  padding: 0;
  border-radius: 50%;
  color: var(--sky-text);
  background: var(--sky-glass-solid);
  box-shadow: var(
    --sky-shadow-glass,
    inset 0 0 0 1px var(--sky-hairline),
    inset 0 0 5px 1px rgba(255, 255, 255, 0.35),
    0 4px 14px rgba(0, 0, 0, 0.16)
  );
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.app-store-profile:focus-visible {
  outline: 2px solid var(--sky-app-accent);
  outline-offset: 2px;
}

.app-store-account-sheet :deep(.sky-sheet__panel) {
  max-height: 92%;
}

.app-store-account-sheet--dragging :deep(.sky-sheet__panel) {
  transform: translateY(var(--store-account-drag-offset, 0px));
  transition-duration: 0ms;
}

.store-account {
  display: grid;
  gap: var(--sky-space-4);
  padding: var(--sky-space-4) var(--sky-page-gutter)
    calc(var(--sky-safe-area-bottom) + var(--sky-space-5));
}

.store-account__grabber {
  width: 100%;
  height: 28px;
  display: grid;
  place-items: center;
  margin: calc(0px - var(--sky-space-3)) 0 calc(0px - var(--sky-space-2));
  border: 0;
  padding: 0;
  background: transparent;
  cursor: grab;
  touch-action: none;
}

.store-account__grabber:active {
  cursor: grabbing;
}

.store-account__grabber:focus-visible {
  outline: none;
}

.store-account__grabber span {
  width: 36px;
  height: 5px;
  border-radius: var(--sky-radius-pill);
  background: var(--sky-subtle);
}

.store-account__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sky-space-3);
}

.store-account__toolbar > div {
  min-width: 0;
}

.store-account__toolbar span,
.store-account__section-heading span {
  color: var(--sky-app-accent);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.store-account__toolbar h2,
.store-account__section-heading h3 {
  margin: 2px 0 0;
  color: var(--sky-text);
  line-height: 1.08;
}

.store-account__toolbar h2 {
  font-size: var(--sky-font-medium-title);
}

.store-account__identity {
  min-height: 82px;
  display: flex;
  align-items: center;
  gap: var(--sky-space-3);
  border: 1px solid var(--sky-hairline);
  border-radius: var(--sky-radius-card);
  padding: var(--sky-space-4);
  background: var(--sky-surface-muted);
}

.store-account__identity > span {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  flex: 0 0 54px;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(145deg, #8eacf0, #586db8);
  font-size: 17px;
  font-weight: 800;
}

.store-account__identity > div {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.store-account__identity strong,
.store-account__identity small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-account__identity small {
  margin-top: 3px;
  color: var(--sky-muted);
  font-size: 11px;
}

.store-account__identity > svg {
  flex: 0 0 auto;
  color: var(--sky-app-accent);
}

.store-account__summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sky-space-3);
  margin: 0;
}

.store-account__summary > div {
  min-height: 70px;
  display: grid;
  place-items: center;
  border-radius: var(--sky-radius-card);
  padding: var(--sky-space-3);
  background: var(--sky-surface-variant);
  text-align: center;
}

.store-account__summary dt {
  color: var(--sky-text);
  font-size: 22px;
  font-weight: 800;
}

.store-account__summary dd {
  margin: -4px 0 0;
  color: var(--sky-muted);
  font-size: 11px;
  font-weight: 700;
}

.store-account__section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sky-space-3);
}

.store-account__section-heading h3 {
  font-size: 20px;
}

.store-account__section-heading > strong {
  min-width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: var(--sky-radius-pill);
  color: var(--sky-muted);
  background: var(--sky-surface-variant);
  font-size: 11px;
}

.store-account__apps {
  overflow: hidden;
  border: 1px solid var(--sky-hairline);
  border-radius: var(--sky-radius-card);
  background: var(--sky-surface);
}

.store-account__apps article {
  min-height: 76px;
  display: flex;
  align-items: center;
  gap: var(--sky-space-3);
  border-bottom: 1px solid var(--sky-hairline);
  padding: var(--sky-space-3);
}

.store-account__apps article:last-child {
  border-bottom: 0;
}

.store-account__apps article > img {
  width: 50px;
  height: 50px;
  flex: 0 0 50px;
  border-radius: calc(var(--sky-radius-control) + var(--sky-space-1));
  object-fit: cover;
}

.store-account__apps article > div {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.store-account__apps article > div strong,
.store-account__apps article > div small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-account__apps article > div strong {
  font-size: 13px;
}

.store-account__apps article > div small {
  color: var(--sky-muted);
  font-size: 9px;
}

.store-account__primary-action {
  min-width: 66px;
  min-height: var(--sky-touch-target);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 0 0 auto;
  border: 0;
  border-radius: var(--sky-radius-pill);
  padding: 0 var(--sky-space-3);
  color: var(--sky-app-accent);
  background: var(--sky-surface-muted);
  font-size: 11px;
  font-weight: 850;
}

.store-account__remove {
  width: var(--sky-touch-target);
  height: var(--sky-touch-target);
  display: grid;
  place-items: center;
  flex: 0 0 var(--sky-touch-target);
  border: 0;
  border-radius: 50%;
  color: var(--sky-danger);
  background: var(--sky-danger-soft);
}

:global(.phone-app--performance) .store-account__identity,
:global(.phone-app--performance) .store-account__apps {
  box-shadow: none;
}

.store-scroll {
  min-height: 0;
  flex: 1 1 auto;
  padding-top: 0;
  padding-right: calc(var(--sky-page-gutter) + var(--sky-safe-area-right));
  padding-left: calc(var(--sky-page-gutter) + var(--sky-safe-area-left));
  overflow-y: auto;
}

.store-scroll--detail {
  margin-top: var(--sky-safe-area-top);
}

.store-today {
  display: grid;
  gap: var(--sky-space-5);
  padding-bottom: var(--sky-space-6);
}

.store-today__date {
  margin: 0;
  color: var(--sky-muted);
  font-size: var(--sky-font-caption);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.store-today__heading {
  margin: var(--sky-space-2) 0 0;
  color: var(--sky-text);
  font-size: var(--sky-font-medium-title);
  line-height: 1.08;
}

.store-highlight {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border-radius: var(--sky-radius-card);
  color: #fff;
  background:
    radial-gradient(
      circle at 78% 20%,
      var(--store-highlight-glow),
      transparent 35%
    ),
    linear-gradient(145deg, var(--store-highlight-background), #10141f 125%);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.18);
  transition:
    box-shadow 100ms ease,
    transform 100ms ease;
}

.store-highlight__detail-link {
  width: 100%;
  height: 100%;
  position: absolute;
  z-index: 3;
  inset: 0;
  border: 0;
  border-radius: inherit;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.store-highlight__detail-link:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.9);
  outline-offset: -3px;
}

.store-highlight__copy {
  position: relative;
  z-index: 2;
  padding: var(--sky-space-5);
}

.store-highlight__copy p,
.store-highlight__copy h2,
.store-highlight__copy > span {
  margin: 0;
}

.store-highlight__copy p {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.76);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.store-highlight__copy h2 {
  max-width: 88%;
  margin-top: var(--sky-space-2);
  font-size: 28px;
  line-height: 1.03;
}

.store-highlight__copy > span {
  max-width: 78%;
  display: block;
  margin-top: var(--sky-space-2);
  color: rgba(255, 255, 255, 0.78);
  font-size: 14px;
  line-height: 1.3;
}

.store-highlight__art {
  position: relative;
  height: 170px;
  display: grid;
  place-items: center;
}

.store-highlight__orbit {
  position: absolute;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  box-shadow:
    0 0 0 28px rgba(255, 255, 255, 0.06),
    0 0 0 58px rgba(255, 255, 255, 0.035);
}

.store-highlight__art img {
  position: relative;
  width: 124px;
  height: 124px;
  border-radius: calc(var(--sky-radius-card) - var(--sky-space-1));
  object-fit: cover;
  filter: drop-shadow(0 16px 18px rgba(0, 0, 0, 0.34));
  transform: rotate(-4deg);
}

.store-highlight__footer {
  position: relative;
  z-index: 2;
  min-height: 76px;
  display: flex;
  align-items: center;
  gap: var(--sky-space-3);
  padding: var(--sky-space-3) var(--sky-space-4);
  background: rgba(0, 0, 0, 0.2);
}

.store-highlight__footer > img {
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  border-radius: calc(var(--sky-radius-control) + var(--sky-space-1));
  object-fit: cover;
}

.store-highlight__footer > div {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.store-highlight__footer strong,
.store-highlight__footer small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-highlight__footer small {
  color: rgba(255, 255, 255, 0.7);
}

.store-highlight__footer button {
  position: relative;
  z-index: 4;
  min-width: 68px;
  min-height: var(--sky-touch-target);
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--sky-radius-pill);
  padding: 0 var(--sky-space-3);
  color: var(--sky-app-accent);
  background: rgba(255, 255, 255, 0.9);
  font-weight: 800;
}

.store-highlight--compact .store-highlight__copy {
  min-height: 116px;
}

.store-highlight--compact .store-highlight__copy h2 {
  max-width: 70%;
  font-size: 24px;
}

.store-highlight--compact .store-highlight__art {
  position: absolute;
  top: 18px;
  right: 8px;
  width: 112px;
  height: 112px;
}

.store-highlight--compact .store-highlight__orbit {
  width: 96px;
  height: 96px;
  box-shadow: 0 0 0 18px rgba(255, 255, 255, 0.05);
}

.store-highlight--compact .store-highlight__art img {
  width: 72px;
  height: 72px;
  border-radius: calc(var(--sky-radius-control) + var(--sky-space-2));
}

.store-today__edition {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sky-space-3);
  border-bottom: 1px solid var(--sky-hairline);
  padding-bottom: var(--sky-space-3);
}

.store-today__edition > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.store-today__edition strong {
  overflow: hidden;
  color: var(--sky-text);
  text-overflow: ellipsis;
  text-transform: capitalize;
  white-space: nowrap;
  font-size: 14px;
}

.store-today__edition > div span {
  color: var(--sky-muted);
  font-size: var(--sky-font-caption);
}

.store-today__edition-badge {
  height: 28px;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 5px;
  border: 1px solid var(--sky-hairline);
  border-radius: var(--sky-radius-pill);
  padding: 0 var(--sky-space-2);
  color: var(--sky-app-accent);
  background: var(--sky-surface);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.store-today__section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sky-space-3);
  margin-top: var(--sky-space-1);
}

.store-today__section-heading > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.store-today__section-heading span {
  color: var(--sky-app-accent);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.store-today__section-heading h2 {
  margin: 0;
  color: var(--sky-text);
  font-size: var(--sky-font-medium-title);
  line-height: 1.08;
}

.store-today__section-heading > svg {
  margin-bottom: 2px;
  color: var(--sky-app-accent);
}

.store-highlight__texture {
  position: absolute;
  inset: 0;
  opacity: 0.42;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 22px 22px;
  pointer-events: none;
}

.store-highlight__spark {
  position: absolute;
  z-index: 1;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 14px 4px var(--store-highlight-glow);
}

.store-highlight__spark--one {
  top: 18px;
  right: 24%;
}

.store-highlight__spark--two {
  bottom: 34px;
  left: 22%;
  width: 4px;
  height: 4px;
  opacity: 0.7;
}

.store-highlight--compact .store-highlight__copy {
  min-height: 132px;
}

.store-highlight--compact .store-highlight__copy > span {
  max-width: 62%;
  font-size: 12px;
}

.store-highlight__story-number {
  min-width: 24px;
  height: 20px;
  display: inline-grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--sky-radius-pill);
  color: #fff;
  background: rgba(0, 0, 0, 0.14);
  font-size: 9px;
  letter-spacing: 0;
}

.store-highlight--reverse {
  background:
    radial-gradient(
      circle at 18% 18%,
      var(--store-highlight-glow),
      transparent 34%
    ),
    linear-gradient(215deg, var(--store-highlight-background), #10141f 125%);
}

.store-highlight--reverse .store-highlight__copy {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  text-align: right;
}

.store-highlight--reverse .store-highlight__copy p,
.store-highlight--reverse .store-highlight__copy h2,
.store-highlight--reverse .store-highlight__copy > span {
  max-width: 70%;
}

.store-highlight--reverse .store-highlight__art {
  right: auto;
  left: 8px;
}

.store-ranking {
  overflow: hidden;
  border: 1px solid var(--sky-hairline);
  border-radius: var(--sky-radius-card);
  background: var(--sky-surface);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.1);
}

.store-ranking__header {
  display: flex;
  align-items: center;
  gap: var(--sky-space-3);
  border-bottom: 1px solid var(--sky-hairline);
  padding: var(--sky-space-4);
  background: var(--sky-surface-muted);
}

.store-ranking__icon {
  width: var(--sky-touch-target);
  height: var(--sky-touch-target);
  display: grid;
  place-items: center;
  flex: 0 0 var(--sky-touch-target);
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(145deg, #ffb21c, #ff7a00);
  box-shadow: 0 7px 16px rgba(255, 132, 0, 0.28);
}

.store-ranking__header h2,
.store-ranking__header p {
  margin: 0;
}

.store-ranking__header h2 {
  color: var(--sky-text);
  font-size: 20px;
}

.store-ranking__header p {
  margin-top: 2px;
  color: var(--sky-muted);
  font-size: 12px;
}

.store-ranking ol {
  margin: 0;
  padding: 0 var(--sky-space-4);
  list-style: none;
}

.store-ranking li {
  min-height: 72px;
  display: flex;
  align-items: center;
  gap: var(--sky-space-2);
  border-bottom: 1px solid var(--sky-hairline);
}

.store-ranking li:last-child {
  border-bottom: 0;
}

.store-ranking__position {
  width: 16px;
  flex: 0 0 16px;
  color: var(--sky-muted);
  text-align: center;
  font-size: 15px;
  font-weight: 800;
}

.store-ranking__detail-link {
  min-width: 0;
  min-height: 72px;
  display: flex;
  align-items: center;
  flex: 1;
  gap: var(--sky-space-2);
  border: 0;
  padding: 0;
  color: inherit;
  background: transparent;
  text-align: left;
  transition: transform 100ms ease;
}

.store-ranking__detail-link:focus-visible {
  border-radius: var(--sky-radius-control);
  outline: 2px solid var(--sky-app-accent);
  outline-offset: -2px;
}

.store-ranking__detail-link > img {
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  border-radius: calc(var(--sky-radius-control) + var(--sky-space-1));
  object-fit: cover;
}

.store-ranking__details {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.store-ranking__details strong,
.store-ranking__details small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-ranking__details small {
  color: var(--sky-muted);
  font-size: 11px;
}

.store-ranking li > button:not(.store-ranking__detail-link),
.store-final-pick > button:not(.store-highlight__detail-link) {
  min-width: 62px;
  min-height: var(--sky-touch-target);
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--sky-radius-pill);
  padding: 0 var(--sky-space-2);
  color: var(--sky-app-accent);
  background: var(--sky-surface-muted);
  font-size: 12px;
  font-weight: 800;
}

.store-final-pick {
  position: relative;
  min-height: 150px;
  display: grid;
  align-items: center;
  grid-template-columns: 1fr auto;
  gap: var(--sky-space-3);
  overflow: hidden;
  border-radius: var(--sky-radius-card);
  padding: var(--sky-space-5);
  color: #fff;
  background: linear-gradient(
    145deg,
    var(--store-highlight-background),
    #111826
  );
  transition:
    box-shadow 100ms ease,
    transform 100ms ease;
}

.store-final-pick__glow {
  position: absolute;
  top: -70px;
  right: -50px;
  width: 190px;
  height: 190px;
  border-radius: 50%;
  background: var(--store-highlight-glow);
  opacity: 0.42;
  filter: blur(30px);
}

.store-final-pick__heading {
  position: relative;
  z-index: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.store-final-pick__heading span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.store-final-pick__heading strong {
  margin-top: 6px;
  font-size: 22px;
  line-height: 1.05;
}

.store-final-pick__heading small {
  margin-top: 7px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.store-final-pick > img {
  position: relative;
  z-index: 1;
  width: 76px;
  height: 76px;
  border-radius: calc(var(--sky-radius-card) - var(--sky-space-2));
  object-fit: cover;
  filter: drop-shadow(0 12px 15px rgba(0, 0, 0, 0.32));
  transform: rotate(4deg);
}

.store-final-pick > button:not(.store-highlight__detail-link) {
  position: relative;
  z-index: 4;
  grid-column: 1 / -1;
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
}

:global(.phone-app--performance) .store-highlight,
:global(.phone-app--performance) .store-ranking,
:global(.phone-app--performance) .store-final-pick {
  box-shadow: none;
}

:global(.phone-app--performance) .store-final-pick__glow,
:global(.phone-app--performance) .store-highlight__texture {
  display: none;
}

:global(.phone-app--performance) .store-highlight__art img,
:global(.phone-app--performance) .store-final-pick > img {
  filter: none;
}

@media (hover: hover) and (pointer: fine) {
  .store-highlight:has(.store-highlight__detail-link:hover),
  .store-final-pick:has(.store-highlight__detail-link:hover) {
    box-shadow: 0 17px 32px rgba(0, 0, 0, 0.24);
    transform: translateY(-1px);
  }
}

.store-browse {
  display: grid;
  gap: var(--sky-space-4);
  padding-bottom: var(--sky-space-5);
}

.store-browse-feature {
  position: relative;
  min-height: 354px;
  overflow: hidden;
  border-radius: var(--sky-radius-card);
  color: #fff;
  background:
    radial-gradient(
      circle at 78% 18%,
      var(--store-highlight-glow),
      transparent 38%
    ),
    linear-gradient(150deg, var(--store-highlight-background), #0e1421 125%);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.18);
}

.store-browse-feature__texture {
  position: absolute;
  inset: 0;
  opacity: 0.45;
  background:
    linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.08)),
    repeating-linear-gradient(
      -32deg,
      transparent 0,
      transparent 16px,
      rgba(255, 255, 255, 0.025) 17px,
      rgba(255, 255, 255, 0.025) 18px
    );
  pointer-events: none;
}

.store-browse-feature__copy {
  position: relative;
  z-index: 2;
  min-height: 112px;
  padding: var(--sky-space-5) var(--sky-space-5) 0;
}

.store-browse-feature__copy span {
  color: #55b6ff;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.store-browse-feature__copy h2,
.store-browse-feature__copy p {
  margin: 0;
}

.store-browse-feature__copy h2 {
  max-width: 94%;
  margin-top: 6px;
  font-size: 27px;
  line-height: 1.04;
}

.store-browse-feature__copy p {
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 12px;
}

.store-browse-feature__art {
  position: relative;
  height: 166px;
  display: grid;
  place-items: center;
}

.store-browse-feature__art > span {
  position: absolute;
  width: 210px;
  height: 125px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  box-shadow:
    0 0 0 22px rgba(255, 255, 255, 0.04),
    0 18px 40px rgba(0, 0, 0, 0.22);
  transform: rotate(-8deg);
}

.store-browse-feature__art > svg {
  position: absolute;
  color: rgba(255, 255, 255, 0.14);
  transform: translate(58px, -14px) rotate(12deg);
}

.store-browse-feature__art > img {
  position: relative;
  z-index: 1;
  width: 118px;
  height: 118px;
  border-radius: calc(var(--sky-radius-card) - var(--sky-space-1));
  object-fit: cover;
  filter: drop-shadow(0 16px 18px rgba(0, 0, 0, 0.36));
  transform: translateX(-28px) rotate(-5deg);
}

.store-browse-feature footer {
  position: relative;
  z-index: 2;
  min-height: 76px;
  display: flex;
  align-items: center;
  gap: var(--sky-space-3);
  padding: var(--sky-space-3) var(--sky-space-4);
  background: rgba(0, 0, 0, 0.25);
}

.store-browse-feature footer > img {
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  border-radius: calc(var(--sky-radius-control) + var(--sky-space-1));
  object-fit: cover;
}

.store-browse-feature__details {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  border: 0;
  padding: 0;
  color: inherit;
  background: transparent;
  text-align: left;
}

.store-browse-feature footer strong,
.store-browse-feature footer small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-browse-feature__details:focus-visible,
.store-list__detail-link:focus-visible,
.store-search__detail-link:focus-visible {
  outline: 2px solid var(--sky-app-accent);
  outline-offset: 2px;
}

.store-browse-feature footer small {
  color: rgba(255, 255, 255, 0.66);
  font-size: 10px;
}

.store-browse-feature footer button:not(.store-browse-feature__details) {
  min-width: 68px;
  min-height: var(--sky-touch-target);
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--sky-radius-pill);
  padding: 0 var(--sky-space-3);
  color: var(--sky-app-accent);
  background: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  font-weight: 850;
}

.store-featured-enter-active,
.store-featured-leave-active {
  transition:
    opacity var(--sky-transition-normal) var(--sky-ease-out),
    transform var(--sky-transition-normal) var(--sky-ease-out);
}

.store-featured-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.store-featured-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

.store-browse__pages {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin: calc(0px - var(--sky-space-4)) 0 calc(0px - var(--sky-space-3));
}

.store-browse__pages button {
  position: relative;
  width: var(--sky-touch-target);
  height: var(--sky-touch-target);
  display: grid;
  place-items: center;
  border: 0;
  padding: 0;
  background: transparent;
}

.store-browse__pages button::after {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--sky-subtle);
  content: '';
  transition:
    width var(--sky-transition-fast) var(--sky-ease-out),
    background var(--sky-transition-fast) var(--sky-ease-out);
}

.store-browse__pages button.is-active::after {
  width: 18px;
  border-radius: var(--sky-radius-pill);
  background: var(--sky-app-accent);
}

.store-browse__list-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sky-space-3);
  margin-top: var(--sky-space-2);
}

.store-browse__list-heading > div {
  min-width: 0;
}

.store-browse__list-heading span {
  color: var(--sky-app-accent);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.store-browse__list-heading h2 {
  margin: 2px 0 0;
  color: var(--sky-text);
  font-size: var(--sky-font-medium-title);
  line-height: 1.08;
}

.store-browse__list-heading > strong {
  min-width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: var(--sky-radius-pill);
  color: var(--sky-muted);
  background: var(--sky-surface-variant);
  font-size: 11px;
}

.store-list--browse {
  overflow: hidden;
  border: 1px solid var(--sky-hairline);
  border-radius: var(--sky-radius-card);
  background: var(--sky-surface);
}

.store-list--browse article {
  min-height: 76px;
  padding: var(--sky-space-3) var(--sky-space-4);
}

.store-list--browse article:last-of-type {
  border-bottom: 0;
}

.store-list--browse .store-icon {
  width: 52px;
  height: 52px;
  flex-basis: 52px;
  border-radius: calc(var(--sky-radius-control) + var(--sky-space-1));
}

.store-list--browse small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}

:global(.phone-app--performance) .store-browse-feature {
  box-shadow: none;
}

:global(.phone-app--performance) .store-browse-feature__texture {
  display: none;
}

:global(.phone-app--performance) .store-browse-feature__art > img {
  filter: none;
}

.app-store-navbar :deep(.sky-navbar__subnavbar .sky-searchbar__control) {
  border-color: var(--sky-hairline);
  background: var(--sky-surface-variant);
}

.app-store-navbar :deep(.sky-navbar__subnavbar .sky-searchbar__input) {
  font-size: 15px;
  font-weight: 600;
}

.app-store-navbar :deep(.sky-navbar__subnavbar .sky-searchbar__suffix) {
  color: var(--sky-text);
}

.store-search {
  display: grid;
  gap: var(--sky-space-6);
  padding-bottom: var(--sky-space-6);
}

.store-search__section,
.store-search__results {
  min-width: 0;
}

.store-search__heading {
  min-height: var(--sky-touch-target);
  display: flex;
  align-items: center;
  gap: var(--sky-space-1);
  color: var(--sky-text);
}

.store-search__heading h2 {
  margin: 0;
  font-size: var(--sky-font-medium-title);
  line-height: 1.08;
}

.store-search__heading > div {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sky-space-3);
}

.store-search__heading > div > span {
  min-width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: var(--sky-radius-pill);
  color: var(--sky-muted);
  background: var(--sky-surface-variant);
  font-size: 11px;
  font-weight: 800;
}

.store-search__recommendations {
  overflow: hidden;
  border-bottom: 1px solid var(--sky-hairline);
}

.store-search__recommendations article {
  min-height: 82px;
  display: flex;
  align-items: center;
  gap: var(--sky-space-3);
  border-top: 1px solid var(--sky-hairline);
  padding: var(--sky-space-3) 0;
}

.store-search__recommendations article:first-child {
  border-top: 0;
}

.store-search__recommendations article.store-search__recommendation--promoted {
  margin-bottom: var(--sky-space-2);
  border: 1px solid rgba(117, 151, 218, 0.22);
  border-radius: var(--sky-radius-card);
  padding: var(--sky-space-3);
  background: linear-gradient(
    115deg,
    rgba(90, 121, 181, 0.22),
    var(--sky-surface)
  );
}

.store-search__recommendations img {
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
  border-radius: calc(var(--sky-radius-control) + var(--sky-space-1));
  object-fit: cover;
}

.store-search__detail-link {
  min-width: 0;
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--sky-space-3);
  border: 0;
  padding: 0;
  color: inherit;
  background: transparent;
  text-align: left;
}

.store-search__detail-link > span {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.store-search__recommendations strong,
.store-search__recommendations small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-search__recommendations strong {
  font-size: 15px;
}

.store-search__recommendations small {
  color: var(--sky-muted);
  font-size: 11px;
}

.store-search__recommendations em {
  width: max-content;
  margin-top: 2px;
  border-radius: 4px;
  padding: 2px 5px;
  color: #fff;
  background: #72aaf5;
  font-size: 9px;
  font-weight: 800;
  font-style: normal;
}

.store-search__recommendations
  article
  > button:not(.store-search__detail-link) {
  min-width: 68px;
  min-height: var(--sky-touch-target);
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 0;
  border-radius: var(--sky-radius-pill);
  padding: 0 var(--sky-space-3);
  color: var(--sky-app-accent);
  background: var(--sky-surface-muted);
  font-size: 12px;
  font-weight: 850;
}

.store-search__discover {
  margin-top: calc(0px - var(--sky-space-2));
}

.store-search__discover-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sky-space-3);
}

.store-search__discover-grid > button {
  min-width: 0;
  min-height: 124px;
  position: relative;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  justify-content: flex-end;
  border: 0;
  border-radius: var(--sky-radius-card);
  padding: var(--sky-space-4);
  color: #fff;
  background:
    radial-gradient(
      circle at 80% 18%,
      rgba(255, 255, 255, 0.36),
      transparent 34%
    ),
    var(--store-search-tile);
  text-align: left;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
}

.store-search__discover-grid > button::before {
  width: 68px;
  height: 68px;
  position: absolute;
  top: -16px;
  right: -8px;
  border: 12px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  content: '';
}

.store-search__discover-grid svg {
  position: absolute;
  top: var(--sky-space-3);
  right: var(--sky-space-3);
  color: rgba(255, 255, 255, 0.5);
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.12));
}

.store-search__discover-grid span,
.store-search__discover-grid small {
  position: relative;
  z-index: 1;
}

.store-search__discover-grid span {
  max-width: 92%;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.05;
}

.store-search__discover-grid small {
  margin-top: 5px;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.72);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.phone-app--performance) .store-search__discover-grid > button {
  background: var(--store-search-tile);
  box-shadow: none;
}

@media (prefers-reduced-motion: reduce) {
  .store-featured-enter-active,
  .store-featured-leave-active,
  .store-browse__pages button {
    transition: none;
  }
}

.store-list {
  padding: 0;
}

.store-list__detail-link {
  min-width: 0;
  min-height: 60px;
  display: flex;
  align-items: center;
  flex: 1;
  gap: var(--sky-space-3);
  border: 0;
  padding: 0;
  color: inherit;
  background: transparent;
  text-align: left;
}

.store-list__detail-link > span {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.store-list__detail-link strong,
.store-list__detail-link small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-list article {
  display: flex;
  align-items: center;
  gap: var(--sky-space-3);
  border-color: var(--sky-hairline);
}

.store-list small,
.store-empty {
  color: var(--sky-muted);
}

.store-list article > button:not(.store-list__detail-link) {
  min-width: 68px;
  min-height: var(--sky-touch-target);
  flex: 0 0 auto;
  color: var(--sky-app-accent);
  background: var(--sky-surface-muted);
}

.store-highlight__footer :deep(button:has(.app-store-action--icon)),
.store-ranking li > :deep(button:has(.app-store-action--icon)),
.store-final-pick > :deep(button:has(.app-store-action--icon)),
.store-browse-feature footer > :deep(button:has(.app-store-action--icon)),
.store-search__recommendations
  article
  > :deep(button:has(.app-store-action--icon)),
.store-list
  article
  > :deep(button:not(.store-list__detail-link):has(.app-store-action--icon)) {
  width: var(--sky-touch-target);
  min-width: var(--sky-touch-target);
  padding: 0;
  border-color: transparent;
  color: var(--sky-app-accent);
  background: transparent;
  box-shadow: none;
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

@media (hover: hover) and (pointer: fine) {
  .app-store-page
    :deep(button:not(.store-ranking__detail-link):not(:disabled):hover) {
    filter: brightness(1.08);
    transform: translateY(-1px);
  }

  .app-store-page :deep(button:not(:disabled):active) {
    filter: brightness(0.98);
    transform: scale(0.97);
  }

  .app-store-page :deep(button:has(.app-store-action--icon):hover) {
    filter: brightness(1.16)
      drop-shadow(
        0 3px 7px color-mix(in srgb, var(--sky-app-accent) 28%, transparent)
      );
  }

  .store-account__primary-action:not(:disabled):hover {
    background: var(--sky-app-accent-soft);
  }

  .store-account__remove:not(:disabled):hover {
    background: color-mix(in srgb, var(--sky-danger) 22%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-store-page :deep(button) {
    transition: none;
  }
}
</style>
