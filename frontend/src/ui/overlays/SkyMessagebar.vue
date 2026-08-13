<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{ disabled?: boolean; placeholder?: string; value?: string }>(),
  { disabled: false, placeholder: '', value: '' },
)

defineEmits<{
  input: [event: Event]
  keydown: [event: KeyboardEvent]
}>()
</script>

<template>
  <div v-bind="$attrs" class="sky-messagebar">
    <textarea
      :disabled="disabled"
      :placeholder="placeholder"
      :value="value"
      rows="1"
      @input="$emit('input', $event)"
      @keydown="$emit('keydown', $event)"
    ></textarea>
    <div v-if="$slots.right" class="sky-messagebar__right">
      <slot name="right" />
    </div>
  </div>
</template>
