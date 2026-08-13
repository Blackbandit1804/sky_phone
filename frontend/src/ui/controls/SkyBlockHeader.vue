<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    component?: 'div' | 'header' | 'section'
    inset?: boolean
  }>(),
  {
    component: 'header',
    inset: false,
  },
)
</script>

<template>
  <component
    :is="component"
    v-bind="$attrs"
    class="sky-block-header"
    :class="{ 'sky-block-header--inset': inset }"
  >
    <slot />
  </component>
</template>
