<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    component?: 'div' | 'nav'
  }>(),
  {
    component: 'div',
  },
)
</script>

<template>
  <component :is="component" v-bind="$attrs" class="sky-toolbar-pane">
    <slot />
  </component>
</template>
