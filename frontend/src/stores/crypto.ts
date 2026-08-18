import { defineStore } from 'pinia'

import type {
  CryptoBootstrap,
  CryptoMarket,
  CryptoQuote,
  CryptoRecipient,
  CryptoSide,
} from '@/types/crypto'
import { nuiCall, type NuiResponse } from '@/utils/nui'

function requestKey(prefix: string): string {
  const random = Math.random().toString(36).slice(2)
  return `${prefix}-${Date.now()}-${random}`
}

export const useCryptoStore = defineStore('crypto', {
  state: () => ({
    data: null as CryptoBootstrap | null,
    error: '',
    isLoading: false,
    pendingQuote: null as CryptoQuote | null,
  }),
  actions: {
    applyMarketUpdate(markets: CryptoMarket[]): void {
      if (!this.data || markets.length === 0) return
      const changed = new Map(markets.map((market) => [market.id, market]))
      const nextMarkets = this.data.markets.map(
        (market) => changed.get(market.id) ?? market,
      )
      const prices = new Map(
        nextMarkets.map((market) => [market.id, Number(market.price)]),
      )
      const holdings = this.data.holdings.map((holding) => ({
        ...holding,
        value: (
          Number(holding.quantity) * (prices.get(holding.assetId) ?? 0)
        ).toFixed(2),
      }))
      const portfolioValue = holdings
        .reduce(
          (total, holding) => total + Number(holding.value),
          Number(this.data.cashBalance),
        )
        .toFixed(2)

      this.data = {
        ...this.data,
        holdings,
        markets: nextMarkets,
        portfolioValue,
      }
      if (this.pendingQuote && changed.has(this.pendingQuote.marketId)) {
        this.pendingQuote = null
      }
    },
    async call<T>(endpoint: string, payload: Record<string, unknown> = {}) {
      this.isLoading = true
      this.error = ''
      const response = await nuiCall<T>(`crypto:${endpoint}`, payload).finally(
        () => {
          this.isLoading = false
        },
      )
      if (!response.success) this.error = response.error ?? 'request_failed'
      return response
    },
    async load(): Promise<boolean> {
      const response = await this.call<CryptoBootstrap>('bootstrap')
      if (!response.success || !response.data) return false
      this.data = response.data
      return true
    },
    async register(handle: string, password: string): Promise<boolean> {
      const response = await this.call<CryptoBootstrap>('register', {
        handle,
        password,
      })
      if (!response.success || !response.data) return false
      this.data = response.data
      return true
    },
    async login(password: string): Promise<boolean> {
      const response = await this.call<CryptoBootstrap>('login', { password })
      if (!response.success || !response.data) return false
      this.data = response.data
      return true
    },
    async logout(): Promise<void> {
      const response = await this.call<null>('logout')
      if (response.success) {
        this.data = this.data
          ? { ...this.data, authenticated: false, profile: null }
          : null
        this.pendingQuote = null
      }
    },
    async resolveRecipient(walletKey: string): Promise<CryptoRecipient | null> {
      const response = await this.call<CryptoRecipient>('recipient', {
        walletKey,
      })
      return response.success ? (response.data ?? null) : null
    },
    async transfer(payload: {
      marketId: string
      password: string
      quantity: string
      walletKey: string
    }): Promise<boolean> {
      const response = await this.call<CryptoBootstrap>('transfer', {
        ...payload,
        idempotencyKey: requestKey('transfer'),
      })
      if (!response.success || !response.data) return false
      this.data = response.data
      return true
    },
    async settle(
      kind: 'deposit' | 'withdraw',
      amount: string,
      password: string,
    ): Promise<boolean> {
      const response = await this.call<CryptoBootstrap>(kind, {
        amount,
        idempotencyKey: requestKey(kind),
        password,
      })
      if (!response.success || !response.data) return false
      this.data = response.data
      return true
    },
    async quote(
      marketId: string,
      side: CryptoSide,
      quantity: string,
    ): Promise<NuiResponse<CryptoQuote>> {
      const response = await this.call<CryptoQuote>('quote', {
        marketId,
        quantity,
        side,
      })
      this.pendingQuote = response.success ? (response.data ?? null) : null
      if (this.pendingQuote) {
        const quoteId = this.pendingQuote.id
        const expiresAt = this.pendingQuote.expiresAt
        globalThis.setTimeout(
          () => {
            if (
              this.pendingQuote?.id === quoteId &&
              this.pendingQuote.expiresAt <= Date.now()
            ) {
              this.pendingQuote = null
            }
          },
          Math.max(0, expiresAt - Date.now()),
        )
      }
      return response
    },
    async executeQuote(): Promise<boolean> {
      if (!this.pendingQuote) return false
      const response = await this.call<CryptoBootstrap>('execute', {
        idempotencyKey: requestKey('trade'),
        quoteId: this.pendingQuote.id,
      })
      this.pendingQuote = null
      if (!response.success || !response.data) return false
      this.data = response.data
      return true
    },
    async updateProfile(payload: {
      handle: string
      hideBalances: boolean
      currentPassword: string
      newPassword: string
      priceAlerts: boolean
      tradeConfirmations: boolean
    }): Promise<boolean> {
      const response = await this.call<CryptoBootstrap>(
        'update-profile',
        payload,
      )
      if (!response.success || !response.data) return false
      this.data = response.data
      return true
    },
  },
})
