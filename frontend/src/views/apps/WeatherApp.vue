<script setup lang="ts">
import { kButton, kCard, kLink, kNavbar, kPage, kPreloader } from 'konsta/vue'
import {
  CloudSun,
  Droplets,
  Gauge,
  Navigation,
  RefreshCw,
  ThermometerSun,
  Umbrella,
  Video,
  Wind,
} from 'lucide-vue-next'
import { computed } from 'vue'

import WeatherConditionIcon from '@/components/WeatherConditionIcon.vue'
import { usePhoneStore } from '@/stores/phone'
import { useWeatherStore } from '@/stores/weather'
import type { WeatherConditionId } from '@/types/weather'

const phone = usePhoneStore()
const weather = useWeatherStore()
const forecast = computed(() => weather.forecast)
const selectedCamera = computed(
  () =>
    weather.cameras.find((camera) => camera.region === forecast.value?.region) ??
    weather.cameras[0],
)
const rainy = computed(
  () =>
    forecast.value?.condition === 'rain' ||
    forecast.value?.condition === 'thunder',
)
const rainDrops = [
  ['4%', '17px', '1.35s', '-0.3s', '0.32'],
  ['11%', '11px', '1.7s', '-1.1s', '0.2'],
  ['18%', '21px', '1.45s', '-0.8s', '0.38'],
  ['25%', '13px', '1.9s', '-1.6s', '0.24'],
  ['33%', '18px', '1.55s', '-0.2s', '0.3'],
  ['40%', '10px', '1.75s', '-1.35s', '0.18'],
  ['47%', '22px', '1.4s', '-0.65s', '0.36'],
  ['54%', '14px', '2s', '-1.8s', '0.22'],
  ['61%', '19px', '1.6s', '-0.45s', '0.34'],
  ['68%', '12px', '1.8s', '-1.2s', '0.2'],
  ['75%', '20px', '1.5s', '-0.9s', '0.37'],
  ['82%', '11px', '1.95s', '-1.55s', '0.2'],
  ['89%', '17px', '1.45s', '-0.15s', '0.31'],
  ['96%', '13px', '1.7s', '-1.05s', '0.24'],
].map(([left, height, duration, delay, opacity]) => ({
  '--rain-delay': delay,
  '--rain-duration': duration,
  '--rain-height': height,
  '--rain-left': left,
  '--rain-opacity': opacity,
}))
const cardColors = {
  bgIos: 'bg-transparent',
  textIos: 'text-white',
}

function conditionLabel(condition: WeatherConditionId): string {
  return phone.t(`Apps.weather.conditions.${condition}`)
}

function formatHour(timestamp: number, index: number): string {
  if (index === 0) return phone.t('Apps.weather.now')
  return new Intl.DateTimeFormat(phone.lang, {
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  }).format(timestamp)
}

function cameraErrorLabel(): string {
  return phone.t(
    `Apps.weather.webcam.errors.${weather.cameraError ?? 'request_failed'}`,
  )
}
</script>

<template>
  <k-page
    component="main"
    class="weather-app"
    :class="forecast ? `weather-app--${forecast.condition}` : ''"
    :colors="{ bgIos: 'bg-transparent' }"
  >
    <div class="weather-app__backdrop" aria-hidden="true"></div>
    <div v-if="rainy" class="weather-app__rain" aria-hidden="true">
      <i v-for="(drop, index) in rainDrops" :key="index" :style="drop"></i>
    </div>
    <k-navbar class="weather-navbar" :title="phone.t('Apps.weather.name')">
      <template #after>
        <k-link
          component="button"
          :aria-label="phone.t('Apps.weather.refresh')"
          :disabled="weather.isLoading"
          @click="weather.refresh(true)"
        >
          <RefreshCw
            :size="17"
            :class="{ 'weather-spin': weather.isLoading }"
          />
        </k-link>
      </template>
    </k-navbar>

    <div v-if="forecast" class="weather-scroll">
      <header class="weather-hero">
        <div class="weather-location">
          <Navigation :size="13" fill="currentColor" />
          {{ phone.t(`Apps.weather.regions.${forecast.region}`) }}
        </div>
        <WeatherConditionIcon
          :condition="forecast.condition"
          :timestamp="forecast.timestamp"
          class="weather-hero__icon"
          :size="82"
        />
        <div class="weather-temperature">{{ forecast.temperature }}°</div>
        <strong>{{ conditionLabel(forecast.condition) }}</strong>
        <p>{{ phone.t(`Apps.weather.summaries.${forecast.condition}`) }}</p>
      </header>

      <p v-if="weather.error" class="weather-stale">
        {{ phone.t('Apps.weather.stale') }}
      </p>

      <section
        class="weather-details"
        :aria-label="phone.t('Apps.weather.details')"
      >
        <k-card
          :colors="cardColors"
          :content-wrap="false"
          class="weather-detail-card"
        >
          <ThermometerSun :size="18" />
          <span>{{ phone.t('Apps.weather.feelsLike') }}</span>
          <strong>{{ forecast.feelsLike }}°</strong>
        </k-card>
        <k-card
          :colors="cardColors"
          :content-wrap="false"
          class="weather-detail-card"
        >
          <Wind :size="18" />
          <span>{{ phone.t('Apps.weather.wind') }}</span>
          <strong>{{ forecast.windSpeed }} km/h</strong>
        </k-card>
        <k-card
          :colors="cardColors"
          :content-wrap="false"
          class="weather-detail-card"
        >
          <Droplets :size="18" />
          <span>{{ phone.t('Apps.weather.humidity') }}</span>
          <strong>{{ forecast.humidity }}%</strong>
        </k-card>
        <k-card
          :colors="cardColors"
          :content-wrap="false"
          class="weather-detail-card"
        >
          <Umbrella :size="18" />
          <span>{{ phone.t('Apps.weather.rain') }}</span>
          <strong>{{ forecast.rainChance }}%</strong>
        </k-card>
      </section>

      <k-card
        v-if="selectedCamera"
        :colors="cardColors"
        :content-wrap="false"
        class="weather-panel weather-camera-card"
      >
        <div class="weather-camera-preview" :class="`weather-camera-preview--${forecast.condition}`">
          <div class="weather-camera-skyline" aria-hidden="true"></div>
          <div class="weather-camera-meta">
            <span class="weather-camera-live"><i></i>{{ phone.t('Apps.weather.webcam.live') }}</span>
            <span>{{ phone.t(`Apps.weather.webcam.locations.${selectedCamera.id}`) }}</span>
          </div>
          <div class="weather-camera-copy">
            <strong>{{ phone.t('Apps.weather.webcam.title') }}</strong>
            <span>{{ phone.t('Apps.weather.webcam.subtitle') }}</span>
          </div>
        </div>
        <div class="weather-camera-action">
          <k-button
            large
            rounded
            :disabled="weather.isOpeningCamera"
            @click="weather.openCamera(selectedCamera.id)"
          >
            <Video :size="17" />
            {{ phone.t('Apps.weather.webcam.view') }}
          </k-button>
          <p v-if="weather.cameraError">{{ cameraErrorLabel() }}</p>
        </div>
      </k-card>

      <k-card
        v-else-if="weather.camerasLoaded"
        :colors="cardColors"
        :content-wrap="false"
        class="weather-panel weather-camera-unavailable"
      >
        {{ phone.t('Apps.weather.webcam.unavailable') }}
      </k-card>

      <k-card
        :colors="cardColors"
        :content-wrap="false"
        class="weather-panel weather-hourly-panel"
      >
        <h2><Gauge :size="15" />{{ phone.t('Apps.weather.hourly') }}</h2>
        <div class="weather-hourly">
          <div
            v-for="(hour, index) in forecast.hourly"
            :key="hour.timestamp"
            class="weather-hour"
          >
            <span>{{ formatHour(hour.timestamp, index) }}</span>
            <WeatherConditionIcon
              :condition="hour.condition"
              :timestamp="hour.timestamp"
            />
            <small v-if="hour.rainChance >= 30">{{ hour.rainChance }}%</small>
            <strong>{{ hour.temperature }}°</strong>
          </div>
        </div>
      </k-card>
    </div>

    <div v-else class="weather-empty">
      <k-preloader v-if="weather.isLoading" />
      <CloudSun v-else :size="52" :stroke-width="1.4" />
      <strong>{{
        phone.t(
          weather.isLoading ? 'Common.loading' : 'Apps.weather.unavailable',
        )
      }}</strong>
      <k-link
        v-if="!weather.isLoading"
        component="button"
        @click="weather.refresh(true)"
      >
        {{ phone.t('Apps.weather.tryAgain') }}
      </k-link>
    </div>
  </k-page>
</template>
