<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    as?: string
    withTabbar?: boolean
  }>(),
  {
    as: 'section',
    withTabbar: false,
  },
)
</script>

<template>
  <component
    :is="as"
    v-bind="$attrs"
    class="sky-scroll-area"
    :class="{ 'sky-scroll-area--tabbar': withTabbar }"
  >
    <slot />
  </component>
</template>
