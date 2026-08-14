import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./AppStoreApp.vue', import.meta.url),
  'utf8',
)
const navigationSource = source.slice(
  source.indexOf('<SkyPillNavigation'),
  source.indexOf('</SkyPillNavigation>') + '</SkyPillNavigation>'.length,
)

describe('AppStoreApp Sky navigation contract', () => {
  it('uses only the first-party Sky UI surface', () => {
    expect(source).not.toContain("from 'konsta/vue'")
    expect(source).not.toMatch(/<\/?k-[a-z]/)
    expect(source).toContain('<SkyAppPage')
    expect(source).toContain('<SkyNavbar')
    expect(source).toContain('<SkyPillNavigation')
    expect(source).toContain('<SkySearchbar')
    expect(source).toContain('<SkySpinner')
    expect(source.match(/<SkyScrollArea/g)).toHaveLength(1)
  })

  it('renders the Today, Apps, Games and Search glass navigation', () => {
    expect(source).toContain("{ id: 'today', icon: Newspaper }")
    expect(source).toContain("{ id: 'apps', icon: Grid2X2 }")
    expect(source).toContain("{ id: 'games', icon: Gamepad2 }")
    expect(source).toContain("{ id: 'search', icon: Search }")
    expect(source).toContain('class="app-store-navigation"')
    expect(source).toContain('layout="full"')
    expect(source).toContain('<SkySegmented')
    expect(source).toContain('navigation')
    expect(source.match(/<SkySegmented\b/g)).toHaveLength(1)
    expect(source).toContain(':active-index="activeTabIndex"')
    expect(source).toContain(':item-count="tabs.length"')
    expect(source).toContain('<SkySegmentedButton')
    expect(source).toContain(':active="tab === item.id"')
    expect(navigationSource).toContain('class="app-store-navigation__item"')
    expect(navigationSource).not.toContain('compact')
  })

  it('renders an Apple-style Search landing page and separate results state', () => {
    expect(source).toContain('const hasSearchQuery = computed')
    expect(source).toContain('const searchRecommendations = computed')
    expect(source).toContain('const searchDiscoverCards = computed')
    expect(source).toContain('v-if="!hasSearchQuery"')
    expect(source).toContain('class="store-search__recommendations"')
    expect(source).toContain('class="store-search__discover-grid"')
    expect(source).toContain(
      'class="store-list store-list--browse store-list--search-results"',
    )
    expect(source).not.toContain('.store-list--search-results article > button')
    expect(source).not.toContain('<template #suffix>')
    expect(source).not.toMatch(/\bMic\b/)
    expect(source).toContain('selectSearchDiscovery(card.app)')
    expect(source).toMatch(
      /\.store-search__discover-grid > button\s*\{[^}]*min-height:\s*124px/s,
    )
  })

  it('opens profile app management with update and uninstall actions', () => {
    expect(source).toContain('@click="profileOpened = true"')
    expect(source).toContain('const installedApps = computed')
    expect(source).toContain('return !appStore.isInstalled(app.id)')
    expect(source).toContain('class="store-account__apps"')
    expect(source).toContain('appStore.updateApp(app.id, currentRelease)')
    expect(source).toContain(
      'appStore.uninstallApp(uninstallCandidate.value.id)',
    )
    expect(source).toContain('v-if="isPhoneAppRemovable(app)"')
    expect(source).toContain(':opened="Boolean(uninstallCandidate)"')
    expect(source).toContain('class="store-account__grabber"')
    expect(source).toContain('@pointerdown="beginProfileDrag"')
    expect(source).toContain('@pointermove="moveProfileDrag"')
    expect(source).toContain('@pointerup="endProfileDrag"')
    expect(source).toContain('profileDragOffset.value >= 72')
    expect(source).not.toContain('<X :size="20"')
  })

  it('opens App Store details from app and game lists without replacing direct actions', () => {
    expect(source).toContain(
      "import AppStoreDetail from './AppStoreDetail.vue'",
    )
    expect(source).toContain(
      'const selectedApp = ref<LaunchablePhoneAppDefinition | null>(null)',
    )
    expect(source).toContain('<AppStoreDetail')
    expect(source).toContain('@click="openAppDetail(app)"')
    expect(source).toContain('@action="handleApp(selectedApp)"')
    expect(source).toContain('@back="selectedApp = null"')
    expect(source).toContain('@click="selectStoreTab(item.id)"')
    expect(source).toContain('scrollElement?.scrollTo({ top: 0 })')
  })

  it('shares app details through EasyShare and restores shared detail links', () => {
    expect(source).toContain(
      "import { useEasyShareStore } from '@/stores/easyshare'",
    )
    expect(source).toContain("appId: 'app-store'")
    expect(source).toContain("kind: 'link'")
    expect(source).toContain('link: `skyphone://app-store/${app.id}`')
    expect(source).toContain('easyShare.open({')
    expect(source).toContain('route.query.easyShareId')
    expect(source).not.toContain('shareToastOpened')
  })

  it('keeps one scroll owner and accessible 44px app actions', () => {
    expect(source).toMatch(
      /<SkyScrollArea\s+ref="storeScroll"\s+class="store-scroll"[\s\S]*?with-tabbar\s*>/,
    )
    expect(source).toMatch(/\.store-scroll\s*\{[^}]*overflow-y:\s*auto/s)
    expect(source).not.toMatch(/\.store-scroll\s*\{[^}]*padding\s*:/s)
    expect(source).toMatch(/\.store-scroll\s*\{[^}]*padding-top:\s*0/s)
    expect(source).toMatch(
      /\.store-scroll\s*\{[^}]*padding-right:\s*calc\(var\(--sky-page-gutter\) \+ var\(--sky-safe-area-right\)\)/s,
    )
    expect(source).toMatch(
      /\.store-scroll\s*\{[^}]*padding-left:\s*calc\(var\(--sky-page-gutter\) \+ var\(--sky-safe-area-left\)\)/s,
    )
    expect(source).toMatch(
      /\.store-list article > button:not\(\.store-list__detail-link\)\s*\{[^}]*min-height:\s*var\(--sky-touch-target\)/s,
    )
    expect(source).toContain(':clear-label="phone.t(\'Common.clear\')"')
    expect(source).toContain(
      ':label="phone.t(\'Apps.appStore.searchPlaceholder\')"',
    )
    expect(source).toContain(
      ':class="{ \'store-scroll--detail\': selectedApp }"',
    )
    expect(source).toMatch(
      /\.store-scroll--detail\s*\{[^}]*margin-top:\s*var\(--sky-safe-area-top\)/s,
    )
  })

  it('gives interactive download, update and remove buttons subtle pointer feedback', () => {
    expect(source).toContain('@media (hover: hover) and (pointer: fine)')
    expect(source).toMatch(
      /button:not\(\.store-ranking__detail-link\):not\(:disabled\):hover\)\s*\{[^}]*brightness\(1\.08\)[^}]*translateY\(-1px\)/s,
    )
    expect(source).toContain('.app-store-page .store-action-button--icon:hover')
    expect(source).toContain(
      '.store-account__primary-action:not(:disabled):hover',
    )
    expect(source).toContain('.store-account__remove:not(:disabled):hover')
    expect(source).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('builds daily Today cards from non-standard internal apps', () => {
    expect(source).toContain(
      "ref<'today' | 'apps' | 'games' | 'search'>('today')",
    )
    expect(source).toContain('getDailyHighlights(')
    expect(source).toContain('!DEFAULT_INSTALLED_PHONE_APP_IDS.has(app.id)')
    expect(source).toContain('v-else-if="tab === \'today\'"')
    expect(source).toContain('class="store-highlight store-highlight--hero"')
    expect(source).toContain('class="store-highlight store-highlight--compact"')
    expect(source).toContain('class="store-today__edition"')
    expect(source).toContain('class="store-ranking"')
    expect(source).toContain('class="store-final-pick"')
    expect(source).toContain('editorialHighlights')
    expect(source).toContain('topToday')
    expect(source).toContain('var(--sky-touch-target)')
  })

  it('opens app details from every Today banner without hijacking app actions', () => {
    expect(source.match(/class="store-highlight__detail-link"/g)).toHaveLength(
      3,
    )
    expect(source).toContain('@click="openAppDetail(dailyHighlights[0])"')
    expect(source).toContain('@click="openAppDetail(app)"')
    expect(source).toContain('@click="openAppDetail(finalHighlight)"')
    expect(source).toContain('@click.stop="handleApp(dailyHighlights[0])"')
    expect(source).toContain('@click.stop="handleApp(finalHighlight)"')
    expect(source).toContain('.store-highlight:hover')
  })

  it('opens Top Today apps while keeping their direct app actions separate', () => {
    expect(source).toContain('class="store-ranking__detail-link"')
    expect(source).toContain('@click="openAppDetail(app)"')
    expect(source).toContain('@click.stop="handleApp(app)"')
    expect(source).toContain(
      '.store-ranking li > button:not(.store-ranking__detail-link)',
    )
    expect(source).not.toContain('.store-ranking__detail-link:hover')
    expect(source).toContain(
      'button:not(.store-ranking__detail-link):not(:disabled):hover',
    )
  })

  it('keeps App Store actions compatible with the FiveM CEF target', () => {
    expect(source.match(/class="store-action-button"/g)).toHaveLength(8)
    expect(source).not.toContain(':has(')
    expect(source).not.toContain('color-mix(')
  })

  it('builds clean Apps and Games pages with rotating features', () => {
    expect(source).not.toContain('class="store-browse__filters"')
    expect(source).not.toContain('browseFilter')
    expect(source).toContain('class="store-browse-feature"')
    expect(source).toContain('class="store-list store-list--browse"')
    expect(source).toContain('featuredCandidates')
    expect(source).toContain('globalThis.setInterval')
    expect(source).toContain('}, 6500)')
    expect(source).toContain('globalThis.clearInterval')
    expect(source).toMatch(
      /\.store-browse__pages button\s*\{[^}]*width:\s*var\(--sky-touch-target\)[^}]*height:\s*var\(--sky-touch-target\)/s,
    )
  })

  it('matches the Photos large header with the player initials profile', () => {
    expect(source).toContain('class="app-store-navbar"')
    expect(source).toContain(':scroll-el="null"')
    expect(source).toContain('<template #right>')
    expect(source).toContain('class="app-store-profile"')
    expect(source).toContain('phone.player.firstName')
    expect(source).toContain('phone.player.lastName')
    expect(source).toContain('{{ profileInitials }}')
    expect(source).toContain('var(--sky-navbar-large-title-height) - 30px')
  })
})
