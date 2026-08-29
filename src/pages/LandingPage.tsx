import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomEntry } from '../components/room/RoomEntry'
import { createRoom, publishRoomCodeIndex } from '../services/roomService'
import { useAuth } from '../hooks/useAuth'
import { toAppError } from '../utils/errors'

export function LandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleCreate = async (pin?: string) => {
    if (!user) return
    setBusy(true)
    setErrorMessage(null)
    try {
      const room = await createRoom({
        uid: user.uid,
        displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Me',
        photoURL: user.photoURL,
        pin: pin ?? null,
      })
      await publishRoomCodeIndex(room.id, room.code)
      navigate(`/room/${room.code}`)
    } catch (err) {
      setErrorMessage(toAppError(err).friendlyMessage)
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async (code: string, pin?: string) => {
    navigate(`/room/${code.toUpperCase()}`, { state: { pin } })
  }

  return <RoomEntry onCreate={handleCreate} onJoin={handleJoin} busy={busy} errorMessage={errorMessage} />
}
