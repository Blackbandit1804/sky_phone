<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    tone?: 'danger' | 'info' | 'neutral' | 'success' | 'warning'
  }>(),
  {
    tone: 'neutral',
  },
)
</script>

<template>
  <span v-bind="$attrs" class="sky-badge" :class="`sky-badge--${tone}`">
    <slot />
  </span>
</template>
