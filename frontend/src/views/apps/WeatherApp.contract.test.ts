import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(
  new URL('./WeatherApp.vue', import.meta.url),
  'utf8',
)

describe('WeatherApp layout contract', () => {
  it('preserves its exact custom forecast gutter instead of generic page padding', () => {
    expect(source).toMatch(
      /<SkyScrollArea[\s\S]*?class="weather-scroll"[\s\S]*?>/,
    )
    expect(source).toMatch(
      /\.weather-scroll\s*\{\s*padding:\s*4px 14px 24px;\s*\}/,
    )
    expect(source).not.toMatch(
      /<SkyScrollArea[\s\S]*?class="weather-scroll"[\s\S]*?\spadded(?:\s|=)[\s\S]*?>/,
    )
  })
})
