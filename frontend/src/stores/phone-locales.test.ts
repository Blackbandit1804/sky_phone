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

  it('keeps mailbox and filter copy translated with a partial server locale', () => {
    const phone = usePhoneStore()
    phone.open({ locales: { Apps: { mail: { name: 'Mail' } } } })

    expect(phone.t('Apps.mail.newMailbox')).toBe('New Mailbox')
    expect(phone.t('Apps.mail.mailboxNamePlaceholder')).toBe('Mailbox name')
    expect(phone.t('Apps.mail.filterTitle')).toBe('Filter')
    expect(phone.t('Apps.mail.filterUnreadLabel')).toBe('Unread')
    expect(phone.t('Apps.mail.errors.mailbox_exists')).toBe(
      'A mailbox with that name already exists.',
    )
  })

  it('keeps provider capability copy translated with a partial server locale', () => {
    const phone = usePhoneStore()
    phone.open({ locales: { Apps: { radio: { name: 'Radio' } } } })

    expect(phone.t('Apps.radio.notSupported')).toBe('Not supported')
    expect(phone.t('Apps.radio.providerFeatureUnavailable')).toBe(
      'Not supported by this voice service',
    )
    expect(phone.t('Apps.radio.displayNamePlaceholder')).toBe(
      'Character name',
    )
  })
})
