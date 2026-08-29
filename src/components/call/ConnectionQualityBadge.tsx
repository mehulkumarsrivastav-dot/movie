import { Wifi, WifiOff } from 'lucide-react'
import { cn } from '../../utils/cn'
import type { NetworkQuality } from '../../types/call'

const LABEL: Record<NetworkQuality, string> = {
  excellent: 'Excellent',
  good: 'Good',
  weak: 'Weak connection',
  reconnecting: 'Reconnecting…',
  unknown: 'Connecting…',
}

const COLOR: Record<NetworkQuality, string> = {
  excellent: 'text-emerald-400',
  good: 'text-amber-400',
  weak: 'text-red-400',
  reconnecting: 'text-amber-400',
  unknown: 'text-cinema-mist',
}

export function ConnectionQualityBadge({ quality, durationLabel }: { quality: NetworkQuality; durationLabel?: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs backdrop-blur-md">
      {quality === 'reconnecting' || quality === 'weak' ? (
        <WifiOff size={13} className={COLOR[quality]} />
      ) : (
        <Wifi size={13} className={cn(COLOR[quality])} />
      )}
      <span className={COLOR[quality]}>{LABEL[quality]}</span>
      {durationLabel && <span className="ml-1 font-mono text-cinema-mist">{durationLabel}</span>}
    </div>
  )
}
