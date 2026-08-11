import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type {
  EasyShareBootstrap,
  EasyShareChatApp,
  EasyShareChatDraft,
  EasyShareEvent,
  EasySharePayload,
  EasyShareTarget,
  EasyShareTransfer,
  EasyShareVisibility,
} from '@/types/easyshare'
import { nuiCall, type NuiResponse } from '@/utils/nui'

export const useEasyShareStore = defineStore('easyshare', () => {
  const opened = ref(false)
  const payload = ref<EasySharePayload | null>(null)
  const chatDraft = ref<EasyShareChatDraft | null>(null)
  const targets = ref<EasyShareTarget[]>([])
  const history = ref<EasyShareTransfer[]>([])
  const pending = ref<EasyShareTransfer[]>([])
  const visibility = ref<EasyShareVisibility>('everyone')
  const loading = ref(false)
  const nearbyOpened = ref(false)
  const historyOpened = ref(false)
  const activeTransfer = ref<EasyShareTransfer | null>(null)
  const incomingTransfer = computed(
    () => pending.value.find((transfer) => transfer.direction === 'incoming') ?? null,
  )

  function open(nextPayload: EasySharePayload): void {
    payload.value = nextPayload
    nearbyOpened.value = false
    historyOpened.value = false
    activeTransfer.value = null
    opened.value = true
  }

  function close(): void {
    opened.value = false
    nearbyOpened.value = false
    historyOpened.value = false
    activeTransfer.value = null
    payload.value = null
  }

  function prepareChatDraft(
    appId: EasyShareChatApp,
    targetId: string | null = null,
  ): boolean {
    if (!payload.value) return false
    const parts = [payload.value.copyText.trim(), payload.value.link?.trim()].filter(
      (part): part is string => Boolean(part),
    )
    chatDraft.value = {
      appId,
      body: [...new Set(parts)].join('\n'),
      payload: { ...payload.value },
      targetId,
    }
    return Boolean(chatDraft.value.body)
  }

  function consumeChatDraft(appId: EasyShareChatApp): EasyShareChatDraft | null {
    if (chatDraft.value?.appId !== appId) return null
    const draft = chatDraft.value
    chatDraft.value = null
    return draft
  }

  async function bootstrap(): Promise<boolean> {
    loading.value = true
    const response = await nuiCall<EasyShareBootstrap>('easyshare:bootstrap')
    loading.value = false
    if (!response.success || !response.data) return false
    targets.value = response.data.targets
    history.value = response.data.history
    pending.value = response.data.pending
    visibility.value = response.data.visibility
    return true
  }

  async function showNearby(): Promise<void> {
    nearbyOpened.value = true
    historyOpened.value = false
    await bootstrap()
  }

  async function showHistory(): Promise<void> {
    historyOpened.value = true
    nearbyOpened.value = false
    await bootstrap()
  }

  async function setVisibility(next: EasyShareVisibility): Promise<boolean> {
    const response = await nuiCall<{ visibility: EasyShareVisibility }>(
      'easyshare:set-visibility',
      { visibility: next },
    )
    if (response.success && response.data) visibility.value = response.data.visibility
    return response.success
  }

  async function request(targetId: number): Promise<NuiResponse<EasyShareTransfer>> {
    if (!payload.value) return { success: false, error: 'missing_payload' }
    const response = await nuiCall<EasyShareTransfer>('easyshare:request', {
      payload: payload.value,
      targetId,
    })
    if (response.success && response.data) activeTransfer.value = response.data
    return response
  }

  async function respond(id: string, accepted: boolean): Promise<boolean> {
    const response = await nuiCall<EasyShareTransfer>('easyshare:respond', {
      accepted,
      id,
    })
    if (response.success && response.data) applyTransfer(response.data)
    return response.success
  }

  async function cancel(id: string): Promise<boolean> {
    const response = await nuiCall<EasyShareTransfer>('easyshare:cancel', { id })
    if (response.success && response.data) applyTransfer(response.data)
    return response.success
  }

  function applyTransfer(transfer: EasyShareTransfer): void {
    const pendingIndex = pending.value.findIndex((entry) => entry.id === transfer.id)
    if (['pending', 'transferring'].includes(transfer.status)) {
      if (pendingIndex >= 0) pending.value[pendingIndex] = transfer
      else pending.value.unshift(transfer)
    } else if (pendingIndex >= 0) {
      pending.value.splice(pendingIndex, 1)
    }

    const historyIndex = history.value.findIndex((entry) => entry.id === transfer.id)
    if (historyIndex >= 0) history.value[historyIndex] = transfer
    else history.value.unshift(transfer)
    history.value = history.value.slice(0, 50)
    if (activeTransfer.value?.id === transfer.id) activeTransfer.value = transfer
  }

  function applyEvent(event: EasyShareEvent): void {
    applyTransfer(event.transfer)
    if (event.transfer.direction === 'incoming' && event.transfer.status === 'pending') {
      opened.value = true
      nearbyOpened.value = true
      historyOpened.value = false
    }
  }

  return {
    activeTransfer,
    applyEvent,
    bootstrap,
    cancel,
    chatDraft,
    close,
    consumeChatDraft,
    history,
    historyOpened,
    incomingTransfer,
    loading,
    nearbyOpened,
    open,
    opened,
    payload,
    pending,
    prepareChatDraft,
    request,
    respond,
    setVisibility,
    showHistory,
    showNearby,
    targets,
    visibility,
  }
})
