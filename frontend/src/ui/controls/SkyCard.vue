<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    component?: 'article' | 'div' | 'section'
    contentWrap?: boolean
  }>(),
  {
    component: 'div',
    contentWrap: true,
  },
)
</script>

<template>
  <component :is="component" v-bind="$attrs" class="sky-card">
    <div v-if="contentWrap" class="sky-card__content">
      <slot />
    </div>
    <slot v-else />
  </component>
</template>
