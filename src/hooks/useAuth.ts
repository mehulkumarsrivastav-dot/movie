import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { subscribeToAuthState, type LocalUser } from '../services/authService'

export type AppUser = User | LocalUser
export type AuthStatus = 'loading' | 'signed-out' | 'signed-in'

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    const unsub = subscribeToAuthState((u) => {
      setUser(u)
      setStatus(u ? 'signed-in' : 'signed-out')
    })
    return unsub
  }, [])

  return { user, status }
}
