<script setup lang="ts">
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { Mark, mergeAttributes } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import DOMPurify from 'dompurify'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-vue-next'
import { onBeforeUnmount, watch } from 'vue'

import {
  noteBodyToEditorHtml,
  serializeRichNoteBody,
} from '@/utils/noteRichText'

export type NotesEditorLabels = {
  bold: string
  bulletList: string
  decreaseText: string
  increaseText: string
  italic: string
  numberedList: string
  quote: string
  redo: string
  strike: string
  toolbar: string
  underline: string
  undo: string
}

const props = defineProps<{
  dark: boolean
  labels: NotesEditorLabels
  modelValue: string
  placeholder: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const allowedTags = [
  'blockquote',
  'br',
  'em',
  'h2',
  'h3',
  'li',
  'ol',
  'p',
  's',
  'strong',
  'span',
  'u',
  'ul',
]

const noteTextSizeSteps = [
  'tiny',
  'small',
  'compact',
  'normal',
  'medium',
  'large',
  'huge',
] as const
type NoteTextSizeStep = (typeof noteTextSizeSteps)[number]
const normalTextSizeIndex = noteTextSizeSteps.indexOf('normal')

const NoteTextSize = Mark.create({
  name: 'noteTextSize',
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element) => {
          const size = element.getAttribute('data-note-size')
          return noteTextSizeSteps.includes(size as NoteTextSizeStep) &&
            size !== 'normal'
            ? size
            : null
        },
        renderHTML: (attributes) => {
          const size = attributes.size as NoteTextSizeStep | undefined
          return size &&
            noteTextSizeSteps.includes(size) &&
            size !== 'normal'
            ? { 'data-note-size': size }
            : {}
        },
      },
    }
  },
  parseHTML() {
    return [{ tag: 'span[data-note-size]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },
})

function sanitizeEditorHtml(body: string): string {
  return String(
    DOMPurify.sanitize(noteBodyToEditorHtml(body), {
      ALLOWED_ATTR: ['data-note-size'],
      ALLOWED_TAGS: allowedTags,
    }),
  )
}

let acceptedHtml = sanitizeEditorHtml(props.modelValue)

const editor = useEditor({
  content: acceptedHtml,
  extensions: [
    StarterKit.configure({
      code: false,
      codeBlock: false,
      heading: { levels: [2, 3] },
      horizontalRule: false,
      link: false,
      strike: {},
      underline: {},
    }),
    NoteTextSize,
    Placeholder.configure({ placeholder: props.placeholder }),
  ],
  injectCSS: false,
  onUpdate: ({ editor: currentEditor }) => {
    const safeHtml = String(
      DOMPurify.sanitize(currentEditor.getHTML(), {
        ALLOWED_ATTR: ['data-note-size'],
        ALLOWED_TAGS: allowedTags,
      }),
    )
    const serializedBody = serializeRichNoteBody(safeHtml)
    if (serializedBody.length > 20_000) {
      currentEditor.commands.setContent(acceptedHtml, { emitUpdate: false })
      return
    }
    acceptedHtml = safeHtml
    emit('update:modelValue', serializedBody)
  },
})

function adjustTextSize(direction: -1 | 1): void {
  if (!editor.value || editor.value.state.selection.empty) return

  const currentSize = editor.value.getAttributes('noteTextSize')
    .size as NoteTextSizeStep | undefined
  const currentIndex = currentSize
    ? noteTextSizeSteps.indexOf(currentSize)
    : normalTextSizeIndex
  const nextIndex = Math.max(
    0,
    Math.min(
      noteTextSizeSteps.length - 1,
      (currentIndex >= 0 ? currentIndex : normalTextSizeIndex) + direction,
    ),
  )
  const nextSize = noteTextSizeSteps[nextIndex]
  const chain = editor.value.chain().focus()

  if (nextSize === 'normal') {
    chain.unsetMark('noteTextSize').run()
    return
  }

  chain.setMark('noteTextSize', { size: nextSize }).run()
}

function toggleSelectionQuote(): void {
  if (!editor.value || editor.value.state.selection.empty) return

  const { from, to } = editor.value.state.selection
  const { doc, tr } = editor.value.state
  const selectedText = doc.textBetween(from, to)
  const isQuotedInside = selectedText.startsWith('„') && selectedText.endsWith('“')
  const isQuotedOutside =
    from > 1 &&
    doc.textBetween(from - 1, from) === '„' &&
    doc.textBetween(to, to + 1) === '“'

  if (isQuotedInside) {
    tr.delete(to - 1, to).delete(from, from + 1)
    tr.setSelection(TextSelection.create(tr.doc, from, to - 2))
  } else if (isQuotedOutside) {
    tr.delete(to, to + 1).delete(from - 1, from)
    tr.setSelection(TextSelection.create(tr.doc, from - 1, to - 1))
  } else {
    tr.insertText('“', to).insertText('„', from)
    tr.setSelection(TextSelection.create(tr.doc, from + 1, to + 1))
  }

  editor.value.view.dispatch(tr)
  editor.value.view.focus()
}

function scrollToolbar(event: WheelEvent): void {
  const toolbar = event.currentTarget as HTMLElement
  if (toolbar.scrollWidth <= toolbar.clientWidth) return
  event.preventDefault()
  toolbar.scrollLeft +=
    Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY
}

watch(
  () => props.modelValue,
  (body) => {
    if (!editor.value) return
    const safeHtml = sanitizeEditorHtml(body)
    if (editor.value.getHTML() === safeHtml) return
    acceptedHtml = safeHtml
    editor.value.commands.setContent(safeHtml, { emitUpdate: false })
  },
)

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <section
    class="notes-rich-editor"
    :class="{ 'notes-rich-editor--dark': dark }"
  >
    <EditorContent
      v-if="editor"
      class="notes-rich-editor__content"
      :editor="editor"
    />

    <nav
      v-if="editor"
      class="notes-rich-editor__toolbar"
      :aria-label="labels.toolbar"
      @wheel="scrollToolbar"
    >
      <button
        type="button"
        :disabled="!editor.can().chain().focus().undo().run()"
        :aria-label="labels.undo"
        :title="labels.undo"
        @click="editor.chain().focus().undo().run()"
      >
        <Undo2 :size="19" />
      </button>
      <button
        type="button"
        :disabled="!editor.can().chain().focus().redo().run()"
        :aria-label="labels.redo"
        :title="labels.redo"
        @click="editor.chain().focus().redo().run()"
      >
        <Redo2 :size="19" />
      </button>
      <span class="notes-rich-editor__separator" aria-hidden="true"></span>
      <button
        type="button"
        :class="{
          'is-active': ['tiny', 'small', 'compact'].includes(
            editor.getAttributes('noteTextSize').size,
          ),
          'is-unavailable': editor.state.selection.empty,
        }"
        :aria-label="labels.decreaseText"
        :title="labels.decreaseText"
        @pointerdown.prevent="adjustTextSize(-1)"
      >
        <span class="notes-rich-editor__text-tool">A−</span>
      </button>
      <button
        type="button"
        :class="{
          'is-active': ['medium', 'large', 'huge'].includes(
            editor.getAttributes('noteTextSize').size,
          ),
          'is-unavailable': editor.state.selection.empty,
        }"
        :aria-label="labels.increaseText"
        :title="labels.increaseText"
        @pointerdown.prevent="adjustTextSize(1)"
      >
        <span
          class="notes-rich-editor__text-tool notes-rich-editor__text-tool--large"
          >A+</span
        >
      </button>
      <span class="notes-rich-editor__separator" aria-hidden="true"></span>
      <button
        type="button"
        :class="{ 'is-active': editor.isActive('bold') }"
        :aria-label="labels.bold"
        :title="labels.bold"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <Bold :size="19" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor.isActive('italic') }"
        :aria-label="labels.italic"
        :title="labels.italic"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <Italic :size="19" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor.isActive('underline') }"
        :aria-label="labels.underline"
        :title="labels.underline"
        @click="editor.chain().focus().toggleUnderline().run()"
      >
        <Underline :size="19" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor.isActive('strike') }"
        :aria-label="labels.strike"
        :title="labels.strike"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        <Strikethrough :size="19" />
      </button>
      <span class="notes-rich-editor__separator" aria-hidden="true"></span>
      <button
        type="button"
        :class="{ 'is-active': editor.isActive('bulletList') }"
        :aria-label="labels.bulletList"
        :title="labels.bulletList"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <List :size="20" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor.isActive('orderedList') }"
        :aria-label="labels.numberedList"
        :title="labels.numberedList"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <ListOrdered :size="20" />
      </button>
      <button
        type="button"
        :class="{ 'is-unavailable': editor.state.selection.empty }"
        :aria-label="labels.quote"
        :title="labels.quote"
        @pointerdown.prevent="toggleSelectionQuote"
      >
        <Quote :size="19" />
      </button>
    </nav>
  </section>
</template>

<style scoped>
.notes-rich-editor {
  min-height: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  color: #171719;
}

.notes-rich-editor--dark {
  background: #000;
  color: #f5f5f7;
}

.notes-rich-editor__content {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.notes-rich-editor__content::-webkit-scrollbar,
.notes-rich-editor__toolbar::-webkit-scrollbar {
  display: none;
}

:deep(.tiptap) {
  min-height: 100%;
  padding: 13px var(--sky-page-gutter) 90px;
  outline: none;
  font-size: 17px;
  line-height: 1.48;
  word-break: break-word;
}

:deep(.tiptap p) {
  min-height: 1.48em;
  margin: 0 0 0.55em;
}

:deep(.tiptap h2),
:deep(.tiptap h3) {
  margin: 0.75em 0 0.35em;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

:deep(.tiptap h2) {
  font-size: 28px;
}

:deep(.tiptap h3) {
  font-size: 22px;
}

:deep(.tiptap span[data-note-size='tiny']) {
  font-size: 11px;
}

:deep(.tiptap span[data-note-size='small']) {
  font-size: 13px;
}

:deep(.tiptap span[data-note-size='compact']) {
  font-size: 15px;
}

:deep(.tiptap span[data-note-size='medium']) {
  font-size: 20px;
}

:deep(.tiptap span[data-note-size='large']) {
  font-size: 23px;
}

:deep(.tiptap span[data-note-size='huge']) {
  font-size: 28px;
}

:deep(.tiptap ul),
:deep(.tiptap ol) {
  margin: 0.45em 0 0.75em;
  padding-left: 1.45em;
  list-style-position: outside;
}

:deep(.tiptap ul) {
  list-style-type: disc;
}

:deep(.tiptap ol) {
  list-style-type: decimal;
}

:deep(.tiptap ul ul) {
  list-style-type: circle;
}

:deep(.tiptap ol ol) {
  list-style-type: lower-alpha;
}

:deep(.tiptap li) {
  margin: 0.2em 0;
}

:deep(.tiptap blockquote) {
  margin: 0.65em 0;
  padding-left: 0.85em;
  border-left: 3px solid #ffcc00;
  color: #636366;
}

.notes-rich-editor--dark :deep(.tiptap blockquote) {
  color: #a1a1a6;
}

:deep(.tiptap p.is-editor-empty:first-child::before) {
  float: left;
  height: 0;
  color: #8e8e93;
  content: attr(data-placeholder);
  pointer-events: none;
}

.notes-rich-editor__toolbar {
  width: 100%;
  min-height: 59px;
  padding: 7px var(--sky-page-gutter) calc(var(--sky-safe-area-bottom) + 7px);
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  border-top: 1px solid rgb(60 60 67 / 18%);
  background: rgb(246 246 248 / 96%);
  box-shadow: 0 -9px 28px rgb(0 0 0 / 7%);
  scrollbar-width: none;
  touch-action: pan-x;
}

.notes-rich-editor--dark .notes-rich-editor__toolbar {
  border-top-color: rgb(255 255 255 / 12%);
  background: rgb(27 27 29 / 97%);
  box-shadow: 0 -10px 30px rgb(0 0 0 / 38%);
}

.notes-rich-editor__toolbar button {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border: 1px solid rgb(60 60 67 / 14%);
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgb(255 255 255 / 72%);
  box-shadow: inset 0 1px rgb(255 255 255 / 65%);
  color: inherit;
  cursor: pointer;
  transition:
    transform 130ms ease,
    background-color 150ms ease,
    color 150ms ease;
}

.notes-rich-editor--dark .notes-rich-editor__toolbar button {
  border-color: rgb(255 255 255 / 10%);
  background: linear-gradient(145deg, #303034, #202023);
  box-shadow: inset 0 1px rgb(255 255 255 / 8%);
}

.notes-rich-editor__toolbar button.is-active {
  border-color: #ffcc00;
  background: #ffcc00;
  color: #171719;
}

.notes-rich-editor__toolbar button:disabled {
  opacity: 0.3;
  cursor: default;
}

.notes-rich-editor__toolbar button.is-unavailable {
  opacity: 0.3;
  cursor: default;
}

.notes-rich-editor__toolbar button:active:not(:disabled) {
  transform: scale(0.94);
}

.notes-rich-editor__toolbar button:focus-visible {
  outline: 2px solid #ffcc00;
  outline-offset: 2px;
}

.notes-rich-editor__separator {
  width: 1px;
  height: 24px;
  flex: 0 0 1px;
  margin: 0 1px;
  background: rgb(60 60 67 / 20%);
}

.notes-rich-editor--dark .notes-rich-editor__separator {
  background: rgb(255 255 255 / 16%);
}

.notes-rich-editor__text-tool {
  font-size: 14px;
  font-weight: 650;
}

.notes-rich-editor__text-tool--large {
  font-size: 17px;
}

@media (hover: hover) {
  .notes-rich-editor__toolbar button:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .notes-rich-editor__toolbar button {
    transition: none;
  }
}
</style>
