import { AnimatePresence, motion } from 'framer-motion'
import type { ReactionEvent } from '../../types/chat'

/** Reactions float upward over the movie without interrupting playback or capturing pointer events. */
export function FloatingReactions({ reactions }: { reactions: ReactionEvent[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.span
            key={r.id}
            initial={{ opacity: 0, y: 40, x: (r.id.charCodeAt(0) % 40) - 20 }}
            animate={{ opacity: [0, 1, 1, 0], y: -220 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.6, ease: 'easeOut' }}
            style={{ position: 'absolute', bottom: '18%', left: `${20 + (r.id.charCodeAt(1) % 60)}%`, fontSize: 32 }}
          >
            {r.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
