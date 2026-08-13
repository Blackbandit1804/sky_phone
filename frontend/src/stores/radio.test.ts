import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useRadioStore } from '@/stores/radio'
import type { RadioData } from '@/types/radio'
import { nuiCall } from '@/utils/nui'

vi.mock('@/utils/nui', () => ({ nuiCall: vi.fn() }))

const mockNuiCall = vi.mocked(nuiCall)
const radioData: RadioData = {
  badge: '231',
  badgeEnabled: true,
  badgeMaxLength: 8,
  connected: false,
  displayName: 'Unit 21',
  displayNameAllowed: true,
  displayNameEnabled: true,
  displayNameMaxLength: 32,
  frequency: 0,
  frequencyMax: 999.9,
  frequencyMin: 0.1,
  frequencyStep: 0.1,
  history: [{ primary: 120.5, secondary: 130.7 }],
  members: [],
  provider: 'yaca',
  secondaryFrequency: 0,
  secondarySupported: true,
  settings: { autoRejoin: false, notifications: true },
  volume: 50,
}

describe('radio store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockNuiCall.mockReset()
  })

  it('hydrates the complete server-authoritative radio state', async () => {
    mockNuiCall.mockResolvedValueOnce({ data: radioData, success: true })
    const radio = useRadioStore()

    await radio.load()

    expect(radio.data).toMatchObject(radioData)
    expect(radio.error).toBe('')
    expect(mockNuiCall).toHaveBeenCalledWith('radio:get')
  })

  it('sends both selected channels and applies the accepted connection', async () => {
    mockNuiCall.mockResolvedValueOnce({
      data: {
        connected: true,
        frequency: 120.5,
        secondaryFrequency: 130.7,
      },
      success: true,
    })
    const radio = useRadioStore()

    expect(await radio.connect(120.5, 130.7)).toBe(true)
    expect(radio.data.connected).toBe(true)
    expect(mockNuiCall).toHaveBeenCalledWith('radio:connect', {
      frequency: 120.5,
      secondaryFrequency: 130.7,
    })
  })

  it('keeps the current connection when disconnect is rejected', async () => {
    mockNuiCall.mockResolvedValueOnce({
      error: 'voice_unavailable',
      success: false,
    })
    const radio = useRadioStore()
    radio.data.connected = true
    radio.data.frequency = 120.5

    await radio.disconnect()

    expect(radio.data.connected).toBe(true)
    expect(radio.data.frequency).toBe(120.5)
    expect(radio.error).toBe('voice_unavailable')
    expect(radio.isLoading).toBe(false)
  })

  it('rolls an optimistic setting change back after server rejection', async () => {
    mockNuiCall.mockResolvedValueOnce({
      error: 'invalid_setting',
      success: false,
    })
    const radio = useRadioStore()

    await radio.saveSetting('autoRejoin', true)

    expect(radio.data.settings.autoRejoin).toBe(false)
    expect(radio.error).toBe('invalid_setting')
  })

  it('ignores a stale volume response that arrives after the newest value', async () => {
    let resolveFirst!: (value: {
      data: { volume: number }
      success: true
    }) => void
    let resolveSecond!: (value: {
      data: { volume: number }
      success: true
    }) => void
    mockNuiCall
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve
          }),
      )
    const radio = useRadioStore()

    const first = radio.setVolume(25)
    const second = radio.setVolume(75)
    resolveSecond({ data: { volume: 75 }, success: true })
    await second
    resolveFirst({ data: { volume: 25 }, success: true })
    await first

    expect(radio.data.volume).toBe(75)
  })

  it('applies canonical profile values accepted by the server', async () => {
    mockNuiCall
      .mockResolvedValueOnce({ data: { badge: 'A_1' }, success: true })
      .mockResolvedValueOnce({
        data: { displayName: 'Unit Seven' },
        success: true,
      })
    const radio = useRadioStore()

    expect(await radio.saveBadge('a_1')).toBe(true)
    expect(await radio.saveDisplayName('  Unit Seven  ')).toBe(true)

    expect(radio.data.badge).toBe('A_1')
    expect(radio.data.displayName).toBe('Unit Seven')
    expect(mockNuiCall).toHaveBeenNthCalledWith(1, 'radio:save-badge', {
      badge: 'a_1',
    })
    expect(mockNuiCall).toHaveBeenNthCalledWith(2, 'radio:save-display-name', {
      displayName: '  Unit Seven  ',
    })
  })

  it('keeps the authoritative profile value when saving is rejected', async () => {
    mockNuiCall.mockResolvedValueOnce({
      error: 'rate_limited',
      success: false,
    })
    const radio = useRadioStore()
    radio.data.badge = '231'

    expect(await radio.saveBadge('232')).toBe(false)

    expect(radio.data.badge).toBe('231')
    expect(radio.error).toBe('rate_limited')
  })

  it('ignores stale badge responses after a newer save', async () => {
    let resolveFirst!: (value: {
      data: { badge: string }
      success: true
    }) => void
    let resolveSecond!: (value: {
      data: { badge: string }
      success: true
    }) => void
    mockNuiCall
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve
          }),
      )
    const radio = useRadioStore()

    const first = radio.saveBadge('231')
    const second = radio.saveBadge('232')
    resolveSecond({ data: { badge: '232' }, success: true })
    await second
    resolveFirst({ data: { badge: '231' }, success: true })
    await first

    expect(radio.data.badge).toBe('232')
  })

  it('ignores stale display-name responses after a newer save', async () => {
    let resolveFirst!: (value: {
      data: { displayName: string }
      success: true
    }) => void
    let resolveSecond!: (value: {
      data: { displayName: string }
      success: true
    }) => void
    mockNuiCall
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve
          }),
      )
    const radio = useRadioStore()

    const first = radio.saveDisplayName('Unit One')
    const second = radio.saveDisplayName('Unit Two')
    resolveSecond({ data: { displayName: 'Unit Two' }, success: true })
    await second
    resolveFirst({ data: { displayName: 'Unit One' }, success: true })
    await first

    expect(radio.data.displayName).toBe('Unit Two')
  })

  it('merges setting responses per key without clobbering another toggle', async () => {
    let resolveAutoRejoin!: (value: {
      data: RadioData['settings']
      success: true
    }) => void
    let resolveNotifications!: (value: {
      data: RadioData['settings']
      success: true
    }) => void
    mockNuiCall
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveAutoRejoin = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveNotifications = resolve
          }),
      )
    const radio = useRadioStore()

    const autoRejoin = radio.saveSetting('autoRejoin', true)
    const notifications = radio.saveSetting('notifications', true)
    resolveNotifications({
      data: { autoRejoin: false, notifications: true },
      success: true,
    })
    await notifications
    resolveAutoRejoin({
      data: { autoRejoin: true, notifications: false },
      success: true,
    })
    await autoRejoin

    expect(radio.data.settings).toEqual({
      autoRejoin: true,
      notifications: true,
    })
  })
})
