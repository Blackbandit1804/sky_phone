<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    component?: 'div' | 'ol' | 'ul'
    density?: 'compact' | 'regular'
    flush?: boolean
    inset?: boolean
    nested?: boolean
    strong?: boolean
  }>(),
  {
    component: 'ul',
    density: 'regular',
    flush: false,
    inset: false,
    nested: false,
    strong: false,
  },
)
</script>

<template>
  <component
    :is="component"
    v-bind="$attrs"
    class="sky-list"
    :class="{
      'sky-list--inset': inset,
      'sky-list--nested': nested,
      'sky-list--strong': strong,
      'sky-list--compact': density === 'compact',
      'sky-list--flush': flush,
    }"
    :role="component === 'div' ? 'list' : undefined"
  >
    <slot />
  </component>
</template>
