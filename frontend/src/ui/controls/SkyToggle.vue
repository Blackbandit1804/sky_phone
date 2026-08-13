<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    ariaLabel?: string
    ariaDescribedby?: string
    ariaLabelledby?: string
    checked?: boolean
    disabled?: boolean
    id?: string
    modelValue?: boolean
    name?: string
  }>(),
  {
    ariaLabel: '',
    ariaDescribedby: '',
    ariaLabelledby: '',
    checked: false,
    disabled: false,
    id: undefined,
    modelValue: undefined,
    name: undefined,
  },
)

const emit = defineEmits<{
  change: [event: Event]
  'update:modelValue': [value: boolean]
}>()

const isChecked = computed(() => props.modelValue ?? props.checked)

function handleChange(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) return
  emit('update:modelValue', event.target.checked)
  emit('change', event)
}
</script>

<template>
  <label
    v-bind="$attrs"
    class="sky-toggle"
    :class="{
      'sky-toggle--checked': isChecked,
      'sky-toggle--disabled': disabled,
    }"
  >
    <input
      :id="id"
      class="sky-toggle__input"
      type="checkbox"
      :aria-describedby="ariaDescribedby || undefined"
      role="switch"
      :aria-label="ariaLabel || undefined"
      :aria-labelledby="ariaLabelledby || undefined"
      :checked="isChecked"
      :disabled="disabled"
      :name="name"
      @change="handleChange"
    />
    <span class="sky-toggle__track" aria-hidden="true">
      <span class="sky-toggle__thumb" />
    </span>
    <span v-if="$slots.default" class="sky-toggle__label">
      <slot />
    </span>
  </label>
</template>
