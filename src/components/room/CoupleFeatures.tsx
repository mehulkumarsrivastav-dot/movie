import { motion, AnimatePresence } from 'framer-motion'
import { Heart } from 'lucide-react'
import { IconButton } from '../ui/IconButton'

interface CoupleFeaturesProps {
  onMissYou: () => void
  onKiss: () => void
  incomingMissYou: boolean
  incomingKiss: boolean
}

export function CoupleFeatures({ onMissYou, onKiss, incomingMissYou, incomingKiss }: CoupleFeaturesProps) {
  return (
    <div className="flex items-center gap-2">
      <IconButton label="Miss You" onClick={onMissYou}>
        <Heart size={16} />
      </IconButton>
      <button
        onClick={onKiss}
        className="rounded-full bg-white/10 px-3 py-2.5 text-sm text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-90"
      >
        💋
      </button>

      <AnimatePresence>
        {incomingMissYou && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed left-1/2 top-8 z-[70] -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm text-white backdrop-blur-xl"
          >
            She's missing you ❤️
          </motion.div>
        )}
        {incomingKiss && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed left-1/2 top-1/2 z-[70] -translate-x-1/2 -translate-y-1/2 text-7xl"
          >
            💋
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
