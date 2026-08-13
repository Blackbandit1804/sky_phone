<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    component?: 'div' | 'section'
    inset?: boolean
    strong?: boolean
  }>(),
  {
    component: 'div',
    inset: false,
    strong: false,
  },
)
</script>

<template>
  <component
    :is="component"
    v-bind="$attrs"
    class="sky-block"
    :class="{
      'sky-block--inset': inset,
      'sky-block--strong': strong,
    }"
  >
    <slot />
  </component>
</template>
