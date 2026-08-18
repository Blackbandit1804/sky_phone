import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCryptoStore } from '@/stores/crypto'
import type { CryptoBootstrap, CryptoQuote } from '@/types/crypto'
import { nuiCall } from '@/utils/nui'

vi.mock('@/utils/nui', () => ({ nuiCall: vi.fn() }))

const mockNuiCall = vi.mocked(nuiCall)
const bootstrap: CryptoBootstrap = {
  activity: [],
  authenticated: true,
  cashBalance: '25000',
  holdings: [],
  markets: [],
  portfolioValue: '25000',
  profile: { handle: 'skyline', id: 'profile-1', status: 'active' },
}
const quote: CryptoQuote = {
  expiresAt: Date.now() + 8000,
  fee: '0.97',
  gross: '128.50',
  id: 'quote-1',
  marketId: 'aurora',
  net: '129.47',
  price: '128.50',
  quantity: '1',
  side: 'buy',
}

describe('crypto store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockNuiCall.mockReset()
  })

  it('loads the server-authoritative portfolio', async () => {
    mockNuiCall.mockResolvedValueOnce({ data: bootstrap, success: true })
    const crypto = useCryptoStore()

    expect(await crypto.load()).toBe(true)
    expect(crypto.data).toEqual(bootstrap)
    expect(mockNuiCall).toHaveBeenCalledWith('crypto:bootstrap', {})
  })

  it('sends only market, side and quantity when requesting a quote', async () => {
    mockNuiCall.mockResolvedValueOnce({ data: quote, success: true })
    const crypto = useCryptoStore()

    await crypto.quote('aurora', 'buy', '1')

    expect(crypto.pendingQuote).toEqual(quote)
    expect(mockNuiCall).toHaveBeenCalledWith('crypto:quote', {
      marketId: 'aurora',
      quantity: '1',
      side: 'buy',
    })
  })

  it('executes a quote with an opaque id and generated idempotency key', async () => {
    mockNuiCall.mockResolvedValueOnce({ data: bootstrap, success: true })
    const crypto = useCryptoStore()
    crypto.pendingQuote = quote

    expect(await crypto.executeQuote()).toBe(true)
    expect(mockNuiCall).toHaveBeenCalledWith(
      'crypto:execute',
      expect.objectContaining({ quoteId: 'quote-1' }),
    )
    expect(crypto.pendingQuote).toBeNull()
  })

  it('keeps server errors and does not replace portfolio state', async () => {
    mockNuiCall.mockResolvedValueOnce({
      error: 'quote_expired',
      success: false,
    })
    const crypto = useCryptoStore()
    crypto.data = bootstrap

    await crypto.quote('aurora', 'buy', '1')

    expect(crypto.data).toEqual(bootstrap)
    expect(crypto.error).toBe('quote_expired')
  })
})
