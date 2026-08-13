<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    active?: boolean
    ariaLabel?: string
    disabled?: boolean
    label?: string
    type?: 'button' | 'reset' | 'submit'
  }>(),
  {
    active: false,
    ariaLabel: '',
    disabled: false,
    label: '',
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
    class="sky-tab-button"
    :class="{ 'sky-tab-button--active': active }"
    :aria-current="active ? 'page' : undefined"
    :aria-label="ariaLabel || undefined"
    :disabled="disabled"
    :type="type"
    @click="$emit('click', $event)"
  >
    <span v-if="$slots.icon" class="sky-tab-button__icon">
      <slot name="icon" />
    </span>
    <span v-if="label || $slots.label" class="sky-tab-button__label">
      <slot name="label">{{ label }}</slot>
    </span>
    <slot />
  </button>
</template>
