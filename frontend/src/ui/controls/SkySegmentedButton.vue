<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    active?: boolean
    disabled?: boolean
    type?: 'button' | 'reset' | 'submit'
  }>(),
  {
    active: false,
    disabled: false,
    type: 'button',
  },
)

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<template>
  <button
    v-bind="$attrs"
    class="sky-segmented-button"
    :class="{ 'sky-segmented-button--active': active }"
    :aria-pressed="active"
    :disabled="disabled"
    :type="type"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>
