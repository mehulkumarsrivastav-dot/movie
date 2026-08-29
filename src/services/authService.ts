import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider, isFirebaseConfigured } from './firebase'
import { AppError } from '../utils/errors'

export interface LocalUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

const LOCAL_USER_KEY = 'movie_night_local_user'
const authListeners = new Set<(user: User | LocalUser | null) => void>()

function getStoredLocalUser(): LocalUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LocalUser
  } catch {
    return null
  }
}

function setStoredLocalUser(user: LocalUser | null) {
  if (user) {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(LOCAL_USER_KEY)
  }
  authListeners.forEach((cb) => cb(user))
}

function clientSideAllowlistHint(): string[] {
  const raw = import.meta.env.VITE_ALLOWED_USERS_HINT ?? ''
  return raw
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isLikelyAllowed(email: string | null): boolean {
  const hint = clientSideAllowlistHint()
  if (hint.length === 0) return true
  if (!email) return true // In local mode or without email, allow access
  return hint.includes(email.toLowerCase())
}

export async function signInAsLocalUser(displayName: string, role: 'host' | 'partner' = 'host', email?: string): Promise<LocalUser> {
  const defaultEmail = email || (role === 'host' ? 'me@movienight.local' : 'partner@movienight.local')
  const user: LocalUser = {
    uid: `local-${role}-${Date.now().toString(36)}`,
    email: defaultEmail,
    displayName: displayName || (role === 'host' ? 'Me ❤️' : 'Partner ❤️'),
    photoURL: null,
  }
  setStoredLocalUser(user)
  return user
}

export async function signInWithGoogle(): Promise<User | LocalUser> {
  if (!isFirebaseConfigured() || !auth) {
    return signInAsLocalUser('Me ❤️', 'host')
  }
  try {
    const cred = await signInWithPopup(auth, googleProvider)
    await ensureUserProfile(cred.user)
    return cred.user
  } catch (err) {
    throw new AppError('AUTH_FAILED', err)
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User | LocalUser> {
  if (!isFirebaseConfigured() || !auth) {
    const name = email.split('@')[0] || 'Me ❤️'
    return signInAsLocalUser(name, 'host', email)
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    await ensureUserProfile(cred.user)
    return cred.user
  } catch (err) {
    throw new AppError('AUTH_FAILED', err)
  }
}

export async function registerWithEmail(email: string, password: string): Promise<User | LocalUser> {
  if (!isFirebaseConfigured() || !auth) {
    const name = email.split('@')[0] || 'Me ❤️'
    return signInAsLocalUser(name, 'host', email)
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await ensureUserProfile(cred.user)
    return cred.user
  } catch (err) {
    throw new AppError('AUTH_FAILED', err)
  }
}

export async function signOut(): Promise<void> {
  if (auth) {
    try {
      await fbSignOut(auth)
    } catch {
      /* ignore */
    }
  }
  setStoredLocalUser(null)
}

export function subscribeToAuthState(cb: (user: (User | LocalUser) | null) => void): () => void {
  authListeners.add(cb)
  const local = getStoredLocalUser()

  if (isFirebaseConfigured() && auth) {
    const fbUnsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        cb(fbUser)
      } else {
        cb(getStoredLocalUser())
      }
    })
    return () => {
      authListeners.delete(cb)
      fbUnsub()
    }
  }

  // Trigger initial callback with local user
  cb(local)
  return () => {
    authListeners.delete(cb)
  }
}

async function ensureUserProfile(user: User) {
  if (!db) return
  try {
    const ref = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Guest',
        photoURL: user.photoURL ?? null,
        createdAt: serverTimestamp(),
      })
    }
  } catch {
    /* ignore in local/offline */
  }
}
