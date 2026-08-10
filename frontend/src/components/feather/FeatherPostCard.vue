<script setup lang="ts">
import {
  Bookmark,
  CheckCircle2,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
  UserRound,
} from 'lucide-vue-next'
import { kButton, kGlass, kIcon } from 'konsta/vue'
import { computed, ref } from 'vue'

import { usePhoneStore } from '@/stores/phone'
import type { FeatherPost } from '@/types/feather'

const props = defineProps<{ post: FeatherPost }>()
defineEmits<{
  follow: [post: FeatherPost]
  menu: [post: FeatherPost]
  open: [post: FeatherPost]
  profile: [profileId: number]
  react: [post: FeatherPost, kind: 'like' | 'bookmark']
  reply: [post: FeatherPost]
  share: [post: FeatherPost]
}>()

const phone = usePhoneStore()
const expanded = ref(false)
const shouldTruncate = computed(() => props.post.body.length > 260)
const visibleBody = computed(() =>
  shouldTruncate.value && !expanded.value
    ? `${props.post.body.slice(0, 260).trimEnd()}…`
    : props.post.body,
)
const leadingMention = computed(
  () => visibleBody.value.match(/^@[a-z0-9_]+/i)?.[0] ?? '',
)
const visibleBodyAfterMention = computed(() =>
  leadingMention.value
    ? visibleBody.value.slice(leadingMention.value.length)
    : visibleBody.value,
)

function relativeTime(timestamp: number): string {
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return new Intl.DateTimeFormat(phone.lang, {
    day: 'numeric',
    month: 'short',
  }).format(timestamp)
}
</script>

<template>
  <kGlass :highlight="false" class="feather-post-glass">
    <article class="feather-post" @click="$emit('open', post)">
      <button
        class="feather-avatar"
        type="button"
        @click.stop="$emit('profile', post.profile_id)"
      >
        <img v-if="post.avatar_url" :src="post.avatar_url" alt="" />
        <UserRound v-else :size="21" />
      </button>

      <div class="feather-post__body">
        <header class="feather-post__header">
          <button
            class="feather-post__author"
            type="button"
            @click.stop="$emit('profile', post.profile_id)"
          >
            <span class="feather-post__name">
              <strong>{{ post.display_name }}</strong>
              <CheckCircle2
                v-if="post.verified"
                :size="13"
                class="feather-verified"
                :aria-label="phone.t('Apps.feather.verified')"
              />
            </span>
            <span class="feather-post__meta">
              @{{ post.handle }} · {{ relativeTime(post.created_at) }}
            </span>
          </button>
          <kButton
            v-if="!post.is_owner && !post.is_following"
            outline
            inline
            small
            rounded
            class="feather-follow"
            @click.stop="$emit('follow', post)"
          >
            {{ phone.t('Apps.feather.follow') }}
          </kButton>
          <kButton
            clear
            rounded
            small
            class="feather-more"
            @click.stop="$emit('menu', post)"
          >
            <kIcon><MoreHorizontal :size="18" /></kIcon>
          </kButton>
        </header>

        <p v-if="post.body" class="feather-post__text">
          <span v-if="leadingMention" class="feather-post__mention">{{
            leadingMention
          }}</span
          >{{ visibleBodyAfterMention }}
          <button
            v-if="shouldTruncate && !expanded"
            type="button"
            class="feather-post__more-text"
            @click.stop="expanded = true"
          >
            {{ phone.t('Apps.feather.showMore') }}
          </button>
        </p>
        <div
          v-if="post.media.length"
          class="feather-media"
          :class="`feather-media--${Math.min(post.media.length, 4)}`"
        >
          <img
            v-for="item in post.media"
            :key="item.id"
            :src="item.url"
            alt=""
          />
        </div>

        <footer class="feather-actions">
          <button type="button" @click.stop="$emit('reply', post)">
            <MessageCircle :size="17" />
            <span v-if="post.reply_count">{{ post.reply_count }}</span>
          </button>
          <button
            type="button"
            :class="{ 'is-liked': post.is_liked }"
            @click.stop="$emit('react', post, 'like')"
          >
            <Heart :size="17" :fill="post.is_liked ? 'currentColor' : 'none'" />
            <span v-if="post.like_count">{{ post.like_count }}</span>
          </button>
          <button
            type="button"
            :class="{ 'is-bookmarked': post.is_bookmarked }"
            @click.stop="$emit('react', post, 'bookmark')"
          >
            <Bookmark
              :size="17"
              :fill="post.is_bookmarked ? 'currentColor' : 'none'"
            />
          </button>
          <button type="button" @click.stop="$emit('share', post)">
            <Share2 :size="17" />
          </button>
        </footer>
      </div>
    </article>
  </kGlass>
</template>

<style scoped>
.feather-post {
  display: flex;
  gap: 11px;
  padding: 11px 13px 8px;
  cursor: pointer;
}
.feather-post-glass {
  display: block;
  width: 100%;
  overflow: hidden;
  border-radius: 17px;
}
.feather-post:active {
  background: color-mix(in srgb, currentColor 4%, transparent);
}

.feather-avatar {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  overflow: hidden;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(145deg, #72c9ff, #377be7);
}

.feather-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.feather-post__body {
  min-width: 0;
  flex: 1;
}
.feather-post__header {
  display: flex;
  align-items: flex-start;
  gap: 3px;
  min-height: 32px;
}
.feather-post__author {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  border: 0;
  padding: 0;
  color: inherit;
  background: none;
  text-align: left;
}
.feather-post__name {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 3px;
}
.feather-post__name strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13.5px;
  letter-spacing: -0.12px;
  white-space: nowrap;
}
.feather-post__meta {
  display: block;
  width: 100%;
  overflow: hidden;
  color: #71767b;
  font-size: 11.5px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.feather-verified {
  flex: none;
  color: #438cf5;
}
.feather-follow {
  --k-button-bg-color: transparent;
  --k-button-text-color: var(--feather-blue, #1d9bf0);
  width: auto;
  min-width: 58px;
  max-width: 68px;
  flex: 0 0 auto;
  margin-left: auto;
  height: 25px;
  border-color: color-mix(
    in srgb,
    var(--feather-blue, #1d9bf0) 72%,
    transparent
  );
  padding-inline: 9px;
  box-shadow: none;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.1px;
}
.feather-more {
  flex: 0 0 auto;
  margin-left: 0;
  width: 27px;
  height: 27px;
  color: #71767b;
}
.feather-post__text {
  margin: 2px 0 8px;
  font-size: 13.5px;
  line-height: 1.42;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.feather-post__mention {
  color: var(--feather-blue, #1d9bf0);
  font-weight: 700;
}
.feather-post__more-text {
  border: 0;
  padding: 0;
  color: #1d9bf0;
  background: transparent;
  font: inherit;
}
.feather-media {
  display: grid;
  gap: 2px;
  max-height: 250px;
  margin: 7px 0 8px;
  overflow: hidden;
  border: 0.5px solid color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 14px;
}
.feather-media img {
  width: 100%;
  height: 100%;
  min-height: 105px;
  object-fit: cover;
}
.feather-media--2,
.feather-media--3,
.feather-media--4 {
  grid-template-columns: repeat(2, 1fr);
}
.feather-media--3 img:first-child {
  grid-row: span 2;
}
.feather-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 1px;
  padding-right: 5px;
  color: #71767b;
}
.feather-actions button {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 34px;
  border: 0;
  padding: 6px 0 4px;
  color: inherit;
  background: none;
  font-size: 10.5px;
}
.feather-actions button:active {
  color: #438cf5;
}
.feather-actions .is-liked {
  color: #f04f87;
}
.feather-actions .is-bookmarked {
  color: #438cf5;
}
</style>
