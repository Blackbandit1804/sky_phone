import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePhoneStore } from '@/stores/phone'

describe('phone locale fallback', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({ matches: false })),
    })
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps CityMarkt profile copy translated with a partial server locale', () => {
    const phone = usePhoneStore()
    phone.open({ locales: { Apps: { citymarkt: { name: 'CityMarkt' } } } })

    expect(phone.t('Apps.citymarkt.editProfile')).toBe('Edit profile')
    expect(phone.t('Apps.citymarkt.profileIntro')).toBe(
      'Your iFruit email stays linked to this profile.',
    )
    expect(phone.t('Apps.citymarkt.saveProfile')).toBe('Save profile')
    expect(phone.t('Apps.citymarkt.addFavorite')).toBe('Add to favorites')
    expect(phone.t('Apps.citymarkt.removeFavorite')).toBe(
      'Remove from favorites',
    )
  })
})
