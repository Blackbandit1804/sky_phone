import { defineStore } from 'pinia'

import type {
  MusicBootstrap,
  MusicPlaylist,
  MusicPlaylistEntry,
  MusicTrack,
} from '@/types/music'
import { nuiCall } from '@/utils/nui'

type YouTubePlayer = {
  destroy: () => void
  getCurrentTime: () => number
  getDuration: () => number
  loadVideoById: (videoId: string) => void
  pauseVideo: () => void
  playVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  setVolume: (volume: number) => void
}

type YouTubeApi = {
  Player: new (
    target: HTMLElement,
    options: {
      events: {
        onError: () => void
        onReady: (event: { target: YouTubePlayer }) => void
        onStateChange: (event: { data: number }) => void
      }
      height: string
      playerVars: Record<string, number | string>
      videoId: string
      width: string
    },
  ) => YouTubePlayer
  PlayerState: {
    ENDED: number
    PAUSED: number
    PLAYING: number
  }
}

declare global {
  interface Window {
    YT?: YouTubeApi
    onYouTubeIframeAPIReady?: () => void
  }
}

const audio = new Audio()
audio.preload = 'metadata'
const YOUTUBE_API_TIMEOUT_MS = 12000
let audioBound = false
let youtubeApiPromise: Promise<YouTubeApi> | null = null
let youtubePlayer: YouTubePlayer | null = null
let youtubeProgressTimer: number | null = null

export function musicTrackKey(
  track: Pick<MusicTrack, 'id' | 'source'>,
): string {
  return `${track.source}:${track.id}`
}

function stopYoutubeProgress(): void {
  if (youtubeProgressTimer !== null) {
    window.clearInterval(youtubeProgressTimer)
    youtubeProgressTimer = null
  }
}

function startYoutubeProgress(): void {
  stopYoutubeProgress()
  youtubeProgressTimer = window.setInterval(() => {
    const store = useMusicStore()
    if (!youtubePlayer || store.currentTrack?.source !== 'youtube') return
    store.currentTime = Math.max(0, youtubePlayer.getCurrentTime() || 0)
    store.duration = Math.max(0, youtubePlayer.getDuration() || 0)
  }, 500)
}

function bindAudioEvents(): void {
  if (audioBound) return
  audioBound = true
  audio.addEventListener('durationchange', () => {
    const store = useMusicStore()
    if (store.currentTrack?.source === 'server') {
      store.duration = Number.isFinite(audio.duration) ? audio.duration : 0
    }
  })
  audio.addEventListener('timeupdate', () => {
    const store = useMusicStore()
    if (store.currentTrack?.source === 'server') {
      store.currentTime = audio.currentTime
    }
  })
  audio.addEventListener('play', () => {
    const store = useMusicStore()
    if (store.currentTrack?.source === 'server') store.isPlaying = true
  })
  audio.addEventListener('pause', () => {
    const store = useMusicStore()
    if (store.currentTrack?.source === 'server') store.isPlaying = false
  })
  audio.addEventListener('ended', () => {
    const store = useMusicStore()
    if (store.currentTrack?.source === 'server') void store.next()
  })
  audio.addEventListener('error', () => {
    const store = useMusicStore()
    if (store.currentTrack?.source === 'server') {
      store.isPlaying = false
      store.playbackError = 'playback_failed'
    }
  })
}

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise
  youtubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    let settled = false
    const previousReady = window.onYouTubeIframeAPIReady
    let script = document.querySelector<HTMLScriptElement>(
      'script[data-sky-phone-youtube-api]',
    )
    let timeout = 0

    const cleanup = (): void => {
      window.clearTimeout(timeout)
      script?.removeEventListener('error', handleError)
    }
    const fail = (error: Error): void => {
      if (settled) return
      settled = true
      cleanup()
      if (!window.YT?.Player) script?.remove()
      if (window.onYouTubeIframeAPIReady === handleReady)
        window.onYouTubeIframeAPIReady = previousReady
      youtubeApiPromise = null
      reject(error)
    }
    const handleReady = (): void => {
      try {
        previousReady?.()
      } catch (error) {
        console.error('[Music] A previous YouTube callback failed:', error)
      }
      if (!window.YT?.Player) {
        fail(new Error('YouTube player API did not initialize.'))
        return
      }
      if (settled) return
      settled = true
      cleanup()
      resolve(window.YT)
    }
    function handleError(): void {
      fail(new Error('YouTube player API failed to load.'))
    }

    window.onYouTubeIframeAPIReady = handleReady
    if (!script) {
      script = document.createElement('script')
      script.dataset.skyPhoneYoutubeApi = 'true'
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.head.append(script)
    }
    script.addEventListener('error', handleError, { once: true })
    timeout = window.setTimeout(
      () => fail(new Error('YouTube player API timed out.')),
      YOUTUBE_API_TIMEOUT_MS,
    )
  })
  return youtubeApiPromise
}

function resetYoutubePlayer(): void {
  stopYoutubeProgress()
  const player = youtubePlayer
  youtubePlayer = null
  try {
    player?.destroy()
  } catch (error) {
    console.error('[Music] YouTube player cleanup failed:', error)
  }
  document.getElementById('sky-phone-youtube-player')?.remove()
}

async function loadYouTubeTrack(videoId: string): Promise<void> {
  const api = await loadYouTubeApi()
  const store = useMusicStore()
  if (youtubePlayer) {
    youtubePlayer.setVolume(store.volume * 100)
    youtubePlayer.loadVideoById(videoId)
    youtubePlayer.playVideo()
    startYoutubeProgress()
    return
  }

  const host = document.createElement('div')
  host.id = 'sky-phone-youtube-player'
  host.style.position = 'fixed'
  host.style.left = '-10000px'
  host.style.top = '0'
  host.style.width = '200px'
  host.style.height = '200px'
  host.style.pointerEvents = 'none'
  document.body.append(host)

  await new Promise<void>((resolve, reject) => {
    youtubePlayer = new api.Player(host, {
      height: '200',
      width: '200',
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        origin: window.location.origin,
        playsinline: 1,
        rel: 0,
      },
      events: {
        onError: () => {
          const activeStore = useMusicStore()
          if (activeStore.currentTrack?.source === 'youtube') {
            activeStore.isPlaying = false
            activeStore.playbackError = 'playback_failed'
          }
          resetYoutubePlayer()
          reject(new Error('YouTube player rejected the track.'))
        },
        onReady: (event) => {
          youtubePlayer = event.target
          event.target.setVolume(useMusicStore().volume * 100)
          event.target.playVideo()
          startYoutubeProgress()
          resolve()
        },
        onStateChange: (event) => {
          const activeStore = useMusicStore()
          if (activeStore.currentTrack?.source !== 'youtube') return
          if (event.data === api.PlayerState.PLAYING) {
            activeStore.isPlaying = true
            activeStore.playbackError = ''
            startYoutubeProgress()
          } else if (event.data === api.PlayerState.PAUSED) {
            activeStore.isPlaying = false
          } else if (event.data === api.PlayerState.ENDED) {
            activeStore.isPlaying = false
            void activeStore.next()
          }
        },
      },
    })
  })
}

function stopActiveMedia(): void {
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
  youtubePlayer?.pauseVideo()
  stopYoutubeProgress()
}

export const useMusicStore = defineStore('music', {
  state: () => ({
    currentTime: 0,
    currentTrack: null as MusicTrack | null,
    duration: 0,
    error: '',
    isLoading: false,
    isPlaying: false,
    playbackError: '',
    playlists: [] as MusicPlaylist[],
    queue: [] as MusicTrack[],
    queueIndex: -1,
    serverTracks: [] as MusicTrack[],
    volume: 0.72,
    youtubeTracks: [] as MusicTrack[],
  }),
  getters: {
    allTracks(state): MusicTrack[] {
      return [...state.serverTracks, ...state.youtubeTracks]
    },
  },
  actions: {
    applyBootstrap(data: MusicBootstrap): void {
      this.serverTracks = data.serverTracks
      this.youtubeTracks = data.youtubeTracks
      this.playlists = data.playlists
      const tracks = new Map(
        [...data.serverTracks, ...data.youtubeTracks].map((track) => [
          musicTrackKey(track),
          track,
        ]),
      )
      if (this.currentTrack) {
        const current = tracks.get(musicTrackKey(this.currentTrack))
        if (current) this.currentTrack = current
        else this.stop()
      }
      this.queue = this.queue
        .map((track) => tracks.get(musicTrackKey(track)))
        .filter((track): track is MusicTrack => Boolean(track))
      this.queueIndex = this.currentTrack
        ? this.queue.findIndex(
            (track) =>
              musicTrackKey(track) === musicTrackKey(this.currentTrack!),
          )
        : -1
    },
    async request(
      endpoint: string,
      payload: Record<string, unknown>,
    ): Promise<boolean> {
      this.isLoading = true
      const response = await nuiCall<MusicBootstrap>(endpoint, payload)
      this.isLoading = false
      this.error = response.success ? '' : (response.error ?? 'default')
      if (response.success && response.data) this.applyBootstrap(response.data)
      return response.success
    },
    async load(): Promise<boolean> {
      void loadYouTubeApi().catch((error) => {
        console.warn('[Music] YouTube API preload failed:', error)
      })
      return this.request('music:bootstrap', {})
    },
    async addYouTube(url: string, title = '', artist = ''): Promise<boolean> {
      return this.request('music:add-youtube', { artist, title, url })
    },
    async removeYouTube(id: string): Promise<boolean> {
      return this.request('music:remove-youtube', { id })
    },
    async createPlaylist(name: string): Promise<boolean> {
      return this.request('music:create-playlist', { name })
    },
    async renamePlaylist(id: string, name: string): Promise<boolean> {
      return this.request('music:rename-playlist', { id, name })
    },
    async deletePlaylist(id: string): Promise<boolean> {
      return this.request('music:delete-playlist', { id })
    },
    async addToPlaylist(
      playlistId: string,
      track: MusicTrack,
    ): Promise<boolean> {
      return this.request('music:add-to-playlist', {
        playlistId,
        songId: track.id,
        source: track.source,
      })
    },
    async removeFromPlaylist(
      playlistId: string,
      track: MusicTrack,
    ): Promise<boolean> {
      return this.request('music:remove-from-playlist', {
        playlistId,
        songId: track.id,
        source: track.source,
      })
    },
    trackForEntry(entry: MusicPlaylistEntry): MusicTrack | undefined {
      return this.allTracks.find(
        (track) => track.source === entry.source && track.id === entry.songId,
      )
    },
    tracksForPlaylist(playlist: MusicPlaylist): MusicTrack[] {
      return playlist.entries
        .map((entry) => this.trackForEntry(entry))
        .filter((track): track is MusicTrack => Boolean(track))
    },
    async play(track: MusicTrack, queue?: MusicTrack[]): Promise<void> {
      bindAudioEvents()
      stopActiveMedia()
      const playableQueue = queue?.length ? [...queue] : [...this.allTracks]
      if (!playableQueue.length) playableQueue.push(track)
      const index = playableQueue.findIndex(
        (candidate) => musicTrackKey(candidate) === musicTrackKey(track),
      )
      this.queue = playableQueue
      this.queueIndex = index >= 0 ? index : 0
      this.currentTrack = index >= 0 ? playableQueue[index]! : track
      this.currentTime = 0
      this.duration = 0
      this.isPlaying = false
      this.playbackError = ''
      try {
        if (track.source === 'server' && track.url) {
          audio.src = new URL(track.url, window.location.href).href
          audio.volume = this.volume
          await audio.play()
        } else if (track.source === 'youtube' && track.videoId) {
          await loadYouTubeTrack(track.videoId)
        } else {
          throw new Error('Track has no playable source.')
        }
      } catch (error) {
        console.error('[Music] Playback failed:', error)
        this.isPlaying = false
        this.playbackError = 'playback_failed'
      }
    },
    async toggle(): Promise<void> {
      if (!this.currentTrack) {
        const first = this.queue[0] ?? this.allTracks[0]
        if (first)
          await this.play(
            first,
            this.queue.length ? this.queue : this.allTracks,
          )
        return
      }
      if (this.isPlaying) {
        if (this.currentTrack.source === 'server') audio.pause()
        else youtubePlayer?.pauseVideo()
        this.isPlaying = false
        return
      }
      try {
        if (this.currentTrack.source === 'server') await audio.play()
        else youtubePlayer?.playVideo()
        this.isPlaying = true
      } catch (error) {
        console.error('[Music] Resume failed:', error)
        this.playbackError = 'playback_failed'
      }
    },
    async next(): Promise<void> {
      if (!this.queue.length) return
      const index =
        this.queueIndex < 0 ? 0 : (this.queueIndex + 1) % this.queue.length
      await this.play(this.queue[index]!, this.queue)
    },
    async previous(): Promise<void> {
      if (!this.queue.length) return
      if (this.currentTime > 3) {
        this.seek(0)
        return
      }
      const index =
        this.queueIndex <= 0 ? this.queue.length - 1 : this.queueIndex - 1
      await this.play(this.queue[index]!, this.queue)
    },
    seek(seconds: number): void {
      const next = Math.max(0, Math.min(this.duration || seconds, seconds))
      this.currentTime = next
      if (this.currentTrack?.source === 'server') audio.currentTime = next
      else youtubePlayer?.seekTo(next, true)
    },
    setVolume(value: number): void {
      this.volume = Math.max(0, Math.min(1, value))
      audio.volume = this.volume
      youtubePlayer?.setVolume(this.volume * 100)
    },
    stop(): void {
      stopActiveMedia()
      this.currentTrack = null
      this.currentTime = 0
      this.duration = 0
      this.isPlaying = false
      this.playbackError = ''
      this.queue = []
      this.queueIndex = -1
    },
  },
})
