import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useEasyShareStore } from '@/stores/easyshare'
import type { EasySharePayload, EasyShareTransfer } from '@/types/easyshare'
import { nuiCall } from '@/utils/nui'

vi.mock('@/utils/nui', () => ({ nuiCall: vi.fn() }))

const mockNuiCall = vi.mocked(nuiCall)
const payload: EasySharePayload = {
  appId: 'notes',
  copyText: 'Meet at Mission Row.',
  id: 'note-1',
  kind: 'note',
  title: 'Meeting',
}
const incoming: EasyShareTransfer = {
  createdAt: Date.now(),
  direction: 'incoming',
  id: 'transfer-1',
  otherName: 'Mia Santos',
  payload,
  progress: 0,
  status: 'pending',
}

describe('easyshare store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockNuiCall.mockReset()
  })

  it('opens with the selected share payload', () => {
    const easyShare = useEasyShareStore()
    easyShare.open(payload)

    expect(easyShare.opened).toBe(true)
    expect(easyShare.payload).toEqual(payload)
    expect(easyShare.nearbyOpened).toBe(false)
  })

  it('opens the acceptance view for an incoming request', () => {
    const easyShare = useEasyShareStore()
    easyShare.applyEvent({ transfer: incoming })

    expect(easyShare.opened).toBe(true)
    expect(easyShare.nearbyOpened).toBe(true)
    expect(easyShare.incomingTransfer).toEqual(incoming)
  })

  it('keeps progress server-driven and removes terminal transfers from pending', () => {
    const easyShare = useEasyShareStore()
    easyShare.applyEvent({ transfer: incoming })
    easyShare.applyEvent({
      transfer: { ...incoming, progress: 50, status: 'transferring' },
    })
    expect(easyShare.pending[0]?.progress).toBe(50)

    easyShare.applyEvent({
      transfer: { ...incoming, progress: 100, status: 'completed' },
    })
    expect(easyShare.pending).toEqual([])
    expect(easyShare.history[0]?.status).toBe('completed')
  })

  it('sends only the target and current payload when requesting a transfer', async () => {
    mockNuiCall.mockResolvedValueOnce({ data: incoming, success: true })
    const easyShare = useEasyShareStore()
    easyShare.open(payload)

    await easyShare.request(41)

    expect(mockNuiCall).toHaveBeenCalledWith('easyshare:request', {
      payload,
      targetId: 41,
    })
  })

  it('hands a prepared share message to the selected chat app once', () => {
    const easyShare = useEasyShareStore()
    easyShare.open({ ...payload, link: 'https://notes.sky/note-1' })

    expect(easyShare.prepareChatDraft('messages', '5551234567')).toBe(true)
    expect(easyShare.consumeChatDraft('messages')).toEqual({
      appId: 'messages',
      body: 'Meet at Mission Row.\nhttps://notes.sky/note-1',
      payload: { ...payload, link: 'https://notes.sky/note-1' },
      targetId: '5551234567',
    })
    expect(easyShare.consumeChatDraft('messages')).toBeNull()
  })

  it('keeps a share draft until a conversation is chosen in the destination app', () => {
    const easyShare = useEasyShareStore()
    easyShare.open(payload)

    expect(easyShare.prepareChatDraft('darkchat')).toBe(true)
    expect(easyShare.consumeChatDraft('darkchat')).toEqual({
      appId: 'darkchat',
      body: 'Meet at Mission Row.',
      payload,
      targetId: null,
    })
  })
})
