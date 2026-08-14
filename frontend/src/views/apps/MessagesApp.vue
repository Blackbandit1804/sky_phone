<script setup lang="ts">
import {
  ArrowUpCircle,
  Camera,
  Check,
  ChevronRight,
  ImagePlay,
  Images,
  MessageCircle,
  Mic,
  Pencil,
  Phone as PhoneIcon,
  Plus,
  SquarePen,
  Trash2,
  ContactRound,
  UserPlus,
  Video,
  X,
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import MessageAttachmentBubble from '@/components/MessageAttachmentBubble.vue'
import MessageContactBubble from '@/components/MessageContactBubble.vue'
import SharedContentCard from '@/components/SharedContentCard.vue'
import FullEmojiPicker from '@/components/FullEmojiPicker.vue'
import VoiceMessageBubble from '@/components/VoiceMessageBubble.vue'
import { useCallsStore } from '@/stores/calls'
import { useEasyShareStore } from '@/stores/easyshare'
import { useMessagesStore } from '@/stores/messages'
import { useMessageMediaStore } from '@/stores/messageMedia'
import { usePhoneStore } from '@/stores/phone'
import { parseDatabaseDate, type DatabaseDateValue } from '@/utils/date'
import { handleEnterAction } from '@/utils/keyboard'
import { sortContactsByMessageRecency } from '@/utils/messages'
import type {
  GifSearchResult,
  SmsAttachmentType,
  SmsConversation,
  SmsMessage,
  SmsSharedContact,
} from '@/types/messages'
import type { PhoneContact } from '@/types/phone'
import type { EasySharePayload } from '@/types/easyshare'
import {
  SkyAppPage,
  SkyButton,
  SkyEmptyState,
  SkyField,
  SkyGlass,
  SkyLink,
  SkyList,
  SkyListItem,
  SkyMessage,
  SkyMessagebar,
  SkyMessages,
  SkyMessagesTitle,
  SkyNavbar,
  SkyPillNavigation,
  SkyScrollArea,
  SkySearchbar,
  SkySegmented,
  SkySegmentedButton,
  SkySpinner,
  SkyToast,
} from '@/ui'

const VOICE_MAX_DURATION_MS = 30_000
const VOICE_MAX_BYTES = 135_000
const WAVEFORM_SAMPLES = 48

const phone = usePhoneStore()
const calls = useCallsStore()
const easyShare = useEasyShareStore()
const messages = useMessagesStore()
const messageMedia = useMessageMediaStore()
const router = useRouter()
const search = ref('')
const showUnreadOnly = ref(false)
const editingList = ref(false)
const selectedNumbers = ref<string[]>([])
const composerNumber = ref('')
const draft = ref('')
const queuedSharePayload = ref<EasySharePayload | null>(null)
const shareDraft = ref<EasySharePayload | null>(null)
const composing = ref(false)
const sending = ref(false)
const toastOpened = ref(false)
const toastText = ref('')
const emojiOpen = ref(false)
const attachmentMenuOpen = ref(false)
const attachmentPicker = ref<'contacts' | 'gifs' | null>(null)
const contactDetailsOpen = ref(false)
const contactEditing = ref(false)
const contactNameDraft = ref('')
const contactNumberDraft = ref('')
const gifQuery = ref('')
const gifResults = ref<GifSearchResult[]>([])
const gifLoading = ref(false)
const gifError = ref<string | null>(null)
const gifHasMore = ref(true)
const gifNextOffset = ref(0)
const recording = ref(false)
const recordingElapsedMs = ref(0)
const recordingLevels = ref<number[]>(Array(32).fill(0.16))
const threadBottom = ref<HTMLElement | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined
let gifSearchTimer: ReturnType<typeof setTimeout> | undefined
let recordingTimer: ReturnType<typeof setInterval> | undefined
let mediaRecorder: MediaRecorder | undefined
let mediaStream: MediaStream | undefined
let audioContext: AudioContext | undefined
let analyser: AnalyserNode | undefined
let recordingStartedAt = 0
let recordingChunks: Blob[] = []
let recordingSamples: number[] = []
let recordingBytes = 0
let discardRecording = false

const hasSim = computed(() => Boolean(phone.device?.sim))
const filteredConversations = computed(() => {
  const query = search.value.trim().toLocaleLowerCase(phone.lang)
  return messages.conversations.filter((conversation) => {
    if (showUnreadOnly.value && conversation.unread === 0) return false
    if (!query) return true
    return `${contactName(conversation.phoneNumber)} ${conversation.phoneNumber} ${conversationPreview(conversation)}`
      .toLocaleLowerCase(phone.lang)
      .includes(query)
  })
})
const knownContactNumbers = computed(
  () => new Set(calls.contacts.map((contact) => contact.phone_number)),
)
const contactAvatarUrls = computed(
  () =>
    new Map(
      calls.contacts
        .filter((contact) => Boolean(contact.avatar_url))
        .map((contact) => [contact.phone_number, contact.avatar_url as string]),
    ),
)
const contactSuggestions = computed(() => {
  const query = composerNumber.value.trim().toLocaleLowerCase(phone.lang)
  const contacts = sortContactsByMessageRecency(
    calls.contacts.filter((contact) => contact.canMessage !== false),
    messages.conversations,
  )
  if (!query) return contacts.slice(0, 8)
  return contacts
    .filter((contact) =>
      `${contact.name} ${contact.phone_number}`
        .toLocaleLowerCase(phone.lang)
        .includes(query),
    )
    .slice(0, 8)
})
const activeTitle = computed(() =>
  messages.activeNumber ? contactName(messages.activeNumber) : '',
)
const activeContact = computed(() =>
  calls.contacts.find(
    (contact) => contact.phone_number === messages.activeNumber,
  ),
)
const activeCanMessage = computed(
  () => activeContact.value?.canMessage !== false,
)
const attachmentPanelOpen = computed(
  () => emojiOpen.value || attachmentPicker.value !== null,
)
function contactName(number: string): string {
  return (
    calls.contacts.find((contact) => contact.phone_number === number)?.name ??
    number
  )
}

function conversationPreview(conversation: SmsConversation): string {
  if (conversation.lastMessageType === 'image') {
    return `📷 ${phone.t('Apps.messages.photo')}`
  }
  if (conversation.lastMessageType === 'gif') {
    return `GIF ${phone.t('Apps.messages.gif')}`
  }
  if (conversation.lastMessageType === 'video') {
    return `▶️ ${phone.t('Apps.messages.video')}`
  }
  if (conversation.lastMessageType === 'contact') {
    return `\u{1F464} ${phone.t('Apps.messages.contact')}`
  }
  if (conversation.lastMessageType === 'share') {
    return `\u{1F517} ${conversation.lastMessage}`
  }
  return conversation.lastMessageType === 'voice'
    ? `🎙️ ${phone.t('Apps.messages.voiceMessage')}`
    : conversation.lastMessage
}

function contactInitials(number: string): string {
  const contact = calls.contacts.find((entry) => entry.phone_number === number)
  if (!contact) return ''
  return contact.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function formatConversationDate(value: DatabaseDateValue): string {
  const date = parseDatabaseDate(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat(phone.lang, {
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
    }).format(date)
  }
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return phone.t('Apps.messages.yesterday')
  }
  const daysAgo = Math.floor((today.getTime() - date.getTime()) / 86_400_000)
  if (daysAgo < 7) {
    return new Intl.DateTimeFormat(phone.lang, { weekday: 'long' }).format(date)
  }
  return new Intl.DateTimeFormat(phone.lang, {
    day: 'numeric',
    month: 'numeric',
  }).format(date)
}

function dayLabel(value: DatabaseDateValue): string {
  const date = parseDatabaseDate(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) {
    return phone.t('Apps.messages.today')
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return phone.t('Apps.messages.yesterday')
  }
  return new Intl.DateTimeFormat(phone.lang, {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  }).format(date)
}

function timeLabel(value: DatabaseDateValue): string {
  const date = parseDatabaseDate(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(phone.lang, {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
  }).format(date)
}

function formatRecordingTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function startsDay(message: SmsMessage, index: number): boolean {
  if (index === 0) return true
  return (
    parseDatabaseDate(
      messages.messages[index - 1].created_at,
    ).toDateString() !== parseDatabaseDate(message.created_at).toDateString()
  )
}

function messageFooter(message: SmsMessage, index: number): string | undefined {
  if (message.direction !== 'sent' || index !== messages.messages.length - 1) {
    return undefined
  }
  if (message.delivery_status === 'sending') {
    return phone.t('Apps.messages.sending')
  }
  if (message.delivery_status === 'failed') {
    return phone.t('Apps.messages.notDelivered')
  }
  return phone.t('Apps.messages.delivered')
}

function showToast(message: string): void {
  if (toastTimer) clearTimeout(toastTimer)
  toastText.value = message
  toastOpened.value = true
  toastTimer = setTimeout(() => (toastOpened.value = false), 2800)
}

function errorText(error?: string): string {
  const known = [
    'invalid_number',
    'invalid_message',
    'invalid_voice',
    'invalid_attachment',
    'invalid_contact',
    'contact_not_found',
    'media_provider_unconfigured',
    'capture_provider_unavailable',
    'capture_failed',
    'gif_provider_unconfigured',
    'gif_provider_unauthorized',
    'gif_provider_rate_limited',
    'gif_provider_failed',
    'self_message',
    'recipient_not_found',
    'no_sim',
    'rate_limited',
    'request_failed',
  ]
  return phone.t(
    `Apps.messages.errors.${error && known.includes(error) ? error : 'default'}`,
  )
}

async function scrollToBottom(animate = true): Promise<void> {
  await nextTick()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
  threadBottom.value?.scrollIntoView({
    block: 'end',
    behavior: animate ? 'smooth' : 'auto',
  })
}

async function openConversation(conversation: SmsConversation): Promise<void> {
  if (editingList.value) {
    const index = selectedNumbers.value.indexOf(conversation.phoneNumber)
    if (index >= 0) selectedNumbers.value.splice(index, 1)
    else selectedNumbers.value.push(conversation.phoneNumber)
    return
  }
  if (!(await messages.openThread(conversation.phoneNumber))) {
    showToast(errorText())
    return
  }
  composing.value = false
  shareDraft.value = queuedSharePayload.value
  queuedSharePayload.value = null
  await scrollToBottom(false)
}

async function openEasyShareDraft(): Promise<void> {
  const shared = easyShare.consumeChatDraft('messages')
  if (!shared) return
  if (!shared.targetId) {
    messages.closeThread()
    composing.value = false
    queuedSharePayload.value = shared.payload
    draft.value = ''
    return
  }
  if (!(await messages.openThread(shared.targetId))) {
    showToast(errorText('invalid_number'))
    return
  }
  composing.value = false
  queuedSharePayload.value = null
  shareDraft.value = shared.payload
  draft.value = ''
  await scrollToBottom(false)
}

function toggleListEditing(): void {
  editingList.value = !editingList.value
  selectedNumbers.value = []
  showUnreadOnly.value = false
}

async function deleteSelectedConversations(): Promise<void> {
  if (!selectedNumbers.value.length) return
  const deleted = await messages.deleteConversations(selectedNumbers.value)
  if (!deleted) {
    showToast(errorText())
    return
  }
  editingList.value = false
  selectedNumbers.value = []
}

function beginCompose(): void {
  messages.closeThread()
  composing.value = true
  composerNumber.value = ''
  draft.value = ''
}

async function chooseRecipient(number: string): Promise<void> {
  const contact = calls.contacts.find(
    (candidate) => candidate.phone_number === number,
  )
  if (contact?.canMessage === false) {
    showToast(phone.t('Apps.messages.messagingUnavailable'))
    return
  }
  composerNumber.value = number
  if (!(await messages.openThread(number))) {
    showToast(errorText('invalid_number'))
    return
  }
  composing.value = false
  shareDraft.value = queuedSharePayload.value
  queuedSharePayload.value = null
  await scrollToBottom(false)
}

function goBack(): void {
  if (contactDetailsOpen.value) {
    contactDetailsOpen.value = false
    contactEditing.value = false
    return
  }
  cancelVoiceRecording()
  if (messages.activeNumber) messages.closeThread()
  composing.value = false
  composerNumber.value = ''
  draft.value = ''
  shareDraft.value = null
  emojiOpen.value = false
  attachmentMenuOpen.value = false
  attachmentPicker.value = null
}

function appendEmoji(emoji: string): void {
  draft.value += emoji
}

function openContactDetails(): void {
  if (!messages.activeNumber) return
  contactNameDraft.value = activeContact.value?.name ?? ''
  contactNumberDraft.value = messages.activeNumber
  contactEditing.value = false
  contactDetailsOpen.value = true
}

async function saveContactDetails(): Promise<void> {
  if (activeContact.value?.readonly) {
    showToast(phone.t('Apps.phone.errors.readonly_contact'))
    return
  }
  if (!contactNameDraft.value.trim() || !contactNumberDraft.value.trim()) return
  const response = await calls.saveContact({
    id: activeContact.value?.id,
    name: contactNameDraft.value.trim(),
    notes: activeContact.value?.notes ?? '',
    organization: activeContact.value?.organization ?? '',
    phoneNumber: contactNumberDraft.value,
  })
  if (!response.success) {
    showToast(phone.t('Apps.messages.contactSaveFailed'))
    return
  }
  contactEditing.value = false
  contactNumberDraft.value =
    response.data?.phone_number ?? contactNumberDraft.value
}

async function deleteActiveContact(): Promise<void> {
  if (!activeContact.value) return
  if (activeContact.value.readonly) {
    showToast(phone.t('Apps.phone.errors.readonly_contact'))
    return
  }
  if (!(await calls.deleteContact(activeContact.value.id))) {
    showToast(phone.t('Apps.messages.contactDeleteFailed'))
    return
  }
  contactDetailsOpen.value = false
  contactEditing.value = false
}

async function callActiveContact(): Promise<void> {
  if (!messages.activeNumber || activeContact.value?.canCall === false) return
  const response = await calls.dial(messages.activeNumber)
  if (!response.success) showToast(phone.t('Apps.messages.callFailed'))
}

function toggleAttachmentMenu(): void {
  attachmentMenuOpen.value = !attachmentMenuOpen.value
  emojiOpen.value = false
  attachmentPicker.value = null
}

function openGifPicker(): void {
  attachmentMenuOpen.value = false
  attachmentPicker.value = 'gifs'
  emojiOpen.value = false
  if (!gifResults.value.length) void loadGifs(true)
}

function openContactPicker(): void {
  attachmentMenuOpen.value = false
  attachmentPicker.value = 'contacts'
  emojiOpen.value = false
}

function openEmojiPicker(): void {
  attachmentMenuOpen.value = false
  attachmentPicker.value = null
  emojiOpen.value = true
}

function openMediaApp(
  app: 'camera' | 'photos',
  mediaType: 'photo' | 'video',
): void {
  if (!messages.activeNumber) return
  attachmentMenuOpen.value = false
  messageMedia.begin(messages.activeNumber, mediaType)
  void router.push({
    path: `/apps/${app}`,
    query: { messageAttachment: mediaType },
  })
}

async function sendAttachment(
  messageType: SmsAttachmentType,
  mediaAssetId: string,
  mediaDurationMs?: number,
): Promise<void> {
  if (!messages.activeNumber || !activeCanMessage.value || sending.value) return
  attachmentMenuOpen.value = false
  attachmentPicker.value = null
  sending.value = true
  const response = await messages.send({
    mediaAssetId,
    mediaDurationMs,
    messageType,
  })
  sending.value = false
  if (!response.success) showToast(errorText(response.error))
  await scrollToBottom()
}

async function sendContact(contact: PhoneContact): Promise<void> {
  if (!messages.activeNumber || sending.value) return
  attachmentMenuOpen.value = false
  attachmentPicker.value = null
  sending.value = true
  const response = await messages.send({
    contact: {
      avatar_url: contact.avatar_url ?? null,
      name: contact.name,
      organization: contact.organization ?? null,
      phone_number: contact.phone_number,
    },
    contactId: contact.id,
    messageType: 'contact',
  })
  sending.value = false
  if (!response.success) showToast(errorText(response.error))
  await scrollToBottom()
}

async function messageSharedContact(contact: SmsSharedContact): Promise<void> {
  if (!(await messages.openThread(contact.phone_number))) {
    showToast(errorText('invalid_number'))
    return
  }
  attachmentMenuOpen.value = false
  attachmentPicker.value = null
  emojiOpen.value = false
  await scrollToBottom(false)
}

async function saveSharedContact(contact: SmsSharedContact): Promise<void> {
  if (knownContactNumbers.value.has(contact.phone_number)) return
  const response = await calls.saveContact({
    name: contact.name,
    organization: contact.organization ?? '',
    phoneNumber: contact.phone_number,
  })
  showToast(
    response.success
      ? phone.t('Apps.messages.contactSaved')
      : phone.t('Apps.messages.contactSaveFailed'),
  )
}

async function loadGifs(reset = false): Promise<void> {
  if (gifLoading.value || (!reset && !gifHasMore.value)) return
  gifError.value = null
  gifLoading.value = true
  const response = await messages.searchGifs(
    gifQuery.value,
    reset ? 0 : gifNextOffset.value,
  )
  gifLoading.value = false
  if (!response.success || !response.data) {
    if (reset) gifResults.value = []
    gifError.value = response.error ?? 'gif_provider_failed'
    showToast(errorText(response.error))
    return
  }
  const existingIds = new Set(
    reset ? [] : gifResults.value.map((result) => result.id),
  )
  const uniqueResults = response.data.results.filter((result) => {
    if (existingIds.has(result.id)) return false
    existingIds.add(result.id)
    return true
  })
  gifResults.value = reset
    ? uniqueResults
    : [...gifResults.value, ...uniqueResults]
  gifHasMore.value = response.data.hasMore
  gifNextOffset.value = response.data.nextOffset
}

function queueGifSearch(): void {
  if (gifSearchTimer) clearTimeout(gifSearchTimer)
  gifSearchTimer = setTimeout(() => void loadGifs(true), 320)
}

async function sendTextMessage(): Promise<void> {
  if (
    !messages.activeNumber ||
    !activeCanMessage.value ||
    (!draft.value.trim() && !shareDraft.value) ||
    sending.value
  ) {
    return
  }
  const body = draft.value
  const shared = shareDraft.value
  draft.value = ''
  shareDraft.value = null
  emojiOpen.value = false
  attachmentMenuOpen.value = false
  attachmentPicker.value = null
  sending.value = true
  await scrollToBottom()
  const response = await messages.send(
    shared
      ? { body, messageType: 'share', sharePayload: shared }
      : { body, messageType: 'text' },
  )
  sending.value = false
  if (!response.success) {
    draft.value = body
    shareDraft.value = shared
    showToast(errorText(response.error))
  }
  await scrollToBottom()
}

function recordingMime(): string | null {
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    return 'audio/webm;codecs=opus'
  }
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  return null
}

function sampleMicrophone(): void {
  if (!analyser) return
  const values = new Uint8Array(analyser.fftSize)
  analyser.getByteTimeDomainData(values)
  let total = 0
  for (const value of values) total += Math.abs(value - 128) / 128
  const level = Math.max(0.08, Math.min(1, (total / values.length) * 4.5))
  recordingSamples.push(level)
  recordingLevels.value = [...recordingLevels.value.slice(1), level]
  recordingElapsedMs.value = performance.now() - recordingStartedAt
  if (recordingElapsedMs.value >= VOICE_MAX_DURATION_MS) {
    stopVoiceRecording()
  }
}

async function startVoiceRecording(): Promise<void> {
  if (!activeCanMessage.value) return
  emojiOpen.value = false
  if (
    !navigator.mediaDevices?.getUserMedia ||
    typeof MediaRecorder === 'undefined'
  ) {
    showToast(phone.t('Apps.messages.microphoneUnavailable'))
    return
  }
  const mime = recordingMime()
  if (!mime) {
    showToast(phone.t('Apps.messages.microphoneUnavailable'))
    return
  }
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
    })
    recordingChunks = []
    recordingSamples = []
    recordingBytes = 0
    discardRecording = false
    mediaRecorder = new MediaRecorder(mediaStream, {
      audioBitsPerSecond: 24_000,
      mimeType: mime,
    })
    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (!event.data.size) return
      recordingChunks.push(event.data)
      recordingBytes += event.data.size
      if (recordingBytes > VOICE_MAX_BYTES) stopVoiceRecording()
    })
    mediaRecorder.addEventListener('stop', () => void finishVoiceRecording())
    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 128
    audioContext.createMediaStreamSource(mediaStream).connect(analyser)
    recordingStartedAt = performance.now()
    recordingElapsedMs.value = 0
    recordingLevels.value = Array(32).fill(0.16)
    recording.value = true
    mediaRecorder.start(250)
    recordingTimer = setInterval(sampleMicrophone, 100)
  } catch (error) {
    console.error('[Messages] Could not start audio recording:', error)
    cleanupRecorder()
    showToast(phone.t('Apps.messages.microphoneUnavailable'))
  }
}

function stopVoiceRecording(): void {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return
  mediaRecorder.stop()
}

function cancelVoiceRecording(): void {
  discardRecording = true
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
  else cleanupRecorder()
}

function cleanupRecorder(): void {
  if (recordingTimer) clearInterval(recordingTimer)
  recordingTimer = undefined
  mediaStream?.getTracks().forEach((track) => track.stop())
  void audioContext?.close()
  mediaRecorder = undefined
  mediaStream = undefined
  audioContext = undefined
  analyser = undefined
  recording.value = false
}

function compressedWaveform(): number[] {
  if (!recordingSamples.length) return Array(16).fill(0.12)
  const result: number[] = []
  const bucketSize = recordingSamples.length / WAVEFORM_SAMPLES
  const count = Math.min(WAVEFORM_SAMPLES, recordingSamples.length)
  for (let index = 0; index < count; index += 1) {
    const start = Math.floor(index * bucketSize)
    const end = Math.max(start + 1, Math.floor((index + 1) * bucketSize))
    const bucket = recordingSamples.slice(start, end)
    result.push(
      Math.max(
        0.08,
        Math.min(
          1,
          bucket.reduce((sum, value) => sum + value, 0) / bucket.length,
        ),
      ),
    )
  }
  return result
}

async function blobBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

async function finishVoiceRecording(): Promise<void> {
  const duration = Math.min(
    VOICE_MAX_DURATION_MS,
    Math.max(300, performance.now() - recordingStartedAt),
  )
  const mime = mediaRecorder?.mimeType ?? 'audio/webm'
  const chunks = recordingChunks
  const waveform = compressedWaveform()
  const shouldDiscard = discardRecording
  cleanupRecorder()
  if (shouldDiscard || !activeCanMessage.value) return
  const blob = new Blob(chunks, { type: mime })
  if (!blob.size || blob.size > VOICE_MAX_BYTES) {
    showToast(phone.t('Apps.messages.recordingTooLarge'))
    return
  }
  const payload = await blobBase64(blob)
  sending.value = true
  const response = await messages.send({
    mediaDurationMs: Math.floor(duration),
    mediaMime: mime,
    mediaPayload: payload,
    mediaWaveform: waveform,
    messageType: 'voice',
  })
  sending.value = false
  if (!response.success) showToast(errorText(response.error))
  await scrollToBottom()
}

onMounted(async () => {
  await Promise.all([messages.loadConversations(), calls.loadContacts()])
  await openEasyShareDraft()
  if (messages.activeNumber) {
    const media = messageMedia.consume(messages.activeNumber)
    if (media) {
      await sendAttachment(
        media.mediaType === 'photo' ? 'image' : 'video',
        import.meta.env.DEV ? media.url : String(media.id),
      )
    }
    await scrollToBottom(false)
  }
})

watch(
  () => easyShare.chatDraft,
  (shared) => {
    if (shared?.appId === 'messages') void openEasyShareDraft()
  },
)

onBeforeUnmount(() => {
  discardRecording = true
  cleanupRecorder()
  if (toastTimer) clearTimeout(toastTimer)
  if (gifSearchTimer) clearTimeout(gifSearchTimer)
})
</script>

<template>
  <SkyAppPage
    v-if="!hasSim"
    class="messages-sky-page"
    :label="phone.t('Apps.messages.name')"
    :dark="phone.isDarkMode"
    accent="#34c759"
    accent-soft="rgba(52, 199, 89, 0.16)"
  >
    <SkyNavbar variant="large" :title="phone.t('Apps.messages.name')" />
    <SkyScrollArea padded class="messages-sky-state-scroll">
      <SkyEmptyState
        :title="phone.t('Apps.messages.noSim')"
        :body="phone.t('Apps.messages.noSimBody')"
      >
        <template #icon><MessageCircle :size="35" /></template>
      </SkyEmptyState>
    </SkyScrollArea>
  </SkyAppPage>

  <SkyAppPage
    v-else-if="!messages.activeNumber && !composing"
    class="messages-sky-page messages-sky-inbox"
    :label="phone.t('Apps.messages.name')"
    :dark="phone.isDarkMode"
    accent="#34c759"
    accent-soft="rgba(52, 199, 89, 0.16)"
  >
    <SkyNavbar
      variant="large"
      :title="
        editingList
          ? phone.t('Apps.messages.selectedCount', {
              count: String(selectedNumbers.length),
            })
          : phone.t('Apps.messages.name')
      "
    >
      <template #left>
        <SkyLink class="messages-sky-edit" @click="toggleListEditing">
          {{ phone.t(editingList ? 'Common.done' : 'Common.edit') }}
        </SkyLink>
      </template>
      <template #right>
        <SkyLink
          v-if="editingList"
          icon-only
          class="messages-sky-delete"
          :disabled="!selectedNumbers.length"
          :aria-label="phone.t('Apps.messages.deleteSelected')"
          @click="deleteSelectedConversations"
        >
          <Trash2 :size="20" />
        </SkyLink>
        <SkyLink
          v-else
          icon-only
          :aria-label="phone.t('Apps.messages.compose')"
          @click="beginCompose"
        >
          <SquarePen :size="21" />
        </SkyLink>
      </template>
      <template #subnavbar>
        <SkySearchbar
          v-model="search"
          class="messages-sky-search"
          :label="phone.t('Apps.messages.search')"
          :placeholder="phone.t('Apps.messages.search')"
          :clear-label="phone.t('Common.clear')"
        />
      </template>
    </SkyNavbar>

    <SkyScrollArea padded with-tabbar class="messages-sky-inbox-scroll">
      <SkySegmented
        v-if="!editingList"
        navigation
        rounded
        strong
        class="messages-sky-filters"
        :active-index="showUnreadOnly ? 1 : 0"
        :aria-label="phone.t('Apps.messages.filterLabel')"
        :item-count="2"
      >
        <SkySegmentedButton
          :active="!showUnreadOnly"
          @click="showUnreadOnly = false"
        >
          {{ phone.t('Apps.messages.allMessages') }}
        </SkySegmentedButton>
        <SkySegmentedButton
          :active="showUnreadOnly"
          @click="showUnreadOnly = true"
        >
          {{ phone.t('Apps.messages.unreadMessages') }}
        </SkySegmentedButton>
      </SkySegmented>

      <SkyList
        v-if="filteredConversations.length"
        flush
        class="messages-sky-conversation-list"
      >
        <SkyListItem
          v-for="conversation in filteredConversations"
          :key="conversation.phoneNumber"
          link
          link-component="button"
          :chevron="false"
          :active="selectedNumbers.includes(conversation.phoneNumber)"
          :aria-label="contactName(conversation.phoneNumber)"
          class="messages-sky-conversation"
          :class="{
            'messages-sky-conversation--unread': conversation.unread > 0,
          }"
          @click="openConversation(conversation)"
        >
          <template #media>
            <span
              class="messages-avatar"
              :class="{
                'messages-avatar--unknown': !knownContactNumbers.has(
                  conversation.phoneNumber,
                ),
              }"
              aria-hidden="true"
            >
              <img
                v-if="contactAvatarUrls.get(conversation.phoneNumber)"
                class="messages-avatar__image"
                :src="contactAvatarUrls.get(conversation.phoneNumber)"
                alt=""
              />
              <span
                v-else-if="knownContactNumbers.has(conversation.phoneNumber)"
                class="messages-avatar__initials"
              >
                {{ contactInitials(conversation.phoneNumber) }}
              </span>
              <span v-else class="messages-avatar__placeholder">
                <i />
                <b />
              </span>
              <span
                v-if="editingList"
                class="messages-sky-selection"
                :class="{
                  'is-selected': selectedNumbers.includes(
                    conversation.phoneNumber,
                  ),
                }"
              >
                <Check
                  v-if="selectedNumbers.includes(conversation.phoneNumber)"
                  :size="13"
                />
              </span>
              <span
                v-else-if="conversation.unread"
                class="messages-sky-unread-dot"
              />
            </span>
          </template>
          <template #title>
            {{ contactName(conversation.phoneNumber) }}
          </template>
          <template #after>
            <span class="messages-sky-conversation-time">
              <time>{{
                formatConversationDate(conversation.lastMessageAt)
              }}</time>
              <ChevronRight :size="15" />
            </span>
          </template>
          <template #subtitle>
            {{ conversationPreview(conversation) }}
          </template>
        </SkyListItem>
      </SkyList>

      <SkyEmptyState
        v-else
        class="messages-sky-empty"
        :title="
          phone.t(
            search ? 'Apps.messages.noResults' : 'Apps.messages.noMessages',
          )
        "
        :body="search ? '' : phone.t('Apps.messages.noMessagesBody')"
      >
        <template #icon><MessageCircle :size="32" /></template>
        <template v-if="!search" #actions>
          <SkyButton rounded @click="beginCompose">
            {{ phone.t('Apps.messages.compose') }}
          </SkyButton>
        </template>
      </SkyEmptyState>
    </SkyScrollArea>

    <SkyPillNavigation
      v-if="editingList"
      layout="compact"
      align="center"
      class="messages-sky-edit-navigation"
      :label="phone.t('Apps.messages.deleteSelected')"
    >
      <SkyButton
        rounded
        variant="danger"
        :disabled="!selectedNumbers.length"
        @click="deleteSelectedConversations"
      >
        <Trash2 :size="18" />
        {{ phone.t('Apps.messages.deleteSelected') }}
      </SkyButton>
    </SkyPillNavigation>
  </SkyAppPage>

  <SkyAppPage
    v-else-if="composing"
    class="messages-sky-page messages-sky-compose"
    :label="phone.t('Apps.messages.compose')"
    :dark="phone.isDarkMode"
    accent="#34c759"
    accent-soft="rgba(52, 199, 89, 0.16)"
  >
    <SkyNavbar :title="phone.t('Apps.messages.compose')">
      <template #right>
        <SkyLink @click="goBack">
          {{ phone.t('Common.cancel') }}
        </SkyLink>
      </template>
    </SkyNavbar>
    <SkyScrollArea padded class="messages-sky-compose-scroll">
      <SkyList class="messages-recipient-field" density="compact" flush>
        <SkyField
          v-model="composerNumber"
          :label="phone.t('Apps.messages.to')"
          layout="inline"
          input-mode="tel"
          type="tel"
          :clear-button="true"
          :clear-label="phone.t('Common.clear')"
          @clear="composerNumber = ''"
          @keyup.enter="chooseRecipient(composerNumber)"
        />
      </SkyList>
      <SkyList
        v-if="contactSuggestions.length"
        class="messages-contact-list"
        flush
      >
        <SkyListItem
          v-for="contact in contactSuggestions"
          :key="contact.id"
          link
          link-component="button"
          strong-title="auto"
          :title="contact.name"
          :subtitle="contact.phone_number"
          @click="chooseRecipient(contact.phone_number)"
        >
          <template #media>
            <span class="messages-avatar messages-avatar--small">
              <img
                v-if="contact.avatar_url"
                class="messages-avatar__image"
                :src="contact.avatar_url"
                alt=""
              />
              <span v-else class="messages-avatar__initials">{{
                contactInitials(contact.phone_number)
              }}</span>
            </span>
          </template>
        </SkyListItem>
      </SkyList>
      <div v-else-if="messages.loading" class="messages-sky-loading">
        <SkySpinner :label="phone.t('Common.loading')" />
      </div>
      <SkyButton
        v-else-if="composerNumber.trim()"
        rounded
        tonal
        class="messages-number-action"
        @click="chooseRecipient(composerNumber)"
      >
        <MessageCircle :size="17" />
        {{ composerNumber }}
      </SkyButton>
    </SkyScrollArea>
  </SkyAppPage>

  <SkyAppPage
    v-else
    class="messages-sky-page messages-sky-thread"
    :class="{
      'messages-sky-thread--panel': attachmentPanelOpen,
      'messages-sky-thread--share': Boolean(shareDraft),
    }"
    :label="activeTitle"
    :dark="phone.isDarkMode"
    accent="#34c759"
    accent-soft="rgba(52, 199, 89, 0.16)"
  >
    <SkyNavbar
      class="messages-sky-thread-navbar"
      :title="activeTitle"
      show-back
      back-appearance="plain"
      :back-label="phone.t('Common.back')"
      @back="goBack"
    >
      <template #title>
        <button
          type="button"
          class="messages-sky-thread-contact"
          :aria-label="phone.t('Apps.messages.contactDetails')"
          @click="openContactDetails"
        >
          <span
            class="messages-avatar messages-avatar--thread"
            :class="{ 'messages-avatar--unknown': !activeContact }"
          >
            <img
              v-if="activeContact?.avatar_url"
              class="messages-avatar__image"
              :src="activeContact.avatar_url"
              alt=""
            />
            <span v-else-if="activeContact" class="messages-avatar__initials">
              {{ contactInitials(messages.activeNumber ?? '') }}
            </span>
            <span
              v-else
              class="messages-avatar__placeholder"
              aria-hidden="true"
            >
              <i />
              <b />
            </span>
          </span>
          <span>{{ activeTitle }}</span>
          <ChevronRight :size="13" />
        </button>
      </template>
    </SkyNavbar>

    <SkyAppPage
      v-if="contactDetailsOpen"
      class="messages-contact-overlay"
      :label="phone.t('Apps.messages.contactDetails')"
      :dark="phone.isDarkMode"
      accent="#34c759"
      accent-soft="rgba(52, 199, 89, 0.16)"
    >
      <SkyNavbar
        :title="phone.t('Apps.messages.contactDetails')"
        show-back
        back-appearance="surface"
        :back-label="phone.t('Common.back')"
        @back="contactDetailsOpen = false"
      >
        <template #right>
          <SkyLink
            v-if="!activeContact?.readonly"
            icon-only
            :aria-label="phone.t('Common.edit')"
            @click="
              contactEditing ? saveContactDetails() : (contactEditing = true)
            "
          >
            <Check v-if="contactEditing" :size="19" />
            <Pencil v-else :size="18" />
          </SkyLink>
        </template>
      </SkyNavbar>
      <SkyScrollArea padded class="messages-contact-overlay__scroll">
        <div class="messages-contact-details__hero">
          <span
            class="messages-avatar messages-avatar--contact"
            :class="{ 'messages-avatar--unknown': !activeContact }"
          >
            <img
              v-if="activeContact?.avatar_url"
              class="messages-avatar__image"
              :src="activeContact.avatar_url"
              alt=""
            />
            <span v-else-if="activeContact" class="messages-avatar__initials">{{
              contactInitials(messages.activeNumber ?? '')
            }}</span>
            <span
              v-else
              class="messages-avatar__placeholder"
              aria-hidden="true"
            >
              <i />
              <b />
            </span>
          </span>
          <h2>{{ activeTitle }}</h2>
          <small>
            {{ messages.activeNumber }}
            <template v-if="activeContact?.readonly">
              · {{ phone.t('Apps.phone.officialContact') }}
            </template>
          </small>
        </div>
        <div class="messages-contact-details__actions">
          <SkyGlass
            v-if="activeContact?.canCall !== false"
            component="button"
            type="button"
            @click="callActiveContact"
          >
            <PhoneIcon :size="20" />
            <span>{{ phone.t('Apps.messages.call') }}</span>
          </SkyGlass>
          <SkyGlass
            v-if="activeCanMessage"
            component="button"
            type="button"
            @click="contactDetailsOpen = false"
          >
            <MessageCircle :size="20" />
            <span>{{ phone.t('Apps.messages.messageAction') }}</span>
          </SkyGlass>
        </div>
        <SkyList inset strong class="messages-contact-details__fields">
          <SkyField
            v-model="contactNameDraft"
            :label="phone.t('Apps.messages.contactName')"
            :readonly="!contactEditing || activeContact?.readonly"
            :placeholder="phone.t('Apps.messages.contactName')"
          />
          <SkyField
            v-model="contactNumberDraft"
            :label="phone.t('Apps.messages.phoneNumber')"
            :readonly="!contactEditing || activeContact?.readonly"
            input-mode="tel"
            type="tel"
          />
        </SkyList>
        <SkyButton
          v-if="!activeContact"
          block
          rounded
          tonal
          class="messages-contact-details__primary"
          @click="contactEditing = true"
        >
          <UserPlus :size="18" />
          {{ phone.t('Apps.messages.addContact') }}
        </SkyButton>
        <SkyButton
          v-else-if="!activeContact.readonly"
          block
          rounded
          tonal
          variant="danger"
          class="messages-contact-details__delete"
          @click="deleteActiveContact"
        >
          <Trash2 :size="18" />
          {{ phone.t('Apps.messages.deleteContact') }}
        </SkyButton>
      </SkyScrollArea>
    </SkyAppPage>

    <SkyScrollArea padded class="messages-sky-thread-scroll">
      <SkyMessages class="messages-bubbles">
        <template
          v-for="(message, index) in messages.messages"
          :key="message.client_id ?? message.id"
        >
          <SkyMessagesTitle v-if="startsDay(message, index)">
            <span class="messages-thread-timestamp">
              <span>{{ phone.t('Apps.messages.smsLabel') }}</span>
              <b
                >{{ dayLabel(message.created_at) }},
                {{ timeLabel(message.created_at) }}</b
              >
            </span>
          </SkyMessagesTitle>
          <SkyMessage
            :class="{
              'messages-message--sending':
                message.delivery_status === 'sending',
              'messages-message--failed': message.delivery_status === 'failed',
            }"
            :type="message.direction"
            :text="message.message_type === 'text' ? message.body : undefined"
            :text-footer="messageFooter(message, index)"
          >
            <template v-if="message.message_type !== 'text'" #text>
              <VoiceMessageBubble
                v-if="message.message_type === 'voice'"
                :message="message"
              />
              <MessageContactBubble
                v-else-if="
                  message.message_type === 'contact' && message.contact
                "
                :add-label="phone.t('Apps.messages.addContact')"
                :contact="message.contact"
                :message-label="phone.t('Apps.messages.messageAction')"
                :saved="knownContactNumbers.has(message.contact.phone_number)"
                :saved-label="phone.t('Apps.messages.contactSaved')"
                @message="messageSharedContact(message.contact)"
                @save="saveSharedContact(message.contact)"
              />
              <SharedContentCard
                v-else-if="message.message_type === 'share' && message.share"
                :payload="message.share"
                variant="messages"
              />
              <MessageAttachmentBubble v-else :message="message" />
            </template>
          </SkyMessage>
        </template>
      </SkyMessages>
      <span
        ref="threadBottom"
        class="messages-thread-bottom"
        aria-hidden="true"
      />
    </SkyScrollArea>

    <section
      v-if="activeCanMessage && attachmentMenuOpen"
      class="messages-attachment-menu"
    >
      <SkyGlass
        component="button"
        type="button"
        @click="openMediaApp('photos', 'photo')"
      >
        <span><Images :size="20" /></span>
        {{ phone.t('Apps.messages.attachPhoto') }}
      </SkyGlass>
      <SkyGlass
        component="button"
        type="button"
        @click="openMediaApp('camera', 'photo')"
      >
        <span><Camera :size="20" /></span>
        {{ phone.t('Apps.messages.takePhoto') }}
      </SkyGlass>
      <SkyGlass component="button" type="button" @click="openEmojiPicker">
        <span class="messages-action-emoji">😀</span>
        {{ phone.t('Apps.messages.emoji') }}
      </SkyGlass>
      <SkyGlass component="button" type="button" @click="openContactPicker">
        <span><ContactRound :size="20" /></span>
        {{ phone.t('Apps.messages.shareContact') }}
      </SkyGlass>
      <SkyGlass component="button" type="button" @click="openGifPicker">
        <span><ImagePlay :size="20" /></span>
        {{ phone.t('Apps.messages.attachGif') }}
      </SkyGlass>
      <SkyGlass
        component="button"
        type="button"
        @click="openMediaApp('photos', 'video')"
      >
        <span><Video :size="20" /></span>
        {{ phone.t('Apps.messages.attachVideo') }}
      </SkyGlass>
    </section>

    <section
      v-if="activeCanMessage && attachmentPicker"
      class="messages-media-picker"
    >
      <header>
        <strong>
          {{
            phone.t(
              attachmentPicker === 'contacts'
                ? 'Apps.messages.contacts'
                : 'Apps.messages.gifs',
            )
          }}
        </strong>
        <SkyLink @click="attachmentPicker = null">
          {{ phone.t('Common.done') }}
        </SkyLink>
      </header>
      <SkyList
        v-if="attachmentPicker === 'contacts'"
        inset
        strong
        class="messages-media-picker__contacts"
      >
        <SkyListItem
          v-for="contact in calls.contacts"
          :key="contact.id"
          link
          link-component="button"
          :title="contact.name"
          :subtitle="contact.organization || contact.phone_number"
          @click="sendContact(contact)"
        >
          <template #media>
            <span class="messages-avatar messages-avatar--small">
              <img
                v-if="contact.avatar_url"
                class="messages-avatar__image"
                :src="contact.avatar_url"
                alt=""
              />
              <span v-else class="messages-avatar__initials">{{
                contactInitials(contact.phone_number)
              }}</span>
            </span>
          </template>
        </SkyListItem>
        <p v-if="!calls.contacts.length" class="messages-media-picker__empty">
          {{ phone.t('Apps.messages.noContactsToShare') }}
        </p>
      </SkyList>
      <div v-else class="messages-media-picker__gifs">
        <SkySearchbar
          v-model="gifQuery"
          class="messages-gif-search"
          :label="phone.t('Apps.messages.searchGifs')"
          :placeholder="phone.t('Apps.messages.searchGifs')"
          :clear-label="phone.t('Common.clear')"
          @input="queueGifSearch"
          @clear="queueGifSearch"
        />
        <button
          v-for="gif in gifResults"
          :key="gif.id"
          type="button"
          :aria-label="gif.title"
          @click="sendAttachment('gif', gif.url)"
        >
          <img :src="gif.previewUrl" :alt="gif.title" loading="lazy" />
        </button>
        <button
          v-if="gifResults.length && gifHasMore && !gifLoading"
          type="button"
          class="messages-gif-more"
          @click="loadGifs()"
        >
          {{ phone.t('Apps.messages.loadMore') }}
        </button>
        <div v-if="gifError && !gifLoading" class="messages-gif-error">
          <ImagePlay :size="24" />
          <strong>{{ errorText(gifError) }}</strong>
          <button type="button" @click="loadGifs(true)">
            {{ phone.t('Apps.messages.retryGifs') }}
          </button>
        </div>
        <SkySpinner
          v-if="gifLoading"
          class="messages-gif-loading"
          :label="phone.t('Common.loading')"
        />
      </div>
    </section>

    <FullEmojiPicker
      v-if="activeCanMessage && emojiOpen"
      @close="emojiOpen = false"
      @pick="appendEmoji"
    />

    <div
      v-if="activeCanMessage && shareDraft && !recording"
      class="shared-composer-preview"
    >
      <SharedContentCard compact :payload="shareDraft" variant="messages" />
      <SkyLink
        icon-only
        :aria-label="phone.t('Common.close')"
        @click="shareDraft = null"
      >
        <X :size="15" />
      </SkyLink>
    </div>

    <section v-if="activeCanMessage && recording" class="messages-recorder">
      <SkyLink
        icon-only
        class="messages-recorder__cancel"
        :aria-label="phone.t('Apps.messages.cancelRecording')"
        @click="cancelVoiceRecording"
      >
        <X :size="20" />
      </SkyLink>
      <span class="messages-recorder__dot" />
      <time>{{ formatRecordingTime(recordingElapsedMs) }}</time>
      <div class="messages-recorder__wave" aria-hidden="true">
        <i
          v-for="(level, index) in recordingLevels"
          :key="index"
          :style="{ height: `${Math.max(3, level * 24)}px` }"
        />
      </div>
      <SkyLink
        icon-only
        class="messages-recorder__send"
        :aria-label="phone.t('Apps.messages.stopAndSend')"
        @click="stopVoiceRecording"
      >
        <ArrowUpCircle :size="29" fill="currentColor" />
      </SkyLink>
    </section>

    <div v-else-if="activeCanMessage" class="messages-sky-composer-shell">
      <SkyGlass
        component="div"
        :highlight="false"
        class="messages-sky-composer-pill"
      >
        <SkyGlass
          component="button"
          class="messages-sky-messagebar__action messages-sky-messagebar__plus"
          :class="{ active: attachmentMenuOpen || attachmentPanelOpen }"
          :aria-label="phone.t('Apps.messages.moreActions')"
          @click="toggleAttachmentMenu"
        >
          <Plus :size="24" />
        </SkyGlass>
        <SkyMessagebar
          v-model="draft"
          class="messages-sky-messagebar"
          embedded
          :outline="false"
          :placeholder="phone.t('Apps.messages.message')"
          :disabled="sending"
          @keydown.enter.exact="handleEnterAction($event, sendTextMessage)"
        >
          <template #right>
            <SkyLink
              v-if="draft.trim() || shareDraft"
              icon-only
              class="messages-sky-messagebar__send"
              :disabled="sending"
              :aria-label="phone.t('Apps.messages.send')"
              @click="sendTextMessage"
            >
              <ArrowUpCircle :size="29" :stroke-width="2.4" />
            </SkyLink>
            <SkyLink
              v-else
              icon-only
              class="messages-sky-messagebar__send"
              :disabled="sending"
              :aria-label="phone.t('Apps.messages.recordVoice')"
              @click="startVoiceRecording"
            >
              <Mic :size="21" :stroke-width="2.3" />
            </SkyLink>
          </template>
        </SkyMessagebar>
      </SkyGlass>
    </div>
    <div v-else class="messages-sky-unavailable">
      {{ phone.t('Apps.messages.messagingUnavailable') }}
    </div>
  </SkyAppPage>

  <SkyToast
    :opened="toastOpened"
    position="center"
    @click="toastOpened = false"
  >
    {{ toastText }}
  </SkyToast>
</template>

<style scoped>
.messages-sky-page {
  --sky-page-gutter: 14px;
}

.messages-sky-state-scroll,
.messages-sky-loading {
  display: grid;
  place-items: center;
}

.messages-sky-state-scroll :deep(.sky-empty-state) {
  margin: auto;
}

.messages-sky-edit,
.messages-sky-delete {
  color: var(--sky-app-accent);
  font-size: 15px;
  font-weight: 650;
}

.messages-sky-delete {
  color: var(--sky-danger);
}

.messages-sky-search {
  width: 100%;
}

.messages-sky-inbox-scroll {
  padding-top: 4px;
}

.messages-sky-filters {
  width: 100%;
  margin-bottom: 12px;
}

.messages-sky-filters :deep(.sky-segmented-button) {
  min-height: 40px;
  font-size: 13px;
  font-weight: 650;
}

.messages-sky-conversation-list {
  margin: 0 calc(var(--sky-page-gutter) * -1);
}

.messages-sky-conversation :deep(.sky-list-item__row) {
  min-height: 72px;
}

.messages-sky-conversation :deep(.sky-list-item__content) {
  padding-top: 9px;
  padding-bottom: 9px;
}

.messages-sky-conversation :deep(.sky-list-item__media) {
  position: relative;
}

.messages-sky-conversation :deep(.sky-list-item__title) {
  overflow: hidden;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.messages-sky-conversation--unread :deep(.sky-list-item__title) {
  font-weight: 760;
}

.messages-sky-conversation :deep(.sky-list-item__subtitle) {
  overflow: hidden;
  display: -webkit-box;
  color: var(--sky-muted);
  font-size: 12px;
  line-height: 16px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.messages-sky-conversation-time {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--sky-muted);
  font-size: 11px;
  white-space: nowrap;
}

.messages-sky-selection,
.messages-sky-unread-dot {
  position: absolute;
  z-index: 2;
  border-radius: 50%;
}

.messages-sky-selection {
  right: -3px;
  bottom: -2px;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border: 2px solid var(--sky-bg);
  background: var(--sky-surface-muted);
  color: #fff;
}

.messages-sky-selection.is-selected {
  background: var(--sky-app-accent);
}

.messages-sky-unread-dot {
  top: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border: 2px solid var(--sky-bg);
  background: var(--sky-app-accent);
}

.messages-sky-empty {
  min-height: 65%;
}

.messages-sky-edit-navigation :deep(.sky-button) {
  min-width: 132px;
}

.messages-sky-compose-scroll {
  padding-top: 2px;
}

.messages-recipient-field,
.messages-contact-list {
  margin: 0 calc(var(--sky-page-gutter) * -1) 12px;
  border-top: 1px solid var(--sky-hairline);
  border-bottom: 1px solid var(--sky-hairline);
  background: transparent;
}

.messages-recipient-field :deep(.sky-field) {
  min-height: 52px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  background: transparent;
}

.messages-recipient-field :deep(.sky-field__inner) {
  min-width: 0;
  display: flex;
  flex: 1;
  align-items: center;
  gap: 10px;
  padding: 0;
}

.messages-contact-list :deep(.sky-list-item__row) {
  background: transparent;
}

.messages-recipient-field :deep(.sky-field__label) {
  margin: 0;
  flex: none;
  color: var(--sky-muted);
  font-size: 14px;
  line-height: 20px;
}

.messages-recipient-field :deep(.sky-field__control),
.messages-recipient-field :deep(.sky-field__input) {
  min-height: 52px;
}

.messages-recipient-field :deep(.sky-field__control) {
  flex: 1;
  margin: 0;
}

.messages-recipient-field :deep(.sky-field__input) {
  font-size: 15px;
}

.messages-number-action {
  margin: 0;
}

.messages-sky-loading {
  min-height: 120px;
  color: var(--sky-app-accent);
}

.messages-sky-thread-navbar :deep(.sky-navbar__heading) {
  overflow: visible;
}

.messages-sky-thread-contact {
  width: 100%;
  min-width: 0;
  height: var(--sky-navbar-height);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  background: transparent;
  color: var(--sky-text);
  font: inherit;
  font-size: 15px;
  font-weight: 700;
}

.messages-sky-thread-contact > span:not(.messages-avatar) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.messages-avatar--thread {
  width: 32px;
  height: 32px;
  border: 1px solid var(--sky-hairline);
  box-shadow: none;
  font-size: 12px;
}

.messages-sky-thread-scroll {
  padding: 4px 14px 10px;
  transition: padding-bottom 240ms ease;
}

.messages-bubbles {
  min-height: 100%;
  justify-content: flex-end;
  padding: 0;
}

.messages-bubbles :deep(.sky-message) {
  max-width: 86%;
  margin-bottom: 7px;
}

.messages-bubbles :deep(.sky-message__bubble) {
  padding: 8px 12px;
  border-radius: 19px;
  font-size: 15px;
  line-height: 19px;
}

.messages-bubbles :deep(.sky-message--received .sky-message__bubble) {
  background: var(--sky-message-received-background);
  color: var(--sky-text);
}

.messages-bubbles :deep(.sky-message--sent .sky-message__bubble) {
  background: var(--sky-app-accent);
  color: #fff;
}

.messages-bubbles :deep(.sky-message__text-footer) {
  margin-top: 2px;
  font-size: 10px;
  line-height: 13px;
}

.messages-bubbles :deep(.messages-message--failed .sky-message__bubble) {
  box-shadow: 0 0 0 1px var(--sky-danger);
}

.messages-sky-composer-shell {
  z-index: 42;
  flex: none;
  padding: 6px var(--sky-page-gutter) calc(var(--sky-safe-area-bottom) + 6px);
  background: var(--sky-bg);
}

.messages-sky-composer-pill {
  min-width: 0;
  min-height: 56px;
  padding: 5px 7px;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  border-radius: var(--sky-radius-pill);
}

.messages-sky-messagebar {
  min-width: 0;
  padding: 0;
  flex: 1;
  gap: 4px;
  background: transparent;
}

.messages-sky-composer-pill > .messages-sky-messagebar {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  background: transparent;
  box-shadow: none;
}

.messages-sky-messagebar :deep(textarea) {
  min-height: 44px;
  padding: 11px 8px 9px 10px;
  border: 0;
  background: transparent;
  color: var(--sky-text);
  font-size: 15px;
  line-height: 20px;
}

.messages-sky-messagebar__action,
.messages-sky-messagebar__send {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
}

.messages-sky-messagebar__action {
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  border-color: transparent;
  background: var(--sky-surface-variant);
  color: var(--sky-text);
  box-shadow: none;
}

.messages-sky-messagebar__plus {
  transition: transform 180ms ease;
}

.messages-sky-messagebar__plus.active {
  color: var(--sky-app-accent);
  transform: rotate(45deg);
}

.messages-sky-messagebar__send {
  color: var(--sky-app-accent);
}

.messages-sky-unavailable {
  padding: 12px 18px calc(var(--sky-safe-area-bottom) + 12px);
  color: var(--sky-muted);
  font-size: 13px;
  text-align: center;
}

.messages-sky-thread--panel .messages-sky-thread-scroll {
  padding-bottom: 326px;
}

.messages-sky-thread--share .messages-sky-thread-scroll {
  padding-bottom: 150px;
}

.messages-contact-overlay {
  position: absolute;
  z-index: 58;
  inset: 0;
}

.messages-contact-overlay__scroll {
  padding-top: 4px;
}

.messages-contact-details__hero {
  padding-top: 10px;
}

.messages-contact-details__actions :deep(.sky-glass) {
  min-height: 62px;
  flex-direction: column;
  border-radius: var(--sky-radius-card);
}

.messages-contact-details__fields {
  margin: 0 0 12px;
}

.messages-contact-details__primary,
.messages-contact-details__delete {
  width: 100%;
  margin: 10px 0 0;
}

.messages-gif-search {
  grid-column: 1 / -1;
  width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .messages-sky-thread-scroll,
  .messages-sky-messagebar__plus {
    transition: none;
  }
}
</style>
