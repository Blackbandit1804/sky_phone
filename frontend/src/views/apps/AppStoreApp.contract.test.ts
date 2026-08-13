import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./AppStoreApp.vue', import.meta.url),
  'utf8',
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

  it('renders the Apps, Games and Search glass navigation', () => {
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
  })

  it('keeps one scroll owner and accessible 44px app actions', () => {
    expect(source).toContain('<SkyScrollArea class="store-scroll" with-tabbar>')
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
      /\.store-list article > button\s*\{[^}]*min-height:\s*var\(--sky-touch-target\)/s,
    )
    expect(source).toContain(':clear-label="phone.t(\'Common.clear\')"')
    expect(source).toContain(
      ':label="phone.t(\'Apps.appStore.searchPlaceholder\')"',
    )
  })
})
