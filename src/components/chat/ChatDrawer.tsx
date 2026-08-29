import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Send } from 'lucide-react'
import type { ChatMessage } from '../../types/chat'
import { Input } from '../ui/Input'
import { IconButton } from '../ui/IconButton'
import { cn } from '../../utils/cn'

interface ChatDrawerProps {
  open: boolean
  onClose: () => void
  messages: ChatMessage[]
  myUid: string
  onSend: (text: string) => void
}

export function ChatDrawer({ open, onClose, messages, myUid, onSend }: ChatDrawerProps) {
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const submit = () => {
    if (!text.trim()) return
    onSend(text)
    setText('')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-cinema-line bg-cinema-black/95 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-cinema-line p-4">
            <h3 className="font-display text-white">Chat</h3>
            <IconButton label="Close chat" onClick={onClose}>
              <X size={16} />
            </IconButton>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && <p className="text-center text-xs text-cinema-mist">Say hi ❤️</p>}
            {messages.map((m) => (
              <div key={m.id} className={cn('max-w-[80%] rounded-2xl px-3.5 py-2 text-sm', m.senderId === myUid ? 'ml-auto bg-rose-glow text-cinema-void' : 'bg-cinema-charcoal text-cinema-fog')}>
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2 border-t border-cinema-line p-3">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Type a message…"
            />
            <IconButton label="Send" onClick={submit}>
              <Send size={16} />
            </IconButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
