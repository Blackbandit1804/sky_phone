<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    floating?: boolean
    label: string
  }>(),
  {
    floating: false,
  },
)
</script>

<template>
  <nav
    v-bind="$attrs"
    class="sky-tabbar"
    :class="{ 'sky-tabbar--floating': floating }"
    :aria-label="label"
  >
    <div class="sky-tabbar__inner">
      <div class="sky-tabbar__pane">
        <slot />
      </div>
    </div>
  </nav>
</template>
