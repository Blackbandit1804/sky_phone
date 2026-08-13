<script setup lang="ts">
import { computed } from 'vue'

import { useComposedFieldValue } from '@/ui/controls/useComposedFieldValue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    ariaLabel?: string
    disabled?: boolean
    id?: string
    modelValue?: string
    name?: string
    outline?: boolean
    placeholder?: string
    value?: string
  }>(),
  {
    ariaLabel: '',
    disabled: false,
    id: undefined,
    modelValue: undefined,
    name: undefined,
    outline: true,
    placeholder: '',
    value: '',
  },
)

const emit = defineEmits<{
  blur: [event: FocusEvent]
  change: [event: Event]
  focus: [event: FocusEvent]
  input: [event: Event]
  keydown: [event: KeyboardEvent]
  'update:modelValue': [value: string]
}>()

const effectiveValue = computed(() => props.modelValue ?? props.value ?? '')
const { endComposition, input, localValue, startComposition } =
  useComposedFieldValue(effectiveValue, (value) =>
    emit('update:modelValue', value),
  )

function fieldValue(event: Event): string {
  return event.target instanceof HTMLTextAreaElement ? event.target.value : ''
}

function handleInput(event: Event): void {
  input(fieldValue(event))
  emit('input', event)
}

function handleCompositionEnd(event: CompositionEvent): void {
  endComposition(fieldValue(event))
}
</script>

<template>
  <div
    v-bind="$attrs"
    class="sky-messagebar"
    :class="{ 'sky-messagebar--outline': outline }"
  >
    <div v-if="$slots.left" class="sky-messagebar__left">
      <slot name="left" />
    </div>
    <textarea
      :id="id"
      :aria-label="ariaLabel || placeholder || undefined"
      :disabled="disabled"
      :name="name"
      :placeholder="placeholder"
      :value="localValue"
      rows="1"
      @blur="emit('blur', $event)"
      @change="emit('change', $event)"
      @compositionend="handleCompositionEnd"
      @compositionstart="startComposition"
      @focus="emit('focus', $event)"
      @input="handleInput"
      @keydown="emit('keydown', $event)"
    ></textarea>
    <div v-if="$slots.right" class="sky-messagebar__right">
      <slot name="right" />
    </div>
  </div>
</template>
