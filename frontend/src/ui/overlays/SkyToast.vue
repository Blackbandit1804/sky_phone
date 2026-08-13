<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{ opened: boolean; position?: 'bottom' | 'center' | 'top' }>(),
  { position: 'bottom' },
)
</script>

<template>
  <div
    v-if="opened"
    v-bind="$attrs"
    class="sky-toast"
    :class="`sky-toast--${position}`"
    role="status"
    aria-live="polite"
  >
    <slot />
  </div>
</template>
