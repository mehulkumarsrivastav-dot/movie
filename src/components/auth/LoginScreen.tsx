import { useState } from 'react'
import { motion } from 'framer-motion'
import { Film, Mail, Lock, Heart, User, Sparkles } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { signInWithGoogle, signInWithEmail, registerWithEmail, signInAsLocalUser } from '../../services/authService'
import { isFirebaseConfigured } from '../../services/firebase'
import { toAppError } from '../../utils/errors'

export function LoginScreen() {
  const [mode, setMode] = useState<'quick' | 'signin' | 'register'>('quick')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [customName, setCustomName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasFirebase = isFirebaseConfigured()

  const handleQuickLocal = async (role: 'host' | 'partner') => {
    setBusy(true)
    setError(null)
    try {
      const defaultName = role === 'host' ? 'Me ❤️' : 'My Partner ❤️'
      const finalName = customName.trim() || defaultName
      await signInAsLocalUser(finalName, role)
    } catch (err) {
      setError(toAppError(err, 'AUTH_FAILED').friendlyMessage)
    } finally {
      setBusy(false)
    }
  }

  const handleGoogle = async () => {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(toAppError(err, 'AUTH_FAILED').friendlyMessage)
    } finally {
      setBusy(false)
    }
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'signin') await signInWithEmail(email, password)
      else await registerWithEmail(email, password)
    } catch (err) {
      setError(toAppError(err, 'AUTH_FAILED').friendlyMessage)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-glow/10 text-rose-glow shadow-[0_0_25px_rgba(232,116,138,0.2)]">
            <Film size={26} strokeWidth={1.6} />
          </div>
          <h1 className="font-display text-2xl text-white tracking-wide">Movie Night</h1>
          <p className="mt-1 text-sm text-cinema-mist flex items-center justify-center gap-1.5">
            A private cinema for two <Heart size={13} className="text-rose-glow inline fill-rose-glow/20" />
          </p>
        </div>

        {mode === 'quick' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-rose-glow/20 bg-cinema-charcoal/60 p-4 backdrop-blur-xl">
              <p className="mb-3 text-xs text-cinema-fog flex items-center gap-1.5 font-medium">
                <Sparkles size={14} className="text-rose-glow" /> Quick Couple Access
              </p>
              <div className="space-y-2.5">
                <div className="relative mb-2">
                  <User size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cinema-mist" />
                  <Input
                    placeholder="Your name (e.g. Mehul / Partner)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="pl-9 text-xs py-2 bg-cinema-black/70"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="md"
                    className="w-full text-xs"
                    onClick={() => handleQuickLocal('host')}
                    disabled={busy}
                  >
                    Enter as Host ❤️
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full text-xs"
                    onClick={() => handleQuickLocal('partner')}
                    disabled={busy}
                  >
                    Enter as Partner ❤️
                  </Button>
                </div>
              </div>
            </div>

            {hasFirebase && (
              <>
                <div className="my-4 flex items-center gap-3 text-xs text-cinema-mist">
                  <div className="h-px flex-1 bg-cinema-line" />
                  or sign in with account
                  <div className="h-px flex-1 bg-cinema-line" />
                </div>

                <Button variant="secondary" size="lg" className="w-full" onClick={handleGoogle} disabled={busy}>
                  Continue with Google
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-cinema-mist"
                  onClick={() => setMode('signin')}
                >
                  Sign in with Email / Password
                </Button>
              </>
            )}
          </div>
        )}

        {(mode === 'signin' || mode === 'register') && (
          <div className="space-y-3">
            <Button variant="secondary" size="lg" className="w-full" onClick={handleGoogle} disabled={busy}>
              Continue with Google
            </Button>

            <div className="my-4 flex items-center gap-3 text-xs text-cinema-mist">
              <div className="h-px flex-1 bg-cinema-line" />
              or
              <div className="h-px flex-1 bg-cinema-line" />
            </div>

            <form onSubmit={handleEmail} className="space-y-3">
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cinema-mist" />
                <Input
                  type="email"
                  required
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11"
                />
              </div>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cinema-mist" />
                <Input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11"
                />
              </div>
              {error && <p className="text-xs text-rose-glow">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy} size="lg">
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            <div className="flex justify-between items-center pt-2">
              <button
                className="text-left text-xs text-cinema-mist hover:text-white"
                onClick={() => setMode((m) => (m === 'signin' ? 'register' : 'signin'))}
              >
                {mode === 'signin' ? 'Create account' : 'Existing account'}
              </button>
              <button
                className="text-right text-xs text-rose-glow hover:underline"
                onClick={() => setMode('quick')}
              >
                Quick Couple Access
              </button>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-[11px] leading-relaxed text-cinema-mist/70">
          This app is private. Only the two people it was built for can enter — cozy, real-time movie nights together.
        </p>
      </motion.div>
    </div>
  )
}
