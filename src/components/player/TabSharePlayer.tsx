import { useEffect, useRef } from 'react'
import { Monitor } from 'lucide-react'

interface TabSharePlayerProps {
  stream: MediaStream
  isSelfSharing?: boolean
  onStopShare?: () => void
}

/** Displays a partner's shared browser tab/window/screen stream with audio */
export function TabSharePlayer({ stream, isSelfSharing, onStopShare }: TabSharePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      // Mute if self is sharing to avoid feedback loop, unmuted for partner
      videoRef.current.muted = Boolean(isSelfSharing)
      void videoRef.current.play().catch(() => {})
    }
  }, [stream, isSelfSharing])

  return (
    <div className="relative h-full w-full bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full object-contain"
      />
      {isSelfSharing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full bg-black/70 px-4 py-2 text-xs text-white backdrop-blur border border-white/10 shadow-lg">
          <Monitor size={14} className="text-rose-glow animate-pulse" />
          <span>You are sharing your screen to the cinema</span>
          {onStopShare && (
            <button
              onClick={onStopShare}
              className="rounded-full bg-rose-glow/20 px-2.5 py-0.5 text-xs text-rose-glow hover:bg-rose-glow/30"
            >
              Stop Sharing
            </button>
          )}
        </div>
      )}
    </div>
  )
}
