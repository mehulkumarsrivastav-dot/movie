import { motion } from 'framer-motion'
import { ExternalLink, Heart } from 'lucide-react'
import { Button } from '../ui/Button'
import type { WatchSource } from '../../types/player'

interface ExternalWatchPanelProps {
  source: WatchSource
  meReady: boolean
  partnerReady: boolean
  countdown: number | null
  onOpen: () => void
  onMarkReady: () => void
}

export function ExternalWatchPanel({ source, meReady, partnerReady, countdown, onOpen, onMarkReady }: ExternalWatchPanelProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-cinema-black p-10 text-center">
      {countdown !== null ? (
        <motion.div key={countdown} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-7xl text-rose-glow">
          {countdown > 0 ? countdown : <span className="flex items-center gap-3 text-5xl">Play <Heart fill="currentColor" /></span>}
        </motion.div>
      ) : (
        <>
          <div>
            <p className="text-xs uppercase tracking-wider text-cinema-mist">External Watch Mode</p>
            <h2 className="mt-2 font-display text-2xl text-white">{source.title}</h2>
            <p className="mt-1 text-sm text-cinema-mist">on {source.provider}</p>
          </div>
          <p className="max-w-sm text-xs text-cinema-mist">
            This site can't be played inside Movie Night, so we'll open it in another tab. Your call stays
            connected the whole time — start the movie at the same moment using the countdown below.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button size="lg" icon={<ExternalLink size={16} />} onClick={onOpen}>
              Open Movie
            </Button>
            <Button size="lg" variant={meReady ? 'secondary' : 'primary'} icon={<Heart size={16} />} onClick={onMarkReady} disabled={meReady}>
              {meReady ? "You're ready" : 'Ready ❤️'}
            </Button>
          </div>
          <div className="flex gap-6 text-xs text-cinema-mist">
            <span className={meReady ? 'text-rose-glow' : ''}>Me: {meReady ? 'Ready' : 'Waiting…'}</span>
            <span className={partnerReady ? 'text-rose-glow' : ''}>Partner: {partnerReady ? 'Ready' : 'Waiting…'}</span>
          </div>
        </>
      )}
    </div>
  )
}
