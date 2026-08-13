<script setup lang="ts">
import { useSlots } from 'vue'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    component?: 'article' | 'div' | 'section'
    contentWrap?: boolean
    contentWrapPadding?: string
    footerDivider?: boolean
    headerDivider?: boolean
  }>(),
  {
    component: 'div',
    contentWrap: true,
    contentWrapPadding: '',
    footerDivider: false,
    headerDivider: false,
  },
)

const slots = useSlots()
</script>

<template>
  <component :is="component" v-bind="$attrs" class="sky-card">
    <div
      v-if="slots.header"
      class="sky-card__header"
      :class="{ 'sky-card__header--divider': headerDivider }"
    >
      <slot name="header" />
    </div>
    <div
      v-if="contentWrap"
      class="sky-card__content"
      :class="contentWrapPadding"
    >
      <slot />
    </div>
    <slot v-else />
    <div
      v-if="slots.footer"
      class="sky-card__footer"
      :class="{ 'sky-card__footer--divider': footerDivider }"
    >
      <slot name="footer" />
    </div>
  </component>
</template>
