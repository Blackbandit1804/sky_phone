<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    clearLabel: string
    disabled?: boolean
    id?: string
    label?: string
    modelValue?: string
    name?: string
    placeholder?: string
    value?: string
  }>(),
  {
    disabled: false,
    id: undefined,
    label: '',
    modelValue: undefined,
    name: undefined,
    placeholder: '',
    value: undefined,
  },
)

const emit = defineEmits<{
  blur: [event: FocusEvent]
  change: [event: Event]
  clear: []
  focus: [event: FocusEvent]
  input: [event: Event]
  'update:modelValue': [value: string]
}>()

const generatedId = useId()
const inputId = computed(() => props.id || generatedId)
const effectiveValue = computed(() => props.modelValue ?? props.value ?? '')
const localValue = ref(effectiveValue.value)
const composing = ref(false)

watch(effectiveValue, (value) => {
  if (!composing.value) localValue.value = value
})

function handleInput(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) return
  localValue.value = event.target.value
  emit('update:modelValue', event.target.value)
  emit('input', event)
}

function handleCompositionEnd(event: CompositionEvent): void {
  composing.value = false
  if (!(event.target instanceof HTMLInputElement)) return
  localValue.value = event.target.value
  emit('update:modelValue', event.target.value)
}

function clear(): void {
  if (props.disabled) return
  localValue.value = ''
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<template>
  <div
    v-bind="$attrs"
    class="sky-searchbar"
    :class="{ 'sky-searchbar--disabled': disabled }"
  >
    <label v-if="label" class="sky-visually-hidden" :for="inputId">
      {{ label }}
    </label>
    <span class="sky-searchbar__icon" aria-hidden="true" />
    <input
      :id="inputId"
      class="sky-searchbar__input"
      type="search"
      :aria-label="label || placeholder || undefined"
      autocomplete="off"
      :disabled="disabled"
      :name="name"
      :placeholder="placeholder"
      :value="localValue"
      @blur="emit('blur', $event)"
      @change="emit('change', $event)"
      @compositionend="handleCompositionEnd"
      @compositionstart="composing = true"
      @focus="emit('focus', $event)"
      @input="handleInput"
    />
    <button
      v-if="localValue"
      class="sky-searchbar__clear"
      type="button"
      :aria-label="clearLabel"
      :disabled="disabled"
      @click="clear"
    >
      <span aria-hidden="true" />
    </button>
  </div>
</template>
