import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./BankingApp.vue', import.meta.url),
  'utf8',
)

describe('Banking app Sky UI migration', () => {
  it('uses Sky UI instead of Konsta components', () => {
    expect(source).not.toContain("from 'konsta/vue'")
    expect(source).not.toMatch(/<\/?k-/)

    for (const component of [
      'SkyAppPage',
      'SkyNavbar',
      'SkyGlass',
      'SkyCard',
      'SkyList',
      'SkyListItem',
      'SkyField',
      'SkyTabBar',
      'SkyTabButton',
      'SkySheet',
      'SkyButton',
      'SkySpinner',
      'SkyEmptyState',
      'SkyToast',
    ]) {
      expect(source).toContain(`<${component}`)
    }
  })

  it('delegates sheet focus and escape handling to SkySheet', () => {
    expect(source).toContain('@escape="closeAction"')
    expect(source).not.toContain('handleSheetKeydown')
    expect(source).not.toContain('handleWindowKeydown')
  })
})
