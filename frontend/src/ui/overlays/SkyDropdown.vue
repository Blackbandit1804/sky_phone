<script setup lang="ts">
import { Check, ChevronRight } from 'lucide-vue-next'

import SkyPopover from './SkyPopover.vue'

defineOptions({ inheritAttrs: false })

interface SkyDropdownItem {
  checked?: boolean
  destructive?: boolean
  disabled?: boolean
  id: string
  label: string
  separatorBefore?: boolean
  submenu?: boolean
}

withDefaults(
  defineProps<{
    items: readonly SkyDropdownItem[]
    label: string
    opened: boolean
    placement?: 'auto' | 'bottom' | 'left' | 'right' | 'top'
    target: HTMLElement | string | null
  }>(),
  {
    placement: 'bottom',
  },
)

const emit = defineEmits<{
  backdropclick: [event: MouseEvent]
  escape: [event: KeyboardEvent]
  positionerror: [reason: string]
  select: [id: string, event: MouseEvent]
}>()
</script>

<template>
  <SkyPopover
    v-bind="$attrs"
    class="sky-dropdown"
    :aria-label="label"
    :opened="opened"
    :placement="placement"
    role="menu"
    :target="target"
    @backdropclick="emit('backdropclick', $event)"
    @escape="emit('escape', $event)"
    @positionerror="emit('positionerror', $event)"
  >
    <div class="sky-dropdown__menu">
      <button
        v-for="item in items"
        :key="item.id"
        class="sky-dropdown__item"
        :class="{
          'sky-dropdown__item--destructive': item.destructive,
          'sky-dropdown__item--separator': item.separatorBefore,
        }"
        :aria-checked="item.checked === undefined ? undefined : item.checked"
        :aria-haspopup="item.submenu ? 'menu' : undefined"
        :disabled="item.disabled"
        :role="item.checked === undefined ? 'menuitem' : 'menuitemradio'"
        type="button"
        @click="emit('select', item.id, $event)"
      >
        <span class="sky-dropdown__indicator" aria-hidden="true">
          <Check v-if="item.checked" :size="21" :stroke-width="2.5" />
        </span>
        <span class="sky-dropdown__label">{{ item.label }}</span>
        <ChevronRight
          v-if="item.submenu"
          class="sky-dropdown__chevron"
          :size="21"
          :stroke-width="2.5"
          aria-hidden="true"
        />
      </button>
    </div>
  </SkyPopover>
</template>
