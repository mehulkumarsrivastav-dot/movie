import { useState } from 'react'
import { Star } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'

interface RateTonightModalProps {
  open: boolean
  onClose: () => void
  onSave: (rating: number, note: string) => void
}

export function RateTonightModal({ open, onClose, onSave }: RateTonightModalProps) {
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')

  return (
    <Modal open={open} onClose={onClose} title="Rate tonight">
      <div className="mb-4 flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
            <Star size={26} className={cn(n <= rating ? 'fill-rose-glow text-rose-glow' : 'text-cinema-line')} />
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What did you think?"
        rows={3}
        className="mb-4 w-full rounded-2xl border border-cinema-line bg-cinema-charcoal/70 p-3 text-sm text-cinema-fog outline-none focus:border-rose-glow/60"
      />
      <Button
        className="w-full"
        disabled={rating === 0}
        onClick={() => {
          onSave(rating, note)
          onClose()
        }}
      >
        Save memory
      </Button>
    </Modal>
  )
}
