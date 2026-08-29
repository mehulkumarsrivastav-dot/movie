import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { WatchSource } from '../../types/player'
import { YouTubePlayerAdapter, loadYouTubeApi } from '../../utils/youtubeAdapter'

interface YouTubeEmbedPlayerProps {
  source: WatchSource
  adapterRef: RefObject<YouTubePlayerAdapter | null>
}

export function YouTubeEmbedPlayer({ source, adapterRef }: YouTubeEmbedPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoId = source.embedUrl?.split('/embed/')[1]?.split('?')[0] ?? ''

  useEffect(() => {
    let destroyed = false
    let ytPlayer: YT.Player | null = null

    void loadYouTubeApi().then(() => {
      if (destroyed || !containerRef.current || !window.YT) return
      const adapter = new YouTubePlayerAdapter()
      adapterRef.current = adapter
      ytPlayer = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => adapter.attach(ytPlayer!),
          onStateChange: (e: { data: number }) => {
            if (e.data === 1) adapter.emit('play')
            if (e.data === 2) adapter.emit('pause')
            if (e.data === 3) adapter.emit('waiting')
            if (e.data === 0) adapter.emit('ended')
          },
        },
      })
    })

    return () => {
      destroyed = true
      ytPlayer?.destroy?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  return (
    <div className="relative h-full w-full bg-black">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
