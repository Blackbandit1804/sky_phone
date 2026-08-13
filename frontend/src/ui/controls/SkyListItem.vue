<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    after?: number | string
    ariaLabel?: string
    disabled?: boolean
    header?: string
    href?: string
    label?: boolean
    link?: boolean
    linkComponent?: 'a' | 'button'
    linkProps?: Record<string, unknown>
    subtitle?: string
    title?: string
  }>(),
  {
    after: undefined,
    ariaLabel: '',
    disabled: false,
    header: '',
    href: undefined,
    label: false,
    link: false,
    linkComponent: 'button',
    linkProps: () => ({}),
    subtitle: '',
    title: '',
  },
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const rowComponent = computed(() => {
  if (props.link) return props.linkComponent
  if (props.label) return 'label'
  return 'div'
})

const rowProps = computed<Record<string, unknown>>(() => {
  if (!props.link) return {}

  if (props.linkComponent === 'a') {
    return {
      ...props.linkProps,
      'aria-disabled': props.disabled || undefined,
      href: props.disabled ? undefined : props.href,
      tabindex: props.disabled ? -1 : undefined,
    }
  }

  return {
    ...props.linkProps,
    disabled: props.disabled,
    type: props.linkProps.type ?? 'button',
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
  <li
    v-bind="$attrs"
    class="sky-list-item"
    :class="{
      'sky-list-item--disabled': disabled,
      'sky-list-item--label': label,
      'sky-list-item--link': link,
    }"
  >
    <component
      :is="rowComponent"
      v-bind="rowProps"
      class="sky-list-item__row"
      :aria-label="ariaLabel || undefined"
      @click="handleClick"
    >
      <span v-if="$slots.media" class="sky-list-item__media">
        <slot name="media" />
      </span>

      <span class="sky-list-item__content">
        <small v-if="header || $slots.header" class="sky-list-item__header">
          <slot name="header">{{ header }}</slot>
        </small>
        <strong v-if="title || $slots.title" class="sky-list-item__title">
          <slot name="title">{{ title }}</slot>
        </strong>
        <span
          v-if="subtitle || $slots.subtitle"
          class="sky-list-item__subtitle"
        >
          <slot name="subtitle">{{ subtitle }}</slot>
        </span>
        <slot />
      </span>

      <span
        v-if="after !== undefined || $slots.after"
        class="sky-list-item__after"
      >
        <slot name="after">{{ after }}</slot>
      </span>
      <span v-if="link" class="sky-list-item__chevron" aria-hidden="true" />
    </component>
  </li>
</template>
