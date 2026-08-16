import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const clockView = readFileSync(
  new URL('./ClockApp.vue', import.meta.url),
  'utf8',
)
const mainCss = readFileSync(
  new URL('../../assets/main.css', import.meta.url),
  'utf8',
)

describe('Clock app controls', () => {
  it('removes the empty navigation row from world clock and timer titles', () => {
    expect(clockView).toContain('class="clock-navbar"')
    expect(clockView).toContain('variant="large"')
    expect(clockView).not.toContain('clock-navbar__empty-inner')
    expect(mainCss).toMatch(
      /\.clock-navbar\.sky-navbar--no-navigation\s*\{[^}]*--sky-navbar-large-title-height[^}]*padding-top:\s*var\(--sky-navbar-safe-area-top\)/s,
    )
  })

  it('uses the danger color while stopwatch and timer controls are running', () => {
    expect(clockView).toMatch(
      /clock\.stopwatchStartedAt === null\s*\? 'primary'\s*:\s*'danger'/,
    )
    expect(clockView).toMatch(
      /:variant="clock\.timerStartedAt === null \? 'primary' : 'danger'"/,
    )
  })

  it('uses the shared full-width Sky tab bar', () => {
    expect(clockView).toContain('<sky-tab-bar')
    expect(clockView).toContain('<sky-tab-button')
    expect(clockView).not.toContain('<sky-segmented')
  })
})
