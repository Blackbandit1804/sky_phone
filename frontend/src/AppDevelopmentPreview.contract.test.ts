import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./App.vue', import.meta.url), 'utf8')

describe('browser development preview contract', () => {
  it('starts unlocked while preserving an explicit lock screen preview', () => {
    expect(source).toContain(
      "developmentParameters.has('lockScreenPreview')",
    )
    expect(source).toContain(
      'isLocked.value = !isDevelopment || developmentLockScreenPreview',
    )
  })

  it('loads authenticated app data without replacing direct app routes', () => {
    expect(source).toContain("if (isLocked.value) void router.replace('/')")
    expect(source).toContain('else loadUnlockedPhoneData()')
  })
})
