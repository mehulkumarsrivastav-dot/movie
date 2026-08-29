import type { ReactionEmoji } from '../../types/chat'

const EMOJIS: ReactionEmoji[] = ['❤️', '😂', '😭', '😘', '🍿', '👀', '😱']

export function ReactionBar({ onReact }: { onReact: (emoji: ReactionEmoji) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2 py-1.5 backdrop-blur-xl">
      {EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => onReact(e)}
          className="rounded-full p-1.5 text-lg transition-transform hover:scale-125 active:scale-95"
          aria-label={`React ${e}`}
        >
          {e}
        </button>
      ))}
    </div>
  )
}
