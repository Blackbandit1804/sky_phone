<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    component?: 'a' | 'button' | 'span'
    disabled?: boolean
    href?: string
    selected?: boolean
    type?: 'button' | 'reset' | 'submit'
  }>(),
  {
    component: 'button',
    disabled: false,
    href: undefined,
    selected: undefined,
    type: 'button',
  },
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const elementProps = computed<Record<string, unknown>>(() => {
  if (props.component === 'button') {
    return { disabled: props.disabled, type: props.type }
  }

  if (props.component === 'a') {
    return {
      'aria-disabled': props.disabled || undefined,
      href: props.disabled ? undefined : props.href,
      tabindex: props.disabled ? -1 : undefined,
    }
  }

  return {}
})

function handleClick(event: MouseEvent): void {
  if (props.disabled) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  emit('click', event)
}
</script>

<template>
  <component
    :is="component"
    v-bind="{ ...$attrs, ...elementProps }"
    class="sky-chip"
    :class="{ 'sky-chip--selected': selected }"
    :aria-pressed="
      component === 'button' && selected !== undefined ? selected : undefined
    "
    @click="handleClick"
  >
    <slot />
  </component>
</template>
