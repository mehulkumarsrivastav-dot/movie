import { useEffect, useRef, useState } from 'react'
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
  quality = 'unknown',
}: CameraBubbleProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const dims = minimized ? { w: 56, h: 56 } : isMobile ? { w: 130, h: 90 } : SIZE_MAP[size]

  // Local state for smooth, glitch-free dragging
  const [pos, setPos] = useState({ x, y })
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ startX: 0, startY: 0, bubbleX: 0, bubbleY: 0 })

  // Keep in sync with incoming x/y prop changes when not actively dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setPos({ x, y })
    }
  }, [x, y])

  // Attach stream to video element
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.srcObject = stream
      if (stream) {
        void video.play().catch(() => {})
      }
    }
  }, [stream])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    isDraggingRef.current = true
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      bubbleX: pos.x,
      bubbleY: pos.y,
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - dragStartRef.current.startX
    const dy = e.clientY - dragStartRef.current.startY

    const maxX = Math.max(8, window.innerWidth - dims.w - 8)
    const maxY = Math.max(8, window.innerHeight - dims.h - 75)

    const nextX = Math.max(8, Math.min(maxX, dragStartRef.current.bubbleX + dx))
    const nextY = Math.max(8, Math.min(maxY, dragStartRef.current.bubbleY + dy))

    setPos({ x: nextX, y: nextY })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    onMove(pos.x, pos.y)
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${dims.w}px`,
        height: `${dims.h}px`,
        zIndex: pinned ? 40 : 30,
        touchAction: 'none',
      }}
      className={cn(
        'group cursor-grab overflow-hidden rounded-2xl sm:rounded-3xl border shadow-[0_18px_45px_-20px_rgba(0,0,0,0.85)] active:cursor-grabbing select-none transition-shadow',
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
    </div>
  )
}
