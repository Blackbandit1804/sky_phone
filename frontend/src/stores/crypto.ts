import { defineStore } from 'pinia'

import type { CryptoBootstrap, CryptoQuote, CryptoSide } from '@/types/crypto'
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
      return response
    },
    async executeQuote(): Promise<boolean> {
      if (!this.pendingQuote) return false
      const response = await this.call<CryptoBootstrap>('execute', {
        idempotencyKey: requestKey('trade'),
        quoteId: this.pendingQuote.id,
      })
      if (!response.success || !response.data) return false
      this.data = response.data
      this.pendingQuote = null
      return true
    },
  },
})
