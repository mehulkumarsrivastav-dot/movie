import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import Hls from 'hls.js'
import type { WatchSource } from '../../types/player'

interface DirectMediaPlayerProps {
  source: WatchSource
  videoRef: RefObject<HTMLVideoElement | null>
  onError: (message: string) => void
}

/**
 * Plays MP4/WebM natively via the <video> element, and HLS (.m3u8) via
 * hls.js on browsers without native HLS support (Chrome, Firefox, Edge).
 * Safari plays HLS natively so hls.js is skipped there. DASH support is
 * intentionally left as a documented TODO — see README — since it needs an
 * additional player library (e.g. dash.js/shaka-player) we haven't wired up.
 */
export function DirectMediaPlayer({ source, videoRef, onError }: DirectMediaPlayerProps) {
  const hlsRef = useRef<Hls | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !source.mediaUrl) return

    hlsRef.current?.destroy()
    hlsRef.current = null

    if (source.mediaKind === 'hls') {
      const nativelySupported = video.canPlayType('application/vnd.apple.mpegurl')
      if (nativelySupported) {
        video.src = source.mediaUrl
      } else if (Hls.isSupported()) {
        const hls = new Hls()
        hls.loadSource(source.mediaUrl)
        hls.attachMedia(video)
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) onError('This HLS stream failed to load — the link may be expired or unreachable.')
        })
        hlsRef.current = hls
      } else {
        onError("Your browser can't play HLS streams.")
      }
    } else if (source.mediaKind === 'dash') {
      onError('DASH playback needs an additional player library that is not yet wired up in this build (see README TODOs).')
    } else {
      video.src = source.mediaUrl
    }

    return () => {
      hlsRef.current?.destroy()
      hlsRef.current = null
    }
  }, [source, videoRef, onError])

  return (
    <video
      ref={videoRef}
      className="h-full w-full bg-black object-contain"
      playsInline
      controls={false}
      onError={() => onError('This file could not be played — it may not be a direct, publicly reachable video link.')}
    />
  )
}
