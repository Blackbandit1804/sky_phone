<script setup lang="ts">
import { computed } from 'vue'

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
    dark: false,
  },
)

const accentStyle = computed(() =>
  props.accent || props.accentSoft
    ? {
        ...(props.accent ? { '--sky-app-accent': props.accent } : {}),
        ...(props.accentSoft
          ? { '--sky-app-accent-soft': props.accentSoft }
          : {}),
      }
    : undefined,
)
</script>

<template>
  <main
    v-bind="$attrs"
    class="sky-app-page"
    :class="{ 'sky-app-page--dark': dark }"
    :style="accentStyle"
    :aria-label="label"
  >
    <div class="sky-app-page__backdrop" aria-hidden="true"></div>
    <slot />
  </main>
</template>
