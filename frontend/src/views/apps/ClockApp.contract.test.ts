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
    expect(clockView).toContain("tab === 'world' || tab === 'timer'")
    expect(clockView).toContain("'clock-navbar__empty-inner'")
    expect(mainCss).toMatch(
      /\.clock-navbar__empty-inner\s*\{[^}]*height:\s*0;/s,
    )
  })

  it('uses the danger color while stopwatch and timer controls are running', () => {
    expect(clockView).toMatch(
      /clock\.stopwatchStartedAt === null[\s\S]*?positiveActionColors[\s\S]*?: dangerActionColors/,
    )
    expect(clockView).toMatch(
      /clock\.timerStartedAt === null[\s\S]*?positiveActionColors[\s\S]*?: dangerActionColors/,
    )
  })
})
