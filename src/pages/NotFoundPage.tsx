import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <Heart size={22} className="text-rose-glow/60" />
      <p className="text-white">We couldn't find that page.</p>
      <Link to="/" className="text-sm text-rose-glow underline">Back to Movie Night</Link>
    </div>
  )
}
