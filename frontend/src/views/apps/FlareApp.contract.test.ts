import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./FlareApp.vue', import.meta.url), 'utf8')
const clientSource = readFileSync(
  new URL('../../../../sky_phone/source/client/main.lua', import.meta.url),
  'utf8',
)
const serverSource = readFileSync(
  new URL('../../../../sky_phone/source/server/flare.lua', import.meta.url),
  'utf8',
)
const localeSource = readFileSync(
  new URL('../../../../sky_phone/config/locales/en.lua', import.meta.url),
  'utf8',
)

describe('FlareApp profile editing contract', () => {
  it('opens the central photo source picker while creating an account', () => {
    const onboardingStart = source.indexOf(
      '<template v-else-if="!flare.profile">',
    )
    const onboardingEnd = source.indexOf(
      '<template v-else-if="activeMatch">',
      onboardingStart,
    )
    const onboarding = source.slice(onboardingStart, onboardingEnd)

    expect(onboardingStart).toBeGreaterThan(-1)
    expect(onboardingEnd).toBeGreaterThan(onboardingStart)
    expect(onboarding).toContain('aria-controls="flare-photo-source-sheet"')
    expect(onboarding).toContain('aria-haspopup="dialog"')
    expect(onboarding).toContain('@click="openPhotoSourcePicker"')
    expect(onboarding).not.toContain("openProfileMediaApp('photos')")
    expect(onboarding).not.toContain("openProfileMediaApp('camera')")
  })

  it('uses the same Gallery and Camera picker for onboarding and editing', () => {
    const mediaAppStart = source.indexOf('function openProfileMediaApp')
    const mediaAppEnd = source.indexOf('function removeDraftPhoto')
    const mediaApp = source.slice(mediaAppStart, mediaAppEnd)

    expect(source.match(/@click="openPhotoSourcePicker"/g)).toHaveLength(2)
    expect(source).toMatch(
      /<sky-action-sheet\s+id=["']flare-photo-source-sheet["']/,
    )
    expect(source).toContain(
      '<sky-action-button bold @click="openProfileMediaApp(\'photos\')">',
    )
    expect(source).toContain(
      '<sky-action-button @click="openProfileMediaApp(\'camera\')">',
    )
    expect(mediaAppStart).toBeGreaterThan(-1)
    expect(mediaAppEnd).toBeGreaterThan(mediaAppStart)
    expect(mediaApp).toContain("app: 'camera' | 'photos'")
    expect(mediaApp).toContain("'flare:profile-photos'")
    expect(mediaApp).toContain("app === 'photos' ? remaining : 1")
    expect(mediaApp).toContain('void router.push({')
    expect(mediaApp).toContain("query: { mediaAttachment: 'photo' }")
  })

  it('opens the relationship goal editor from the profile summary card', () => {
    const cardClass = source.indexOf('class="flare-profile-card"')
    const cardStart = source.lastIndexOf('<sky-card', cardClass)
    const cardEnd = source.indexOf('</sky-card>', cardClass)
    const card = source.slice(cardStart, cardEnd)

    expect(cardClass).toBeGreaterThan(-1)
    expect(cardStart).toBeGreaterThan(-1)
    expect(cardEnd).toBeGreaterThan(cardStart)
    expect(card).toContain('component="button"')
    expect(card).toContain('aria-controls="flare-choice-sheet"')
    expect(card).toContain('aria-haspopup="dialog"')
    expect(card).toContain('@click="openProfileGoalEditor"')
    expect(source).toContain('async function openProfileGoalEditor()')
    expect(source).toMatch(
      /openProfileGoalEditor\(\)[\s\S]*?profileEditing\.value = true[\s\S]*?openChoice\('lookingFor', null\)/,
    )
  })

  it('uses the central surfaced SkyNavbar back action for profile screens', () => {
    const mainNavbarStart =
      source.match(/<template v-else>\s*<sky-navbar/)?.index ?? -1
    const mainNavbarEnd = source.indexOf('</sky-navbar>', mainNavbarStart)
    const navbar = source.slice(mainNavbarStart, mainNavbarEnd)

    expect(mainNavbarStart).toBeGreaterThan(-1)
    expect(navbar).toContain(':show-back=')
    expect(navbar).toContain('back-appearance="surface"')
    expect(navbar).toContain(':back-label="phone.t(\'Common.back\')"')
    expect(navbar).toContain('@back="closeProfileScreen"')
    expect(navbar).not.toContain('<template #left>')
  })

  it('shows every own profile photo as a selectable thumbnail', () => {
    expect(source).toContain('class="flare-profile-photo-strip"')
    expect(source).toContain('v-for="(photo, index) in draftPhotos"')
    expect(source).toContain(
      ':aria-pressed="index === normalizedOwnPhotoIndex"',
    )
    expect(source).toContain('@click="selectOwnPhoto(index)"')
    expect(source).toContain(':style="ownPhotoStyle()"')
  })

  it('exposes confirmed sign-out and destructive Flare account deletion', () => {
    expect(source).toContain('<sky-settings-group')
    expect(source).toContain('@activate="signOutDialogOpened = true"')
    expect(source).toContain('@activate="deleteAccountDialogOpened = true"')
    expect(source).toContain(':opened="deleteAccountDialogOpened"')
    expect(source).toContain('role="alertdialog"')
    expect(source).toContain('@escape="closeDeleteAccountDialog"')
    expect(source).toContain('@click="deleteFlareAccount"')
    expect(source).toContain('const account = useAccountStore()')
    expect(source).toContain('const success = await account.logout()')
    expect(source).toContain('appAuth.clear()')
    expect(source).toContain("flare.reset('not_authenticated')")
    expect(localeSource).toContain(
      'This signs the whole phone out of Sky Cloud.',
    )
    expect(localeSource).toContain(
      'Signing out affects every app that uses Sky Cloud on this phone.',
    )
  })

  it('deletes all account-owned Flare data in one server transaction', () => {
    expect(clientSource).toContain('"flare:delete-profile"')
    expect(serverSource).toContain(
      'Bridge.Callbacks.Register("sky_phone:flare:delete-profile"',
    )
    expect(serverSource).toContain(
      'SkyPhone.AllowOperation(source, "flare_profile_delete", 3, 60)',
    )
    expect(serverSource).toContain('Bridge.Database.Transaction({')
    expect(serverSource).toContain('DELETE FROM `sky_phone_flare_matches`')
    expect(serverSource).toContain('DELETE FROM `sky_phone_flare_swipes`')
    expect(serverSource).toContain('DELETE FROM `sky_phone_flare_profiles`')
  })
})
