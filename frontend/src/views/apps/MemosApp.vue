<script setup lang="ts">
import {
  kActions,
  kActionsButton,
  kActionsGroup,
  kActionsLabel,
  kBlock,
  kBlockTitle,
  kButton,
  kDialog,
  kDialogButton,
  kFab,
  kGlass,
  kLink,
  kList,
  kListButton,
  kListInput,
  kListItem,
  kNavbar,
  kNavbarBackLink,
  kPage,
  kPreloader,
  kRange,
  kSearchbar,
  kSegmented,
  kSegmentedButton,
} from 'konsta/vue'
import {
  Ellipsis,
  Mic,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Square,
  Trash2,
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import { useMemosStore } from '@/stores/memos'
import { useNotificationsStore } from '@/stores/notifications'
import { usePhoneStore } from '@/stores/phone'
import type { MemoDto, MemoRecorderState } from '@/types/memos'
import { isTrustedRootMessageSource } from '@/utils/windowMessages'

type MemoView = 'detail' | 'list' | 'recording'

const phone = usePhoneStore()
const memos = useMemosStore()
const notifications = useNotificationsStore()
const view = ref<MemoView>('list')
const searchQuery = ref('')
const selectedId = ref<string | null>(null)
const draftTitle = ref('')
const draftNote = ref('')
const recorderState = ref<MemoRecorderState>({
  elapsedMs: 0,
  levels: Array(32).fill(0.08),
  state: 'idle',
})
const audio = ref<HTMLAudioElement | null>(null)
const activeAudioId = ref<string | null>(null)
const audioCurrentTime = ref(0)
const audioPlaying = ref(false)
const playbackRate = ref(1)
const deleteDialogOpened = ref(false)
const discardDialogOpened = ref(false)
const menuOpened = ref(false)
let playbackRequest = 0

const selectedMemo = computed(() =>
  selectedId.value
    ? memos.memos.find((memo) => memo.id === selectedId.value)
    : undefined,
)
const activeAudioMemo = computed(() =>
  activeAudioId.value
    ? memos.memos.find((memo) => memo.id === activeAudioId.value)
    : undefined,
)
const visibleMemos = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase(phone.lang)
  return [...memos.memos]
    .filter(
      (memo) =>
        !query ||
        `${memo.title}\n${memo.note}`
          .toLocaleLowerCase(phone.lang)
          .includes(query),
    )
    .sort((left, right) => right.updatedAt - left.updatedAt)
})
const recordingBusy = computed(() =>
  ['starting', 'stopping', 'uploading'].includes(recorderState.value.state),
)
const recordingActive = computed(() =>
  ['recording', 'paused', 'starting', 'stopping', 'uploading'].includes(
    recorderState.value.state,
  ),
)
const recordingControllable = computed(() =>
  ['paused', 'recording'].includes(recorderState.value.state),
)
const recorderWaveform = computed(() => {
  const levels = recorderState.value.levels.length
    ? recorderState.value.levels
    : Array(32).fill(0.08)
  return Array.from({ length: 64 }, (_, index) => levels[index % levels.length])
})
const activeAudioProgress = computed(() => {
  const duration = (activeAudioMemo.value?.durationMs ?? 0) / 1000
  return duration > 0 ? Math.min(1, audioCurrentTime.value / duration) : 0
})
const deleteActionColors = {
  textIos: 'text-red-500',
  textMaterial: 'text-red-500',
}
const recordButtonColors = {
  fillBgIos: 'bg-red-500 active:bg-red-600',
  fillBgMaterial: 'bg-red-500',
  fillTextIos: 'text-white',
  fillTextMaterial: 'text-white',
}
const memoRowLinkProps = { role: 'button', tabindex: 0 }

function defaultRecordingTitle(): string {
  const date = new Intl.DateTimeFormat(phone.lang, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())
  return phone.t('Apps.memos.newMemoWithDate', { date })
}

function formatDuration(milliseconds: number, precise = false): string {
  const safe = Math.max(0, milliseconds)
  const totalSeconds = Math.floor(safe / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (!precise) return `${minutes}:${String(seconds).padStart(2, '0')}`
  const tenths = Math.floor((safe % 1000) / 100)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`
}

function memoDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  return new Intl.DateTimeFormat(phone.lang, {
    ...(sameDay
      ? { hour: '2-digit', minute: '2-digit' }
      : {
          day: '2-digit',
          month: '2-digit',
          ...(date.getFullYear() === now.getFullYear()
            ? {}
            : { year: 'numeric' }),
        }),
  }).format(date)
}

function memoSubtitle(memo: MemoDto): string {
  return `${memoDate(memo.updatedAt)} · ${formatDuration(memo.durationMs)}`
}

function waveformProgress(memo: MemoDto): number {
  return activeAudioId.value === memo.id ? activeAudioProgress.value : 0
}

function showNotification(message: string): void {
  notifications.show({
    appId: 'memos',
    route: '/apps/memos',
    text: message,
    title: phone.t('Apps.memos.name'),
  })
}

function recorderError(error?: string): string {
  if (error === 'microphone_unavailable') {
    return phone.t('Apps.memos.microphoneUnavailable')
  }
  if (error === 'recording_too_large') {
    return phone.t('Apps.memos.recordingTooLarge')
  }
  const known = new Set([
    'conflict',
    'invalid_memo',
    'invalid_request',
    'invalid_upload',
    'invalid_upload_token',
    'memo_limit',
    'memo_not_found',
    'media_provider_failed',
    'media_provider_rate_limited',
    'media_provider_unauthorized',
    'missing_config',
    'operation_in_progress',
    'owner_changed',
    'rate_limited',
    'recording_failed',
    'request_timeout',
    'upload_failed',
    'upload_timeout',
  ])
  return phone.t(
    `Apps.memos.errors.${known.has(error ?? '') ? error : 'request_failed'}`,
  )
}

function postRecorderCommand(
  type: string,
  data: Record<string, unknown> = {},
): void {
  window.postMessage({ data, type }, '*')
}

function startRecording(): void {
  stopPlayback()
  draftTitle.value = defaultRecordingTitle()
  draftNote.value = ''
  recorderState.value = {
    elapsedMs: 0,
    levels: Array(32).fill(0.08),
    state: 'starting',
  }
  view.value = 'recording'
  postRecorderCommand('memo:recordStart', {
    note: '',
    pinned: false,
    title: draftTitle.value,
  })
}

function stopRecording(): void {
  postRecorderCommand('memo:recordStop', {
    note: draftNote.value.trim(),
    pinned: false,
    title: draftTitle.value.trim() || defaultRecordingTitle(),
  })
}

function pauseOrResumeRecording(): void {
  postRecorderCommand(
    recorderState.value.state === 'paused'
      ? 'memo:recordResume'
      : 'memo:recordPause',
  )
}

function requestCancelRecording(): void {
  if (!recordingActive.value) {
    view.value = 'list'
    return
  }
  discardDialogOpened.value = true
}

function discardRecording(): void {
  discardDialogOpened.value = false
  postRecorderCommand('memo:recordCancel')
  view.value = 'list'
}

function updateSearch(event: Event): void {
  searchQuery.value = (event.target as HTMLInputElement).value
}

function updateDraftTitle(event: Event): void {
  draftTitle.value = (event.target as HTMLInputElement).value
}

function updateDraftNote(event: Event): void {
  draftNote.value = (event.target as HTMLInputElement).value
}

async function ensureAudio(memo: MemoDto): Promise<HTMLAudioElement | null> {
  if (activeAudioId.value !== memo.id) {
    audio.value?.pause()
    audioPlaying.value = false
    activeAudioId.value = memo.id
    audioCurrentTime.value = 0
    await nextTick()
    audio.value?.load()
  }
  if (audio.value) audio.value.playbackRate = playbackRate.value
  return audio.value
}

async function togglePlayback(memo: MemoDto): Promise<void> {
  const request = ++playbackRequest
  const player = await ensureAudio(memo)
  if (!player || request !== playbackRequest || activeAudioId.value !== memo.id)
    return
  if (audioPlaying.value && activeAudioId.value === memo.id) {
    player.pause()
    return
  }
  if (player.ended) {
    player.currentTime = 0
    audioCurrentTime.value = 0
  }
  try {
    await player.play()
  } catch (error) {
    if (request !== playbackRequest) return
    console.error(`[Memos] Could not play memo ${memo.id}.`, error)
    showNotification(phone.t('Apps.memos.errors.request_failed'))
  }
}

function stopPlayback(): void {
  playbackRequest += 1
  audio.value?.pause()
  audioPlaying.value = false
  audioCurrentTime.value = 0
  if (audio.value) audio.value.currentTime = 0
}

function updateAudioProgress(): void {
  audioCurrentTime.value = audio.value?.currentTime ?? 0
}

function finishPlayback(): void {
  audioPlaying.value = false
  audioCurrentTime.value = 0
  if (audio.value) audio.value.currentTime = 0
}

function failPlayback(): void {
  audioPlaying.value = false
  showNotification(phone.t('Apps.memos.errors.request_failed'))
}

function skipPlayback(seconds: number): void {
  if (!audio.value || !activeAudioMemo.value) return
  const duration = activeAudioMemo.value.durationMs / 1000
  audio.value.currentTime = Math.min(
    duration,
    Math.max(0, audio.value.currentTime + seconds),
  )
  updateAudioProgress()
}

function seekPlayback(event: Event): void {
  if (!audio.value || !selectedMemo.value) return
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  audio.value.currentTime = value
  audioCurrentTime.value = value
}

function setPlaybackRate(rate: number): void {
  playbackRate.value = rate
  if (audio.value) audio.value.playbackRate = rate
}

function openMemo(memo: MemoDto): void {
  stopPlayback()
  selectedId.value = memo.id
  draftTitle.value = memo.title
  draftNote.value = memo.note
  playbackRate.value = 1
  activeAudioId.value = memo.id
  view.value = 'detail'
}

function openMemoFromKeyboard(event: KeyboardEvent, memo: MemoDto): void {
  if ((event.target as HTMLElement).closest('.memo-row__play')) return
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  openMemo(memo)
}

async function persistSelected(): Promise<boolean> {
  const memo = selectedMemo.value
  if (!memo) return false
  const title = draftTitle.value.trim() || memo.title
  const note = draftNote.value.trim()
  const unchanged = title === memo.title && note === memo.note
  if (unchanged) return true
  const response = await memos.update(memo.id, {
    note,
    pinned: memo.pinned,
    revision: memo.revision,
    title,
  })
  if (!response.success) {
    if (response.error === 'conflict') {
      await memos.load()
      const current = selectedMemo.value
      if (current) {
        draftTitle.value = current.title
        draftNote.value = current.note
      }
    }
    showNotification(recorderError(response.error))
    return false
  }
  draftTitle.value = response.data?.title ?? title
  draftNote.value = response.data?.note ?? note
  return true
}

async function closeDetail(): Promise<void> {
  menuOpened.value = false
  if (!(await persistSelected())) return
  stopPlayback()
  selectedId.value = null
  activeAudioId.value = null
  view.value = 'list'
}

async function openMenu(): Promise<void> {
  if (!(await persistSelected())) return
  menuOpened.value = true
}

function requestDelete(): void {
  menuOpened.value = false
  deleteDialogOpened.value = true
}

async function deleteSelected(): Promise<void> {
  const memo = selectedMemo.value
  if (!memo) return
  const response = await memos.deleteMemo(memo.id)
  deleteDialogOpened.value = false
  if (!response.success) {
    showNotification(recorderError(response.error))
    return
  }
  stopPlayback()
  selectedId.value = null
  activeAudioId.value = null
  view.value = 'list'
  showNotification(phone.t('Apps.memos.deleted'))
}

function onMessage(event: MessageEvent): void {
  if (!isTrustedRootMessageSource(event.source, window)) return
  const message = event.data as { data?: unknown; type?: string }
  if (message.type === 'memo:recordState') {
    const state = message.data as MemoRecorderState
    if (!state || !Array.isArray(state.levels)) return
    recorderState.value = state
    if (state.error) showNotification(recorderError(state.error))
  } else if (message.type === 'memo:saved') {
    const memo = message.data as MemoDto
    selectedId.value = memo.id
    draftTitle.value = memo.title
    draftNote.value = memo.note
    activeAudioId.value = memo.id
    view.value = 'detail'
  }
}

onMounted(() => window.addEventListener('message', onMessage))

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  stopPlayback()
  if (recordingActive.value) postRecorderCommand('memo:recordCancel')
  if (view.value === 'detail') void persistSelected()
})
</script>

<template>
  <k-page
    v-if="view === 'list'"
    class="memos-page !pt-[44px] !pb-[25px]"
    :aria-label="phone.t('Apps.memos.name')"
  >
    <k-navbar large transparent :title="phone.t('Apps.memos.name')">
      <template #subnavbar>
        <k-searchbar
          :value="searchQuery"
          :placeholder="phone.t('Apps.memos.searchPlaceholder')"
          @input="updateSearch"
          @clear="searchQuery = ''"
        />
      </template>
    </k-navbar>

    <div class="memos-page__content">
      <k-block v-if="memos.loading" class="memos-loading">
        <k-preloader />
      </k-block>

      <k-glass v-else-if="visibleMemos.length" class="memos-list-glass">
        <k-list nested class="memos-list">
          <k-list-item
            v-for="memo in visibleMemos"
            :key="memo.id"
            link
            link-component="div"
            :link-props="memoRowLinkProps"
            :title="memo.title"
            :subtitle="memoSubtitle(memo)"
            :chevron="false"
            strong-title="auto"
            class="memo-row"
            @click="openMemo(memo)"
            @keydown="openMemoFromKeyboard($event, memo)"
          >
            <template #media>
              <k-link
                component="button"
                icon-only
                class="memo-row__play"
                :aria-label="
                  phone.t(
                    audioPlaying && activeAudioId === memo.id
                      ? 'Apps.memos.pausePlayback'
                      : 'Apps.memos.play',
                  )
                "
                @click.stop="togglePlayback(memo)"
              >
                <Pause
                  v-if="audioPlaying && activeAudioId === memo.id"
                  :size="17"
                  fill="currentColor"
                />
                <Play v-else :size="17" fill="currentColor" />
              </k-link>
            </template>
            <template #text>
              <div class="memo-row__waveform" aria-hidden="true">
                <i
                  v-for="(sample, index) in memo.waveform.slice(0, 48)"
                  :key="index"
                  :class="{
                    active:
                      index /
                        Math.max(1, memo.waveform.slice(0, 48).length - 1) <=
                      waveformProgress(memo),
                  }"
                  :style="{ height: `${Math.max(3, sample * 20)}px` }"
                />
              </div>
            </template>
          </k-list-item>
        </k-list>
      </k-glass>

      <k-glass v-else class="memos-empty-glass">
        <k-block-title large>{{
          phone.t(
            searchQuery ? 'Apps.memos.noResults' : 'Apps.memos.emptyTitle',
          )
        }}</k-block-title>
        <k-block>{{
          phone.t(
            searchQuery ? 'Apps.memos.noResultsBody' : 'Apps.memos.emptyBody',
          )
        }}</k-block>
        <k-list v-if="!searchQuery" nested>
          <k-list-button link-component="button" @click="startRecording">
            {{ phone.t('Apps.memos.newMemo') }}
          </k-list-button>
        </k-list>
      </k-glass>
    </div>

    <k-fab
      component="button"
      type="button"
      class="memos-record-fab"
      :aria-label="phone.t('Apps.memos.newMemo')"
      @click="startRecording"
    >
      <template #icon><Mic :size="24" /></template>
    </k-fab>
  </k-page>

  <k-page
    v-else-if="view === 'recording'"
    class="memo-recording-page !pt-[44px] !pb-[25px]"
    :aria-label="phone.t('Apps.memos.newMemo')"
  >
    <k-navbar :title="phone.t('Apps.memos.newMemo')">
      <template #left>
        <k-navbar-back-link
          component="button"
          :text="phone.t('Apps.memos.cancel')"
          @click="requestCancelRecording"
        />
      </template>
    </k-navbar>

    <k-glass class="memo-fields-glass memo-recording-title">
      <k-list nested :dividers="false">
        <k-list-input
          :value="draftTitle"
          :label="phone.t('Apps.memos.title')"
          :placeholder="phone.t('Apps.memos.titlePlaceholder')"
          maxlength="120"
          :disabled="recordingBusy"
          @input="updateDraftTitle"
        />
      </k-list>
    </k-glass>

    <section class="memo-recorder-stage">
      <div class="memo-recorder-stage__status">
        <span
          v-if="recorderState.state === 'recording'"
          class="memo-recording-dot"
          aria-hidden="true"
        />
        <span v-if="recorderState.state === 'error'">
          {{ recorderError(recorderState.error) }}
        </span>
        <span v-else>{{
          phone.t(
            recorderState.state === 'paused'
              ? 'Apps.memos.paused'
              : recorderState.state === 'uploading' ||
                  recorderState.state === 'stopping'
                ? 'Apps.memos.saving'
                : recorderState.state === 'starting'
                  ? 'Apps.memos.preparing'
                  : 'Apps.memos.recording',
          )
        }}</span>
      </div>
      <div class="memo-recorder-waveform" aria-hidden="true">
        <i
          v-for="(level, index) in recorderWaveform"
          :key="index"
          :style="{ height: `${Math.max(5, level * 104)}px` }"
        />
      </div>
      <strong class="memo-recorder-time">{{
        formatDuration(recorderState.elapsedMs, true)
      }}</strong>
    </section>

    <k-glass class="memo-recorder-controls">
      <k-preloader v-if="recordingBusy" />
      <k-button
        v-else-if="!recordingControllable"
        inline
        rounded
        large
        class="memo-retry-button"
        @click="startRecording"
      >
        <Mic :size="18" aria-hidden="true" />
        <span>{{ phone.t('Apps.memos.newMemo') }}</span>
      </k-button>
      <template v-else>
        <k-button
          rounded
          large
          class="memo-control-button memo-control-button--secondary"
          :aria-label="
            phone.t(
              recorderState.state === 'paused'
                ? 'Apps.memos.resume'
                : 'Apps.memos.pause',
            )
          "
          @click="pauseOrResumeRecording"
        >
          <Play
            v-if="recorderState.state === 'paused'"
            :size="21"
            fill="currentColor"
          />
          <Pause v-else :size="21" fill="currentColor" />
        </k-button>
        <k-button
          rounded
          large
          class="memo-control-button"
          :colors="recordButtonColors"
          :aria-label="phone.t('Apps.memos.stop')"
          @click="stopRecording"
        >
          <Square :size="21" fill="currentColor" />
        </k-button>
      </template>
    </k-glass>
  </k-page>

  <k-page
    v-else-if="selectedMemo"
    class="memo-detail-page !pt-[44px] !pb-[25px]"
    :aria-label="selectedMemo.title"
  >
    <k-navbar :title="phone.t('Apps.memos.memo')">
      <template #left>
        <k-navbar-back-link
          component="button"
          :text="phone.t('Apps.memos.back')"
          @click="closeDetail"
        />
      </template>
      <template #right>
        <k-link
          component="button"
          icon-only
          :aria-label="phone.t('Apps.memos.actions')"
          @click="openMenu"
        >
          <Ellipsis :size="22" />
        </k-link>
      </template>
    </k-navbar>

    <k-glass class="memo-fields-glass memo-detail-fields">
      <k-list nested :dividers="false">
        <k-list-input
          :value="draftTitle"
          :label="phone.t('Apps.memos.title')"
          :placeholder="phone.t('Apps.memos.titlePlaceholder')"
          maxlength="120"
          @input="updateDraftTitle"
        />
        <k-list-input
          type="textarea"
          :value="draftNote"
          :label="phone.t('Apps.memos.note')"
          :placeholder="phone.t('Apps.memos.notePlaceholder')"
          maxlength="2000"
          @input="updateDraftNote"
        />
      </k-list>
    </k-glass>

    <k-glass component="section" class="memo-player" :highlight="false">
      <div class="memo-player__meta">
        <span>{{ memoDate(selectedMemo.createdAt) }}</span>
        <span>{{ formatDuration(selectedMemo.durationMs) }}</span>
      </div>
      <div class="memo-player__waveform" aria-hidden="true">
        <i
          v-for="(sample, index) in selectedMemo.waveform"
          :key="index"
          :class="{
            active:
              index / Math.max(1, selectedMemo.waveform.length - 1) <=
              activeAudioProgress,
          }"
          :style="{ height: `${Math.max(4, sample * 96)}px` }"
        />
      </div>
      <k-range
        class="memo-player__range"
        :value="audioCurrentTime"
        :min="0"
        :max="selectedMemo.durationMs / 1000"
        :step="0.1"
        :aria-label="phone.t('Apps.memos.play')"
        @input="seekPlayback"
      />
      <div class="memo-player__times">
        <span>{{ formatDuration(audioCurrentTime * 1000) }}</span>
        <span
          >-{{
            formatDuration(
              Math.max(0, selectedMemo.durationMs - audioCurrentTime * 1000),
            )
          }}</span
        >
      </div>
    </k-glass>

    <k-glass class="memo-player-controls">
      <k-button
        rounded
        class="memo-player-control"
        :aria-label="phone.t('Apps.memos.skipBack')"
        @click="skipPlayback(-15)"
      >
        <RotateCcw :size="22" />
        <small>15</small>
      </k-button>
      <k-button
        rounded
        large
        class="memo-player-control memo-player-control--main"
        :aria-label="
          phone.t(audioPlaying ? 'Apps.memos.pausePlayback' : 'Apps.memos.play')
        "
        @click="togglePlayback(selectedMemo)"
      >
        <Pause v-if="audioPlaying" :size="28" fill="currentColor" />
        <Play v-else :size="28" fill="currentColor" />
      </k-button>
      <k-button
        rounded
        class="memo-player-control"
        :aria-label="phone.t('Apps.memos.skipForward')"
        @click="skipPlayback(15)"
      >
        <RotateCw :size="22" />
        <small>15</small>
      </k-button>
    </k-glass>

    <k-block-title>{{ phone.t('Apps.memos.playbackSpeed') }}</k-block-title>
    <k-glass class="memo-speed-block" :highlight="false">
      <k-segmented strong rounded>
        <k-segmented-button
          v-for="rate in [0.75, 1, 1.25, 1.5]"
          :key="rate"
          :active="playbackRate === rate"
          @click="setPlaybackRate(rate)"
        >
          {{ rate }}×
        </k-segmented-button>
      </k-segmented>
    </k-glass>
  </k-page>

  <k-actions
    v-if="menuOpened"
    :opened="menuOpened"
    @backdropclick="menuOpened = false"
  >
    <k-actions-group>
      <k-actions-button
        class="memo-delete-action"
        font-size-ios="text-base"
        :colors="deleteActionColors"
        @click="requestDelete"
      >
        <Trash2 :size="17" aria-hidden="true" />
        <span>{{ phone.t('Apps.memos.delete') }}</span>
      </k-actions-button>
    </k-actions-group>
  </k-actions>

  <audio
    ref="audio"
    :src="activeAudioMemo?.url"
    preload="metadata"
    @play="audioPlaying = true"
    @pause="audioPlaying = false"
    @timeupdate="updateAudioProgress"
    @ended="finishPlayback"
    @error="failPlayback"
  />

  <k-dialog
    :opened="discardDialogOpened"
    @backdropclick="discardDialogOpened = false"
  >
    <template #title>{{ phone.t('Apps.memos.discardTitle') }}</template>
    <p>{{ phone.t('Apps.memos.discardBody') }}</p>
    <template #buttons>
      <k-dialog-button @click="discardDialogOpened = false">
        {{ phone.t('Apps.memos.keepRecording') }}
      </k-dialog-button>
      <k-dialog-button strong class="memo-danger" @click="discardRecording">
        {{ phone.t('Apps.memos.discard') }}
      </k-dialog-button>
    </template>
  </k-dialog>

  <k-actions
    v-if="deleteDialogOpened"
    :opened="deleteDialogOpened"
    @backdropclick="deleteDialogOpened = false"
  >
    <k-actions-group>
      <k-actions-label class="memo-delete-confirmation">
        <span>
          <strong>{{ phone.t('Apps.memos.deleteTitle') }}</strong>
          <small>{{ phone.t('Apps.memos.deleteBody') }}</small>
        </span>
      </k-actions-label>
      <k-actions-button
        class="memo-delete-action"
        font-size-ios="text-base"
        :colors="deleteActionColors"
        @click="deleteSelected"
      >
        <Trash2 :size="17" aria-hidden="true" />
        <span>{{ phone.t('Common.delete') }}</span>
      </k-actions-button>
    </k-actions-group>
    <k-actions-group>
      <k-actions-button
        bold
        class="memo-cancel-action"
        font-size-ios="text-base"
        @click="deleteDialogOpened = false"
      >
        {{ phone.t('Common.cancel') }}
      </k-actions-button>
    </k-actions-group>
  </k-actions>

</template>

<style scoped>
.memos-page,
.memo-recording-page,
.memo-detail-page {
  position: relative;
  background: var(--k-color-surface, #f2f2f7);
}

.memos-page,
.memo-recording-page {
  overflow: hidden;
}

.memos-page {
  display: flex;
  flex-direction: column;
}

.memos-page :deep(.k-navbar) {
  flex: 0 0 auto;
}

.memos-page__content {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  padding-bottom: 92px;
}

.memo-detail-page {
  overflow-y: auto;
}

.memos-loading {
  display: grid;
  min-height: 180px;
  place-items: center;
}

.memos-list-glass,
.memos-empty-glass,
.memo-fields-glass,
.memo-player,
.memo-recorder-controls,
.memo-player-controls,
.memo-speed-block {
  border: 1px solid rgb(60 60 67 / 11%);
  overflow: hidden;
}

.memos-list-glass,
.memos-empty-glass {
  margin: 16px;
  border-radius: 24px;
}

.memos-empty-glass {
  padding: 2px 0 8px;
}

.memos-empty-glass :deep(.k-block-title),
.memos-empty-glass :deep(.k-block) {
  margin-right: 16px;
  margin-left: 16px;
}

.memos-record-fab {
  position: absolute;
  z-index: 20;
  right: 20px;
  bottom: 35px;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 24%),
    0 5px 12px rgb(0 0 0 / 18%) !important;
}

.memo-row :deep(.k-list-item-media) {
  align-self: center;
}

.memo-row__play {
  width: 38px;
  height: 38px;
  display: grid;
  border-radius: 50%;
  color: #ff3b30;
  background: rgb(255 59 48 / 11%);
  place-items: center;
}

.memo-row__waveform {
  width: 100%;
  height: 24px;
  display: flex;
  align-items: center;
  gap: 1.5px;
  margin-top: 5px;
  overflow: hidden;
}

.memo-row__waveform i,
.memo-player__waveform i,
.memo-recorder-waveform i {
  display: block;
  min-width: 2px;
  border-radius: 999px;
  background: #c7c7cc;
  transition:
    height 90ms linear,
    background-color 160ms ease;
}

.memo-row__waveform i {
  flex: 1 1 2px;
}

.memo-row__waveform i.active,
.memo-player__waveform i.active {
  background: #ff3b30;
}

.memo-recording-title,
.memo-detail-fields {
  margin: 8px 18px 0;
  border-radius: 22px;
}

.memo-recorder-stage {
  min-height: 485px;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 18px 110px;
}

.memo-recorder-stage__status {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #8e8e93;
  font-size: 13px;
  font-weight: 650;
}

.memo-recording-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff3b30;
  animation: memo-pulse 1.2s ease-in-out infinite;
}

.memo-recorder-waveform {
  width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  margin: 26px 0 20px;
  overflow: hidden;
}

.memo-recorder-waveform i {
  flex: 1 1 2px;
  max-width: 4px;
  background: linear-gradient(#ff7169, #ff3b30);
}

.memo-recorder-time {
  font-size: 38px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -1.5px;
}

.memo-recorder-controls,
.memo-player-controls {
  position: absolute;
  z-index: 10;
  right: 18px;
  bottom: 34px;
  left: 18px;
  min-height: 82px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 34px;
  border-radius: 30px;
}

.memo-control-button {
  width: 54px;
  height: 54px;
  padding: 0;
  border-radius: 50%;
}

.memo-retry-button {
  width: auto;
  min-width: 164px;
  gap: 8px;
  padding-right: 22px;
  padding-left: 22px;
}

.memo-control-button--secondary {
  color: #1c1c1e;
  background: rgb(118 118 128 / 14%);
}

.memo-detail-fields :deep(textarea) {
  min-height: 62px;
  resize: none;
}

.memo-player {
  margin: 10px 18px 0;
  padding: 17px 16px 11px;
  border-radius: 24px;
}

.memo-player__meta,
.memo-player__times {
  display: flex;
  justify-content: space-between;
  color: #8e8e93;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.memo-player__waveform {
  height: 110px;
  display: flex;
  align-items: center;
  gap: 1.5px;
  margin: 8px 0 3px;
  overflow: hidden;
}

.memo-player__waveform i {
  flex: 1 1 2px;
  min-width: 1.5px;
}

.memo-player__range {
  margin: -2px 0 0;
}

.memo-player-controls {
  position: static;
  min-height: 86px;
  margin: 13px 18px 5px;
}

.memo-speed-block {
  margin: 0 18px 28px;
  padding: 4px;
  border-radius: 999px;
}

.memo-speed-block :deep(.k-segmented) {
  background: transparent;
}

.memo-player-control {
  position: relative;
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 50%;
  color: #1c1c1e;
  background: rgb(118 118 128 / 12%);
}

.memo-player-control small {
  position: absolute;
  font-size: 8px;
  font-weight: 800;
}

.memo-player-control--main {
  width: 62px;
  height: 62px;
  color: white;
  background: #ff3b30;
  box-shadow: 0 8px 22px rgb(255 59 48 / 28%);
}

.memo-danger {
  color: #ff3b30;
}

.memo-delete-action,
.memo-cancel-action {
  height: 48px;
}

.memo-delete-action {
  gap: 8px;
}

.memo-delete-confirmation {
  height: auto;
  min-height: 64px;
  padding-top: 10px;
  padding-bottom: 10px;
  text-align: center;
}

.memo-delete-confirmation span {
  display: grid;
  gap: 3px;
}

.memo-delete-confirmation strong {
  color: #1c1c1e;
  font-size: 13px;
  font-weight: 650;
}

.memo-delete-confirmation small {
  font-size: 11px;
  line-height: 1.35;
}

audio {
  display: none;
}

:global(.phone-app.dark .memos-page),
:global(.phone-app.dark .memo-recording-page),
:global(.phone-app.dark .memo-detail-page) {
  background: #000;
}

:global(.phone-app.dark .memos-list-glass),
:global(.phone-app.dark .memos-empty-glass),
:global(.phone-app.dark .memo-fields-glass),
:global(.phone-app.dark .memo-player),
:global(.phone-app.dark .memo-recorder-controls),
:global(.phone-app.dark .memo-player-controls),
:global(.phone-app.dark .memo-speed-block) {
  border-color: rgb(255 255 255 / 10%);
}

:global(.phone-app.dark .memo-control-button--secondary),
:global(.phone-app.dark .memo-player-control:not(.memo-player-control--main)) {
  color: #fff;
  background: rgb(255 255 255 / 12%);
}

:global(.phone-app.dark .memo-delete-confirmation strong) {
  color: #fff;
}

@keyframes memo-pulse {
  0%,
  100% {
    opacity: 0.45;
    transform: scale(0.82);
  }
  50% {
    opacity: 1;
    transform: scale(1.12);
  }
}

@media (prefers-reduced-motion: reduce) {
  .memo-recording-dot {
    animation: none;
  }

  .memo-row__waveform i,
  .memo-player__waveform i,
  .memo-recorder-waveform i {
    transition: none;
  }
}
</style>
