<script setup lang="ts">
import { Pencil } from 'lucide-vue-next'
import { computed, nextTick, ref, watch } from 'vue'

import AppIcon from '@/components/AppIcon.vue'
import { usePhoneStore } from '@/stores/phone'
import type { PhoneAppDefinition } from '@/types/apps'
import {
  SkyButton,
  SkyField,
  SkyLink,
  SkySheet,
} from '@/ui'
import {
  HOME_FOLDER_NAME_MAX_LENGTH,
  HOME_FOLDER_PAGE_SIZE,
  type HomeFolder,
} from '@/utils/homeLayout'

type FolderAppEntry = {
  app: PhoneAppDefinition
  index: number
}

const props = defineProps<{
  apps: FolderAppEntry[]
  editMode: boolean
  folder: HomeFolder
  renameOnOpen: boolean
}>()
const emit = defineEmits<{
  close: []
  edit: []
  extract: [index: number, event: PointerEvent]
  move: [sourceIndex: number, targetIndex: number]
  rename: [name: string]
  'rename-opened': []
}>()

const phone = usePhoneStore()
const currentPage = ref(0)
const pageTransitionDirection = ref<'backward' | 'forward'>('forward')
const draggingIndex = ref<number | null>(null)
const renameOpened = ref(false)
const renameDraft = ref('')
let pagePointerStart = 0
let pagePointerId: number | null = null

const folderName = computed(
  () => props.folder.name || phone.t('Home.folders.defaultName'),
)
const pageCount = computed(() =>
  Math.max(1, Math.ceil(props.folder.apps.length / HOME_FOLDER_PAGE_SIZE)),
)
const pageTransitionName = computed(
  () => `home-folder-page-${pageTransitionDirection.value}`,
)
const visibleApps = computed(() => {
  const start = currentPage.value * HOME_FOLDER_PAGE_SIZE
  return props.apps.filter(
    (entry) =>
      entry.index >= start && entry.index < start + HOME_FOLDER_PAGE_SIZE,
  )
})

watch(pageCount, (count) => {
  const nextPage = Math.min(currentPage.value, count - 1)
  if (nextPage === currentPage.value) return
  pageTransitionDirection.value = 'backward'
  currentPage.value = nextPage
})

watch(
  () => props.folder.name,
  (name) => {
    if (!renameOpened.value) renameDraft.value = name || folderName.value
  },
  { immediate: true },
)

watch(
  () => props.renameOnOpen,
  async (shouldOpen) => {
    if (!shouldOpen) return
    renameDraft.value = props.folder.name || folderName.value
    renameOpened.value = true
    emit('rename-opened')
    await nextTick()
    document
      .querySelector<HTMLInputElement>('.home-folder-rename .sky-field__input')
      ?.select()
  },
  { immediate: true },
)

function openRename(): void {
  renameDraft.value = props.folder.name || folderName.value
  renameOpened.value = true
  void nextTick(() => {
    document
      .querySelector<HTMLInputElement>('.home-folder-rename .sky-field__input')
      ?.select()
  })
}

function saveRename(): void {
  emit('rename', renameDraft.value.trim() || phone.t('Home.folders.defaultName'))
  renameOpened.value = false
}

function startFolderAppDrag(index: number): void {
  draggingIndex.value = index
}

function finishFolderAppDrag(event: PointerEvent): void {
  const sourceIndex = draggingIndex.value
  draggingIndex.value = null
  if (sourceIndex === null) return
  const panel = document.querySelector<HTMLElement>('.home-folder-panel')
  if (!panel) return
  const panelBounds = panel.getBoundingClientRect()
  const insidePanel =
    event.clientX >= panelBounds.left &&
    event.clientX <= panelBounds.right &&
    event.clientY >= panelBounds.top &&
    event.clientY <= panelBounds.bottom
  if (!insidePanel) {
    emit('extract', sourceIndex, event)
    return
  }

  const target = document
    .elementsFromPoint(event.clientX, event.clientY)
    .map((element) => element.closest<HTMLElement>('[data-folder-app-index]'))
    .find(
      (element) =>
        element && Number(element.dataset.folderAppIndex) !== sourceIndex,
    )
  if (!target) return
  const targetIndex = Number(target.dataset.folderAppIndex)
  if (Number.isInteger(targetIndex)) emit('move', sourceIndex, targetIndex)
}

function stopFolderAppDrag(): void {
  draggingIndex.value = null
}

function goToPage(page: number): void {
  const nextPage = Math.max(0, Math.min(pageCount.value - 1, page))
  if (nextPage === currentPage.value) return
  pageTransitionDirection.value =
    nextPage > currentPage.value ? 'forward' : 'backward'
  currentPage.value = nextPage
}

function startPageSwipe(event: PointerEvent): void {
  if ((event.target as HTMLElement).closest('button, input')) return
  pagePointerStart = event.clientX
  pagePointerId = event.pointerId
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function finishPageSwipe(event: PointerEvent): void {
  if (pagePointerId !== event.pointerId) return
  const distance = event.clientX - pagePointerStart
  if (Math.abs(distance) > 42) {
    goToPage(currentPage.value + (distance < 0 ? 1 : -1))
  }
  pagePointerId = null
}
</script>

<template>
  <div class="home-folder-layer">
    <button
      class="home-folder-backdrop"
      type="button"
      :aria-label="phone.t('Home.folders.close')"
      @click="emit('close')"
    ></button>
    <section
      class="home-folder-dialog"
      role="dialog"
      aria-modal="true"
      :aria-label="folderName"
      @pointerdown.stop
    >
      <div class="home-folder-heading">
        <button
          class="home-folder-title"
          type="button"
          :aria-label="phone.t('Home.folders.rename')"
          @click="openRename"
        >
          {{ folderName }}
        </button>
        <SkyLink
          class="home-folder-edit"
          component="button"
          icon-only
          :aria-label="phone.t('Home.folders.rename')"
          type="button"
          @click="openRename"
        >
          <Pencil :size="18" :stroke-width="2.2" />
        </SkyLink>
      </div>
      <div
        class="home-folder-panel"
        :class="{ 'home-folder-panel--dragging': draggingIndex !== null }"
        @pointerdown="startPageSwipe"
        @pointerup="finishPageSwipe"
        @pointercancel="pagePointerId = null"
      >
        <div class="home-folder-page-viewport">
          <Transition :name="pageTransitionName">
            <div :key="currentPage" class="home-folder-page-grid">
              <AppIcon
                v-for="entry in visibleApps"
                :key="entry.app.id"
                :app="entry.app"
                :data-folder-app-index="entry.index"
                :edit-mode="editMode"
                @dragcancel="stopFolderAppDrag"
                @dragend="finishFolderAppDrag"
                @dragstart="startFolderAppDrag(entry.index)"
                @edit="emit('edit')"
              />
            </div>
          </Transition>
        </div>
        <nav
          v-if="pageCount > 1"
          class="home-folder-pages"
          :aria-label="phone.t('Home.folders.pages')"
        >
          <button
            v-for="page in pageCount"
            :key="page"
            type="button"
            :class="{ active: currentPage === page - 1 }"
            :aria-label="`${phone.t('Home.page')} ${page}`"
            @click="goToPage(page - 1)"
          ></button>
        </nav>
      </div>
    </section>

    <SkySheet
      class="home-folder-rename"
      :opened="renameOpened"
      :aria-label="phone.t('Home.folders.rename')"
      @backdropclick="renameOpened = false"
      @escape="renameOpened = false"
    >
      <form class="home-folder-rename__content" @submit.prevent="saveRename">
        <span class="home-folder-rename__handle" aria-hidden="true"></span>
        <header>
          <div>
            <small>{{ phone.t('Home.folders.name') }}</small>
            <h2>{{ phone.t('Home.folders.rename') }}</h2>
          </div>
        </header>
        <ul class="home-folder-rename__fields">
          <SkyField
            v-model="renameDraft"
            :aria-label="phone.t('Home.folders.name')"
            autocomplete="off"
            clear-button
            :clear-label="phone.t('Common.clear')"
            :maxlength="HOME_FOLDER_NAME_MAX_LENGTH"
            outline
            :placeholder="phone.t('Home.folders.defaultName')"
          />
        </ul>
        <div class="home-folder-rename__actions">
          <SkyButton
            block
            large
            rounded
            type="button"
            variant="secondary"
            @click="renameOpened = false"
          >
            {{ phone.t('Common.cancel') }}
          </SkyButton>
          <SkyButton block large rounded type="submit">
            {{ phone.t('Common.save') }}
          </SkyButton>
        </div>
      </form>
    </SkySheet>
  </div>
</template>

<style scoped>
.home-folder-layer {
  --sky-app-accent: #0a84ff;
  --sky-bg: #08080a;
  --sky-surface: #1c1c1e;
  --sky-surface-muted: #2c2c2e;
  --sky-text: #f5f5f7;
  --sky-muted: #98989f;
  --sky-hairline: rgb(255 255 255 / 12%);
  position: absolute;
  z-index: 70;
  inset: 0;
  color: #fff;
  font-family:
    -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
}

.home-folder-backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: rgb(8 12 24 / 38%);
}

.home-folder-dialog {
  position: absolute;
  top: 108px;
  right: 18px;
  left: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}

.home-folder-heading {
  max-width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.home-folder-title {
  min-width: 0;
  max-width: 100%;
  min-height: 44px;
  margin: 0;
  padding: 2px 12px;
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  color: #fff;
  background: transparent;
  font: inherit;
  font-size: 28px;
  font-weight: 650;
  letter-spacing: -0.8px;
  line-height: 36px;
  text-align: center;
  text-overflow: ellipsis;
  text-shadow: 0 2px 8px rgb(0 0 0 / 38%);
  white-space: nowrap;
}

.home-folder-title:focus-visible,
.home-folder-edit:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.home-folder-edit {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: rgb(255 255 255 / 13%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 12%);
  text-shadow: 0 2px 8px rgb(0 0 0 / 38%);
}

.home-folder-edit:active {
  background: rgb(255 255 255 / 22%);
  transform: scale(0.94);
}

.home-folder-panel {
  box-sizing: border-box;
  width: 100%;
  min-height: 342px;
  padding: 25px 22px 16px;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 25%);
  border-radius: 28px;
  background: rgb(115 135 176 / 72%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 18%),
    0 18px 50px rgb(0 0 0 / 26%);
  touch-action: none;
}

.home-folder-panel--dragging {
  overflow: visible;
}

.home-folder-page-viewport {
  position: relative;
  min-height: 285px;
  margin-top: -8px;
  overflow: hidden;
}

.home-folder-panel--dragging .home-folder-page-viewport {
  overflow: visible;
}

.home-folder-page-grid {
  position: absolute;
  inset: 0;
  top: 8px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(3, 79px);
  gap: 13px 20px;
  align-items: start;
}

.home-folder-page-forward-enter-active,
.home-folder-page-forward-leave-active,
.home-folder-page-backward-enter-active,
.home-folder-page-backward-leave-active {
  pointer-events: none;
  transition:
    opacity 190ms ease,
    transform 290ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform;
}

.home-folder-page-forward-enter-from {
  opacity: 0;
  transform: translateX(48px) scale(0.985);
}

.home-folder-page-forward-leave-to {
  opacity: 0;
  transform: translateX(-48px) scale(0.985);
}

.home-folder-page-backward-enter-from {
  opacity: 0;
  transform: translateX(-48px) scale(0.985);
}

.home-folder-page-backward-leave-to {
  opacity: 0;
  transform: translateX(48px) scale(0.985);
}

.home-folder-page-grid :deep(.app-icon-item) {
  width: 100%;
}

.home-folder-page-grid :deep(.app-icon-item--dragging) {
  z-index: 80;
}

.home-folder-pages {
  min-height: 20px;
  margin-top: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.home-folder-pages button {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgb(255 255 255 / 38%);
  transition:
    background-color 180ms ease,
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.home-folder-pages button.active {
  background: #fff;
  transform: scale(1.18);
}

.home-folder-rename {
  --sky-overlay-layer: 90;
}

.home-folder-rename :deep(.sky-sheet__panel) {
  overflow: hidden;
  border-radius: 26px 26px 0 0;
  background: rgb(28 28 30 / 98%);
}

.home-folder-rename__content {
  padding: 9px 16px calc(20px + var(--sky-safe-area-bottom));
}

.home-folder-rename__handle {
  display: block;
  width: 38px;
  height: 5px;
  margin: 0 auto 16px;
  border-radius: 999px;
  background: rgb(255 255 255 / 28%);
}

.home-folder-rename__content header {
  margin: 0 2px 14px;
}

.home-folder-rename__content header small {
  display: block;
  margin-bottom: 2px;
  color: var(--sky-muted);
  font-size: 12px;
}

.home-folder-rename__content h2 {
  margin: 0;
  color: var(--sky-text);
  font-size: 21px;
  line-height: 27px;
}

.home-folder-rename__fields {
  margin: 0;
  padding: 0;
  list-style: none;
  text-align: left;
}

.home-folder-rename__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
}

@media (prefers-reduced-motion: reduce) {
  .home-folder-layer *,
  .home-folder-layer *::before,
  .home-folder-layer *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
