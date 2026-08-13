import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./GarageApp.vue', import.meta.url), 'utf8')

describe('GarageApp Sky UI contract', () => {
  it('uses first-party Sky UI without direct Konsta markup', () => {
    expect(source).not.toContain("from 'konsta/vue'")
    expect(source).not.toMatch(/<\/?k-[a-z]/)
    expect(source).toContain('<SkyAppPage')
    expect(source).toContain('<SkyNavbar')
    expect(source).toContain('<SkyScrollArea')
    expect(source).toContain('<SkySearchbar')
    expect(source).toContain('<SkySegmented')
    expect(source).toContain('<SkyGlass')
  })

  it('does not expose provider metadata or vehicle sharing', () => {
    expect(source).not.toContain('useEasyShareStore')
    expect(source).not.toContain('shareVehicle')
    expect(source).not.toContain('Apps.garage.provider')
    expect(source).not.toContain('overview.system')
  })

  it('raises only the Garage title block', () => {
    expect(source).toContain('class="garage-navbar"')
    expect(source).toMatch(
      /\.garage-navbar :deep\(\.sky-navbar__title-container > div\)\s*\{[^}]*translateY\(-6px\)/s,
    )
  })
})
