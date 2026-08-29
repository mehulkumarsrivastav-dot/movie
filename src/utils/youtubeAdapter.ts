/**
 * Adapts the YouTube IFrame Player API to a minimal subset of the
 * HTMLVideoElement interface (currentTime, play/pause, playbackRate,
 * addEventListener for play/pause/waiting/playing/ended) so useWatchSync's
 * drift-correction and event logic can treat a YouTube embed exactly like a
 * native <video> element without special-casing it. This is an adapter, not
 * a real HTMLVideoElement — only the members useWatchSync actually touches
 * are implemented.
 */
export class YouTubePlayerAdapter extends EventTarget {
  private player: YT.Player | null = null
  private _rate = 1

  attach(player: YT.Player) {
    this.player = player
  }

  get paused() {
    return this.player?.getPlayerState?.() !== 1 // 1 = YT.PlayerState.PLAYING
  }

  get currentTime() {
    return this.player?.getCurrentTime?.() ?? 0
  }

  set currentTime(t: number) {
    this.player?.seekTo(t, true)
  }

  get playbackRate() {
    return this._rate
  }

  set playbackRate(r: number) {
    this._rate = r
    this.player?.setPlaybackRate(r)
  }

  play() {
    this.player?.playVideo()
    return Promise.resolve()
  }

  pause() {
    this.player?.pauseVideo()
  }

  emit(type: string) {
    this.dispatchEvent(new Event(type))
  }
}

declare global {
  interface Window {
    YT?: typeof YT
    onYouTubeIframeAPIReady?: () => void
  }
  namespace YT {
    class Player {
      constructor(el: HTMLElement | string, options: Record<string, unknown>)
      playVideo(): void
      pauseVideo(): void
      seekTo(seconds: number, allowSeekAhead: boolean): void
      getCurrentTime(): number
      getPlayerState(): number
      setPlaybackRate(rate: number): void
      destroy(): void
    }
  }
}

let apiLoadPromise: Promise<void> | null = null
export function loadYouTubeApi(): Promise<void> {
  if (window.YT) return Promise.resolve()
  if (apiLoadPromise) return apiLoadPromise
  apiLoadPromise = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve()
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  })
  return apiLoadPromise
}
