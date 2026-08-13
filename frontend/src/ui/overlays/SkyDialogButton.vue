<script setup lang="ts">
withDefaults(defineProps<{ disabled?: boolean; strong?: boolean }>(), {
  disabled: false,
  strong: false,
})
</script>

<template>
  <button
    type="button"
    class="sky-dialog-button"
    :class="{ 'sky-dialog-button--strong': strong }"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
