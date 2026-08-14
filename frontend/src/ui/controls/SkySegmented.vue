<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

import { useSkyNavbar } from '../navbar-context'
import SkyGlass from './SkyGlass.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    activeIndex?: number
    ariaLabel?: string
    compact?: boolean
    glassHighlight?: boolean
    itemCount?: number
    navigation?: boolean
    outline?: boolean
    raised?: boolean
    rounded?: boolean
    strong?: boolean
  }>(),
  {
    activeIndex: 0,
    ariaLabel: '',
    compact: false,
    glassHighlight: true,
    itemCount: 0,
    navigation: undefined,
    outline: false,
    raised: false,
    rounded: false,
    strong: true,
  },
)

const insideNavbar = useSkyNavbar()
const isNavbarSegmented = computed(
  () => insideNavbar && typeof props.navigation === 'undefined',
)
const isNavigation = computed(() => props.navigation === true)
const usesGlass = computed(() => isNavigation.value || isNavbarSegmented.value)
const rootComponent = computed(() => (usesGlass.value ? SkyGlass : 'div'))
const indicatorStyle = computed<CSSProperties | undefined>(() => {
  const itemCount = Number.isFinite(props.itemCount)
    ? Math.max(0, Math.floor(props.itemCount))
    : 0
  if (!usesGlass.value || !props.strong || itemCount === 0) return undefined

  const requestedIndex = Number.isFinite(props.activeIndex)
    ? Math.floor(props.activeIndex)
    : 0
  const activeIndex = Math.max(0, Math.min(itemCount - 1, requestedIndex))
  const widthPercentage = Number((100 / itemCount).toFixed(4))
  const spacing = Number(((8 + (itemCount - 1) * 4) / itemCount).toFixed(4))
  const percentageOffset = activeIndex * 100
  const pixelOffset = activeIndex * 4

  return {
    '--sky-segmented-indicator-offset': `calc(${percentageOffset}% + ${pixelOffset}px)`,
    '--sky-segmented-indicator-offset-rtl': `calc(-${percentageOffset}% - ${pixelOffset}px)`,
    width: `calc(${widthPercentage}% - ${spacing}px)`,
  }
})
</script>

<template>
  <component
    :is="rootComponent"
    v-bind="$attrs"
    :highlight="usesGlass ? glassHighlight : undefined"
    class="sky-segmented"
    :class="{
      'sky-segmented--navigation': isNavigation,
      'sky-segmented--navbar': isNavbarSegmented,
      'sky-segmented--compact': compact,
      'sky-segmented--outline': outline,
      'sky-segmented--raised': raised,
      'sky-segmented--rounded': rounded,
      'sky-segmented--strong': strong,
    }"
    role="group"
    :aria-label="ariaLabel || undefined"
  >
    <slot />
    <span
      v-if="indicatorStyle"
      class="sky-segmented__highlight"
      :style="indicatorStyle"
      aria-hidden="true"
    />
  </component>
</template>
