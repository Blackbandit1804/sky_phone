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
  profile: {
    createdAt: Date.now() - 86_400_000,
    handle: 'skyline',
    hideBalances: false,
    id: 'profile-1',
    priceAlerts: true,
    status: 'active',
    totalTrades: 12,
    totalVolume: '18462.80',
    tradeConfirmations: true,
    walletKey: 'VX-7F3A-92C1-44BE-810D',
  },
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

  it('applies live server prices to holdings and portfolio profit or loss', () => {
    const crypto = useCryptoStore()
    crypto.data = {
      ...bootstrap,
      cashBalance: '100.00',
      holdings: [
        {
          assetId: 'aurora',
          averagePrice: '100.00',
          quantity: '2.000000',
          value: '200.00',
        },
      ],
      markets: [
        {
          changePercent: 0,
          color: '#25d9ad',
          enabled: true,
          high24h: '100.00',
          id: 'aurora',
          issuedSupply: '1000000.000000',
          logo: '◈',
          low24h: '100.00',
          name: 'Aurora',
          price: '100.00',
          sparkline: [0, 1],
          symbol: 'AUR',
          treasuryAvailable: '850000.000000',
        },
      ],
      portfolioValue: '300.00',
    }
    crypto.pendingQuote = quote

    crypto.applyMarketUpdate([
      {
        ...crypto.data.markets[0],
        changePercent: 25,
        high24h: '125.00',
        price: '125.00',
        priceHistory: ['100.00', '125.00'],
      },
    ])

    expect(crypto.data.holdings[0].value).toBe('250.00')
    expect(crypto.data.portfolioValue).toBe('350.00')
    expect(crypto.data.markets[0].priceHistory).toEqual(['100.00', '125.00'])
    expect(crypto.pendingQuote).toBeNull()
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

  it('removes an expired quote so the trade form can request a new one', async () => {
    vi.useFakeTimers()
    const expiringQuote = { ...quote, expiresAt: Date.now() + 1000 }
    mockNuiCall.mockResolvedValueOnce({ data: expiringQuote, success: true })
    const crypto = useCryptoStore()

    await crypto.quote('aurora', 'buy', '1')
    expect(crypto.pendingQuote).toEqual(expiringQuote)

    await vi.advanceTimersByTimeAsync(1000)
    expect(crypto.pendingQuote).toBeNull()
    vi.useRealTimers()
  })

  it('clears a rejected execution so a fresh quote can be requested', async () => {
    mockNuiCall.mockResolvedValueOnce({
      error: 'quote_expired',
      success: false,
    })
    const crypto = useCryptoStore()
    crypto.pendingQuote = quote

    expect(await crypto.executeQuote()).toBe(false)
    expect(crypto.pendingQuote).toBeNull()
    expect(crypto.error).toBe('quote_expired')
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

  it('updates profile preferences through the authenticated server endpoint', async () => {
    mockNuiCall.mockResolvedValueOnce({ data: bootstrap, success: true })
    const crypto = useCryptoStore()

    expect(
      await crypto.updateProfile({
        handle: 'skyline',
        hideBalances: true,
        currentPassword: '',
        newPassword: '',
        priceAlerts: false,
        tradeConfirmations: true,
      }),
    ).toBe(true)
    expect(mockNuiCall).toHaveBeenCalledWith('crypto:update-profile', {
      handle: 'skyline',
      hideBalances: true,
      currentPassword: '',
      newPassword: '',
      priceAlerts: false,
      tradeConfirmations: true,
    })
  })

  it('resolves a public key and sends only crypto with an idempotency key', async () => {
    mockNuiCall
      .mockResolvedValueOnce({
        data: {
          handle: 'receiver',
          walletKey: 'VX-DEAD-BEEF-C0DE-2026',
        },
        success: true,
      })
      .mockResolvedValueOnce({ data: bootstrap, success: true })
    const crypto = useCryptoStore()

    expect(await crypto.resolveRecipient('VX-DEAD-BEEF-C0DE-2026')).toEqual({
      handle: 'receiver',
      walletKey: 'VX-DEAD-BEEF-C0DE-2026',
    })
    expect(
      await crypto.transfer({
        marketId: 'aurora',
        password: 'VaultX123!',
        quantity: '0.5',
        walletKey: 'VX-DEAD-BEEF-C0DE-2026',
      }),
    ).toBe(true)
    expect(mockNuiCall).toHaveBeenLastCalledWith(
      'crypto:transfer',
      expect.objectContaining({
        marketId: 'aurora',
        password: 'VaultX123!',
        quantity: '0.5',
        walletKey: 'VX-DEAD-BEEF-C0DE-2026',
        idempotencyKey: expect.stringMatching(/^transfer-/),
      }),
    )
  })
})
