import { Camera, Heart } from 'lucide-react'
import { Button } from '../ui/Button'
import type { AppError } from '../../utils/errors'

interface PermissionGateProps {
  onRetry: () => void
  error: AppError | null
}

export function PermissionGate({ onRetry, error }: PermissionGateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-cinema-line bg-cinema-black/60 p-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-glow/10 text-rose-glow">
        <Camera size={24} />
      </div>
      <h2 className="font-display text-lg text-white">We need your camera so she can see your beautiful face</h2>
      <p className="mt-2 max-w-sm text-sm text-cinema-mist">
        {error ? error.friendlyMessage : 'Allow camera and microphone access when your browser asks — nothing is ever recorded or stored.'}
      </p>
      <Button className="mt-6" onClick={onRetry} icon={<Heart size={14} />}>
        Try again
      </Button>
    </div>
  )
}
