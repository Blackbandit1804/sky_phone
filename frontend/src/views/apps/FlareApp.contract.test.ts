import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./FlareApp.vue', import.meta.url), 'utf8')

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
    expect(source).toContain(
      '<sky-action-sheet\n      id="flare-photo-source-sheet"',
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
})
