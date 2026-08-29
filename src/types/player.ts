export type PlayerState =
  | 'EMPTY'
  | 'LOADING'
  | 'READY'
  | 'PLAYING'
  | 'PAUSED'
  | 'BUFFERING'
  | 'ENDED'
  | 'ERROR'

export type WatchMode =
  | 'DIRECT_MEDIA'
  | 'YOUTUBE'
  | 'SUPPORTED_EMBED'
  | 'EXTERNAL'
  | 'SCREEN_SHARE'

export type MediaKind = 'mp4' | 'webm' | 'hls' | 'dash' | 'unknown'

export interface WatchSource {
  mode: WatchMode
  provider: string
  embedUrl: string | null
  mediaUrl: string | null
  mediaKind: MediaKind | null
  title: string
  originalUrl: string
  /** true only when the provider's own docs confirm embedding is permitted */
  officiallyEmbeddable: boolean
}

export type SyncEventType =
  | 'PLAY'
  | 'PAUSE'
  | 'SEEK'
  | 'BUFFERING'
  | 'READY'
  | 'RATE_CHANGE'
  | 'MEDIA_CHANGED'
  | 'EXTERNAL_READY'
  | 'EXTERNAL_COUNTDOWN'
  | 'PING'
  | 'PONG'

export interface SyncEvent {
  type: SyncEventType
  roomId: string
  senderId: string
  currentTime: number
  playbackRate: number
  sentAt: number      // monotonic-ish local timestamp (Date.now())
  sequence: number
  payload?: Record<string, unknown>
}

export interface DriftCorrectionConfig {
  /** below this |drift|, do nothing */
  toleranceMs: number
  /** between tolerance and hardSeekMs, nudge playbackRate instead of seeking */
  softCorrectMs: number
  /** above this, hard-seek to resync immediately */
  hardSeekMs: number
  /** how much to nudge playbackRate by during a soft correction */
  rateNudge: number
  /** how often to compare clocks/positions, ms */
  checkIntervalMs: number
}

export const DEFAULT_DRIFT_CONFIG: DriftCorrectionConfig = {
  toleranceMs: 250,
  softCorrectMs: 1000,
  hardSeekMs: 1000,
  rateNudge: 0.03,
  checkIntervalMs: 3000,
}
