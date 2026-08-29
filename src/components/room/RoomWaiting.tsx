import { motion } from 'framer-motion'
import { Copy, Check, Heart } from 'lucide-react'
import { useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'

interface RoomWaitingProps {
  code: string
  onLeave: () => void
}

export function RoomWaiting({ code, onLeave }: RoomWaitingProps) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const link = `${window.location.origin}/room/${code}`

  const copy = async (text: string, which: 'code' | 'link') => {
    await navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 1800)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-glow/10 text-rose-glow"
        >
          <Heart size={26} fill="currentColor" fillOpacity={0.2} />
        </motion.div>
        <h1 className="font-display text-2xl text-white">Waiting for your partner</h1>
        <p className="mt-2 text-sm text-cinema-mist">Send her this room code, or the link below.</p>

        <Card className="mt-8 p-6">
          <p className="mb-2 text-xs uppercase tracking-wider text-cinema-mist">Room code</p>
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="font-mono text-3xl tracking-[0.3em] text-white">{code}</span>
            <button onClick={() => copy(code, 'code')} className="text-cinema-mist hover:text-rose-glow" aria-label="Copy code">
              {copied === 'code' ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <button
            onClick={() => copy(link, 'link')}
            className="flex w-full items-center justify-between rounded-2xl border border-cinema-line bg-cinema-charcoal/60 px-4 py-3 text-left text-xs text-cinema-mist hover:border-rose-glow/40"
          >
            <span className="truncate font-mono">{link}</span>
            {copied === 'link' ? <Check size={15} className="ml-2 shrink-0 text-rose-glow" /> : <Copy size={15} className="ml-2 shrink-0" />}
          </button>
        </Card>

        <Button variant="ghost" className="mt-6" onClick={onLeave}>
          Leave room
        </Button>
      </motion.div>
    </div>
  )
}
