import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./App.vue', import.meta.url), 'utf8')

describe('browser development preview contract', () => {
  it('starts unlocked while preserving an explicit lock screen preview', () => {
    expect(source).toContain(
      "developmentParameters.has('lockScreenPreview')",
    )
    expect(source).toContain(
      ': !isDevelopment || developmentLockScreenPreview',
    )
    expect(source).toContain("developmentParameters.has('setupPreview')")
  })

  it('loads authenticated app data without replacing direct app routes', () => {
    expect(source).toContain(
      "if (isLocked.value || setupRequired.value) void router.replace('/')",
    )
    expect(source).toContain('else loadUnlockedPhoneData()')
  })

  it('requires the passcode only for the first unlock of a device session', () => {
    expect(source).toContain('const passcodeRequired = ref(false)')
    expect(source).toContain(
      'if (phone.security.enabled && passcodeRequired.value)',
    )
    expect(source).toContain(
      'passcodeRequired.value = isLocked.value && phone.security.enabled',
    )
    expect(source).toMatch(
      /function lockPhone\(\): void \{[\s\S]*?passcodeRequired\.value = false[\s\S]*?isLocked\.value = true/,
    )
  })

  it('keeps hairlines at one rendered device pixel through phone zoom', () => {
    expect(source).toContain(
      '...getHairlinePixelStyle(phoneZoom.value, browserDevicePixelRatio.value)',
    )
    expect(source).toContain(':device-pixel-ratio="browserDevicePixelRatio"')
  })
})
