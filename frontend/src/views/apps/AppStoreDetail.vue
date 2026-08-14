<script setup lang="ts">
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Share2,
  Sparkles,
  Star,
  Users,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'

import { getPhoneAppLabel, isExternalPhoneApp } from '@/config/apps'
import { usePhoneStore } from '@/stores/phone'
import type { LaunchablePhoneAppDefinition } from '@/types/apps'

import AppStoreAction from './AppStoreAction.vue'

const props = defineProps<{
  action: 'get' | 'installing' | 'open'
  app: LaunchablePhoneAppDefinition
}>()

const emit = defineEmits<{
  action: []
  back: []
  share: []
}>()

const phone = usePhoneStore()
const previews = ref<HTMLElement | null>(null)
const activePreviewIndex = ref(0)
const previewCount = 3
const appName = computed(() => getPhoneAppLabel(props.app, phone.t))
const developer = computed(() =>
  isExternalPhoneApp(props.app)
    ? props.app.developer
    : phone.t('Apps.appStore.details.skyStudios'),
)
const rating = computed(() => (4.4 + (props.app.gridOrder % 5) / 10).toFixed(1))
const ratingCount = computed(() =>
  new Intl.NumberFormat(phone.lang, { notation: 'compact' }).format(
    12400 + props.app.gridOrder * 1371,
  ),
)
const ageRating = computed(() =>
  props.app.category === 'games' ? '12+' : '4+',
)
const chartRank = computed(() => `#${(props.app.gridOrder % 8) + 1}`)
const version = computed(
  () => `1.${(props.app.gridOrder % 9) + 1}.${props.app.gridOrder % 5}`,
)
const detailStyle = computed(() => {
  const palettes = [
    ['#2365d8', '#69c7ff'],
    ['#7a42c2', '#d19dff'],
    ['#0b8a78', '#60e2c0'],
    ['#cf5b35', '#ffc06b'],
    ['#4057b3', '#9baaff'],
  ] as const
  const palette = palettes[props.app.gridOrder % palettes.length]!
  return {
    '--store-detail-accent': palette[0],
    '--store-detail-glow': palette[1],
  }
})

function scrollToPreview(index: number): void {
  const row = previews.value
  if (!row) return
  const cards = Array.from(
    row.querySelectorAll<HTMLElement>('.store-detail-preview'),
  )
  const nextIndex = Math.min(cards.length - 1, Math.max(0, index))
  const card = cards[nextIndex]
  if (!card) return
  activePreviewIndex.value = nextIndex
  row.scrollTo({
    behavior: 'smooth',
    left: card.offsetLeft - row.offsetLeft,
  })
}

function updateActivePreview(): void {
  const row = previews.value
  if (!row) return
  const cards = Array.from(
    row.querySelectorAll<HTMLElement>('.store-detail-preview'),
  )
  activePreviewIndex.value = cards.reduce((closestIndex, card, index) => {
    const closest = cards[closestIndex]
    if (!closest) return index
    const distance = Math.abs(card.offsetLeft - row.offsetLeft - row.scrollLeft)
    const closestDistance = Math.abs(
      closest.offsetLeft - row.offsetLeft - row.scrollLeft,
    )
    return distance < closestDistance ? index : closestIndex
  }, 0)
}
</script>

<template>
  <section class="store-detail" :style="detailStyle">
    <header class="store-detail__toolbar">
      <button
        type="button"
        :aria-label="phone.t('Common.back')"
        @click="emit('back')"
      >
        <ChevronLeft :size="26" :stroke-width="2.2" aria-hidden="true" />
      </button>
      <button
        type="button"
        :aria-label="phone.t('Apps.appStore.details.share')"
        @click="emit('share')"
      >
        <Share2 :size="21" :stroke-width="2" aria-hidden="true" />
      </button>
    </header>

    <section class="store-detail__hero">
      <img :src="app.iconImage" alt="" draggable="false" />
      <div>
        <h1>{{ appName }}</h1>
        <p>{{ developer }}</p>
        <button
          type="button"
          class="store-detail__action"
          :class="{ 'store-detail__action--icon': action !== 'open' }"
          :disabled="action === 'installing'"
          @click="emit('action')"
        >
          <AppStoreAction :action="action" />
        </button>
      </div>
    </section>

    <dl class="store-detail__facts">
      <div>
        <dt>
          {{ phone.t('Apps.appStore.details.ratings', { count: ratingCount }) }}
        </dt>
        <dd>{{ rating }}</dd>
        <span class="store-detail__stars" aria-hidden="true">
          <Star v-for="star in 5" :key="star" :size="11" fill="currentColor" />
        </span>
      </div>
      <div>
        <dt>{{ phone.t('Apps.appStore.details.age') }}</dt>
        <dd>{{ ageRating }}</dd>
        <span>{{ phone.t('Apps.appStore.details.years') }}</span>
      </div>
      <div>
        <dt>{{ phone.t('Apps.appStore.details.chart') }}</dt>
        <dd>{{ chartRank }}</dd>
        <span>{{ phone.t(`Home.groups.${app.category}`) }}</span>
      </div>
    </dl>

    <section class="store-detail__whats-new">
      <header>
        <h2>{{ phone.t('Apps.appStore.details.whatsNew') }}</h2>
        <ChevronRight :size="22" :stroke-width="2.4" aria-hidden="true" />
      </header>
      <div class="store-detail__version">
        <span>{{ phone.t('Apps.appStore.details.version', { version }) }}</span>
        <span>{{ phone.t('Apps.appStore.details.updatedToday') }}</span>
      </div>
      <p>
        {{
          phone.t('Apps.appStore.details.releaseNotes', {
            app: appName,
          })
        }}
      </p>
    </section>

    <section class="store-detail__preview-section">
      <header>
        <h2>{{ phone.t('Apps.appStore.details.preview') }}</h2>
        <div class="store-detail__preview-navigation">
          <span>{{ activePreviewIndex + 1 }} / {{ previewCount }}</span>
          <button
            type="button"
            :aria-label="phone.t('Apps.appStore.details.previousPreview')"
            :disabled="activePreviewIndex === 0"
            @click="scrollToPreview(activePreviewIndex - 1)"
          >
            <ChevronLeft :size="17" :stroke-width="2.4" aria-hidden="true" />
          </button>
          <button
            type="button"
            :aria-label="phone.t('Apps.appStore.details.nextPreview')"
            :disabled="activePreviewIndex === previewCount - 1"
            @click="scrollToPreview(activePreviewIndex + 1)"
          >
            <ChevronRight :size="17" :stroke-width="2.4" aria-hidden="true" />
          </button>
        </div>
      </header>
      <div
        ref="previews"
        class="store-detail__previews"
        @scroll.passive="updateActivePreview"
      >
        <article class="store-detail-preview store-detail-preview--overview">
          <div class="store-detail-preview__status">
            <span>{{ phone.t('Apps.appStore.details.previewLive') }}</span>
            <Activity :size="14" aria-hidden="true" />
          </div>
          <img :src="app.iconImage" alt="" draggable="false" />
          <strong>{{ appName }}</strong>
          <small>{{ phone.t('Apps.appStore.details.previewOverview') }}</small>
          <div class="store-detail-preview__metrics">
            <span><b>24</b>{{ phone.t('Apps.appStore.details.today') }}</span>
            <span
              ><b>87%</b>{{ phone.t('Apps.appStore.details.progress') }}</span
            >
          </div>
          <div class="store-detail-preview__activity">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
        </article>

        <article class="store-detail-preview store-detail-preview--community">
          <div class="store-detail-preview__status">
            <span>{{ phone.t('Apps.appStore.details.previewCommunity') }}</span>
            <Users :size="14" aria-hidden="true" />
          </div>
          <div class="store-detail-preview__avatars">
            <span>AM</span><span>JS</span><span>RK</span>
          </div>
          <strong>{{
            phone.t('Apps.appStore.details.communityTitle', { app: appName })
          }}</strong>
          <small>{{ phone.t('Apps.appStore.details.communityBody') }}</small>
          <div class="store-detail-preview__message">
            <Sparkles :size="15" aria-hidden="true" />
            <span>{{ phone.t('Apps.appStore.details.featuredMoment') }}</span>
          </div>
          <img :src="app.iconImage" alt="" draggable="false" />
        </article>

        <article class="store-detail-preview store-detail-preview--insights">
          <div class="store-detail-preview__status">
            <span>{{ phone.t('Apps.appStore.details.previewInsights') }}</span>
            <BarChart3 :size="14" aria-hidden="true" />
          </div>
          <strong>{{ phone.t('Apps.appStore.details.weeklyActivity') }}</strong>
          <div class="store-detail-preview__chart" aria-hidden="true">
            <span
              v-for="height in [38, 64, 48, 82, 56, 92, 73]"
              :key="height"
              :style="{ height: `${height}%` }"
            ></span>
          </div>
          <div class="store-detail-preview__insight">
            <b>+18%</b>
            <span>{{ phone.t('Apps.appStore.details.fromLastWeek') }}</span>
          </div>
          <img :src="app.iconImage" alt="" draggable="false" />
        </article>
      </div>
    </section>

    <section class="store-detail__description">
      <h2>{{ phone.t('Apps.appStore.details.about') }}</h2>
      <p>
        {{
          phone.t('Apps.appStore.details.description', {
            app: appName,
            category: phone.t(`Home.groups.${app.category}`),
          })
        }}
      </p>
    </section>
  </section>
</template>

<style scoped>
.store-detail {
  width: 100%;
  min-width: 0;
  display: grid;
  overflow-x: hidden;
  gap: var(--sky-space-5);
  padding: var(--sky-space-3) 0 var(--sky-space-6);
  color: var(--sky-text);
}

.store-detail__preview-section {
  min-width: 0;
}

.store-detail__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.store-detail__toolbar button {
  width: var(--sky-touch-target);
  height: var(--sky-touch-target);
  display: grid;
  place-items: center;
  border: 1px solid var(--sky-hairline);
  border-radius: 50%;
  color: var(--sky-text);
  background: var(--sky-surface-variant);
  transition:
    background-color 100ms ease,
    border-color 100ms ease,
    box-shadow 100ms ease,
    transform 100ms ease;
}

.store-detail__toolbar button:active {
  transform: scale(0.94);
}

.store-detail__hero {
  display: grid;
  grid-template-columns: 116px minmax(0, 1fr);
  align-items: center;
  gap: var(--sky-space-4);
}

.store-detail__hero > img {
  width: 116px;
  height: 116px;
  border-radius: calc(var(--sky-radius-card) + var(--sky-space-1));
  object-fit: cover;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
}

.store-detail__hero > div {
  min-width: 0;
}

.store-detail__hero h1 {
  margin: 0;
  overflow: hidden;
  color: var(--sky-text);
  font-size: 24px;
  line-height: 1.02;
  text-overflow: ellipsis;
}

.store-detail__hero p {
  margin: 6px 0 12px;
  overflow: hidden;
  color: var(--sky-muted);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-detail__hero button {
  min-width: 72px;
  min-height: var(--sky-touch-target);
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--sky-radius-pill);
  padding: 0 var(--sky-space-4);
  color: #fff;
  background: var(--sky-app-accent);
  font-size: 12px;
  font-weight: 850;
}

.store-detail__hero .store-detail__action--icon {
  width: var(--sky-touch-target);
  min-width: var(--sky-touch-target);
  padding: 0;
  color: var(--sky-app-accent);
  background: transparent;
}

.store-detail__facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  border-top: 1px solid var(--sky-hairline);
  border-bottom: 1px solid var(--sky-hairline);
  padding: var(--sky-space-3) 0;
}

.store-detail__facts > div {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-direction: column;
  border-right: 1px solid var(--sky-hairline);
  text-align: center;
}

.store-detail__facts > div:last-child {
  border-right: 0;
}

.store-detail__facts dt {
  overflow: hidden;
  color: var(--sky-muted);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.store-detail__facts dd {
  margin: 5px 0 0;
  color: var(--sky-text);
  font-size: 24px;
  font-weight: 700;
}

.store-detail__facts span {
  max-width: 100%;
  overflow: hidden;
  color: var(--sky-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-detail__facts .store-detail__stars {
  display: flex;
  color: var(--sky-muted);
}

.store-detail__whats-new,
.store-detail__description {
  border-bottom: 1px solid var(--sky-hairline);
  padding-bottom: var(--sky-space-5);
}

.store-detail__whats-new header,
.store-detail__preview-section > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sky-space-2);
}

.store-detail__whats-new h2,
.store-detail__preview-section h2,
.store-detail__description h2 {
  margin: 0;
  font-size: var(--sky-font-medium-title);
}

.store-detail__version {
  display: flex;
  justify-content: space-between;
  gap: var(--sky-space-3);
  margin-top: var(--sky-space-3);
  color: var(--sky-muted);
  font-size: 11px;
}

.store-detail__whats-new p,
.store-detail__description p {
  margin: var(--sky-space-3) 0 0;
  color: var(--sky-text);
  font-size: 13px;
  line-height: 1.45;
}

.store-detail__preview-navigation {
  display: flex;
  align-items: center;
  gap: 5px;
}

.store-detail__preview-navigation > span {
  min-width: 30px;
  color: var(--sky-muted);
  font-size: 9px;
  font-weight: 700;
  text-align: center;
}

.store-detail__preview-navigation button {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid var(--sky-hairline);
  border-radius: 50%;
  padding: 0;
  color: var(--sky-text);
  background: var(--sky-surface-variant);
  transition:
    background-color 100ms ease,
    color 100ms ease,
    transform 100ms ease;
}

.store-detail__preview-navigation button:disabled {
  opacity: 0.34;
}

.store-detail__preview-navigation button:active:not(:disabled) {
  transform: scale(0.92);
}

.store-detail__previews {
  display: flex;
  gap: var(--sky-space-3);
  margin-right: calc(0px - var(--sky-page-gutter));
  overflow-x: auto;
  padding: var(--sky-space-3) var(--sky-page-gutter) var(--sky-space-2) 0;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.store-detail__previews::-webkit-scrollbar {
  display: none;
}

.store-detail-preview {
  width: 224px;
  height: 354px;
  position: relative;
  display: flex;
  overflow: hidden;
  flex: 0 0 224px;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--sky-radius-card);
  padding: var(--sky-space-4);
  color: #fff;
  background:
    radial-gradient(
      circle at 78% 12%,
      var(--store-detail-glow),
      transparent 32%
    ),
    linear-gradient(155deg, var(--store-detail-accent), #101523 118%);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.18);
  scroll-snap-align: start;
}

.store-detail-preview::after {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    -35deg,
    transparent 0 20px,
    rgba(255, 255, 255, 0.025) 21px 22px
  );
  content: '';
  pointer-events: none;
}

.store-detail-preview__status {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.72);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.store-detail-preview--overview > img {
  width: 90px;
  height: 90px;
  z-index: 1;
  align-self: center;
  margin: 26px 0 16px;
  border-radius: 24px;
  object-fit: cover;
  box-shadow: 0 14px 24px rgba(0, 0, 0, 0.28);
  transform: rotate(-4deg);
}

.store-detail-preview > strong,
.store-detail-preview > small {
  position: relative;
  z-index: 1;
}

.store-detail-preview > strong {
  font-size: 20px;
  line-height: 1.08;
}

.store-detail-preview > small {
  margin-top: 5px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 11px;
}

.store-detail-preview__metrics {
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sky-space-2);
  margin-top: auto;
}

.store-detail-preview__metrics span {
  display: flex;
  flex-direction: column;
  border-radius: var(--sky-radius-control);
  padding: var(--sky-space-3);
  background: rgba(255, 255, 255, 0.11);
  color: rgba(255, 255, 255, 0.7);
  font-size: 9px;
}

.store-detail-preview__metrics b {
  color: #fff;
  font-size: 17px;
}

.store-detail-preview__activity {
  z-index: 1;
  height: 28px;
  display: flex;
  align-items: flex-end;
  gap: 5px;
  margin-top: var(--sky-space-3);
}

.store-detail-preview__activity span {
  width: 20%;
  border-radius: var(--sky-radius-pill);
  background: rgba(255, 255, 255, 0.42);
}

.store-detail-preview__activity span:nth-child(1) {
  height: 42%;
}
.store-detail-preview__activity span:nth-child(2) {
  height: 72%;
}
.store-detail-preview__activity span:nth-child(3) {
  height: 55%;
}
.store-detail-preview__activity span:nth-child(4) {
  height: 92%;
}
.store-detail-preview__activity span:nth-child(5) {
  height: 68%;
}

.store-detail-preview__avatars {
  z-index: 1;
  display: flex;
  margin: 42px 0 22px;
}

.store-detail-preview__avatars span {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  margin-right: -12px;
  border: 3px solid rgba(255, 255, 255, 0.82);
  border-radius: 50%;
  background: rgba(17, 22, 38, 0.74);
  font-size: 12px;
  font-weight: 800;
}

.store-detail-preview__message {
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--sky-space-2);
  margin-top: auto;
  border-radius: var(--sky-radius-control);
  padding: var(--sky-space-3);
  background: rgba(255, 255, 255, 0.12);
  font-size: 10px;
}

.store-detail-preview--community > img,
.store-detail-preview--insights > img {
  width: 42px;
  height: 42px;
  z-index: 1;
  position: absolute;
  right: var(--sky-space-4);
  bottom: var(--sky-space-4);
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 8px 14px rgba(0, 0, 0, 0.24);
}

.store-detail-preview--insights > strong {
  margin-top: 36px;
}

.store-detail-preview__chart {
  height: 145px;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  gap: 7px;
  margin-top: var(--sky-space-5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0 var(--sky-space-2);
}

.store-detail-preview__chart span {
  width: 14px;
  border-radius: 7px 7px 0 0;
  background: linear-gradient(180deg, #fff, rgba(255, 255, 255, 0.24));
}

.store-detail-preview__insight {
  z-index: 1;
  display: flex;
  flex-direction: column;
  margin-top: var(--sky-space-4);
}

.store-detail-preview__insight b {
  font-size: 22px;
}

.store-detail-preview__insight span {
  color: rgba(255, 255, 255, 0.68);
  font-size: 10px;
}

:global(.phone-app--performance) .store-detail-preview,
:global(.phone-app--performance) .store-detail__hero > img {
  box-shadow: none;
}

@media (hover: hover) {
  .store-detail__toolbar button:hover {
    border-color: rgba(255, 255, 255, 0.16);
    background: var(--sky-surface-tint);
    box-shadow: 0 7px 16px rgba(0, 0, 0, 0.18);
    transform: translateY(-1px);
  }

  .store-detail__preview-navigation button:hover:not(:disabled) {
    color: var(--sky-app-accent);
    background: var(--sky-surface-tint);
    transform: translateY(-1px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .store-detail__previews {
    scroll-behavior: auto;
  }
}
</style>
