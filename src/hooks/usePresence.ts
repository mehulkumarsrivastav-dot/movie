import { useEffect, useState } from 'react'
import type { RoomMember } from '../types/room'

export type PresenceLabel = 'online' | 'offline' | 'reconnecting' | 'left'

/**
 * Derives a friendly presence label from a member's raw presence field. The
 * label is computed purely from `member` + a periodically-ticking `now`
 * value (rather than pushed into its own state via a synchronous setState
 * in an effect), so "reconnecting" is detected once lastSeen goes stale —
 * covering tab-suspend / silent network loss where the beforeunload write
 * never fires — without an extra render-triggering effect.
 */
export function usePresenceLabel(member: RoomMember | null): PresenceLabel {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(id)
  }, [])

  if (!member) return 'offline'
  if (member.presence === 'offline') return 'offline'
  if (member.presence === 'reconnecting') return 'reconnecting'
  const staleMs = now - member.lastSeen
  return staleMs > 20000 ? 'reconnecting' : 'online'
}
