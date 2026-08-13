<script setup lang="ts">
import { nextTick, ref, toRef, watch } from 'vue'
import { useOverlayFocusTrap } from './useOverlayFocusTrap'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    ariaDescribedby?: string
    ariaLabel?: string
    ariaLabelledby?: string
    ariaModal?: boolean | 'false' | 'true'
    label?: string
    opened: boolean
    role?: 'alertdialog' | 'dialog' | 'none' | 'presentation'
    tabindex?: number | string
  }>(),
  {
    ariaModal: true,
    tabindex: -1,
  },
)
const emit = defineEmits<{
  backdropclick: []
  escape: [event: KeyboardEvent]
}>()

const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const inferredRole = ref<'alertdialog' | 'dialog' | 'none' | 'presentation'>()

watch(
  [toRef(props, 'opened'), toRef(props, 'role')],
  async ([opened]) => {
    inferredRole.value = undefined
    if (!opened) return

    await nextTick()
    if (!props.opened || !panel.value) return

    const nestedDialog = panel.value.querySelector(
      '[role="dialog"], [role="alertdialog"]',
    )
    inferredRole.value = props.role ?? (nestedDialog ? undefined : 'dialog')
  },
  { immediate: true, flush: 'post' },
)

useOverlayFocusTrap({
  onEscape: (event) => emit('escape', event),
  opened: toRef(props, 'opened'),
  panel,
  root,
})
</script>

<template>
  <div v-if="opened" ref="root" v-bind="$attrs" class="sky-action-sheet">
    <div
      class="sky-overlay-backdrop"
      aria-hidden="true"
      @click="emit('backdropclick')"
    ></div>
    <div
      ref="panel"
      class="sky-action-sheet__panel"
      :role="inferredRole"
      :aria-modal="
        inferredRole === 'dialog' || inferredRole === 'alertdialog'
          ? ariaModal
          : undefined
      "
      :aria-label="inferredRole ? ariaLabel || label || undefined : undefined"
      :aria-labelledby="inferredRole ? ariaLabelledby : undefined"
      :aria-describedby="inferredRole ? ariaDescribedby : undefined"
      :tabindex="tabindex"
    >
      <slot />
    </div>
  </div>
</template>
