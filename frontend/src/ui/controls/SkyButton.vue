<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    block?: boolean
    component?: 'a' | 'button'
    disabled?: boolean
    href?: string
    iconOnly?: boolean
    large?: boolean
    outline?: boolean
    rounded?: boolean
    type?: 'button' | 'reset' | 'submit'
    variant?: 'danger' | 'plain' | 'primary' | 'secondary'
  }>(),
  {
    block: false,
    component: 'button',
    disabled: false,
    href: undefined,
    iconOnly: false,
    large: false,
    outline: false,
    rounded: false,
    type: 'button',
    variant: 'primary',
  },
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const elementProps = computed<Record<string, unknown>>(() => {
  if (props.component === 'a') {
    return {
      'aria-disabled': props.disabled || undefined,
      href: props.disabled ? undefined : props.href,
      tabindex: props.disabled ? -1 : undefined,
    }
  }

  return {
    disabled: props.disabled,
    type: props.type,
  }
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
    class="sky-button"
    :class="[
      `sky-button--${variant}`,
      {
        'sky-button--block': block,
        'sky-button--icon-only': iconOnly,
        'sky-button--large': large,
        'sky-button--outline': outline,
        'sky-button--rounded': rounded,
      },
    ]"
    @click="handleClick"
  >
    <slot />
  </component>
</template>
