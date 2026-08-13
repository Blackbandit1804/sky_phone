<script setup lang="ts">
import { ref, toRef, useId } from 'vue'
import { useOverlayFocusTrap } from './useOverlayFocusTrap'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    ariaModal?: boolean | 'false' | 'true'
    content?: string
    opened: boolean
    role?: 'alertdialog' | 'dialog'
    tabindex?: number | string
    title: string
  }>(),
  {
    ariaModal: true,
    role: 'dialog',
    tabindex: -1,
  },
)
const emit = defineEmits<{
  backdropclick: []
  escape: [event: KeyboardEvent]
}>()

const titleId = useId()
const contentId = useId()
const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)

useOverlayFocusTrap({
  onEscape: (event) => emit('escape', event),
  opened: toRef(props, 'opened'),
  panel,
  root,
})
</script>

<template>
  <div v-if="opened" ref="root" v-bind="$attrs" class="sky-dialog">
    <div
      class="sky-overlay-backdrop"
      aria-hidden="true"
      @click="emit('backdropclick')"
    ></div>
    <section
      ref="panel"
      class="sky-dialog__panel"
      :role="role"
      :aria-modal="ariaModal"
      :aria-labelledby="titleId"
      :aria-describedby="content ? contentId : undefined"
      :tabindex="tabindex"
    >
      <div class="sky-dialog__content">
        <h2 :id="titleId">{{ title }}</h2>
        <p v-if="content" :id="contentId">{{ content }}</p>
        <slot />
      </div>
      <div class="sky-dialog__buttons"><slot name="buttons" /></div>
    </section>
  </div>
</template>
