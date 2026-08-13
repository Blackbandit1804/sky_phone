<script setup lang="ts">
defineOptions({ inheritAttrs: false })

defineProps<{
  label: string
}>()
</script>

<template>
  <nav v-bind="$attrs" class="sky-tabbar" :aria-label="label">
    <div class="sky-tabbar__inner">
      <div class="sky-tabbar__pane">
        <slot />
      </div>
    </div>
  </nav>
</template>
