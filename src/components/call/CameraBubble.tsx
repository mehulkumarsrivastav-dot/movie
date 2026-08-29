import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Maximize2, Minimize2, MicOff, VideoOff, Pin, PinOff } from 'lucide-react'
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
  quality?: 'excellent' | 'good' | 'weak' | 'reconnecting' | 'unknown'
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg', { w: number; h: number }> = {
  sm: { w: 140, h: 96 },
  md: { w: 200, h: 138 },
  lg: { w: 280, h: 194 },
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
  muted,
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
  quality = 'unknown',
}: CameraBubbleProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hovered, setHovered] = useState(false)
  const dims = minimized ? { w: 64, h: 64 } : SIZE_MAP[size]

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream])

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      initial={false}
      animate={{ width: dims.w, height: dims.h }}
      style={{ position: 'absolute', left: x, top: y, zIndex: pinned ? 40 : 30 }}
      onDragEnd={(_e, info) => onMove(Math.max(4, x + info.offset.x), Math.max(4, y + info.offset.y))}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={cn(
        'group cursor-grab overflow-hidden rounded-3xl border shadow-[0_18px_45px_-20px_rgba(0,0,0,0.85)] active:cursor-grabbing',
        pinned ? 'border-rose-glow/70' : 'border-white/10',
        'bg-cinema-charcoal'
      )}
    >
      {!cameraOff && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={cn('h-full w-full object-cover', isSelf && 'scale-x-[-1]')}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-cinema-charcoal text-cinema-mist">
          <VideoOff size={minimized ? 14 : 20} />
          {!minimized && <span className="text-[10px]">{label}</span>}
        </div>
      )}

      {!minimized && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-2">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/90">
            <span className={cn('h-1.5 w-1.5 rounded-full', QUALITY_COLOR[quality])} />
            {label}
          </span>
          {micOff && <MicOff size={12} className="text-rose-glow" />}
        </div>
      )}

      {hovered && (
        <div className="pointer-events-auto absolute right-1.5 top-1.5 flex gap-1">
          {onTogglePin && !isSelf && (
            <button
              onClick={onTogglePin}
              className="rounded-full bg-black/50 p-1.5 text-white backdrop-blur hover:bg-black/70"
              aria-label={pinned ? 'Unpin' : 'Pin'}
            >
              {pinned ? <PinOff size={12} /> : <Pin size={12} />}
            </button>
          )}
          <button
            onClick={onToggleMinimize}
            className="rounded-full bg-black/50 p-1.5 text-white backdrop-blur hover:bg-black/70"
            aria-label={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
        </div>
      )}
    </motion.div>
  )
}
