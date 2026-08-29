import type { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { LoginScreen } from './LoginScreen'
import { NotAllowedScreen } from './NotAllowedScreen'
import { isLikelyAllowed } from '../../services/authService'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-glow border-t-transparent" />
      </div>
    )
  }

  if (status === 'signed-out' || !user) return <LoginScreen />

  // Client-side UX shortcut only. The real boundary is firestore.rules,
  // which every read/write in this app is checked against server-side.
  if (!isLikelyAllowed(user.email)) return <NotAllowedScreen email={user.email} />

  return <>{children}</>
}
