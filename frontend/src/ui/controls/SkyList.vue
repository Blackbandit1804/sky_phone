<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    component?: 'div' | 'ol' | 'ul'
    density?: 'compact' | 'regular'
    dividers?: boolean
    flush?: boolean
    inset?: boolean
    menu?: boolean
    nested?: boolean
    outline?: boolean
    strong?: boolean
  }>(),
  {
    component: 'ul',
    density: 'regular',
    dividers: true,
    flush: false,
    inset: false,
    menu: false,
    nested: false,
    outline: false,
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
      'sky-list--dividers': dividers,
      'sky-list--menu': menu,
      'sky-list--nested': nested,
      'sky-list--outline': outline,
      'sky-list--strong': strong,
      'sky-list--compact': density === 'compact',
      'sky-list--flush': flush,
    }"
    :role="component === 'div' ? 'list' : undefined"
  >
    <slot />
  </component>
</template>
