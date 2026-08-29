import { useState } from 'react'
import { ExternalLink, HelpCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import type { WatchSource } from '../../types/player'

interface SupportedEmbedPlayerProps {
  source: WatchSource
  onConfirmBlocked: () => void
}

/**
 * Renders an iframe for providers on our explicit "officially embeddable"
 * allowlist (see urlResolver.ts). Because browsers do not expose whether an
 * iframe was actually refused by X-Frame-Options/CSP to the embedding
 * page's JS, we can't auto-detect failure — we ask the user to confirm
 * playback is visible, and offer an honest fallback if not.
 */
export function SupportedEmbedPlayer({ source, onConfirmBlocked }: SupportedEmbedPlayerProps) {
  const [confirming, setConfirming] = useState(true)

  return (
    <div className="relative h-full w-full bg-black">
      {source.embedUrl && (
        <iframe
          src={source.embedUrl}
          className="h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          title={source.title}
        />
      )}
      {confirming && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center">
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs text-white backdrop-blur-md">
            <HelpCircle size={14} className="text-rose-glow" />
            Can you see the {source.provider} player above?
            <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>Yes</Button>
            <Button size="sm" variant="ghost" icon={<ExternalLink size={12} />} onClick={onConfirmBlocked}>
              No, open externally
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
