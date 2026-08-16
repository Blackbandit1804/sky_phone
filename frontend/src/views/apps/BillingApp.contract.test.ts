import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./BillingApp.vue', import.meta.url),
  'utf8',
)

describe('Billing app Sky UI migration', () => {
  it('uses Sky UI instead of Konsta components', () => {
    expect(source).not.toContain("from 'konsta/vue'")
    expect(source).not.toMatch(/<\/?k[A-Z-]/)
    expect(source).not.toContain('--k-')

    for (const component of [
      'SkyAppPage',
      'SkyNavbar',
      'SkyNavbarBackLink',
      'SkyGlass',
      'SkyCard',
      'SkyBadge',
      'SkyButton',
      'SkyLink',
      'SkySearchbar',
      'SkySegmented',
      'SkySegmentedButton',
      'SkySpinner',
      'SkyTabBar',
      'SkyTabButton',
      'SkySheet',
      'SkyToast',
    ]) {
      expect(source).toContain(`<${component}`)
    }
  })

  it('uses the Sky sheet focus and escape behavior for payment', () => {
    expect(source).toContain('@escape="paymentOpen = false"')
    expect(source).toContain(':ariaLabelledby=')
  })
})
