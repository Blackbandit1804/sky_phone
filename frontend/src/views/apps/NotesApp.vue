<script setup lang="ts">
import {
  kBlock,
  kBlockTitle,
  kLink,
  kList,
  kListButton,
  kListItem,
  kNavbar,
  kNavbarBackLink,
  kPage,
} from 'konsta/vue'
import {
  Ellipsis,
  Pin,
  PinOff,
  Share2,
  SquarePen,
  Trash2,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'

import NotesRichTextEditor from '@/components/NotesRichTextEditor.vue'
import { useNotesStore } from '@/stores/notes'
import { useEasyShareStore } from '@/stores/easyshare'
import { usePhoneStore } from '@/stores/phone'
import { SkyActionSheet, SkyButton, SkyFab, SkySearchbar } from '@/ui'
import type { Note } from '@/utils/notes'
import { noteBodyToPlainText } from '@/utils/noteRichText'

const phone = usePhoneStore()
const notes = useNotesStore()
const easyShare = useEasyShareStore()
const searchQuery = ref('')
const editorId = ref<string | null>(null)
const editorOpened = ref(false)
const draftBody = ref('')
const menuOpened = ref(false)
const currentNote = computed(() =>
  editorId.value
    ? notes.notes.find((note) => note.id === editorId.value)
    : undefined,
)

const visibleNotes = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase(phone.lang)
  return [...notes.notes]
    .filter((note) => {
      if (!query) return true
      return `${note.title}\n${noteBodyToPlainText(note.body)}`
        .toLocaleLowerCase(phone.lang)
        .includes(query)
    })
    .sort(
      (left, right) =>
        Number(right.pinned) - Number(left.pinned) ||
        right.updatedAt - left.updatedAt,
    )
})
const editorLabels = computed(() => ({
  bold: phone.t('Apps.notes.tools.bold'),
  bulletList: phone.t('Apps.notes.tools.bulletList'),
  decreaseText: phone.t('Apps.notes.tools.decreaseText'),
  increaseText: phone.t('Apps.notes.tools.increaseText'),
  italic: phone.t('Apps.notes.tools.italic'),
  numberedList: phone.t('Apps.notes.tools.numberedList'),
  quote: phone.t('Apps.notes.tools.quote'),
  redo: phone.t('Apps.notes.tools.redo'),
  strike: phone.t('Apps.notes.tools.strike'),
  toolbar: phone.t('Apps.notes.tools.toolbar'),
  underline: phone.t('Apps.notes.tools.underline'),
  undo: phone.t('Apps.notes.tools.undo'),
}))

function noteTitle(note: Note): string {
  return note.title.trim() || phone.t('Apps.notes.untitled')
}

function notePreview(note: Note): string {
  return (
    noteBodyToPlainText(note.body).trim().replace(/\s+/g, ' ') ||
    phone.t('Apps.notes.noText')
  )
}

function noteDate(note: Note): string {
  const date = new Date(note.updatedAt)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return new Intl.DateTimeFormat(phone.lang, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date)
}

function noteSubtitle(note: Note): string {
  return `${noteDate(note)} · ${notePreview(note)}`
}

function titleFromDraftBody(body: string): string {
  return noteBodyToPlainText(body).split('\n')[0]?.trim() ?? ''
}

function createNote(): void {
  editorId.value = null
  draftBody.value = ''
  editorOpened.value = true
}

function editNote(note: Note): void {
  editorId.value = note.id
  draftBody.value = note.body
  editorOpened.value = true
}

function persistDraft(): Note | undefined {
  const draft = {
    body: draftBody.value,
    title: titleFromDraftBody(draftBody.value) || currentNote.value?.title.trim() || '',
  }

  if (editorId.value) {
    notes.updateNote(editorId.value, draft)
    return notes.notes.find((note) => note.id === editorId.value)
  }
  if (!draft.title && !noteBodyToPlainText(draft.body).trim()) return undefined

  const note = notes.createNote(draft)
  editorId.value = note.id
  return note
}

function saveAndClose(): void {
  persistDraft()
  menuOpened.value = false
  editorOpened.value = false
}

function openMenu(): void {
  if (!persistDraft()) return
  menuOpened.value = true
}

function deleteNote(): void {
  const note = persistDraft()
  if (!note) return
  notes.deleteNote(note.id)
  menuOpened.value = false
  editorOpened.value = false
}

function togglePinned(): void {
  const note = persistDraft()
  if (!note) return
  notes.togglePinned(note.id)
  menuOpened.value = false
}

function shareNote(): void {
  const note = persistDraft()
  if (!note) return
  menuOpened.value = false
  easyShare.open({
    appId: 'notes',
    copyText: noteBodyToPlainText(note.body) || note.title,
    id: note.id,
    kind: 'note',
    subtitle: notePreview(note),
    title: noteTitle(note),
  })
}
</script>

<template>
  <k-page
    v-if="!editorOpened"
    class="notes-list-page !pt-[44px]"
    :aria-label="phone.t('Apps.notes.name')"
  >
    <k-navbar large transparent :title="phone.t('Apps.notes.name')" />

    <k-list v-if="visibleNotes.length" strong inset>
      <k-list-item
        v-for="note in visibleNotes"
        :key="note.id"
        href="#"
        :title="noteTitle(note)"
        :subtitle="noteSubtitle(note)"
        :chevron="false"
        strong-title="auto"
        @click.prevent="editNote(note)"
      >
        <template v-if="note.pinned" #after>
          <Pin :size="15" aria-hidden="true" />
        </template>
      </k-list-item>
    </k-list>

    <template v-else>
      <k-block-title large>{{
        phone.t(searchQuery ? 'Apps.notes.noResults' : 'Apps.notes.emptyTitle')
      }}</k-block-title>
      <k-block strong inset>{{
        phone.t(
          searchQuery ? 'Apps.notes.noResultsBody' : 'Apps.notes.emptyBody',
        )
      }}</k-block>
      <k-list v-if="!searchQuery" strong inset>
        <k-list-button link-component="button" @click="createNote">
          {{ phone.t('Apps.notes.newNote') }}
        </k-list-button>
      </k-list>
    </template>

    <footer
      class="notes-composer sky-ui-provider"
      :class="{ 'sky-ui-provider--dark': phone.isDarkMode }"
    >
      <SkySearchbar
        v-model="searchQuery"
        class="notes-search"
        :clear-label="phone.t('Common.clear')"
        :label="phone.t('Apps.notes.searchPlaceholder')"
        :placeholder="phone.t('Apps.notes.searchPlaceholder')"
      />
      <SkyFab
        class="notes-create-fab"
        :aria-label="phone.t('Apps.notes.newNote')"
        @click="createNote"
      >
        <template #icon>
          <SquarePen :size="21" aria-hidden="true" />
        </template>
      </SkyFab>
    </footer>
  </k-page>

  <k-page v-else class="notes-editor-page !pt-[44px] !pb-0">
    <k-navbar :title="phone.t('Apps.notes.note')">
      <template #left>
        <k-navbar-back-link
          component="button"
          :text="phone.t('Apps.notes.back')"
          :aria-label="phone.t('Apps.notes.back')"
          @click="saveAndClose"
        />
      </template>
      <template #right>
        <k-link
          component="button"
          icon-only
          :aria-label="phone.t('Apps.notes.actions')"
          @click="openMenu"
        >
          <Ellipsis :size="22" />
        </k-link>
      </template>
    </k-navbar>

    <div class="notes-editor-layout">
      <NotesRichTextEditor
        v-model="draftBody"
        :dark="phone.isDarkMode"
        :labels="editorLabels"
        :placeholder="phone.t('Apps.notes.bodyPlaceholder')"
      />
    </div>

    <SkyActionSheet
      class="notes-action-sheet sky-ui-provider"
      :class="{ 'sky-ui-provider--dark': phone.isDarkMode }"
      :aria-label="phone.t('Apps.notes.actions')"
      :opened="menuOpened"
      @backdropclick="menuOpened = false"
      @escape="menuOpened = false"
    >
      <div class="notes-action-menu">
        <div class="notes-action-menu__choices">
          <SkyButton block large tonal @click="shareNote">
            <Share2 :size="19" aria-hidden="true" />
            {{ phone.t('Apps.easyShare.name') }}
          </SkyButton>
          <SkyButton block large tonal @click="togglePinned">
            <PinOff
              v-if="currentNote?.pinned"
              :size="19"
              aria-hidden="true"
            />
            <Pin v-else :size="19" aria-hidden="true" />
            {{
              phone.t(
                currentNote?.pinned ? 'Apps.notes.unpin' : 'Apps.notes.pin',
              )
            }}
          </SkyButton>
          <SkyButton
            block
            class="notes-action-menu__danger"
            large
            tonal
            @click="deleteNote"
          >
            <Trash2 :size="19" aria-hidden="true" />
            {{ phone.t('Apps.notes.deleteNote') }}
          </SkyButton>
        </div>
        <SkyButton block clear large @click="menuOpened = false">
          {{ phone.t('Common.cancel') }}
        </SkyButton>
      </div>
    </SkyActionSheet>
  </k-page>
</template>

<style scoped>
.notes-list-page {
  padding-bottom: calc(
    var(--sky-safe-area-bottom) + var(--sky-touch-target) + 24px
  ) !important;
}

.notes-composer {
  position: absolute;
  z-index: 20;
  right: 0;
  bottom: 0;
  left: 0;
  min-width: 0;
  padding: 8px calc(var(--sky-page-gutter) + var(--sky-safe-area-right))
    calc(var(--sky-safe-area-bottom) + 8px)
    calc(var(--sky-page-gutter) + var(--sky-safe-area-left));
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--sky-touch-target);
  align-items: center;
  gap: 10px;
  background: linear-gradient(to top, var(--sky-bg) 72%, transparent);
}

.notes-search {
  min-width: 0;
}

.notes-create-fab {
  width: var(--sky-touch-target);
  height: var(--sky-touch-target);
}

.notes-editor-page {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.notes-editor-layout {
  min-height: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.notes-action-menu {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--sky-hairline);
  border-radius: 28px 28px 0 0;
  background: var(--sky-surface);
  box-shadow: 0 -18px 50px rgb(0 0 0 / 32%);
}

.notes-action-menu__choices {
  display: grid;
  gap: 8px;
}

.notes-action-menu :deep(.sky-button) {
  justify-content: center;
  border-radius: var(--sky-radius-control);
}

.notes-action-menu__danger {
  color: var(--sky-danger);
  background: var(--sky-danger-soft);
}

.notes-action-sheet :deep(.sky-action-sheet__panel) {
  max-height: none;
  padding: 0;
}
</style>
