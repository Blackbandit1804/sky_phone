import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCallsStore } from '@/stores/calls'
import { nuiCall } from '@/utils/nui'
import { playPhoneTone } from '@/utils/tones'

vi.mock('@/utils/nui', () => ({
  nuiCall: vi.fn(async () => ({ success: true, data: [] })),
}))
vi.mock('@/utils/tones', () => ({
  playPhoneTone: vi.fn(() => vi.fn()),
}))

describe('calls store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({ matches: false })),
      setTimeout,
    })
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('rings for incoming calls and stops when connected', () => {
    const stop = vi.fn()
    vi.mocked(playPhoneTone).mockReturnValueOnce(stop)
    const calls = useCallsStore()

    calls.applyCallState({
      direction: 'incoming',
      id: 'call-1',
      otherNumber: '1234567890',
      startedAt: 1,
      state: 'ringing',
    })
    expect(playPhoneTone).toHaveBeenCalledWith('apex', 80, true)

    calls.applyCallState({
      direction: 'incoming',
      id: 'call-1',
      otherNumber: '1234567890',
      startedAt: 1,
      state: 'connected',
    })
    expect(stop).toHaveBeenCalledOnce()
  })

  it('clears terminal states and refreshes recents', async () => {
    const calls = useCallsStore()
    calls.applyCallState({
      direction: 'outgoing',
      id: 'call-2',
      otherNumber: '1234567890',
      startedAt: 1,
      state: 'busy',
    })

    await vi.advanceTimersByTimeAsync(1600)

    expect(calls.activeCall).toBeNull()
    expect(nuiCall).toHaveBeenCalledWith('calls:recents')
  })

  it('blocks the active caller and closes the call screen', async () => {
    const calls = useCallsStore()
    calls.applyCallState({
      direction: 'incoming',
      id: 'call-3',
      otherNumber: '5551110025',
      startedAt: 1,
      state: 'ringing',
    })

    const response = await calls.blockNumber('5551110025')

    expect(response.success).toBe(true)
    expect(nuiCall).toHaveBeenCalledWith('calls:block', {
      phoneNumber: '5551110025',
    })
    expect(calls.activeCall).toBeNull()
    expect(nuiCall).toHaveBeenCalledWith('calls:recents')
  })

  it('applies the provider-authoritative speaker state for a connected call', async () => {
    vi.mocked(nuiCall).mockResolvedValueOnce({
      success: true,
      data: { speakerEnabled: true },
    })
    const calls = useCallsStore()
    calls.applyCallState({
      direction: 'outgoing',
      id: 'call-speaker',
      otherNumber: '5551110025',
      speakerEnabled: false,
      speakerSupported: true,
      startedAt: 1,
      state: 'connected',
    })

    const response = await calls.setSpeaker(true)

    expect(response.success).toBe(true)
    expect(nuiCall).toHaveBeenCalledWith('calls:set-speaker', {
      enabled: true,
      id: 'call-speaker',
    })
    expect(calls.activeCall?.speakerEnabled).toBe(true)
  })

  it('does not simulate speaker state for unsupported voice providers', async () => {
    const calls = useCallsStore()
    calls.applyCallState({
      direction: 'outgoing',
      id: 'call-pma',
      otherNumber: '5551110025',
      speakerEnabled: false,
      speakerSupported: false,
      startedAt: 1,
      state: 'connected',
    })

    const response = await calls.setSpeaker(true)

    expect(response).toEqual({
      error: 'speaker_unavailable',
      success: false,
    })
    expect(nuiCall).not.toHaveBeenCalled()
    expect(calls.activeCall?.speakerEnabled).toBe(false)
  })

  it('updates a contact favorite and refreshes the contact list', async () => {
    vi.mocked(nuiCall)
      .mockResolvedValueOnce({
        success: true,
        data: { favorite: true, id: 'contact-alex' },
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          {
            favorite: true,
            id: 'contact-alex',
            name: 'Alex Rivera',
            phone_number: '5551110001',
          },
        ],
      })
    const calls = useCallsStore()

    const response = await calls.setContactFavorite('contact-alex', true)

    expect(response.success).toBe(true)
    expect(nuiCall).toHaveBeenNthCalledWith(1, 'contacts:favorite', {
      favorite: true,
      id: 'contact-alex',
    })
    expect(nuiCall).toHaveBeenNthCalledWith(2, 'contacts:list')
    expect(calls.contacts[0]?.favorite).toBe(true)
  })
})
