import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const cameraView = readFileSync(
  new URL('./CameraApp.vue', import.meta.url),
  'utf8',
)
const mediaCapture = readFileSync(
  new URL('../../components/PhoneMediaCapture.vue', import.meta.url),
  'utf8',
)
const cameraClient = readFileSync(
  new URL('../../../../sky_phone/source/client/camera.lua', import.meta.url),
  'utf8',
)
const cameraConfig = readFileSync(
  new URL('../../../../sky_phone/config/config.lua', import.meta.url),
  'utf8',
)
const cameraAnimations = readFileSync(
  new URL(
    '../../../../sky_phone/source/client/animations.lua',
    import.meta.url,
  ),
  'utf8',
)

describe('Camera app controls', () => {
  it('uses the Sky UI moving segment for photo and video modes', () => {
    expect(cameraView).toContain('SkySegmented')
    expect(cameraView).toContain(':active-index="mode === \'photo\' ? 0 : 1"')
    expect(cameraView).not.toContain('SkyPillNavigation')
    expect(cameraView).not.toContain('k-segmented')
    expect(cameraView).not.toContain('k-navbar')
  })

  it('keeps continuous wheel zoom without an extra slider bar', () => {
    expect(cameraView).not.toContain('camera-zoom-slider')
    expect(cameraView).not.toContain('type="range"')
    expect(cameraView).toContain('event.deltaY * 0.0025')
    expect(mediaCapture).toContain('nextZoom < 0.5 || nextZoom > 3')
    expect(mediaCapture).not.toContain('[0.5, 1, 2, 3].includes(nextZoom)')
  })

  it('renders the development preview differently at 0.5x and 1x', () => {
    expect(cameraView).toContain('transform: `scale(${selectedZoom})`')
    expect(cameraView).not.toContain('Math.max(1, selectedZoom)')
    expect(cameraView).toMatch(
      /\.camera-dev-view\s*\{[^}]*inset:\s*-50%;[^}]*width:\s*200%;[^}]*height:\s*200%;/s,
    )
  })

  it('locks look controls without changing the global gameplay camera', () => {
    expect(cameraView).toContain("nuiCall('camera:setLocked'")
    expect(cameraView).toContain('cameraLocked.value')
    expect(cameraView).toContain('Apps.camera.spaceKey')
    expect(cameraClient).toContain('RegisterNUICallback("camera:setLocked"')
    expect(cameraClient).toContain('INPUT_LOOK_LR')
    expect(cameraClient).toContain('INPUT_LOOK_UD')
    expect(cameraClient).toContain('first_person_view_mode = 4')
    expect(cameraClient).toContain(
      'SetFollowPedCamViewMode(first_person_view_mode)',
    )
    expect(cameraClient).toContain(
      'SetFollowVehicleCamViewMode(first_person_view_mode)',
    )
    expect(cameraClient).not.toContain('ultrawide_camera_handle')
    expect(cameraClient).not.toContain('ensure_ultrawide_camera')
  })

  it('uses a looping camera-hold pose instead of the old selfie dance', () => {
    expect(cameraConfig).toContain('Camera = "cellphone@self"')
    expect(cameraConfig).toContain('Camera = "selfie"')
    expect(cameraAnimations).toContain(
      'mode == MODE_CAMERA_REAR or mode == MODE_CAMERA_SELFIE',
    )
    expect(cameraAnimations).toContain(
      'Config.Animations.Dictionaries.Camera, Config.Animations.Clips.Camera',
    )
    expect(cameraConfig).not.toContain('anim@mp_player_intuppertake_selfie')
  })
})
