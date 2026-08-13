import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./SettingsApp.vue', import.meta.url),
  'utf8',
)

describe('SettingsApp Sky UI contract', () => {
  it('uses the first-party settings surface without direct Konsta markup', () => {
    expect(source).not.toContain("from 'konsta/vue'")
    expect(source).not.toMatch(/<\/?k-[a-z]/)
    expect(source).toContain('<SkyAppPage')
    expect(source).toContain('<SkyNavbar')
    expect(source).toContain(":variant=\"activeView === 'root' ? 'large' : 'compact'\"")
    expect(source).toContain('<SkyScrollArea')
    expect(source).toContain('<SkySettingsGroup')
    expect(source).toContain('<SkySettingsRow')
  })
})
