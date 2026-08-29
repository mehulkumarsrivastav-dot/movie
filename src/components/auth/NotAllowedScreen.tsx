import { Heart } from 'lucide-react'
import { Button } from '../ui/Button'
import { signOut } from '../../services/authService'

export function NotAllowedScreen({ email }: { email: string | null }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Heart size={28} className="mb-4 text-rose-glow/60" />
      <h1 className="font-display text-xl text-white">This cinema is reserved</h1>
      <p className="mt-2 max-w-sm text-sm text-cinema-mist">
        {email ?? 'This account'} isn't on the guest list for this private Movie Night. If that's a
        mistake, ask whoever set this app up to add your email to <span className="font-mono text-xs">VITE_ALLOWED_USERS_HINT</span> and the
        Firestore allowlist.
      </p>
      <Button variant="secondary" className="mt-6" onClick={() => void signOut()}>
        Sign out
      </Button>
    </div>
  )
}
