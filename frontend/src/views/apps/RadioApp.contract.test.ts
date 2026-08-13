import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./RadioApp.vue', import.meta.url), 'utf8')
const navigationSource = source.slice(
  source.indexOf('<SkyPillNavigation'),
  source.indexOf('</SkyPillNavigation>') + '</SkyPillNavigation>'.length,
)

describe('RadioApp Sky UI contract', () => {
  it('uses only the first-party Sky UI surface', () => {
    expect(source).not.toContain("from 'konsta/vue'")
    expect(source).not.toMatch(/<\/?k-[a-z]/)
    expect(source).toContain('<SkyAppPage')
    expect(source).toContain('<SkyNavbar')
    expect(source).toContain('<SkyPillNavigation')
    expect(source.match(/<SkyScrollArea\b/g)).toHaveLength(1)
    expect(source).toContain('<SkyStatusCard')
    expect(source).toContain('<SkyField')
    expect(source).toContain('<SkyRange')
    expect(source).toContain('<SkySettingsGroup')
    expect(source).toContain('<SkySettingsRow')
    expect(source).toContain('<SkyToast')
  })

  it('renders Radio and Settings in full-width bottom Glass navigation', () => {
    expect(navigationSource).toContain('layout="full"')
    expect(navigationSource).toContain('<SkySegmented')
    expect(navigationSource).toContain('navigation')
    expect(navigationSource).toContain('rounded')
    expect(navigationSource).toContain('strong')
    expect(navigationSource).toContain(
      ':active-index="tab === \'radio\' ? 0 : 1"',
    )
    expect(navigationSource).toContain(':data-active-tab="tab"')
    expect(navigationSource).toContain(':item-count="2"')
    expect(navigationSource.match(/<SkySegmentedButton\b/g)).toHaveLength(2)
    expect(navigationSource).toContain("tab = 'radio'")
    expect(navigationSource).toContain("tab = 'settings'")
    expect(navigationSource).toContain(
      ':aria-label="phone.t(\'Apps.radio.tabs.radio\')"',
    )
    expect(navigationSource).toContain(
      ':aria-label="phone.t(\'Apps.radio.tabs.settings\')"',
    )
    expect(navigationSource.match(/:size="20"/g)).toHaveLength(2)
    expect(navigationSource).not.toContain('compact')
    expect(source).toContain(
      '<SkyScrollArea class="radio-content" with-tabbar>',
    )
    expect(source.indexOf('</SkyScrollArea>')).toBeLessThan(
      source.indexOf('<SkyPillNavigation'),
    )
    expect(source).not.toMatch(/\.radio-content\s*\{[^}]*padding-bottom\s*:/s)
    expect(source).not.toContain('<template #subnavbar>')
    expect(source).not.toContain('radio-tab-switcher')
    expect(source).toMatch(
      /\.radio-navigation__item > span:last-child\s*\{[^}]*text-overflow:\s*ellipsis[^}]*white-space:\s*nowrap/s,
    )
  })

  it('keeps the Radio actions, hydration and trusted updates wired', () => {
    expect(source).toContain('await radio.load()')
    expect(source).toContain('await radio.connect(primary, secondary)')
    expect(source).toContain('await radio.disconnect()')
    expect(source).toContain('void radio.setVolume(volumeInput.value)')
    expect(source).toContain("radio.saveSetting('autoRejoin', $event)")
    expect(source).toContain("radio.saveSetting('notifications', $event)")
    expect(source).toContain('await radio.saveDisplayName(displayName)')
    expect(source).toContain('await radio.saveBadge(badge)')
    expect(source).toContain('isTrustedRootMessageSource(event.source, window)')
    expect(source).toContain("event.data?.type === 'radio:updated'")
    expect(source).toContain('radio.updateMembers(event.data.data.members)')
    expect(source).toContain("window.addEventListener('message', onMessage)")
    expect(source).toContain("window.removeEventListener('message', onMessage)")
    expect(source).toContain("value.replace(',', '.')")
    expect(source).toContain('connectHistory(entry)')
  })

  it('preserves theme, labels, loading, empty, error and feedback states', () => {
    expect(source).toContain(':dark="phone.isDarkMode"')
    expect(source).toContain(':label="phone.t(\'Apps.radio.name\')"')
    expect(source).toContain('radio.isLoading && !radio.data.provider')
    expect(source).toContain('<span aria-hidden="true">')
    expect(source).toContain('<SkyEmptyState')
    expect(source).toContain('role="alert"')
    expect(source).toContain(':opened="Boolean(feedback)"')
    expect(source).toContain('vertical-position="center"')
  })
})
