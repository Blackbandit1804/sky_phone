<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    block?: boolean
    clear?: boolean
    component?: 'a' | 'button'
    disabled?: boolean
    href?: string
    iconOnly?: boolean
    inline?: boolean
    large?: boolean
    outline?: boolean
    raised?: boolean
    rounded?: boolean
    small?: boolean
    tonal?: boolean
    type?: 'button' | 'reset' | 'submit'
    variant?: 'danger' | 'plain' | 'primary' | 'secondary'
  }>(),
  {
    block: false,
    clear: false,
    component: 'button',
    disabled: false,
    href: undefined,
    iconOnly: false,
    inline: false,
    large: false,
    outline: false,
    raised: false,
    rounded: false,
    small: false,
    tonal: false,
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
        'sky-button--clear': clear,
        'sky-button--icon-only': iconOnly,
        'sky-button--inline': inline,
        'sky-button--large': large,
        'sky-button--outline': outline,
        'sky-button--raised': raised,
        'sky-button--rounded': rounded,
        'sky-button--small': small && !large,
        'sky-button--tonal': tonal,
      },
    ]"
    @click="handleClick"
  >
    <slot />
  </component>
</template>
