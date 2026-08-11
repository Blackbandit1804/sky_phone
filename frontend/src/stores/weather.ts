import { defineStore } from 'pinia'

import type {
  RawWeatherSnapshot,
  WeatherCamera,
  WeatherForecast,
} from '@/types/weather'
import { nuiCall } from '@/utils/nui'
import { buildWeatherForecast } from '@/utils/weather'

const REFRESH_INTERVAL = 30_000

export const useWeatherStore = defineStore('weather', {
  state: () => ({
    error: null as string | null,
    cameraError: null as string | null,
    cameras: [] as WeatherCamera[],
    camerasLoaded: false,
    forecast: null as WeatherForecast | null,
    intervalId: undefined as number | undefined,
    isLoading: false,
    isOpeningCamera: false,
    lastFetchedAt: 0,
  }),
  actions: {
    async loadCameras(force = false): Promise<void> {
      if (this.camerasLoaded && !force) return
      const response = await nuiCall<{ cameras: WeatherCamera[] }>(
        'weather:cameras',
      )
      this.camerasLoaded = true
      if (!response.success || !Array.isArray(response.data?.cameras)) {
        this.cameraError = response.error ?? 'request_failed'
        return
      }
      this.cameras = response.data.cameras.filter(
        (camera) =>
          typeof camera?.id === 'string' &&
          ['los_santos', 'blaine_county', 'cayo_perico'].includes(
            camera.region,
          ),
      )
      this.cameraError = null
    },
    async openCamera(id: string): Promise<boolean> {
      if (this.isOpeningCamera) return false
      this.isOpeningCamera = true
      const response = await nuiCall('weather:camera-open', { id })
      this.isOpeningCamera = false
      this.cameraError = response.success
        ? null
        : (response.error ?? 'request_failed')
      return response.success
    },
    async refresh(force = false): Promise<void> {
      if (this.isLoading) return
      if (!force && Date.now() - this.lastFetchedAt < REFRESH_INTERVAL) return
      this.isLoading = true
      const response = await nuiCall<RawWeatherSnapshot>('weather:get')
      this.isLoading = false
      if (!response.success || !response.data) {
        this.error = response.error ?? 'request_failed'
        return
      }
      this.forecast = buildWeatherForecast(response.data)
      this.lastFetchedAt = Date.now()
      this.error = null
    },
    start(): void {
      void this.refresh(true)
      void this.loadCameras()
      if (this.intervalId !== undefined) return
      this.intervalId = window.setInterval(() => void this.refresh(true), REFRESH_INTERVAL)
    },
    stop(): void {
      if (this.intervalId !== undefined) window.clearInterval(this.intervalId)
      this.intervalId = undefined
    },
  },
})
