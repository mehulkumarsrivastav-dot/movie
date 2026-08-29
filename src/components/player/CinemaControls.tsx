import { Play, Pause, Maximize, Minimize } from 'lucide-react'
import { formatClock } from '../../utils/time'
import { IconButton } from '../ui/IconButton'

interface CinemaControlsProps {
  playing: boolean
  currentTime: number
  duration: number
  onPlayPause: () => void
  onSeek: (t: number) => void
  onFullscreen: () => void
  isFullscreen: boolean
  canControl: boolean
}

export function CinemaControls({ playing, currentTime, duration, onPlayPause, onSeek, onFullscreen, isFullscreen, canControl }: CinemaControlsProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-black/50 px-4 py-3 backdrop-blur-md">
      <IconButton label={playing ? 'Pause' : 'Play'} onClick={onPlayPause} disabled={!canControl}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </IconButton>
      <span className="w-12 shrink-0 font-mono text-xs text-cinema-mist">{formatClock(currentTime)}</span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        value={currentTime}
        onChange={(e) => onSeek(Number(e.target.value))}
        disabled={!canControl || !duration}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-rose-glow disabled:cursor-default"
      />
      <span className="w-12 shrink-0 font-mono text-xs text-cinema-mist">{formatClock(duration)}</span>
      <IconButton label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={onFullscreen}>
        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </IconButton>
    </div>
  )
}
