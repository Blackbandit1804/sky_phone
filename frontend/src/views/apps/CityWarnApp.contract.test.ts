import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./CityWarnApp.vue', import.meta.url),
  'utf8',
)
const server = readFileSync(
  new URL('../../../../sky_phone/source/server/citywarn.lua', import.meta.url),
  'utf8',
)
const store = readFileSync(
  new URL('../../stores/citywarn.ts', import.meta.url),
  'utf8',
)
const config = readFileSync(
  new URL('../../../../sky_phone/config/config.lua', import.meta.url),
  'utf8',
)

describe('CityWarn product contract', () => {
  it('uses central Sky navigation, scrolling, settings and sheets', () => {
    expect(source).toContain('SkyPillNavigation')
    expect(source).toContain('SkyScrollArea')
    expect(source).toContain('SkySettingsGroup')
    expect(source).toContain('SkySettingsRow')
    expect(source).toContain('SkySheet')
    expect(source).not.toContain("from 'konsta/vue'")
  })

  it('ships citizen feed, map, archive, settings and authority workflows', () => {
    expect(source).toContain(
      "type CityWarnTab = 'active' | 'map' | 'archive' | 'settings'",
    )
    expect(store).toContain("'citywarn:publish'")
    expect(store).toContain("'citywarn:update'")
    expect(store).toContain("'citywarn:resolve'")
    expect(source).toContain('map:getPlayerCoords')
  })

  it('reserves the pill navigation, keeps sheets safe and avoids blur flicker', () => {
    expect(source).toMatch(
      /\.citywarn-scroll\.sky-scroll-area--tabbar\s*\{[^}]*padding-bottom:\s*calc\(var\(--sky-safe-area-bottom\) \+ 84px\)/s,
    )
    expect(source).toMatch(/\.citywarn-map\s*\{[^}]*height:\s*430px;/s)
    expect(source).toMatch(
      /\.citywarn-compose-sheet :deep\(\.sky-sheet__panel\)\s*\{[^}]*height:\s*88%;[^}]*overflow:\s*hidden;/s,
    )
    expect(source).toContain('-webkit-backdrop-filter: none;')
    expect(source).toContain('backdrop-filter: none;')
    expect(source).toContain('filter: none !important;')
    expect(source).toContain('will-change: auto !important;')
    expect(source).not.toContain("t('manage.success')")
    expect(source).not.toContain('<X :size="20" />')
    expect(source).not.toContain('<span>{{ alert.title }}</span>')
  })

  it('keeps publishing authorization and validation on the server', () => {
    expect(server).toContain('Bridge.Framework.GetJob(source)')
    expect(server).toContain('SkyPhone.RequireSession(source)')
    expect(server).toContain('config.RequireDuty and not on_duty')
    expect(server).toContain('severity_rank[data.severity]')
    expect(server).toContain('sky_phone_citywarn_updates')
    expect(config).toContain('Config.CityWarn = {')
    expect(config).toContain('Publishers = {')
  })
})
