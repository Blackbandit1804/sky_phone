<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    ariaLabel: string
    component?: 'a' | 'button'
    disabled?: boolean
    href?: string
    showText?: boolean
    text?: string
    type?: 'button' | 'reset' | 'submit'
  }>(),
  {
    component: 'button',
    disabled: false,
    href: undefined,
    showText: false,
    text: '',
    type: 'button',
  },
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const accessibleLabel = computed(
  () => props.ariaLabel || (props.showText ? props.text : undefined),
)
const elementProps = computed<Record<string, unknown>>(() => {
  const common = {
    'aria-label': accessibleLabel.value || undefined,
  }

  if (props.component === 'a') {
    return {
      ...common,
      'aria-disabled': props.disabled || undefined,
      href: props.disabled ? undefined : props.href,
      tabindex: props.disabled ? -1 : undefined,
    }
  }

  return {
    ...common,
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
    class="sky-navbar-back-link"
    :class="{
      'sky-navbar-back-link--disabled': disabled,
      'sky-navbar-back-link--with-text': showText,
    }"
    @click="handleClick"
  >
    <span class="sky-navbar-back-link__icon" aria-hidden="true">
      <span class="sky-navbar-back-link__chevron" />
    </span>
    <span v-if="showText && text" class="sky-navbar-back-link__text">
      {{ text }}
    </span>
    <slot />
  </component>
</template>
