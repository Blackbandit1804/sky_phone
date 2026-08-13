<script setup lang="ts">
withDefaults(defineProps<{ bold?: boolean; disabled?: boolean }>(), {
  bold: false,
  disabled: false,
})
</script>

<template>
  <button
    type="button"
    class="sky-action-button"
    :class="{ 'sky-action-button--bold': bold }"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
