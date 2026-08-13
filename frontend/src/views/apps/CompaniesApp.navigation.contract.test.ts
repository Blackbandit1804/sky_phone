import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./CompaniesApp.vue', import.meta.url),
  'utf8',
)
const navigationSource = source.slice(
  source.indexOf('<SkyPillNavigation'),
  source.indexOf('</SkyPillNavigation>') + '</SkyPillNavigation>'.length,
)

describe('CompaniesApp Sky pill navigation contract', () => {
  it('uses the full-width sliding glass navigation on the root screen', () => {
    expect(source).not.toContain('<SkyTabBar')
    expect(source).not.toContain('<SkyTabButton')
    expect(source).toContain('<SkyPillNavigation')
    expect(source).toContain('v-if="screen === \'root\'"')
    expect(source).toContain('layout="full"')
    expect(source).toContain('<SkySegmented')
    expect(source).toContain('navigation')
    expect(source).toContain(':active-index="activeTabIndex"')
    expect(source).toContain(':data-active-tab="activeTab"')
    expect(source).toContain(':item-count="3"')
    expect(navigationSource.match(/<SkySegmentedButton\b/g)).toHaveLength(3)
  })

  it('keeps directory, requests and work actions with unread badges', () => {
    expect(source).toContain("selectTab('directory')")
    expect(source).toContain("selectTab('requests')")
    expect(source).toContain("selectTab('work')")
    expect(source).toContain("phone.t('Apps.companies.tabs.directory')")
    expect(source).toContain("phone.t('Apps.companies.tabs.requests')")
    expect(source).toContain("phone.t('Apps.companies.tabs.work')")
    expect(source).toContain('companies.customerUnreadCount')
    expect(source).toContain('companies.workUnreadCount')
  })

  it('retains tabbar-aware padding on all three root scroll owners', () => {
    expect(source.match(/with-tabbar/g)).toHaveLength(3)
  })
})
