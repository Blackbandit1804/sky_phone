<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next'
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    backAppearance?: 'plain' | 'surface'
    backLabel?: string
    showBack?: boolean
    showBackText?: boolean
    title: string
    variant?: 'compact' | 'large'
  }>(),
  {
    backAppearance: 'plain',
    backLabel: '',
    showBack: false,
    showBackText: false,
    variant: 'compact',
  },
)

const emit = defineEmits<{
  back: []
}>()

const accessibleBackLabel = computed(() => props.backLabel || props.title)
</script>

<template>
  <header v-bind="$attrs" class="sky-navbar" :class="`sky-navbar--${variant}`">
    <div class="sky-navbar__left">
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

    <h1 class="sky-navbar__title">{{ title }}</h1>

    <div class="sky-navbar__right">
      <slot name="right" />
    </div>
  </header>
</template>
