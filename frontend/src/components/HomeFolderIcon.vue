<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

import { usePhoneStore } from '@/stores/phone'
import type { PhoneAppDefinition } from '@/types/apps'
import type { HomeFolder } from '@/utils/homeLayout'
import {
  reorderDirectionFromKeyboard,
  type ReorderDirection,
} from '@/utils/keyboard'
import {
  springboardPageDragCompensation,
  springboardSwipeIntent,
} from '@/utils/springboardDrag'

const props = withDefaults(
  defineProps<{
    apps: PhoneAppDefinition[]
    defaultName: string
    editMode?: boolean
    externalDragVisual?: boolean
    folder: HomeFolder
    showLabel?: boolean
  }>(),
  {
    editMode: false,
    externalDragVisual: false,
    showLabel: true,
  },
)
const emit = defineEmits<{
  dragcancel: []
  dragend: [event: PointerEvent]
  dragmove: [event: PointerEvent]
  dragstart: [event: PointerEvent]
  edit: []
  open: []
  reorder: [direction: ReorderDirection]
}>()

const phone = usePhoneStore()
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const suppressClick = ref(false)
let dragStartPage = 0
let dragPageWidth = 0
let holdTimer: number | undefined
let pointerStart = { x: 0, y: 0 }
let pointerTarget: HTMLElement | null = null
let pointerId: number | null = null

const folderName = computed(() => props.folder.name || props.defaultName)
const dragStyle = computed(() =>
  isDragging.value && !props.externalDragVisual
    ? {
        transform: `translate3d(${springboardPageDragCompensation(dragStartPage, phone.currentPage, dragPageWidth)}px, 0, 0)`,
      }
    : undefined,
)
const dragPointerStyle = computed(() =>
  isDragging.value && !props.externalDragVisual
    ? {
        transform: `translate3d(${dragOffset.value.x}px, ${dragOffset.value.y}px, 0)`,
      }
    : undefined,
)

function clearHold(): void {
  if (holdTimer !== undefined) window.clearTimeout(holdTimer)
  holdTimer = undefined
}

function releasePointerCapture(): void {
  if (
    pointerTarget &&
    pointerId !== null &&
    pointerTarget.hasPointerCapture(pointerId)
  ) {
    pointerTarget.releasePointerCapture(pointerId)
  }
  pointerTarget = null
  pointerId = null
}

function beginPointerDrag(event: PointerEvent): void {
  dragStartPage = phone.currentPage
  dragPageWidth =
    (event.target as HTMLElement)
      .closest<HTMLElement>('.springboard-page')
      ?.getBoundingClientRect().width ?? 0
  isDragging.value = true
  emit('dragstart', event)
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return
  suppressClick.value = false
  pointerTarget = event.currentTarget as HTMLElement
  pointerId = event.pointerId
  pointerTarget.setPointerCapture(pointerId)
  pointerStart = { x: event.clientX, y: event.clientY }
  clearHold()
  if (props.editMode) {
    beginPointerDrag(event)
    return
  }
  holdTimer = window.setTimeout(() => {
    suppressClick.value = true
    emit('edit')
    beginPointerDrag(event)
    holdTimer = undefined
  }, 520)
}

function onPointerMove(event: PointerEvent): void {
  if (isDragging.value) {
    dragOffset.value = {
      x: event.clientX - pointerStart.x,
      y: event.clientY - pointerStart.y,
    }
    emit('dragmove', event)
    return
  }
  if (
    springboardSwipeIntent(
      event.clientX - pointerStart.x,
      event.clientY - pointerStart.y,
    ) !== 'pending'
  ) {
    suppressClick.value = true
    clearHold()
  }
}

function onPointerUp(event: PointerEvent): void {
  clearHold()
  if (isDragging.value) {
    suppressClick.value = true
    isDragging.value = false
    dragOffset.value = { x: 0, y: 0 }
    releasePointerCapture()
    emit('dragend', event)
    return
  }
  releasePointerCapture()
}

function cancelPointerDrag(): void {
  clearHold()
  const wasDragging = isDragging.value
  isDragging.value = false
  dragOffset.value = { x: 0, y: 0 }
  releasePointerCapture()
  if (wasDragging) emit('dragcancel')
}

function openFolder(): void {
  if (props.editMode || suppressClick.value) {
    suppressClick.value = false
    return
  }
  emit('open')
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.editMode) return
  const direction = reorderDirectionFromKeyboard(event)
  if (!direction) return
  event.preventDefault()
  event.stopPropagation()
  emit('reorder', direction)
}

onBeforeUnmount(() => {
  clearHold()
  cancelPointerDrag()
})
</script>

<template>
  <div
    class="home-folder-item app-icon-item"
    :class="{
      'app-icon-item--drag-source': isDragging && externalDragVisual,
      'app-icon-item--dragging': isDragging,
      'app-icon-item--editing': editMode,
      'home-folder-item--dragging': isDragging,
    }"
    :style="dragStyle"
  >
    <button
      class="home-folder-button app-icon-button"
      type="button"
      :aria-label="folderName"
      :aria-keyshortcuts="
        editMode ? 'ArrowLeft ArrowRight ArrowUp ArrowDown' : undefined
      "
      :style="dragPointerStyle"
      @click="openFolder"
      @contextmenu.prevent
      @keydown="onKeydown"
      @lostpointercapture="cancelPointerDrag"
      @pointercancel="cancelPointerDrag"
      @pointerdown="onPointerDown"
      @pointerleave="isDragging || clearHold()"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    >
      <span class="home-folder-preview" aria-hidden="true">
        <span
          v-for="app in apps.slice(0, 9)"
          :key="app.id"
          class="home-folder-preview__app"
        >
          <img :src="app.iconImage" alt="" draggable="false" />
        </span>
      </span>
      <span v-if="showLabel" class="app-icon-label">{{ folderName }}</span>
    </button>
  </div>
</template>

<style scoped>
.home-folder-button {
  width: 100%;
}

.home-folder-preview {
  box-sizing: border-box;
  width: 56px;
  height: 56px;
  padding: 6px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 2px;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 22%);
  border-radius: 14px;
  background: rgb(210 220 235 / 42%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 20%),
    0 2px 8px rgb(0 0 0 / 18%);
}

.home-folder-preview__app {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: 3px;
}

.home-folder-preview__app img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}
</style>
