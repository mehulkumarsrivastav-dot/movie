import { useEffect, useRef, useState, type RefObject } from 'react'
import { motion } from 'framer-motion'
import { Maximize2, Minimize2, MicOff, VideoOff, Pin, PinOff, RefreshCw } from 'lucide-react'
import { cn } from '../../utils/cn'

interface CameraBubbleProps {
  stream: MediaStream | null
  label: string
  isSelf?: boolean
  muted?: boolean
  cameraOff?: boolean
  micOff?: boolean
  minimized: boolean
  pinned?: boolean
  size: 'sm' | 'md' | 'lg'
  x: number
  y: number
  onMove: (x: number, y: number) => void
  onToggleMinimize: () => void
  onTogglePin?: () => void
  onFlipCamera?: () => void
  containerRef?: RefObject<HTMLDivElement | null>
  quality?: 'excellent' | 'good' | 'weak' | 'reconnecting' | 'unknown'
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg', { w: number; h: number }> = {
  sm: { w: 120, h: 84 },
  md: { w: 180, h: 124 },
  lg: { w: 240, h: 168 },
}

const QUALITY_COLOR: Record<string, string> = {
  excellent: 'bg-emerald-400',
  good: 'bg-amber-400',
  weak: 'bg-red-400',
  reconnecting: 'bg-amber-400 animate-pulse',
  unknown: 'bg-cinema-mist',
}

export function CameraBubble({
  stream,
  label,
  isSelf,
  muted = false,
  cameraOff,
  micOff,
  minimized,
  pinned,
  size,
  x,
  y,
  onMove,
  onToggleMinimize,
  onTogglePin,
  onFlipCamera,
  containerRef,
  quality = 'unknown',
}: CameraBubbleProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hovered, setHovered] = useState(false)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const dims = minimized ? { w: 56, h: 56 } : (isMobile ? { w: 130, h: 90 } : SIZE_MAP[size])

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.srcObject = stream
      if (stream) {
        void video.play().catch(() => {})
      }
    }
  }, [stream])

  return (
    <motion.div
      drag
      dragConstraints={containerRef}
      dragMomentum={false}
      dragElastic={0.02}
      initial={false}
      animate={{ width: dims.w, height: dims.h }}
      style={{ position: 'absolute', left: x, top: y, zIndex: pinned ? 40 : 30 }}
      onDragEnd={(_e, info) => {
        const maxX = typeof window !== 'undefined' ? window.innerWidth - dims.w - 12 : 1000
        const maxY = typeof window !== 'undefined' ? window.innerHeight - dims.h - 90 : 800
        const newX = Math.max(12, Math.min(maxX, x + info.offset.x))
        const newY = Math.max(12, Math.min(maxY, y + info.offset.y))
        onMove(newX, newY)
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      className={cn(
        'group cursor-grab overflow-hidden rounded-2xl sm:rounded-3xl border shadow-[0_18px_45px_-20px_rgba(0,0,0,0.85)] active:cursor-grabbing touch-none select-none',
        pinned ? 'border-rose-glow/80 ring-1 ring-rose-glow/50' : 'border-white/15',
        'bg-cinema-charcoal/90 backdrop-blur-md'
      )}
    >
      {!cameraOff && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={cn('h-full w-full object-cover pointer-events-none', isSelf && 'scale-x-[-1]')}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-cinema-charcoal text-cinema-mist p-2 text-center pointer-events-none">
          <VideoOff size={minimized ? 14 : 18} />
          {!minimized && <span className="text-[10px] truncate max-w-full font-medium">{label}</span>}
        </div>
      )}

      {!minimized && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 sm:p-2">
          <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium text-white/90 truncate">
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', QUALITY_COLOR[quality])} />
            <span className="truncate">{label}</span>
          </span>
          {micOff && <MicOff size={11} className="text-rose-glow shrink-0" />}
        </div>
      )}

      {/* Bubble control buttons */}
      {(hovered || isMobile) && (
        <div className="pointer-events-auto absolute right-1 top-1 flex gap-1">
          {isSelf && onFlipCamera && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFlipCamera()
              }}
              className="rounded-full bg-black/60 p-1 text-white backdrop-blur hover:bg-black/80 transition"
              aria-label="Flip camera"
              title="Flip camera"
            >
              <RefreshCw size={11} />
            </button>
          )}
          {onTogglePin && !isSelf && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onTogglePin()
              }}
              className="rounded-full bg-black/60 p-1 text-white backdrop-blur hover:bg-black/80 transition"
              aria-label={pinned ? 'Unpin' : 'Pin'}
            >
              {pinned ? <PinOff size={11} /> : <Pin size={11} />}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleMinimize()
            }}
            className="rounded-full bg-black/60 p-1 text-white backdrop-blur hover:bg-black/80 transition"
            aria-label={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
          </button>
        </div>
      )}
    </motion.div>
  )
}
