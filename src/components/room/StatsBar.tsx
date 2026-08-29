import type { RoomStats } from '../../types/memory'
import { formatDuration } from '../../utils/time'

export function StatsBar({ stats }: { stats: RoomStats | null }) {
  if (!stats) return null
  return (
    <div className="grid grid-cols-3 gap-3 text-center">
      <Stat label="Movie nights" value={stats.movieNightsCount} />
      <Stat label="Time together" value={formatDuration(stats.totalWatchTimeSec)} />
      <Stat label="Movies completed" value={stats.moviesCompletedCount} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-cinema-line bg-cinema-black/60 p-4">
      <p className="font-display text-2xl text-white">{value}</p>
      <p className="mt-1 text-[11px] text-cinema-mist">{label}</p>
    </div>
  )
}
