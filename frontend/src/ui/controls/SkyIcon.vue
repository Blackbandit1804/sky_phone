<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label?: string
    size?: number | string
  }>(),
  {
    label: '',
    size: undefined,
  },
)

const iconStyle = computed<CSSProperties | undefined>(() => {
  if (props.size === undefined) return undefined
  const size = typeof props.size === 'number' ? `${props.size}px` : props.size
  return { height: size, width: size }
})
</script>

<template>
  <span
    v-bind="$attrs"
    class="sky-icon"
    :style="iconStyle"
    :aria-hidden="label ? undefined : true"
    :aria-label="label || undefined"
    :role="label ? 'img' : undefined"
  >
    <slot />
  </span>
</template>
