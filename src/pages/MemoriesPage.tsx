import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Heart, Star } from 'lucide-react'
import { subscribeToMemories } from '../services/memoryService'
import type { MovieMemory } from '../types/memory'
import { formatDuration } from '../utils/time'
import { Card } from '../components/ui/Card'

export function MemoriesPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [memories, setMemories] = useState<MovieMemory[]>([])

  useEffect(() => {
    if (!roomId) return
    return subscribeToMemories(roomId, setMemories)
  }, [roomId])

  return (
    <div className="min-h-screen px-6 py-10">
      <button onClick={() => navigate(-1)} className="mb-8 flex items-center gap-1.5 text-sm text-cinema-mist hover:text-white">
        <ArrowLeft size={15} /> Back
      </button>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-2">
          <Heart size={18} className="text-rose-glow" />
          <h1 className="font-display text-2xl text-white">Our Movie Memories</h1>
        </div>

        {memories.length === 0 && <p className="text-sm text-cinema-mist">No memories yet — finish a movie together and rate it to start your collection.</p>}

        <div className="space-y-4">
          {memories.map((m) => (
            <Card key={m.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg text-white">{m.title}</h3>
                  <p className="mt-0.5 text-xs text-cinema-mist">{new Date(m.date).toLocaleDateString()} · {formatDuration(m.durationWatchedSec)} · {m.watchMode}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-6 text-xs">
                <RatingRow label="Host" rating={m.ratingHost} />
                <RatingRow label="Partner" rating={m.ratingPartner} />
              </div>
              {m.note && <p className="mt-3 text-sm italic text-cinema-fog">"{m.note}"</p>}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function RatingRow({ label, rating }: { label: string; rating: number | null }) {
  return (
    <div className="flex items-center gap-1 text-cinema-mist">
      {label}:
      {rating ? (
        [...Array(5)].map((_, i) => <Star key={i} size={12} className={i < rating ? 'fill-rose-glow text-rose-glow' : 'text-cinema-line'} />)
      ) : (
        <span className="text-cinema-line">not rated</span>
      )}
    </div>
  )
}
