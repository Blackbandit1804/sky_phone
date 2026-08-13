<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next'
import {
  computed,
  onBeforeUnmount,
  ref,
  useSlots,
  watch,
  type CSSProperties,
} from 'vue'

import { getSkyNavbarCollapseState } from './navbar-collapse'
import { provideSkyNavbar } from './navbar-context'
import { useSkyPageScroll } from './page-scroll-context'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    backAppearance?: 'plain' | 'surface'
    backLabel?: string
    outline?: boolean
    showBack?: boolean
    showBackText?: boolean
    scrollEl?: HTMLElement | null
    subnavbarClass?: string
    subtitle?: string
    title: string
    transparent?: boolean
    variant?: 'compact' | 'large' | 'medium'
  }>(),
  {
    backAppearance: 'plain',
    backLabel: '',
    outline: false,
    showBack: false,
    showBackText: false,
    subnavbarClass: '',
    subtitle: '',
    transparent: false,
    variant: 'compact',
  },
)

const emit = defineEmits<{
  back: []
}>()

provideSkyNavbar()

const slots = useSlots()
const pageScroll = useSkyPageScroll()
const accessibleBackLabel = computed(() => props.backLabel || props.title)
const hasExtendedTitle = computed(() => props.variant !== 'compact')
const isCollapsible = computed(
  () => hasExtendedTitle.value || props.transparent,
)
const titleHeight = computed(() => (props.variant === 'large' ? 52 : 44))
const effectiveScrollElement = computed(() =>
  props.scrollEl === undefined
    ? (pageScroll?.element.value ?? null)
    : props.scrollEl,
)
const collapseState = ref(getSkyNavbarCollapseState(0, titleHeight.value))
const collapseStyle = computed<CSSProperties>(
  () =>
    ({
      '--sky-navbar-collapse-offset': `${collapseState.value.offset}px`,
      '--sky-navbar-compact-title-opacity': `${collapseState.value.compactTitleOpacity}`,
      '--sky-navbar-extended-title-opacity': `${collapseState.value.extendedTitleOpacity}`,
    }) as CSSProperties,
)

let observedScrollElement: HTMLElement | null = null
let animationFrame = 0

function updateCollapse(): void {
  animationFrame = 0
  collapseState.value = isCollapsible.value
    ? getSkyNavbarCollapseState(
        observedScrollElement?.scrollTop ?? 0,
        titleHeight.value,
        hasExtendedTitle.value,
      )
    : getSkyNavbarCollapseState(0, titleHeight.value)
  if (pageScroll) pageScroll.collapseOffset.value = collapseState.value.offset
}

function scheduleCollapseUpdate(): void {
  if (animationFrame) return
  animationFrame = window.requestAnimationFrame(updateCollapse)
}

function detachScrollElement(): void {
  observedScrollElement?.removeEventListener('scroll', scheduleCollapseUpdate)
  observedScrollElement = null
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame)
    animationFrame = 0
  }
}

watch(
  [effectiveScrollElement, isCollapsible, titleHeight],
  ([element]) => {
    detachScrollElement()
    observedScrollElement = element
    if (element && isCollapsible.value) {
      element.addEventListener('scroll', scheduleCollapseUpdate, {
        passive: true,
      })
    }
    updateCollapse()
  },
  { flush: 'post', immediate: true },
)

onBeforeUnmount(() => {
  detachScrollElement()
  if (pageScroll) pageScroll.collapseOffset.value = 0
})

function hasLeftContent(): boolean {
  return props.showBack || Boolean(slots.left)
}

function hasRightContent(): boolean {
  return Boolean(slots.right)
}

function hasNavigationRow(): boolean {
  return !hasExtendedTitle.value || hasLeftContent() || hasRightContent()
}
</script>

<template>
  <header
    v-bind="$attrs"
    class="sky-navbar"
    :class="[
      `sky-navbar--${variant}`,
      {
        'sky-navbar--outline': outline,
        'sky-navbar--transparent': transparent,
        'sky-navbar--with-subnavbar': Boolean($slots.subnavbar),
        'sky-navbar--no-navigation': !hasNavigationRow(),
      },
    ]"
    :style="collapseStyle"
  >
    <div class="sky-navbar__blur" aria-hidden="true" />
    <div class="sky-navbar__background" aria-hidden="true" />

    <div v-if="hasNavigationRow()" class="sky-navbar__inner">
      <div v-if="hasLeftContent()" class="sky-navbar__left">
        <slot name="left">
          <button
            v-if="showBack"
            type="button"
            class="sky-navbar__back"
            :class="`sky-navbar__back--${backAppearance}`"
            :aria-label="accessibleBackLabel"
            @click="emit('back')"
          >
            <ChevronLeft :size="26" :stroke-width="2" aria-hidden="true" />
            <span v-if="showBackText" class="sky-navbar__back-label">
              {{ backLabel }}
            </span>
          </button>
        </slot>
      </div>

      <div v-if="!hasExtendedTitle" class="sky-navbar__heading">
        <h1 class="sky-navbar__title">
          <slot name="title">{{ title }}</slot>
        </h1>
        <p v-if="subtitle || $slots.subtitle" class="sky-navbar__subtitle">
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </div>

      <div v-if="hasRightContent()" class="sky-navbar__right">
        <slot name="right" />
      </div>
    </div>

    <div v-if="hasExtendedTitle" class="sky-navbar__title-container">
      <div>
        <h1 class="sky-navbar__title">
          <slot name="title">{{ title }}</slot>
        </h1>
        <p v-if="subtitle || $slots.subtitle" class="sky-navbar__subtitle">
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </div>
    </div>

    <div
      v-if="hasExtendedTitle"
      class="sky-navbar__collapsed-heading"
      aria-hidden="true"
    >
      <span class="sky-navbar__title">
        <slot name="title">{{ title }}</slot>
      </span>
    </div>

    <div
      v-if="$slots.subnavbar"
      class="sky-navbar__subnavbar"
      :class="subnavbarClass"
    >
      <slot name="subnavbar" />
    </div>
  </header>
</template>
