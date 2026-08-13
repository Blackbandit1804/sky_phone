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
    size: 20,
  },
)

const spinnerStyle = computed<CSSProperties>(() => {
  const size = typeof props.size === 'number' ? `${props.size}px` : props.size
  return { height: size, width: size }
})
</script>

<template>
  <span
    v-bind="$attrs"
    class="sky-spinner"
    :style="spinnerStyle"
    :aria-hidden="label ? undefined : true"
    :aria-label="label || undefined"
    :role="label ? 'status' : undefined"
  />
</template>
