<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    component?: 'div' | 'h2' | 'h3'
  }>(),
  {
    component: 'h2',
  },
)
</script>

<template>
  <component :is="component" v-bind="$attrs" class="sky-block-title">
    <slot />
  </component>
</template>
