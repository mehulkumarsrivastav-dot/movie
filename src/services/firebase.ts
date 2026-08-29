import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

/**
 * All values come from Vite env vars (see .env.example).
 * When Firebase env vars are missing, the app gracefully runs in Local/P2P Mode
 * using LocalStorage + BroadcastChannel + WebRTC without crashing.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  )
}

let firebaseAppInstance: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null

if (isFirebaseConfigured()) {
  try {
    firebaseAppInstance = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
    authInstance = getAuth(firebaseAppInstance)
    dbInstance = getFirestore(firebaseAppInstance)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[firebase] Could not initialize Firebase SDK, falling back to Local/P2P mode:', err)
  }
}

export const firebaseApp = firebaseAppInstance
export const auth = authInstance
export const db = dbInstance
export const googleProvider = new GoogleAuthProvider()
