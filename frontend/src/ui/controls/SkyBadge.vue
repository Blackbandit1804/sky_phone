<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    component?: string
    small?: boolean
    tone?: 'danger' | 'info' | 'neutral' | 'success' | 'warning'
  }>(),
  {
    component: 'span',
    small: false,
    tone: 'neutral',
  },
)
</script>

<template>
  <component
    :is="component"
    v-bind="$attrs"
    class="sky-badge"
    :class="[`sky-badge--${tone}`, { 'sky-badge--small': small }]"
  >
    <slot />
  </component>
</template>
