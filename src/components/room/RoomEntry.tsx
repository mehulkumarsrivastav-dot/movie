import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, KeyRound, ArrowRight } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'

interface RoomEntryProps {
  onCreate: (pin?: string) => Promise<unknown>
  onJoin: (code: string, pin?: string) => Promise<unknown>
  busy: boolean
  errorMessage: string | null
}

export function RoomEntry({ onCreate, onJoin, busy, errorMessage }: RoomEntryProps) {
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none')
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md text-center">
        <div className="mb-3 flex justify-center">
          <Heart size={22} className="text-rose-glow" fill="currentColor" fillOpacity={0.15} />
        </div>
        <h1 className="font-display text-3xl text-white sm:text-4xl">Movie Night</h1>
        <p className="mt-3 text-cinema-mist">Our little cinema, wherever we are.</p>

        <Card className="mt-10 p-6 text-left">
          {mode === 'none' && (
            <div className="space-y-3">
              <Button className="w-full" size="lg" onClick={() => setMode('create')}>
                Create Our Room
              </Button>
              <Button variant="secondary" className="w-full" size="lg" onClick={() => setMode('join')}>
                Join Room
              </Button>
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs text-cinema-mist">Room PIN (optional)</label>
                <Input placeholder="4-digit PIN, optional" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={8} />
              </div>
              {errorMessage && <p className="text-xs text-rose-glow">{errorMessage}</p>}
              <Button className="w-full" size="lg" disabled={busy} onClick={() => onCreate(pin || undefined)} icon={<ArrowRight size={16} />}>
                {busy ? 'Creating…' : 'Create Room'}
              </Button>
              <button className="w-full text-center text-xs text-cinema-mist hover:text-cinema-fog" onClick={() => setMode('none')}>
                Back
              </button>
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs text-cinema-mist">Room code</label>
                <Input
                  placeholder="ABCD12"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="tracking-[0.3em] font-mono text-center text-lg"
                />
              </div>
              <div>
                <label className="mb-1.5 mt-1 flex items-center gap-1.5 text-xs text-cinema-mist">
                  <KeyRound size={12} /> PIN (if your partner set one)
                </label>
                <Input placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={8} />
              </div>
              {errorMessage && <p className="text-xs text-rose-glow">{errorMessage}</p>}
              <Button className="w-full" size="lg" disabled={busy || !code} onClick={() => onJoin(code, pin || undefined)}>
                {busy ? 'Joining…' : 'Join Room'}
              </Button>
              <button className="w-full text-center text-xs text-cinema-mist hover:text-cinema-fog" onClick={() => setMode('none')}>
                Back
              </button>
            </div>
          )}
        </Card>

        <p className="mt-6 text-xs text-cinema-mist/70">Watch together. Talk together. Be together.</p>
      </motion.div>
    </div>
  )
}
