<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    ariaLabel?: string
  }>(),
  {
    ariaLabel: '',
  },
)
</script>

<template>
  <div
    v-bind="$attrs"
    class="sky-segmented"
    role="group"
    :aria-label="ariaLabel || undefined"
  >
    <slot />
  </div>
</template>
