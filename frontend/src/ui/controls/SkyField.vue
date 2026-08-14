<script setup lang="ts">
import { computed, ref, useId, useSlots, type CSSProperties } from 'vue'

import { useComposedFieldValue } from '@/ui/controls/useComposedFieldValue'

defineOptions({ inheritAttrs: false })

type FieldValue = number | string
type FieldOption = {
  disabled?: boolean
  label: string
  value: FieldValue
}

const props = withDefaults(
  defineProps<{
    ariaLabel?: string
    autocapitalize?:
      | 'characters'
      | 'none'
      | 'off'
      | 'on'
      | 'sentences'
      | 'words'
    autocomplete?: string
    autocorrect?: 'off' | 'on'
    clearButton?: boolean
    clearLabel?: string
    disabled?: boolean
    error?: string
    floatingLabel?: boolean
    help?: string
    id?: string
    inputMode?:
      | 'decimal'
      | 'email'
      | 'none'
      | 'numeric'
      | 'search'
      | 'tel'
      | 'text'
      | 'url'
    inputStyle?: CSSProperties
    label?: string
    layout?: 'inline' | 'stacked'
    max?: number | string
    maxlength?: number | string
    min?: number | string
    modelValue?: FieldValue
    name?: string
    outline?: boolean
    options?: readonly FieldOption[]
    pattern?: string
    placeholder?: string
    readonly?: boolean
    required?: boolean
    rows?: number
    spellcheck?: boolean
    step?: number | string
    type?:
      | 'date'
      | 'datetime-local'
      | 'email'
      | 'number'
      | 'password'
      | 'search'
      | 'select'
      | 'tel'
      | 'text'
      | 'textarea'
      | 'time'
      | 'url'
    value?: FieldValue
  }>(),
  {
    ariaLabel: '',
    autocapitalize: undefined,
    autocomplete: undefined,
    autocorrect: undefined,
    clearButton: false,
    clearLabel: '',
    disabled: false,
    error: '',
    floatingLabel: false,
    help: '',
    id: undefined,
    inputMode: undefined,
    inputStyle: undefined,
    label: '',
    layout: 'stacked',
    max: undefined,
    maxlength: undefined,
    min: undefined,
    modelValue: undefined,
    name: undefined,
    outline: false,
    options: () => [],
    pattern: undefined,
    placeholder: '',
    readonly: false,
    required: false,
    rows: 3,
    spellcheck: undefined,
    step: undefined,
    type: 'text',
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
const slots = useSlots()
const isFocused = ref(false)
const inputId = computed(() => props.id || generatedId)
const helpId = computed(() => `${inputId.value}-help`)
const errorId = computed(() => `${inputId.value}-error`)
const effectiveValue = computed(() => props.modelValue ?? props.value ?? '')
const {
  clear: clearValue,
  endComposition,
  input,
  localValue,
  startComposition,
} = useComposedFieldValue(effectiveValue, (value) =>
  emit('update:modelValue', value),
)
const hasClearButton = computed(
  () =>
    props.clearButton &&
    Boolean(props.clearLabel) &&
    localValue.value.length > 0,
)
const isFloatingRaised = computed(
  () =>
    Boolean(props.label) &&
    props.floatingLabel &&
    (isFocused.value || localValue.value.length > 0),
)

const describedBy = computed(() => {
  const ids: string[] = []
  if (props.help) ids.push(helpId.value)
  if (props.error) ids.push(errorId.value)
  return ids.length ? ids.join(' ') : undefined
})

function fieldValue(event: Event): string {
  const target = event.target
  if (
    !(target instanceof HTMLInputElement) &&
    !(target instanceof HTMLSelectElement) &&
    !(target instanceof HTMLTextAreaElement)
  ) {
    return ''
  }
  return target.value
}

function handleInput(event: Event): void {
  const value = fieldValue(event)
  input(value)
  emit('input', event)
}

function handleCompositionEnd(event: CompositionEvent): void {
  endComposition(fieldValue(event))
}

function handleFocus(event: FocusEvent): void {
  isFocused.value = true
  emit('focus', event)
}

function handleBlur(event: FocusEvent): void {
  isFocused.value = false
  emit('blur', event)
}

function clear(): void {
  if (props.disabled || props.readonly) return
  clearValue()
  emit('clear')
}
</script>

<template>
  <li
    v-bind="$attrs"
    class="sky-field"
    :class="{
      'sky-field--disabled': disabled,
      'sky-field--error': Boolean(error),
      'sky-field--floating-label': Boolean(label) && floatingLabel,
      'sky-field--floating-raised': isFloatingRaised,
      'sky-field--inline': layout === 'inline',
      'sky-field--outline': outline,
      'sky-field--has-leading': Boolean(slots.leading),
    }"
  >
    <label v-if="label" class="sky-field__label" :for="inputId">
      {{ label }}
    </label>
    <div class="sky-field__control">
      <span v-if="$slots.leading" class="sky-field__leading">
        <slot name="leading" />
      </span>
      <textarea
        v-if="type === 'textarea'"
        :id="inputId"
        class="sky-field__input sky-field__textarea"
        :aria-describedby="describedBy"
        :aria-invalid="error ? true : undefined"
        :aria-label="ariaLabel || undefined"
        :autocapitalize="autocapitalize"
        :autocorrect="autocorrect"
        :disabled="disabled"
        :maxlength="maxlength"
        :name="name"
        :placeholder="placeholder"
        :readonly="readonly"
        :required="required"
        :rows="rows"
        :spellcheck="spellcheck"
        :style="inputStyle"
        :value="localValue"
        @blur="handleBlur"
        @change="emit('change', $event)"
        @compositionend="handleCompositionEnd"
        @compositionstart="startComposition"
        @focus="handleFocus"
        @input="handleInput"
      />
      <select
        v-else-if="type === 'select'"
        :id="inputId"
        class="sky-field__input sky-field__select"
        :aria-describedby="describedBy"
        :aria-invalid="error ? true : undefined"
        :aria-label="ariaLabel || undefined"
        :disabled="disabled"
        :name="name"
        :required="required"
        :style="inputStyle"
        :value="localValue"
        @blur="handleBlur"
        @change="emit('change', $event)"
        @focus="handleFocus"
        @input="handleInput"
      >
        <option v-if="placeholder" disabled value="">
          {{ placeholder }}
        </option>
        <option
          v-for="(option, index) in options"
          :key="`${typeof option.value}:${String(option.value)}:${index}`"
          :disabled="option.disabled"
          :value="option.value"
        >
          {{ option.label }}
        </option>
        <slot />
      </select>
      <input
        v-else
        :id="inputId"
        class="sky-field__input"
        :aria-describedby="describedBy"
        :aria-invalid="error ? true : undefined"
        :aria-label="ariaLabel || undefined"
        :autocapitalize="autocapitalize"
        :autocomplete="autocomplete"
        :autocorrect="autocorrect"
        :disabled="disabled"
        :inputmode="inputMode"
        :max="max"
        :maxlength="maxlength"
        :min="min"
        :name="name"
        :pattern="pattern"
        :placeholder="placeholder"
        :readonly="readonly"
        :required="required"
        :step="step"
        :spellcheck="spellcheck"
        :style="inputStyle"
        :type="type"
        :value="localValue"
        @blur="handleBlur"
        @change="emit('change', $event)"
        @compositionend="handleCompositionEnd"
        @compositionstart="startComposition"
        @focus="handleFocus"
        @input="handleInput"
      />
      <span v-if="$slots.trailing" class="sky-field__trailing">
        <slot name="trailing" />
      </span>
      <button
        v-if="hasClearButton"
        class="sky-field__clear"
        type="button"
        :aria-label="clearLabel"
        :disabled="disabled || readonly"
        @pointerdown.prevent
        @click="clear"
      >
        <span aria-hidden="true" />
      </button>
    </div>
    <small v-if="help" :id="helpId" class="sky-field__help">{{ help }}</small>
    <small v-if="error" :id="errorId" class="sky-field__error" role="alert">
      {{ error }}
    </small>
  </li>
</template>
