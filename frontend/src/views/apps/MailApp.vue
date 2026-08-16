<script setup lang="ts">
import {
  SkyDialog,
  SkyDialogButton,
  SkyFab,
  SkyLink,
  SkyNavbar,
  SkyNavbarBackLink,
  SkyAppPage,
  SkySpinner,
  SkyToast,
  SkyToolbar,
  SkyToolbarPane,
} from '@/ui'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  FileText,
  Forward,
  Inbox,
  Mail,
  MailCheck,
  MailOpen,
  Reply,
  ReplyAll,
  RotateCcw,
  Search,
  Send,
  Share2,
  ShieldCheck,
  SquarePen,
  Trash2,
  X,
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import mailIcon from '@/assets/img/app-icons/mail.webp'
import MailMarkdownEditor, {
  type MailEditorLabels,
} from '@/components/MailMarkdownEditor.vue'
import { useMailStore } from '@/stores/mail'
import { useEasyShareStore } from '@/stores/easyshare'
import { usePhoneStore } from '@/stores/phone'
import type {
  MailComposeDraft,
  MailCounts,
  MailFolder,
  MailListItem,
  MailMessage,
} from '@/types/mail'
import {
  buildForwardDraft,
  buildReplyDraft,
  filterMailAddressInput,
  filterMailRecipientInput,
  MAIL_ADDRESS_INPUT_MAX_LENGTH,
  MAIL_RECIPIENT_INPUT_MAX_LENGTH,
  mailPlainText,
  parseMailRecipients,
} from '@/utils/mail'
import { parseDatabaseDate, type DatabaseDateValue } from '@/utils/date'
import {
  clampMailSwipeOffset,
  resolveMailSwipeAction,
  resolveMailSwipeAxis,
  type MailSwipeAction,
  type MailSwipeAxis,
} from '@/utils/mailSwipe'
import { isTrustedRootMessageSource } from '@/utils/windowMessages'

type AuthMode = 'login' | 'register'
type MailScreen = 'folders' | 'list' | 'message' | 'compose'
type MailEvent = {
  data?: {
    counts?: MailCounts
  }
  type?: 'mail:changed'
}
type MailSwipeState = {
  axis: MailSwipeAxis | null
  committing: MailSwipeAction | null
  itemKey: string
  offset: number
  pointerId: number
  startX: number
  startY: number
}

const MAIL_SWIPE_COMMIT_ANIMATION_MS = 180
const MAIL_DELETE_BATCH_SIZE = 50

const phone = usePhoneStore()
const mail = useMailStore()
const easyShare = useEasyShareStore()
const authMode = ref<AuthMode>('login')
const authEmail = ref('')
const authPassword = ref('')
const authConfirm = ref('')
const submitting = ref(false)
const screen = ref<MailScreen>('folders')
const selectedMessage = ref<MailMessage | null>(null)
const composeReturn = ref<Exclude<MailScreen, 'compose'>>('folders')
const draftId = ref<string>()
const recipientText = ref('')
const subject = ref('')
const body = ref('')
const composeTouched = ref(false)
const toastOpened = ref(false)
const toastText = ref('')
const emptyTrashOpened = ref(false)
const swipeState = ref<MailSwipeState | null>(null)
const ignoredRowClick = ref<string | null>(null)
const selecting = ref(false)
const selectedItemKeys = ref<string[]>([])
const deletingSelected = ref(false)
let draftTimer: ReturnType<typeof setTimeout> | undefined
let ignoredRowClickTimer: ReturnType<typeof setTimeout> | undefined
let searchTimer: ReturnType<typeof setTimeout> | undefined
let toastTimer: ReturnType<typeof setTimeout> | undefined

const authenticated = computed(() => Boolean(mail.accountEmail))
const folderTitle = computed(() => phone.t(`Apps.mail.${mail.folder}`))
const selectedItems = computed(() =>
  mail.items.filter((item) =>
    selectedItemKeys.value.includes(mailItemKey(item)),
  ),
)
const canSend = computed(
  () =>
    Boolean(parseMailRecipients(recipientText.value)) &&
    Boolean(subject.value.trim() || mailPlainText(body.value)) &&
    body.value.length <= 20000 &&
    !submitting.value,
)
const editorLabels = computed<MailEditorLabels>(() => ({
  bold: phone.t('Apps.mail.formatBold'),
  bulletList: phone.t('Apps.mail.formatBulletList'),
  italic: phone.t('Apps.mail.formatItalic'),
  numberedList: phone.t('Apps.mail.formatNumberedList'),
  quote: phone.t('Apps.mail.formatQuote'),
  redo: phone.t('Apps.mail.redo'),
  undo: phone.t('Apps.mail.undo'),
}))

function showToast(message: string): void {
  if (toastTimer) clearTimeout(toastTimer)
  toastText.value = message
  toastOpened.value = true
  toastTimer = setTimeout(() => {
    toastOpened.value = false
  }, 3000)
}

function errorText(error?: string): string {
  const known = [
    'invalid_email',
    'invalid_password',
    'invalid_credentials',
    'email_taken',
    'rate_limited',
    'invalid_message',
    'recipient_not_found',
    'invalid_draft',
    'not_authenticated',
    'request_failed',
    'invalid_request',
  ]
  return phone.t(
    `Apps.mail.errors.${error && known.includes(error) ? error : 'default'}`,
  )
}

function eventValue(event: Event): string {
  return (event.target as HTMLInputElement).value
}

function filteredEventValue(
  event: Event,
  filter: (value: string) => string,
): string {
  const input = event.target as HTMLInputElement
  const original = input.value
  const selectionStart = input.selectionStart ?? original.length
  const filtered = filter(original)

  if (filtered !== original) {
    const nextSelection = filter(original.slice(0, selectionStart)).length
    input.value = filtered
    input.setSelectionRange(nextSelection, nextSelection)
  }

  return filtered
}

function updateAuthEmail(event: Event): void {
  authEmail.value = filteredEventValue(event, filterMailAddressInput)
}

function updateRecipientText(event: Event): void {
  recipientText.value = filteredEventValue(event, filterMailRecipientInput)
}

function formatDate(value: DatabaseDateValue): string {
  const date = parseDatabaseDate(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat(phone.lang, {
    day: 'numeric',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: 'short',
  }).format(date)
}

function formatListDate(value: DatabaseDateValue): string {
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
  return new Intl.DateTimeFormat(phone.lang, {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

function itemTitle(item: MailListItem): string {
  if (mail.folder === 'drafts') {
    return item.recipients.join(', ') || phone.t('Apps.mail.compose')
  }
  if (item.folder === 'sent') return item.recipients.join(', ')
  return item.sender ?? ''
}

function itemPreview(item: MailListItem): string {
  return mailPlainText(item.preview) || phone.t('Apps.mail.noMessageContent')
}

function mailItemKey(item: MailListItem): string {
  return `${mail.folder}:${item.id}`
}

function canSwipeRead(item: MailListItem): boolean {
  return mail.folder === 'inbox' && !item.is_read
}

function mailRowStyle(
  item: MailListItem,
  index: number,
): Record<string, string> {
  const state = swipeState.value
  const offset = state?.itemKey === mailItemKey(item) ? state.offset : 0
  return {
    '--mail-row-index': String(Math.min(index, 8)),
    '--mail-row-offset': `${offset}px`,
    '--mail-swipe-progress': String(Math.min(Math.abs(offset) / 64, 1)),
  }
}

function mailRowClasses(item: MailListItem): Record<string, boolean> {
  const state = swipeState.value
  const active = state?.itemKey === mailItemKey(item)
  return {
    'is-committing-delete': active && state.committing === 'delete',
    'is-committing-read': active && state.committing === 'read',
    'is-dragging': active && state.axis === 'horizontal' && !state.committing,
    'is-selected': isMailSelected(item),
  }
}

function isMailSelected(item: MailListItem): boolean {
  return selectedItemKeys.value.includes(mailItemKey(item))
}

function clearMailSelection(): void {
  selecting.value = false
  selectedItemKeys.value = []
  swipeState.value = null
}

function toggleMailSelection(): void {
  if (deletingSelected.value) return
  if (selecting.value) {
    clearMailSelection()
    return
  }
  selecting.value = true
  selectedItemKeys.value = []
  swipeState.value = null
}

function toggleMailItemSelection(item: MailListItem): void {
  const itemKey = mailItemKey(item)
  if (selectedItemKeys.value.includes(itemKey)) {
    selectedItemKeys.value = selectedItemKeys.value.filter(
      (key) => key !== itemKey,
    )
    return
  }
  if (selectedItemKeys.value.length >= MAIL_DELETE_BATCH_SIZE) {
    showToast(
      phone.t('Apps.mail.selectionLimit', {
        count: String(MAIL_DELETE_BATCH_SIZE),
      }),
    )
    return
  }
  selectedItemKeys.value = [...selectedItemKeys.value, itemKey]
}

function beginMailSwipe(item: MailListItem, event: PointerEvent): void {
  if (
    selecting.value ||
    !event.isPrimary ||
    event.button !== 0 ||
    swipeState.value?.committing
  ) {
    return
  }

  swipeState.value = {
    axis: null,
    committing: null,
    itemKey: mailItemKey(item),
    offset: 0,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
  }
}

function moveMailSwipe(item: MailListItem, event: PointerEvent): void {
  if (selecting.value) return
  const state = swipeState.value
  if (
    !state ||
    state.committing ||
    state.pointerId !== event.pointerId ||
    state.itemKey !== mailItemKey(item)
  ) {
    return
  }

  const deltaX = event.clientX - state.startX
  const deltaY = event.clientY - state.startY
  if (!state.axis) {
    state.axis = resolveMailSwipeAxis(deltaX, deltaY)
    if (state.axis === 'horizontal') {
      const target = event.currentTarget as HTMLElement
      target.setPointerCapture(event.pointerId)
    }
  }
  if (state.axis !== 'horizontal') return

  if (event.cancelable) event.preventDefault()
  state.offset = clampMailSwipeOffset(deltaX, canSwipeRead(item), true)
}

function suppressNextRowClick(itemKey: string): void {
  if (ignoredRowClickTimer) clearTimeout(ignoredRowClickTimer)
  ignoredRowClick.value = itemKey
  ignoredRowClickTimer = setTimeout(() => {
    if (ignoredRowClick.value === itemKey) ignoredRowClick.value = null
  }, 300)
}

async function executeSwipeAction(
  item: MailListItem,
  action: MailSwipeAction,
): Promise<boolean> {
  if (action === 'read') {
    return mail.mutateEntry('mail:set-read', Number(item.id), { read: true })
  }

  if (mail.folder === 'drafts') {
    const deleted = await mail.deleteDraft(String(item.id))
    if (deleted) await mail.loadFolder('drafts', mail.search)
    return deleted
  }

  return mail.mutateEntry(
    mail.folder === 'trash' ? 'mail:delete-forever' : 'mail:trash',
    Number(item.id),
  )
}

async function commitMailSwipe(
  item: MailListItem,
  action: MailSwipeAction,
): Promise<void> {
  const state = swipeState.value
  if (!state || state.itemKey !== mailItemKey(item)) return

  state.committing = action
  await new Promise<void>((resolve) => {
    setTimeout(resolve, MAIL_SWIPE_COMMIT_ANIMATION_MS)
  })
  const success = await executeSwipeAction(item, action)
  if (!success) showToast(errorText())
  if (swipeState.value?.itemKey === state.itemKey) swipeState.value = null
}

function endMailSwipe(item: MailListItem, event: PointerEvent): void {
  if (selecting.value) return
  const state = swipeState.value
  if (
    !state ||
    state.committing ||
    state.pointerId !== event.pointerId ||
    state.itemKey !== mailItemKey(item)
  ) {
    return
  }

  const target = event.currentTarget as HTMLElement
  if (target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }

  if (state.axis === 'horizontal') {
    suppressNextRowClick(state.itemKey)
  }

  const action = resolveMailSwipeAction(state.offset, canSwipeRead(item), true)
  if (action) {
    void commitMailSwipe(item, action)
    return
  }

  swipeState.value = null
}

function cancelMailSwipe(item: MailListItem, event: PointerEvent): void {
  const state = swipeState.value
  if (
    state?.pointerId === event.pointerId &&
    state.itemKey === mailItemKey(item) &&
    !state.committing
  ) {
    swipeState.value = null
  }
}

function handleMailRowClick(item: MailListItem): void {
  if (selecting.value) {
    toggleMailItemSelection(item)
    return
  }
  const itemKey = mailItemKey(item)
  if (ignoredRowClick.value === itemKey) {
    ignoredRowClick.value = null
    return
  }
  void openItem(item)
}

function senderInitials(value: string): string {
  const localPart = value.split('@')[0] ?? value
  const parts = localPart.split(/[._-]+/).filter(Boolean)
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return initials || 'M'
}

function senderStyle(value: string): Record<string, string> {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return { '--mail-avatar-hue': String(Math.abs(hash) % 360) }
}

function folderCount(folder: MailFolder): number {
  return mail.counts[folder]
}

async function submitAuth(): Promise<void> {
  if (
    authMode.value === 'register' &&
    authPassword.value !== authConfirm.value
  ) {
    showToast(phone.t('Apps.mail.passwordsMismatch'))
    return
  }

  submitting.value = true
  const response =
    authMode.value === 'login'
      ? await mail.login(authEmail.value, authPassword.value)
      : await mail.register(authEmail.value, authPassword.value)
  submitting.value = false
  if (!response.success) {
    showToast(errorText(response.error))
    return
  }

  authPassword.value = ''
  authConfirm.value = ''
  screen.value = 'folders'
}

async function signOut(): Promise<void> {
  await mail.logout()
  selectedMessage.value = null
  screen.value = 'folders'
}

async function openFolder(folder: MailFolder): Promise<void> {
  clearMailSelection()
  if (!(await mail.loadFolder(folder))) {
    showToast(errorText())
    return
  }
  screen.value = 'list'
}

async function openItem(item: MailListItem): Promise<void> {
  if (mail.folder === 'drafts') {
    const draft = await mail.openDraft(String(item.id))
    if (!draft) {
      showToast(errorText('invalid_draft'))
      return
    }
    beginCompose({
      body: draft.body,
      id: draft.id,
      recipients: draft.recipients,
      subject: draft.subject,
    })
    return
  }

  const message = await mail.openMessage(Number(item.id))
  if (!message) {
    showToast(errorText())
    return
  }
  selectedMessage.value = message
  screen.value = 'message'
}

function draftRecipientValues(): string[] {
  return recipientText.value
    .split(/[;,]/)
    .map((recipient) => recipient.trim())
    .filter(Boolean)
    .slice(0, 10)
}

async function saveDraftNow(): Promise<void> {
  if (!authenticated.value || screen.value !== 'compose') return
  if (
    !recipientText.value.trim() &&
    !subject.value.trim() &&
    !mailPlainText(body.value)
  ) {
    return
  }

  const id = await mail.saveDraft({
    body: body.value,
    id: draftId.value,
    recipients: draftRecipientValues(),
    subject: subject.value,
  })
  if (id) draftId.value = id
}

function scheduleDraftSave(): void {
  if (!composeTouched.value || screen.value !== 'compose') return
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(() => void saveDraftNow(), 750)
}

function beginCompose(draft?: MailComposeDraft): void {
  composeReturn.value = screen.value === 'compose' ? 'folders' : screen.value
  draftId.value = draft?.id
  recipientText.value = draft?.recipients.join(', ') ?? ''
  subject.value = draft?.subject ?? ''
  body.value = draft?.body ?? ''
  composeTouched.value = false
  screen.value = 'compose'
}

async function closeCompose(): Promise<void> {
  await saveDraftNow()
  screen.value = composeReturn.value
}

async function deleteCurrentDraft(): Promise<void> {
  if (draftId.value) await mail.deleteDraft(draftId.value)
  screen.value = composeReturn.value
}

async function sendMessage(): Promise<void> {
  const recipients = parseMailRecipients(recipientText.value)
  if (!recipients || !canSend.value) {
    showToast(errorText('invalid_message'))
    return
  }

  submitting.value = true
  const response = await mail.send({
    body: body.value,
    id: draftId.value,
    recipients,
    subject: subject.value,
  })
  submitting.value = false
  if (!response.success) {
    showToast(errorText(response.error))
    return
  }

  showToast(phone.t('Apps.mail.sentSuccess'))
  selectedMessage.value = null
  screen.value = 'folders'
}

function composeReply(replyAll = false): void {
  if (!selectedMessage.value) return
  beginCompose(
    buildReplyDraft(selectedMessage.value, mail.accountEmail, replyAll),
  )
}

function composeForward(): void {
  if (selectedMessage.value)
    beginCompose(buildForwardDraft(selectedMessage.value))
}

function shareMessage(): void {
  if (!selectedMessage.value) return
  easyShare.open({
    appId: 'mail',
    copyText: `${selectedMessage.value.subject}\n${mailPlainText(selectedMessage.value.body)}`,
    id: selectedMessage.value.id,
    kind: 'document',
    link: `skyphone://mail/message/${selectedMessage.value.id}`,
    subtitle: selectedMessage.value.sender,
    title: selectedMessage.value.subject || phone.t('Apps.mail.untitled'),
  })
}

async function mutateSelected(
  endpoint: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  if (!selectedMessage.value) return
  if (!(await mail.mutateEntry(endpoint, selectedMessage.value.id, extra))) {
    showToast(errorText())
    return
  }
  selectedMessage.value = null
  screen.value = 'list'
}

function updateSearch(event: Event): void {
  const value = eventValue(event)
  if (selecting.value) clearMailSelection()
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void mail.loadFolder(mail.folder, value)
  }, 300)
}

async function confirmEmptyTrash(): Promise<void> {
  emptyTrashOpened.value = false
  if (!(await mail.emptyTrash())) showToast(errorText())
}

function clearMailSearch(): void {
  if (selecting.value) clearMailSelection()
  void mail.loadFolder(mail.folder, '')
}

async function deleteSelectedMessages(): Promise<void> {
  if (deletingSelected.value || !selectedItems.value.length) return

  deletingSelected.value = true
  const deleted = await mail.deleteMany(
    selectedItems.value.map((item) => item.id),
  )
  deletingSelected.value = false
  if (!deleted) {
    showToast(errorText())
    return
  }
  clearMailSelection()
}

function goBack(): void {
  if (deletingSelected.value) return
  if (screen.value === 'list') {
    clearMailSelection()
    screen.value = 'folders'
  } else if (screen.value === 'message') screen.value = 'list'
}

function onMailEvent(event: MessageEvent<MailEvent>): void {
  if (!isTrustedRootMessageSource(event.source, window)) return
  if (event.data.type === 'mail:changed' && event.data.data?.counts) {
    mail.setCounts(event.data.data.counts)
    if (screen.value === 'list' && !deletingSelected.value) {
      void mail.loadFolder(mail.folder, mail.search)
    }
  }
}

watch([recipientText, subject, body], () => {
  composeTouched.value = true
  scheduleDraftSave()
})

watch(
  () => mail.items.map((item) => mailItemKey(item)),
  (visibleItemKeys) => {
    if (!selecting.value) return
    const visible = new Set(visibleItemKeys)
    selectedItemKeys.value = selectedItemKeys.value.filter((key) =>
      visible.has(key),
    )
  },
)

onMounted(() => window.addEventListener('message', onMailEvent))

onBeforeUnmount(() => {
  window.removeEventListener('message', onMailEvent)
  if (draftTimer) clearTimeout(draftTimer)
  if (ignoredRowClickTimer) clearTimeout(ignoredRowClickTimer)
  if (searchTimer) clearTimeout(searchTimer)
  if (screen.value === 'compose') void saveDraftNow()
})
</script>

<template>
  <sky-app-page
    v-if="!authenticated"
    class="mail-page mail-page--auth"
    :aria-label="phone.t('Apps.mail.loginTitle')"
  >
    <div class="mail-auth">
      <header class="mail-auth__hero">
        <img :src="mailIcon" alt="" class="mail-auth__icon" />
        <span>{{ phone.t('Apps.mail.accountEyebrow') }}</span>
        <h1>{{ phone.t('Apps.mail.loginTitle') }}</h1>
        <p>
          {{
            phone.t(
              authMode === 'login'
                ? 'Apps.mail.loginBody'
                : 'Apps.mail.registerBody',
            )
          }}
        </p>
      </header>

      <div class="mail-auth__segment" role="tablist">
        <button
          type="button"
          role="tab"
          :aria-selected="authMode === 'login'"
          :class="{ 'is-active': authMode === 'login' }"
          @click="authMode = 'login'"
        >
          {{ phone.t('Apps.mail.login') }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="authMode === 'register'"
          :class="{ 'is-active': authMode === 'register' }"
          @click="authMode = 'register'"
        >
          {{ phone.t('Apps.mail.registerLink') }}
        </button>
      </div>

      <form class="mail-auth__form" @submit.prevent="submitAuth">
        <label class="mail-auth__field">
          <span>{{
            phone.t(
              authMode === 'login' ? 'Apps.mail.email' : 'Apps.mail.localPart',
            )
          }}</span>
          <div>
            <Mail :size="18" />
            <input
              :value="authEmail"
              autocomplete="username"
              autocapitalize="none"
              autocorrect="off"
              inputmode="email"
              :maxlength="MAIL_ADDRESS_INPUT_MAX_LENGTH"
              pattern="[A-Za-z0-9@._-]*"
              spellcheck="false"
              :placeholder="phone.t('Apps.mail.emailPlaceholder')"
              @input="updateAuthEmail"
            />
            <small v-if="authMode === 'register'">@ifruit.com</small>
          </div>
        </label>
        <label class="mail-auth__field">
          <span>{{ phone.t('Apps.mail.password') }}</span>
          <div>
            <ShieldCheck :size="18" />
            <input
              type="password"
              :value="authPassword"
              :autocomplete="
                authMode === 'login' ? 'current-password' : 'new-password'
              "
              :placeholder="phone.t('Apps.mail.passwordPlaceholder')"
              @input="authPassword = eventValue($event)"
            />
          </div>
        </label>
        <label v-if="authMode === 'register'" class="mail-auth__field">
          <span>{{ phone.t('Apps.mail.confirmPassword') }}</span>
          <div>
            <ShieldCheck :size="18" />
            <input
              type="password"
              :value="authConfirm"
              autocomplete="new-password"
              :placeholder="phone.t('Apps.mail.passwordPlaceholder')"
              @input="authConfirm = eventValue($event)"
            />
          </div>
        </label>

        <button class="mail-auth__submit" type="submit" :disabled="submitting">
          <sky-spinner v-if="submitting" />
          <template v-else>
            {{
              phone.t(
                authMode === 'login' ? 'Apps.mail.login' : 'Apps.mail.register',
              )
            }}
          </template>
        </button>
        <p v-if="authMode === 'register'" class="mail-auth__warning">
          <ShieldCheck :size="14" />
          {{ phone.t('Apps.mail.passwordWarning') }}
        </p>
      </form>
    </div>
  </sky-app-page>

  <sky-app-page
    v-else-if="screen === 'folders'"
    class="mail-page"
    :aria-label="phone.t('Apps.mail.mailboxes')"
  >
    <div class="mail-screen">
      <header class="mail-header mail-header--large">
        <span aria-hidden="true" />
        <button class="mail-header__text" type="button" @click="signOut">
          {{ phone.t('Apps.mail.logout') }}
        </button>
        <div class="mail-header__title">
          <small>{{ mail.accountEmail }}</small>
          <h1>{{ phone.t('Apps.mail.mailboxes') }}</h1>
        </div>
      </header>

      <main class="mail-folders">
        <div class="mail-folders__card">
          <button
            class="mail-folder-row"
            type="button"
            @click="openFolder('inbox')"
          >
            <span class="mail-folder-row__icon"><Inbox :size="22" /></span>
            <strong>{{ phone.t('Apps.mail.inbox') }}</strong>
            <span>{{ mail.counts.unread || '' }}</span>
            <ChevronRight :size="19" />
          </button>
          <button
            class="mail-folder-row"
            type="button"
            @click="openFolder('sent')"
          >
            <span class="mail-folder-row__icon"><Send :size="21" /></span>
            <strong>{{ phone.t('Apps.mail.sent') }}</strong>
            <span>{{ folderCount('sent') }}</span>
            <ChevronRight :size="19" />
          </button>
          <button
            class="mail-folder-row"
            type="button"
            @click="openFolder('drafts')"
          >
            <span class="mail-folder-row__icon"><FileText :size="21" /></span>
            <strong>{{ phone.t('Apps.mail.drafts') }}</strong>
            <span>{{ folderCount('drafts') }}</span>
            <ChevronRight :size="19" />
          </button>
          <button
            class="mail-folder-row"
            type="button"
            @click="openFolder('trash')"
          >
            <span class="mail-folder-row__icon"><Trash2 :size="21" /></span>
            <strong>{{ phone.t('Apps.mail.trash') }}</strong>
            <span>{{ folderCount('trash') }}</span>
            <ChevronRight :size="19" />
          </button>
        </div>
      </main>

      <sky-fab
        component="button"
        class="mail-compose-fab"
        type="button"
        :aria-label="phone.t('Apps.mail.compose')"
        @click="beginCompose()"
      >
        <template #icon><SquarePen :size="22" /></template>
      </sky-fab>
    </div>
  </sky-app-page>

  <sky-app-page
    v-else-if="screen === 'list'"
    class="mail-page"
    :aria-label="folderTitle"
  >
    <div class="mail-screen">
      <header class="mail-header mail-header--list">
        <sky-link
          component="button"
          icon-only
          class="mail-header__back"
          :aria-label="phone.t('Apps.mail.mailboxes')"
          @click="goBack"
        >
          <ArrowLeft :size="21" />
        </sky-link>
        <div v-if="mail.items.length" class="mail-header__actions">
          <sky-link
            v-if="mail.folder === 'trash' && !selecting"
            component="button"
            @click="emptyTrashOpened = true"
          >
            {{ phone.t('Apps.mail.emptyTrash') }}
          </sky-link>
          <sky-link
            component="button"
            :disabled="deletingSelected"
            @click="toggleMailSelection"
          >
            {{ phone.t(selecting ? 'Common.done' : 'Apps.mail.select') }}
          </sky-link>
        </div>
        <span v-else />
        <div class="mail-header__title">
          <small>{{
            selecting
              ? phone.t('Apps.mail.selectedCount', {
                  count: String(selectedItems.length),
                })
              : `${mail.items.length} ${phone.t('Apps.mail.messages')}`
          }}</small>
          <h1>{{ folderTitle }}</h1>
        </div>
        <label class="mail-search">
          <Search :size="17" />
          <input
            :value="mail.search"
            :placeholder="phone.t('Apps.mail.search')"
            @input="updateSearch"
          />
          <button
            v-if="mail.search"
            type="button"
            :aria-label="phone.t('Common.close')"
            @click="clearMailSearch"
          >
            <X :size="14" />
          </button>
        </label>
      </header>

      <main class="mail-list">
        <div v-if="mail.loading" class="mail-loading"><sky-spinner /></div>
        <template v-else-if="mail.items.length">
          <div
            v-for="(item, index) in mail.items"
            :key="`${mail.folder}-${item.id}`"
            class="mail-row-shell"
            :class="mailRowClasses(item)"
            :style="mailRowStyle(item, index)"
            @pointercancel="cancelMailSwipe(item, $event)"
            @pointerdown="beginMailSwipe(item, $event)"
            @pointermove="moveMailSwipe(item, $event)"
            @pointerup="endMailSwipe(item, $event)"
          >
            <span class="mail-row-action mail-row-action--read">
              <MailCheck :size="22" />
              <small>{{ phone.t('Apps.mail.markRead') }}</small>
            </span>
            <span class="mail-row-action mail-row-action--delete">
              <Trash2 :size="21" />
              <small>{{ phone.t('Apps.mail.delete') }}</small>
            </span>
            <button
              class="mail-row"
              :class="{
                'mail-row--unread': mail.folder === 'inbox' && !item.is_read,
                'mail-row--selecting': selecting,
              }"
              type="button"
              :aria-pressed="selecting ? isMailSelected(item) : undefined"
              @click="handleMailRowClick(item)"
            >
              <span
                v-if="!selecting && mail.folder === 'inbox' && !item.is_read"
                class="mail-row__unread"
              />
              <span v-if="selecting" class="mail-row__selection">
                <Check v-if="isMailSelected(item)" :size="14" />
              </span>
              <span
                class="mail-avatar"
                :class="{ 'mail-avatar--draft': mail.folder === 'drafts' }"
                :style="senderStyle(itemTitle(item))"
              >
                <FileText v-if="mail.folder === 'drafts'" :size="20" />
                <template v-else>{{
                  senderInitials(itemTitle(item))
                }}</template>
              </span>
              <span class="mail-row__copy">
                <span class="mail-row__topline">
                  <strong>{{ itemTitle(item) }}</strong>
                  <time>{{ formatListDate(item.created_at) }}</time>
                </span>
                <span class="mail-row__subject">
                  {{ item.subject || phone.t('Apps.mail.untitled') }}
                </span>
                <span class="mail-row__preview">{{ itemPreview(item) }}</span>
              </span>
              <ChevronRight :size="17" class="mail-row__chevron" />
            </button>
          </div>
          <button
            v-if="mail.hasMore"
            class="mail-load-more"
            type="button"
            @click="mail.loadFolder(mail.folder, mail.search, true)"
          >
            {{ phone.t('Apps.mail.loadMore') }}
          </button>
        </template>
        <div v-else class="mail-empty">
          <Mail :size="38" />
          <h2>
            {{
              phone.t(mail.search ? 'Apps.mail.noResults' : 'Apps.mail.noMail')
            }}
          </h2>
          <p>
            {{
              phone.t(
                mail.search
                  ? 'Apps.mail.noResultsBody'
                  : 'Apps.mail.noMailBody',
              )
            }}
          </p>
        </div>
      </main>

      <sky-fab
        v-if="!selecting"
        component="button"
        class="mail-compose-fab"
        type="button"
        :aria-label="phone.t('Apps.mail.compose')"
        @click="beginCompose()"
      >
        <template #icon><SquarePen :size="21" /></template>
      </sky-fab>
      <sky-toolbar
        v-else
        class="mail-selection-toolbar"
        inner-class="mail-selection-toolbar__inner"
        :outline="false"
      >
        <sky-toolbar-pane class="mail-selection-toolbar__pane">
          <span>
            {{
              phone.t('Apps.mail.selectedCount', {
                count: String(selectedItems.length),
              })
            }}
          </span>
          <sky-link
            component="button"
            :disabled="deletingSelected || !selectedItems.length"
            @click="deleteSelectedMessages"
          >
            <sky-spinner v-if="deletingSelected" />
            <Trash2 v-else :size="18" />
            {{ phone.t('Apps.mail.deleteSelected') }}
          </sky-link>
        </sky-toolbar-pane>
      </sky-toolbar>
    </div>
  </sky-app-page>

  <sky-app-page
    v-else-if="screen === 'message' && selectedMessage"
    class="mail-page"
    :aria-label="selectedMessage.subject"
  >
    <div class="mail-screen">
      <sky-navbar class="mail-navbar" :title="folderTitle">
        <template #left>
          <sky-navbar-back-link
            component="button"
            :text="folderTitle"
            :aria-label="folderTitle"
            @click="goBack"
          />
        </template>
        <template #right>
          <sky-link
            component="button"
            icon-only
            :aria-label="phone.t('Apps.mail.compose')"
            @click="beginCompose()"
          >
            <SquarePen :size="20" />
          </sky-link>
        </template>
      </sky-navbar>

      <article class="mail-message">
        <div class="mail-message__sender">
          <span
            class="mail-avatar mail-avatar--large"
            :style="senderStyle(selectedMessage.sender)"
          >
            {{ senderInitials(selectedMessage.sender) }}
          </span>
          <div>
            <strong>{{ selectedMessage.sender }}</strong>
            <span
              >{{ phone.t('Apps.mail.to') }}:
              {{ selectedMessage.recipients.join(', ') }}</span
            >
          </div>
          <time>{{ formatDate(selectedMessage.created_at) }}</time>
        </div>
        <h1>{{ selectedMessage.subject || phone.t('Apps.mail.untitled') }}</h1>
        <div class="mail-message__body">
          <MailMarkdownEditor
            :model-value="selectedMessage.body"
            :editable="false"
          />
        </div>
      </article>

      <sky-toolbar
        class="mail-action-bar"
        inner-class="mail-action-bar__inner"
        :outline="false"
      >
        <sky-toolbar-pane class="mail-action-bar__pane">
          <sky-link
            component="button"
            icon-only
            type="button"
            :aria-label="phone.t('Apps.easyShare.share')"
            @click="shareMessage"
          >
            <Share2 :size="20" />
          </sky-link>
          <sky-link
            component="button"
            icon-only
            type="button"
            :aria-label="phone.t('Apps.mail.reply')"
            @click="composeReply(false)"
          >
            <Reply :size="20" />
          </sky-link>
          <sky-link
            component="button"
            icon-only
            type="button"
            :aria-label="phone.t('Apps.mail.replyAll')"
            @click="composeReply(true)"
          >
            <ReplyAll :size="20" />
          </sky-link>
          <sky-link
            component="button"
            icon-only
            type="button"
            :aria-label="phone.t('Apps.mail.forward')"
            @click="composeForward"
          >
            <Forward :size="20" />
          </sky-link>
          <sky-link
            v-if="selectedMessage.trashed_at"
            component="button"
            icon-only
            type="button"
            :aria-label="phone.t('Apps.mail.restore')"
            @click="mutateSelected('mail:restore')"
          >
            <RotateCcw :size="20" />
          </sky-link>
          <sky-link
            v-else
            component="button"
            icon-only
            class="mail-action-bar__danger"
            type="button"
            :aria-label="phone.t('Apps.mail.moveToTrash')"
            @click="mutateSelected('mail:trash')"
          >
            <Trash2 :size="20" />
          </sky-link>
          <sky-link
            v-if="selectedMessage.trashed_at"
            component="button"
            icon-only
            class="mail-action-bar__danger"
            type="button"
            :aria-label="phone.t('Apps.mail.deleteForever')"
            @click="mutateSelected('mail:delete-forever')"
          >
            <Trash2 :size="20" />
          </sky-link>
          <sky-link
            v-else
            component="button"
            icon-only
            type="button"
            :aria-label="phone.t('Apps.mail.markUnread')"
            @click="mutateSelected('mail:set-read', { read: false })"
          >
            <MailOpen :size="20" />
          </sky-link>
        </sky-toolbar-pane>
      </sky-toolbar>
    </div>
  </sky-app-page>

  <sky-app-page v-else-if="screen === 'compose'" class="mail-page">
    <div class="mail-screen mail-compose">
      <sky-navbar
        class="mail-navbar mail-compose__navbar"
        left-class="mail-compose__nav-side mail-compose__nav-side--left"
        right-class="mail-compose__nav-side mail-compose__nav-side--right"
        title-class="mail-compose__nav-title"
        :title="phone.t('Apps.mail.compose')"
      >
        <template #left>
          <sky-link
            component="button"
            class="mail-compose__nav-action"
            type="button"
            @click="closeCompose"
          >
            {{ phone.t('Common.cancel') }}
          </sky-link>
        </template>
        <template #right>
          <sky-link
            component="button"
            class="mail-compose__nav-action"
            type="button"
            :disabled="!canSend"
            :aria-label="phone.t('Common.send')"
            @click="sendMessage"
          >
            {{ phone.t('Common.send') }}
          </sky-link>
        </template>
      </sky-navbar>

      <div class="mail-compose__fields">
        <label>
          <span>{{ phone.t('Apps.mail.recipients') }}</span>
          <input
            :value="recipientText"
            autocapitalize="none"
            autocorrect="off"
            inputmode="email"
            :maxlength="MAIL_RECIPIENT_INPUT_MAX_LENGTH"
            pattern="[A-Za-z0-9@._,; -]*"
            spellcheck="false"
            :placeholder="phone.t('Apps.mail.recipientPlaceholder')"
            @input="updateRecipientText"
          />
        </label>
        <div class="mail-compose__from">
          <span>{{ phone.t('Apps.mail.from') }}</span>
          <strong>{{ mail.accountEmail }}</strong>
        </div>
        <label>
          <span>{{ phone.t('Apps.mail.subject') }}</span>
          <input
            :value="subject"
            maxlength="120"
            :placeholder="phone.t('Apps.mail.subjectPlaceholder')"
            @input="subject = eventValue($event)"
          />
        </label>
      </div>

      <div class="mail-compose__editor">
        <MailMarkdownEditor
          v-model="body"
          :labels="editorLabels"
          :placeholder="phone.t('Apps.mail.messagePlaceholder')"
        />
      </div>
      <div class="mail-compose__meta">
        <button v-if="draftId" type="button" @click="deleteCurrentDraft">
          <Trash2 :size="15" /> {{ phone.t('Apps.mail.deleteDraft') }}
        </button>
        <span :class="{ 'is-over-limit': body.length > 20000 }">
          {{ body.length.toLocaleString(phone.lang) }} / 20,000
        </span>
      </div>
    </div>
  </sky-app-page>

  <sky-dialog
    :opened="emptyTrashOpened"
    @backdropclick="emptyTrashOpened = false"
  >
    <template #title>{{ phone.t('Apps.mail.emptyTrashTitle') }}</template>
    <p>{{ phone.t('Apps.mail.emptyTrashBody') }}</p>
    <template #buttons>
      <sky-dialog-button @click="emptyTrashOpened = false">
        {{ phone.t('Common.cancel') }}
      </sky-dialog-button>
      <sky-dialog-button strong @click="confirmEmptyTrash">
        {{ phone.t('Apps.mail.emptyTrash') }}
      </sky-dialog-button>
    </template>
  </sky-dialog>

  <sky-toast
    :opened="toastOpened"
    position="center"
    @click="toastOpened = false"
  >
    {{ toastText }}
  </sky-toast>
</template>

<style scoped>
.mail-page {
  --mail-blue: #0a84ff;
  --mail-border: var(--sky-hairline);
  --mail-muted: var(--sky-muted);
  --mail-surface: var(--sky-surface);
  min-height: 0 !important;
  padding: 0 !important;
  overflow: hidden;
  background: var(--sky-bg) !important;
  color: var(--sky-text);
}

.mail-screen {
  position: relative;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--sky-bg);
  animation: mail-screen-enter 240ms cubic-bezier(0.22, 0.8, 0.3, 1) both;
}

button,
input {
  font: inherit;
}

button {
  color: inherit;
}

.mail-header {
  position: relative;
  z-index: 5;
  display: grid;
  grid-template-columns: 54px 1fr 54px;
  align-items: center;
  padding: 51px 15px 10px;
  background: color-mix(in srgb, var(--sky-bg) 88%, transparent);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
}

.mail-header > :first-child {
  justify-self: start;
}

.mail-header > :nth-child(2) {
  justify-self: center;
}

.mail-header > :nth-child(3) {
  justify-self: end;
}

.mail-header--large,
.mail-header--list {
  grid-template-rows: 40px auto;
  padding-bottom: 12px;
}

.mail-header--large {
  grid-template-columns: 54px 1fr 86px;
}

.mail-header--large > :nth-child(2) {
  grid-column: 3;
  justify-self: end;
  white-space: nowrap;
}

.mail-header--large .mail-header__title,
.mail-header--list .mail-header__title {
  grid-column: 1 / -1;
  justify-self: stretch;
  padding-top: 8px;
}

.mail-header__title h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 760;
  line-height: 1.08;
  letter-spacing: -1.2px;
}

.mail-header__title small {
  display: block;
  margin-bottom: 3px;
  overflow: hidden;
  color: var(--mail-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-header__text {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  padding: 5px 0;
  background: none;
  color: var(--mail-blue);
  font-size: 13px;
  cursor: pointer;
}

.mail-header__back {
  width: 38px;
  height: 38px;
  color: var(--mail-blue);
}

.mail-folders {
  padding: 8px 15px 90px;
}

.mail-folders__card {
  overflow: hidden;
  border: 1px solid #ffffff08;
  border-radius: 22px;
  background: var(--mail-surface);
}

.mail-folder-row {
  position: relative;
  width: 100%;
  min-height: 61px;
  display: grid;
  grid-template-columns: 36px 1fr auto 18px;
  align-items: center;
  gap: 9px;
  border: 0;
  padding: 0 13px 0 14px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color 160ms ease;
}

.mail-folder-row:not(:last-child)::after {
  position: absolute;
  right: 13px;
  bottom: 0;
  left: 59px;
  height: 1px;
  background: var(--mail-border);
  content: '';
}

.mail-folder-row strong {
  font-size: 16px;
  font-weight: 560;
}

.mail-folder-row > span:nth-of-type(2),
.mail-folder-row > svg {
  color: var(--mail-muted);
  font-size: 13px;
}

.mail-folder-row__icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: var(--mail-blue);
}

.mail-header--list {
  grid-template-columns: 1fr 1fr;
}

.mail-header--list > .mail-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-self: end;
  white-space: nowrap;
}

.mail-header__actions :deep(.sky-link) {
  border: 0;
  padding: 4px 0;
  background: transparent;
  color: var(--mail-blue);
  font-size: 12px;
}

.mail-header__actions :deep(.sky-link:disabled) {
  opacity: 0.4;
}

.mail-search {
  grid-column: 1 / -1;
  display: flex;
  height: 34px;
  align-items: center;
  gap: 7px;
  margin-top: 11px;
  padding: 0 10px;
  border-radius: 10px;
  background: var(--mail-surface);
  color: var(--mail-muted);
}

.mail-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--sky-text);
  font-size: 14px;
}

.mail-search button {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  padding: 0;
  background: #636366;
  color: #1c1c1e;
}

.mail-list {
  height: calc(100% - 188px);
  overflow-y: auto;
  padding: 0 0 82px;
}

.mail-row-shell {
  --mail-row-index: 0;
  --mail-row-offset: 0px;
  --mail-swipe-progress: 0;
  position: relative;
  min-height: 82px;
  overflow: hidden;
  touch-action: pan-y;
  animation: mail-row-enter 280ms cubic-bezier(0.22, 0.8, 0.3, 1) both;
  animation-delay: calc(var(--mail-row-index) * 24ms);
}

.mail-row-action {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 108px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fff;
  opacity: var(--mail-swipe-progress);
  pointer-events: none;
  transition:
    opacity 120ms ease,
    transform 180ms ease;
}

.mail-row-action small {
  font-size: 11px;
  font-weight: 700;
}

.mail-row-action--read {
  left: 0;
  justify-content: flex-start;
  padding-left: 18px;
  background: linear-gradient(90deg, #0a84ff, #0874df);
  transform: translateX(-10px);
}

.mail-row-action--delete {
  right: 0;
  justify-content: flex-end;
  padding-right: 18px;
  background: linear-gradient(90deg, #d73229, #ff453a);
  transform: translateX(10px);
}

.mail-row-shell.is-dragging .mail-row-action,
.mail-row-shell.is-committing-delete .mail-row-action--delete,
.mail-row-shell.is-committing-read .mail-row-action--read {
  transform: translateX(0);
}

.mail-row {
  position: relative;
  width: 100%;
  min-height: 82px;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 15px;
  align-items: center;
  gap: 10px;
  border: 0;
  padding: 8px 13px 8px 19px;
  background: var(--sky-bg);
  text-align: left;
  cursor: pointer;
  transform: translate3d(var(--mail-row-offset), 0, 0);
  transition:
    transform 260ms cubic-bezier(0.22, 0.8, 0.3, 1),
    background-color 160ms ease;
  will-change: transform;
}

.mail-row--selecting {
  grid-template-columns: 26px 48px minmax(0, 1fr) 15px;
  gap: 9px;
  padding-left: 11px;
}

.mail-row-shell.is-selected .mail-row {
  background: #0a84ff1c;
}

.mail-row__selection {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 1.5px solid #636366;
  border-radius: 50%;
  color: #fff;
}

.mail-row-shell.is-selected .mail-row__selection {
  border-color: var(--mail-blue);
  background: var(--mail-blue);
}

.mail-row-shell.is-dragging .mail-row {
  transition: none;
}

.mail-row-shell.is-committing-delete .mail-row {
  transform: translate3d(-110%, 0, 0);
}

.mail-row-shell.is-committing-read .mail-row {
  transform: translate3d(110%, 0, 0);
}

.mail-row::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 76px;
  height: 1px;
  background: var(--mail-border);
  content: '';
}

.mail-row__unread {
  position: absolute;
  left: 7px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--mail-blue);
}

.mail-avatar {
  --mail-avatar-hue: 210;
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 12px;
  background: linear-gradient(
    145deg,
    hsl(var(--mail-avatar-hue) 76% 62%),
    hsl(var(--mail-avatar-hue) 72% 42%)
  );
  color: #fff;
  font-size: 16px;
  font-weight: 720;
  box-shadow: inset 0 1px #ffffff40;
}

.mail-avatar--draft {
  background: linear-gradient(145deg, #ff9f0a, #c56c00);
}

.mail-avatar--large {
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.mail-row__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.mail-row__topline {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.mail-row__topline strong,
.mail-row__subject,
.mail-row__preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-row__topline strong {
  flex: 1;
  font-size: 15px;
  font-weight: 510;
}

.mail-row--unread .mail-row__topline strong,
.mail-row--unread .mail-row__subject {
  font-weight: 720;
}

.mail-row__topline time {
  color: var(--mail-muted);
  font-size: 11px;
  white-space: nowrap;
}

.mail-row__subject {
  color: var(--sky-text);
  font-size: 13px;
}

.mail-row__preview {
  color: var(--mail-muted);
  font-size: 12px;
}

.mail-row__chevron {
  color: #48484a;
}

.mail-compose-fab {
  position: absolute;
  z-index: 8;
  right: 17px;
  bottom: 32px;
}

.mail-selection-toolbar {
  position: absolute;
  z-index: 8;
  right: 0;
  bottom: 0;
  left: 0;
}

.mail-selection-toolbar :deep(.mail-selection-toolbar__inner) {
  width: 100%;
  max-width: 330px;
}

.mail-selection-toolbar :deep(.mail-selection-toolbar__pane) {
  width: 100%;
  gap: 14px;
  padding: 0 7px 0 15px;
}

.mail-selection-toolbar :deep(.mail-selection-toolbar__pane > span) {
  overflow: hidden;
  color: var(--sky-text);
  font-size: 12px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-selection-toolbar :deep(.sky-link) {
  gap: 6px;
  color: #ff453a;
  font-size: 12px;
  font-weight: 650;
}

.mail-selection-toolbar :deep(.sky-link:disabled) {
  opacity: 0.4;
}

.mail-loading,
.mail-empty {
  display: flex;
  min-height: 270px;
  align-items: center;
  justify-content: center;
}

.mail-empty {
  flex-direction: column;
  padding: 30px;
  color: var(--mail-muted);
  text-align: center;
}

.mail-empty h2 {
  margin: 13px 0 4px;
  color: var(--sky-text);
  font-size: 20px;
}

.mail-empty p {
  max-width: 240px;
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
}

.mail-load-more {
  width: 100%;
  border: 0;
  padding: 18px;
  background: none;
  color: var(--mail-blue);
}

.mail-navbar {
  --sky-safe-area-top: 46px;
  color: var(--sky-text);
}

.mail-navbar :deep(.sky-link) {
  color: var(--mail-blue);
}

.mail-navbar :deep(.sky-link:disabled) {
  opacity: 0.4;
}

.mail-compose__navbar :deep(.mail-compose__nav-side--left) {
  margin-right: 12px;
}

.mail-compose__navbar :deep(.mail-compose__nav-side--right) {
  margin-left: 12px;
}

.mail-compose__navbar :deep(.mail-compose__nav-title) {
  max-width: 112px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mail-compose__navbar :deep(.mail-compose__nav-action) {
  min-width: 54px;
  justify-content: center;
  padding-right: 10px;
  padding-left: 10px;
}

.mail-message {
  height: calc(100% - 90px);
  overflow-y: auto;
  padding: 18px 18px 104px;
  user-select: text;
}

.mail-message__sender {
  display: grid;
  grid-template-columns: 50px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
}

.mail-message__sender > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mail-message__sender strong,
.mail-message__sender span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-message__sender strong {
  font-size: 14px;
}
.mail-message__sender span,
.mail-message__sender time {
  color: var(--mail-muted);
  font-size: 10px;
}

.mail-message > h1 {
  margin: 22px 0 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--mail-border);
  font-size: 25px;
  line-height: 1.18;
  letter-spacing: -0.5px;
}

.mail-message__body {
  font-size: 15px;
  line-height: 1.5;
}

.mail-action-bar {
  position: absolute;
  z-index: 7;
  right: 0;
  bottom: 0;
  left: 0;
  animation: mail-action-bar-enter 320ms cubic-bezier(0.22, 0.8, 0.3, 1) both;
}

.mail-action-bar :deep(.mail-action-bar__inner) {
  width: 100%;
  max-width: 340px;
}

.mail-action-bar :deep(.mail-action-bar__pane) {
  width: 100%;
}

.mail-action-bar :deep(.sky-link) {
  position: relative;
  color: var(--sky-text);
}

.mail-action-bar :deep(.sky-link::after) {
  position: absolute;
  bottom: calc(100% + 9px);
  left: 50%;
  padding: 5px 8px;
  border: 1px solid #ffffff1c;
  border-radius: 7px;
  background: #2c2c2ef5;
  box-shadow: 0 6px 18px #0009;
  color: #fff;
  content: attr(aria-label);
  font-size: 9px;
  font-weight: 600;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 5px) scale(0.96);
  transition:
    opacity 140ms ease,
    transform 140ms ease;
  white-space: nowrap;
}

.mail-action-bar :deep(.sky-link:focus-visible),
.mail-compose-fab:focus-visible {
  outline: 2px solid var(--mail-blue);
  outline-offset: 2px;
}

.mail-action-bar :deep(.sky-link:focus-visible::after) {
  opacity: 1;
  transform: translate(-50%, 0) scale(1);
}

@media (hover: hover) {
  .mail-folder-row:hover,
  .mail-row-shell:not(.is-dragging) .mail-row:hover {
    background: #ffffff0b;
  }

  .mail-action-bar :deep(.sky-link:hover) {
    color: #64b5ff;
  }

  .mail-action-bar :deep(.mail-action-bar__danger:hover) {
    color: #ff6961;
  }

  .mail-action-bar :deep(.sky-link:hover::after) {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }
}

.mail-compose__fields {
  border-top: 1px solid var(--mail-border);
}

.mail-compose__fields label,
.mail-compose__from {
  min-height: 45px;
  display: grid;
  grid-template-columns: 66px minmax(0, 1fr);
  align-items: center;
  margin-left: 17px;
  border-bottom: 1px solid var(--mail-border);
}

.mail-compose__fields span {
  color: var(--mail-muted);
  font-size: 13px;
}

.mail-compose__fields input,
.mail-compose__from strong {
  min-width: 0;
  border: 0;
  outline: 0;
  padding: 0 16px 0 0;
  background: transparent;
  color: var(--sky-text);
  font-size: 14px;
  font-weight: 400;
}

.mail-compose__from strong {
  overflow: hidden;
  color: var(--mail-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-compose__editor {
  height: calc(100% - 278px);
  min-height: 250px;
  overflow-y: auto;
}

.mail-compose__meta {
  position: absolute;
  right: 17px;
  bottom: 28px;
  left: 17px;
  z-index: 4;
  display: flex;
  justify-content: space-between;
  color: var(--mail-muted);
  font-size: 10px;
  pointer-events: none;
}

.mail-compose__meta button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  padding: 0;
  background: none;
  color: #ff453a;
  pointer-events: auto;
}

.mail-compose__meta .is-over-limit {
  color: #ff453a;
}

.mail-auth {
  position: relative;
  height: 100%;
  overflow-y: auto;
  padding: 70px 22px 40px;
  background:
    radial-gradient(circle at 50% 11%, #0a84ff2e, transparent 31%),
    var(--sky-bg);
}

.mail-auth__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.mail-auth__icon {
  width: 72px;
  height: 72px;
  margin-bottom: 13px;
  border-radius: 17px;
  box-shadow: 0 12px 35px #0a84ff4a;
}

.mail-auth__hero span {
  color: var(--mail-blue);
  font-size: 10px;
  font-weight: 760;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.mail-auth__hero h1 {
  margin: 5px 0 7px;
  font-size: 30px;
  line-height: 1;
  letter-spacing: -1px;
}

.mail-auth__hero p {
  max-width: 280px;
  min-height: 36px;
  margin: 0;
  color: var(--mail-muted);
  font-size: 12px;
  line-height: 1.45;
}

.mail-auth__segment {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  margin: 24px 0 14px;
  padding: 3px;
  border-radius: 11px;
  background: var(--sky-surface-muted);
}

.mail-auth__segment button {
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--mail-muted);
  font-size: 12px;
  font-weight: 600;
}

.mail-auth__segment button.is-active {
  background: var(--sky-surface-tint);
  color: var(--sky-text);
  box-shadow: 0 1px 4px rgb(0 0 0 / 18%);
}

.mail-auth__form {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.mail-auth__field > span {
  display: block;
  margin: 0 0 5px 3px;
  color: var(--mail-muted);
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.45px;
  text-transform: uppercase;
}

.mail-auth__field > div {
  height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 13px;
  border: 1px solid var(--sky-hairline);
  border-radius: 13px;
  background: var(--sky-surface);
  color: var(--sky-muted);
}

.mail-auth__field:focus-within > div {
  border-color: #0a84ff88;
  box-shadow: 0 0 0 3px #0a84ff1f;
}

.mail-auth__field input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--sky-text);
  font-size: 14px;
}

.mail-auth__field small {
  color: var(--mail-muted);
  font-size: 11px;
}

.mail-auth__submit {
  height: 48px;
  display: grid;
  place-items: center;
  margin-top: 5px;
  border: 0;
  border-radius: 14px;
  background: var(--mail-blue);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 9px 24px #0a84ff3f;
}

.mail-auth__submit:disabled {
  opacity: 0.55;
}

.mail-auth__warning {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 2px 3px 0;
  color: var(--mail-muted);
  font-size: 10px;
  line-height: 1.35;
}

.mail-auth__warning svg {
  flex: 0 0 auto;
}

@keyframes mail-screen-enter {
  from {
    opacity: 0;
    transform: translate3d(10px, 0, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes mail-row-enter {
  from {
    opacity: 0;
    transform: translate3d(0, 7px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes mail-action-bar-enter {
  from {
    opacity: 0;
    transform: translate3d(0, 12px, 0) scale(0.97);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mail-screen,
  .mail-row-shell,
  .mail-action-bar {
    animation: none;
  }

  .mail-row,
  .mail-row-action,
  .mail-compose-fab,
  .mail-folder-row {
    transition-duration: 0.01ms;
  }

  .mail-action-bar :deep(.sky-link) {
    transition-duration: 0.01ms;
  }
}
</style>
