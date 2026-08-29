/** Explicit room lifecycle state machine — never inferred from ad-hoc booleans. */
export type RoomState =
  | 'IDLE'
  | 'CREATING'
  | 'WAITING'      // room created/joined, waiting for the second person
  | 'CONNECTING'    // both present, WebRTC handshake in progress
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ENDED'

export type MemberRole = 'host' | 'partner'

export interface RoomMember {
  uid: string
  displayName: string
  photoURL: string | null
  role: MemberRole
  joinedAt: number
  lastSeen: number
  presence: 'online' | 'offline' | 'reconnecting'
}

export interface RoomDoc {
  id: string
  code: string
  createdBy: string
  createdAt: number
  pin: string | null
  memberUids: string[] // exactly length <= 2, enforced by security rules
  controlMode: 'HOST_ONLY' | 'BOTH'
  pauseOnPartnerBuffer: boolean
  activeWatchSourceId: string | null
  expiresAt: number | null
}

export interface SignalDoc {
  id: string
  from: string
  to: string
  type: 'offer' | 'answer' | 'ice-candidate' | 'bye' | 'ice-restart'
  payload: string // JSON-serialized RTCSessionDescriptionInit | RTCIceCandidateInit
  createdAt: number
}
