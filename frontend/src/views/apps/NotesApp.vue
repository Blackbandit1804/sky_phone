<script setup lang="ts">
import {
  kBlock,
  kBlockTitle,
  kLink,
  kList,
  kListButton,
  kListInput,
  kListItem,
  kNavbar,
  kNavbarBackLink,
  kPage,
  kSearchbar,
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
import { SkyActionButton, SkyActionGroup, SkyActionSheet } from '@/ui'
import type { Note } from '@/utils/notes'
import { noteBodyToPlainText } from '@/utils/noteRichText'

const phone = usePhoneStore()
const notes = useNotesStore()
const easyShare = useEasyShareStore()
const searchQuery = ref('')
const editorId = ref<string | null>(null)
const editorOpened = ref(false)
const draftTitle = ref('')
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

function updateSearch(event: Event): void {
  searchQuery.value = (event.target as HTMLInputElement).value
}

function updateTitle(event: Event): void {
  draftTitle.value = (event.target as HTMLInputElement).value
}

function createNote(): void {
  editorId.value = null
  draftTitle.value = ''
  draftBody.value = ''
  editorOpened.value = true
}

function editNote(note: Note): void {
  editorId.value = note.id
  draftTitle.value = note.title
  draftBody.value = note.body
  editorOpened.value = true
}

function persistDraft(): Note | undefined {
  const draft = {
    body: draftBody.value,
    title: draftTitle.value.trim(),
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
    class="!pt-[44px] !pb-[25px]"
    :aria-label="phone.t('Apps.notes.name')"
  >
    <k-navbar large transparent :title="phone.t('Apps.notes.name')">
      <template #right>
        <k-link
          component="button"
          icon-only
          :aria-label="phone.t('Apps.notes.newNote')"
          @click="createNote"
        >
          <SquarePen :size="21" />
        </k-link>
      </template>
      <template #subnavbar>
        <k-searchbar
          :value="searchQuery"
          :placeholder="phone.t('Apps.notes.searchPlaceholder')"
          @input="updateSearch"
          @clear="searchQuery = ''"
        />
      </template>
    </k-navbar>

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
      <k-list class="notes-editor-title" nested :dividers="false">
        <k-list-input
          :value="draftTitle"
          :label="phone.t('Apps.notes.title')"
          :placeholder="phone.t('Apps.notes.titlePlaceholder')"
          maxlength="120"
          clear-button
          @input="updateTitle"
          @clear="draftTitle = ''"
        />
      </k-list>
      <NotesRichTextEditor
        v-model="draftBody"
        :dark="phone.isDarkMode"
        :labels="editorLabels"
        :placeholder="phone.t('Apps.notes.bodyPlaceholder')"
      />
    </div>

    <SkyActionSheet
      class="notes-action-sheet"
      :opened="menuOpened"
      :label="phone.t('Apps.notes.actions')"
      @backdropclick="menuOpened = false"
      @escape="menuOpened = false"
    >
      <div class="notes-action-sheet__handle" aria-hidden="true"></div>
      <p class="notes-action-sheet__title">
        {{ phone.t('Apps.notes.actions') }}
      </p>
      <SkyActionGroup>
        <SkyActionButton @click="shareNote">
          <span class="notes-action-button__content">
            <Share2 :size="18" />
            {{ phone.t('Apps.easyShare.name') }}
          </span>
        </SkyActionButton>
        <SkyActionButton @click="togglePinned">
          <span class="notes-action-button__content">
            <PinOff v-if="currentNote?.pinned" :size="18" />
            <Pin v-else :size="18" />
            {{
              phone.t(
                currentNote?.pinned ? 'Apps.notes.unpin' : 'Apps.notes.pin',
              )
            }}
          </span>
        </SkyActionButton>
        <SkyActionButton class="notes-action-button--danger" @click="deleteNote">
          <span class="notes-action-button__content">
            <Trash2 :size="18" />
            {{ phone.t('Apps.notes.deleteNote') }}
          </span>
        </SkyActionButton>
      </SkyActionGroup>
      <SkyActionGroup>
        <SkyActionButton bold @click="menuOpened = false">
          {{ phone.t('Common.cancel') }}
        </SkyActionButton>
      </SkyActionGroup>
    </SkyActionSheet>
  </k-page>
</template>

<style scoped>
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

.notes-editor-title {
  margin: 0;
  flex: 0 0 auto;
}

.notes-action-button__content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
}

.notes-action-button--danger {
  color: var(--sky-danger);
}

.notes-action-sheet :deep(.sky-action-sheet__panel) {
  padding: 8px var(--sky-page-gutter)
    calc(var(--sky-safe-area-bottom) + 10px);
  border: 1px solid var(--sky-hairline);
  border-bottom: 0;
  border-radius: 30px 30px 0 0;
  background: var(--sky-surface);
  box-shadow: 0 -18px 50px rgb(0 0 0 / 32%);
}

.notes-action-sheet :deep(.sky-action-group) {
  margin-top: 9px;
  background: var(--sky-surface-muted);
}

.notes-action-sheet__handle {
  width: 38px;
  height: 5px;
  margin: 0 auto 7px;
  border-radius: 999px;
  background: var(--sky-hairline-strong, rgb(142 142 147 / 65%));
}

.notes-action-sheet__title {
  margin: 0;
  color: var(--sky-muted);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}
</style>
