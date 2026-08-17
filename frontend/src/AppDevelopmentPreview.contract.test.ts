import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./App.vue', import.meta.url), 'utf8')
const styles = readFileSync(
  new URL('./assets/main.css', import.meta.url),
  'utf8',
)

describe('browser development preview contract', () => {
  it('starts unlocked while preserving an explicit lock screen preview', () => {
    expect(source).toContain("developmentParameters.has('lockScreenPreview')")
    expect(source).toContain(': !isDevelopment || developmentLockScreenPreview')
    expect(source).toContain("developmentParameters.has('setupPreview')")
  })

  it('loads authenticated app data without replacing direct app routes', () => {
    expect(source).toContain(
      "if (isLocked.value || setupRequired.value) void router.replace('/')",
    )
    expect(source).toContain('else loadUnlockedPhoneData()')
  })

  it('requires the passcode again after a full device lock', () => {
    expect(source).toContain('const passcodeRequired = ref(false)')
    expect(source).toContain(
      'if (phone.security.enabled && passcodeRequired.value)',
    )
    expect(source).toContain(
      'passcodeRequired.value = isLocked.value && phone.security.enabled',
    )
    expect(source).toMatch(
      /function lockPhone\(\): void \{[\s\S]*?passcodeRequired\.value = phone\.security\.enabled[\s\S]*?isLocked\.value = true/,
    )
  })

  it('keeps hairlines at one rendered device pixel through phone zoom', () => {
    expect(source).toContain(
      '...getHairlinePixelStyle(phoneZoom.value, browserDevicePixelRatio.value)',
    )
    expect(source).toContain(':device-pixel-ratio="browserDevicePixelRatio"')
  })

  it('maps the visible device side controls to phone actions', () => {
    expect(source).toContain('@click="toggleHardwareAlertMute"')
    expect(source).toContain('@click="changeHardwareAlertVolume(10)"')
    expect(source).toContain('@click="changeHardwareAlertVolume(-10)"')
    expect(source).toContain('@click="toggleHardwareLock"')
    expect(source).toMatch(
      /function toggleHardwareLock\(\): void \{[\s\S]*?unlockPhone\(\)[\s\S]*?lockPhone\(\)/,
    )
    expect(source).toMatch(
      /function changeHardwareAlertVolume\(delta: number\): void \{[\s\S]*?phone\.setAlertVolumes\(volume\)/,
    )
    expect(styles).toMatch(
      /\.phone-hardware-button\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?z-index:\s*101;/,
    )
    expect(styles).toContain('.phone-hardware-button--power')
    expect(source).toContain('class="phone-volume-hud"')
    expect(source).toContain('showHardwareVolumeHud()')
    expect(styles).toContain('.phone-volume-hud__level')
  })
})
