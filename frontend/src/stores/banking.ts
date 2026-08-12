import { defineStore } from 'pinia'

import type { BankingAction, BankingOverview } from '@/types/banking'
import { nuiCall, type NuiResponse } from '@/utils/nui'

export const useBankingStore = defineStore('banking', {
  state: () => ({
    error: '',
    isLoading: false,
    overview: null as BankingOverview | null,
    pendingRequests: 0,
    requestGeneration: 0,
  }),
  actions: {
    async load(): Promise<boolean> {
      const generation = ++this.requestGeneration
      this.pendingRequests += 1
      this.isLoading = true
      const response = await nuiCall<BankingOverview>('banking:overview').finally(
        () => {
          this.pendingRequests = Math.max(0, this.pendingRequests - 1)
          this.isLoading = this.pendingRequests > 0
        },
      )
      if (generation !== this.requestGeneration) return response.success
      if (response.success && response.data) {
        this.overview = response.data
        this.error = ''
        return true
      }
      this.error = response.error ?? 'request_failed'
      return false
    },
    async perform(
      action: BankingAction,
      amount: number,
      phoneNumber?: string,
    ): Promise<NuiResponse<BankingOverview>> {
      const generation = ++this.requestGeneration
      this.pendingRequests += 1
      this.isLoading = true
      const response = await nuiCall<BankingOverview>(`banking:${action}`, {
        amount,
        ...(phoneNumber === undefined ? {} : { phoneNumber }),
      }).finally(() => {
        this.pendingRequests = Math.max(0, this.pendingRequests - 1)
        this.isLoading = this.pendingRequests > 0
      })
      if (generation !== this.requestGeneration) return response
      if (response.success && response.data) {
        this.overview = response.data
        this.error = ''
      } else {
        this.error = response.error ?? 'request_failed'
      }
      return response
    },
  },
})
