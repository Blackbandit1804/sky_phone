<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

import { provideSkyPageScroll } from './page-scroll-context'
import { useSkyTheme } from './theme'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    accent?: string
    accentSoft?: string
    dark?: boolean
    label: string
  }>(),
  {
    accent: '',
    accentSoft: '',
    dark: undefined,
  },
)

const theme = useSkyTheme()
const pageScroll = provideSkyPageScroll()
const isDark = computed(() => props.dark ?? theme?.dark.value ?? false)
const effectiveAccent = computed(
  () => props.accent || theme?.accent.value || '',
)
const effectiveAccentSoft = computed(
  () => props.accentSoft || theme?.accentSoft.value || '',
)

const accentStyle = computed(() =>
  effectiveAccent.value || effectiveAccentSoft.value
    ? {
        ...(effectiveAccent.value
          ? { '--sky-app-accent': effectiveAccent.value }
          : {}),
        ...(effectiveAccentSoft.value
          ? { '--sky-app-accent-soft': effectiveAccentSoft.value }
          : {}),
      }
    : undefined,
)
const pageStyle = computed<CSSProperties>(
  () =>
    ({
      ...(accentStyle.value ?? {}),
      '--sky-page-collapse-offset': `${pageScroll.collapseOffset.value}px`,
    }) as CSSProperties,
)
</script>

<template>
  <main
    v-bind="$attrs"
    class="sky-app-page"
    :class="{ 'sky-app-page--dark': isDark }"
    :style="pageStyle"
    :aria-label="label"
  >
    <div class="sky-app-page__backdrop" aria-hidden="true"></div>
    <slot />
  </main>
</template>
