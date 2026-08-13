<script setup lang="ts">
withDefaults(
  defineProps<{
    name?: string
    text: string
    textFooter?: string
    type?: 'received' | 'sent'
  }>(),
  { name: '', textFooter: '', type: 'received' },
)
</script>

<template>
  <article class="sky-message" :class="`sky-message--${type}`">
    <small v-if="name" class="sky-message__name">{{ name }}</small>
    <p>{{ text }}</p>
    <time v-if="textFooter">{{ textFooter }}</time>
  </article>
</template>
