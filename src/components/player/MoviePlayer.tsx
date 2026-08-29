import { useEffect, useState } from 'react'
import { Film, ExternalLink } from 'lucide-react'
import { WatchSourceInput } from './WatchSourceInput'
import { DirectMediaPlayer } from './DirectMediaPlayer'
import { YouTubeEmbedPlayer } from './YouTubeEmbedPlayer'
import { SupportedEmbedPlayer } from './SupportedEmbedPlayer'
import { ExternalWatchPanel } from './ExternalWatchPanel'
import { TabSharePlayer } from './TabSharePlayer'
import { CinemaControls } from './CinemaControls'
import type { WatchSource, PlayerState } from '../../types/player'
import type { YouTubePlayerAdapter } from '../../utils/youtubeAdapter'

interface MoviePlayerProps {
  source: WatchSource | null
  playerState: PlayerState
  onSubmitUrl: (url: string, title?: string) => void
  onPickLocalFile?: (file: File) => void
  onShareScreen?: () => void
  urlError: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  youtubeAdapterRef: React.RefObject<YouTubePlayerAdapter | null>
  onPlay: () => void
  onPause: () => void
  onSeek: (t: number) => void
  canControl: boolean
  externalReady: { me: boolean; partner: boolean }
  externalCountdown: number | null
  onExternalOpen: () => void
  onExternalMarkReady: () => void
  pauseOnPartnerBuffer: boolean
  partnerScreenShareStream: MediaStream | null
  localScreenShareStream?: MediaStream | null
  onStopScreenShare?: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
}

export function MoviePlayer({
  source,
  playerState,
  onSubmitUrl,
  onPickLocalFile,
  onShareScreen,
  urlError,
  videoRef,
  youtubeAdapterRef,
  onPlay,
  onPause,
  onSeek,
  canControl,
  externalReady,
  externalCountdown,
  onExternalOpen,
  onExternalMarkReady,
  pauseOnPartnerBuffer,
  partnerScreenShareStream,
  localScreenShareStream,
  onStopScreenShare,
  isFullscreen,
  onToggleFullscreen,
}: MoviePlayerProps) {
  const [embedBlocked, setEmbedBlocked] = useState(false)
  const [activeEl, setActiveEl] = useState({ currentTime: 0, duration: 0, paused: true })

  // Poll the active media element/adapter for live position
  useEffect(() => {
    const id = setInterval(() => {
      if (source?.mode === 'YOUTUBE') {
        const adapter = youtubeAdapterRef.current
        setActiveEl({ currentTime: adapter?.currentTime ?? 0, duration: 0, paused: adapter?.paused ?? true })
      } else {
        const video = videoRef.current
        setActiveEl({ currentTime: video?.currentTime ?? 0, duration: video?.duration ?? 0, paused: video?.paused ?? true })
      }
    }, 400)
    return () => clearInterval(id)
  }, [source?.mode, videoRef, youtubeAdapterRef])

  // If a screen share stream is active (either partner's or local)
  if (partnerScreenShareStream || localScreenShareStream) {
    return (
      <div className="relative flex h-full w-full flex-col bg-black">
        <TabSharePlayer
          stream={partnerScreenShareStream || localScreenShareStream!}
          isSelfSharing={Boolean(localScreenShareStream && !partnerScreenShareStream)}
          onStopShare={onStopScreenShare}
        />
      </div>
    )
  }

  if (!source) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-cinema-void p-6 md:p-10 overflow-y-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-glow/10 text-rose-glow shadow-[0_0_30px_rgba(232,116,138,0.2)]">
          <Film size={28} strokeWidth={1.5} />
        </div>
        <WatchSourceInput
          onSubmit={onSubmitUrl}
          onPickLocalFile={onPickLocalFile}
          onShareScreen={onShareScreen}
          errorMessage={urlError}
        />
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full flex-col bg-black">
      <div className="relative flex-1">
        {source.mode === 'DIRECT_MEDIA' && (
          <DirectMediaPlayer source={source} videoRef={videoRef} onError={() => {}} />
        )}
        {source.mode === 'YOUTUBE' && <YouTubeEmbedPlayer source={source} adapterRef={youtubeAdapterRef} />}
        {source.mode === 'SUPPORTED_EMBED' && !embedBlocked && (
          <SupportedEmbedPlayer source={source} onConfirmBlocked={() => setEmbedBlocked(true)} />
        )}
        {(source.mode === 'EXTERNAL' || embedBlocked) && (
          <ExternalWatchPanel
            source={source}
            meReady={externalReady.me}
            partnerReady={externalReady.partner}
            countdown={externalCountdown}
            onOpen={() => {
              window.open(source.originalUrl, '_blank', 'noopener,noreferrer')
              onExternalOpen()
            }}
            onMarkReady={onExternalMarkReady}
          />
        )}
        {source.mode === 'SCREEN_SHARE' && partnerScreenShareStream && (
          <TabSharePlayer stream={partnerScreenShareStream} />
        )}

        {playerState === 'BUFFERING' && pauseOnPartnerBuffer && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-glow border-t-transparent" />
            <p className="text-sm text-white font-display">Waiting for your partner ❤️</p>
          </div>
        )}
      </div>

      {(source.mode === 'DIRECT_MEDIA' || source.mode === 'YOUTUBE') && (
        <div className="p-3">
          <CinemaControls
            playing={!activeEl.paused}
            currentTime={activeEl.currentTime}
            duration={activeEl.duration}
            onPlayPause={() => (activeEl.paused ? onPlay() : onPause())}
            onSeek={onSeek}
            onFullscreen={onToggleFullscreen}
            isFullscreen={isFullscreen}
            canControl={canControl}
          />
        </div>
      )}

      {source.mode === 'SUPPORTED_EMBED' && !embedBlocked && (
        <div className="absolute right-3 top-3">
          <button
            onClick={() => setEmbedBlocked(true)}
            className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[11px] text-white backdrop-blur hover:bg-black/80 transition"
          >
            <ExternalLink size={11} /> Trouble watching? Open externally
          </button>
        </div>
      )}
    </div>
  )
}
