import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  type Timestamp,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { AppError } from '../utils/errors'
import type { RoomDoc, RoomMember, MemberRole } from '../types/room'

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ROOM_TTL_MS = 1000 * 60 * 60 * 24 * 30

function generateRoomCode(length = 6): string {
  let code = ''
  const arr = new Uint32Array(length)
  crypto.getRandomValues(arr)
  for (let i = 0; i < length; i++) code += ROOM_CODE_ALPHABET[arr[i] % ROOM_CODE_ALPHABET.length]
  return code
}

export interface CreateRoomOptions {
  uid: string
  displayName: string
  photoURL: string | null
  pin?: string | null
}

export interface JoinRoomOptions {
  code: string
  uid: string
  displayName: string
  photoURL: string | null
  pin?: string | null
}

// ==========================================
// Local / BroadcastChannel Reactive Storage
// ==========================================
interface LocalRoomState {
  room: RoomDoc
  members: Record<string, RoomMember>
}

const LOCAL_ROOMS_PREFIX = 'movie_night_room_'
const LOCAL_CODE_PREFIX = 'movie_night_code_'
const roomBroadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('movie-night-room-bus')
  : null

function getLocalRoomState(roomId: string): LocalRoomState | null {
  try {
    const raw = localStorage.getItem(LOCAL_ROOMS_PREFIX + roomId)
    if (!raw) return null
    return JSON.parse(raw) as LocalRoomState
  } catch {
    return null
  }
}

function saveLocalRoomState(roomId: string, state: LocalRoomState) {
  try {
    localStorage.setItem(LOCAL_ROOMS_PREFIX + roomId, JSON.stringify(state))
    roomBroadcast?.postMessage({ type: 'ROOM_UPDATED', roomId, state })
  } catch {
    /* ignore */
  }
}

export async function createRoom(opts: CreateRoomOptions): Promise<RoomDoc> {
  const code = generateRoomCode()
  const now = Date.now()

  if (isFirebaseConfigured() && db) {
    const roomRef = doc(collection(db, 'rooms'))
    const room: RoomDoc = {
      id: roomRef.id,
      code,
      createdBy: opts.uid,
      createdAt: now,
      pin: opts.pin ?? null,
      memberUids: [opts.uid],
      controlMode: 'BOTH',
      pauseOnPartnerBuffer: true,
      activeWatchSourceId: null,
      expiresAt: now + ROOM_TTL_MS,
    }

    await setDoc(roomRef, { ...room, createdAt: serverTimestamp() })

    const memberRef = doc(db, 'rooms', roomRef.id, 'members', opts.uid)
    const member: RoomMember = {
      uid: opts.uid,
      displayName: opts.displayName,
      photoURL: opts.photoURL,
      role: 'host',
      joinedAt: now,
      lastSeen: now,
      presence: 'online',
    }
    await setDoc(memberRef, member)
    return room
  }

  // Local Mode
  const roomId = `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const room: RoomDoc = {
    id: roomId,
    code,
    createdBy: opts.uid,
    createdAt: now,
    pin: opts.pin ?? null,
    memberUids: [opts.uid],
    controlMode: 'BOTH',
    pauseOnPartnerBuffer: true,
    activeWatchSourceId: null,
    expiresAt: now + ROOM_TTL_MS,
  }

  const member: RoomMember = {
    uid: opts.uid,
    displayName: opts.displayName,
    photoURL: opts.photoURL,
    role: 'host',
    joinedAt: now,
    lastSeen: now,
    presence: 'online',
  }

  saveLocalRoomState(roomId, {
    room,
    members: { [opts.uid]: member },
  })

  localStorage.setItem(LOCAL_CODE_PREFIX + code.toUpperCase(), roomId)
  return room
}

export async function joinRoomByCode(opts: JoinRoomOptions): Promise<RoomDoc> {
  const upperCode = opts.code.toUpperCase().trim()

  if (isFirebaseConfigured() && db) {
    const roomsRef = collection(db, 'rooms')
    const codeIndexRef = doc(db, 'roomCodes', upperCode)
    const codeSnap = await getDoc(codeIndexRef)
    if (!codeSnap.exists()) throw new AppError('ROOM_NOT_FOUND')
    const roomId = codeSnap.data().roomId as string

    const roomRef = doc(roomsRef, roomId)

    const room = await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef)
      if (!snap.exists()) throw new AppError('ROOM_NOT_FOUND')
      const data = snap.data() as RoomDoc & { createdAt: Timestamp | number; expiresAt: number | null }

      if (data.expiresAt && data.expiresAt < Date.now()) throw new AppError('ROOM_EXPIRED')
      if (data.pin && data.pin !== opts.pin) throw new AppError('NOT_ALLOWED')

      const members: string[] = data.memberUids ?? []
      if (!members.includes(opts.uid)) {
        if (members.length >= 2) throw new AppError('ROOM_FULL')
        tx.update(roomRef, { memberUids: [...members, opts.uid] })
      }
      return { ...data, id: roomId } as RoomDoc
    })

    const memberRef = doc(db, 'rooms', roomId, 'members', opts.uid)
    const existing = await getDoc(memberRef)
    const role: MemberRole = existing.exists() ? (existing.data().role as MemberRole) : 'partner'
    const member: RoomMember = {
      uid: opts.uid,
      displayName: opts.displayName,
      photoURL: opts.photoURL,
      role,
      joinedAt: existing.exists() ? existing.data().joinedAt : Date.now(),
      lastSeen: Date.now(),
      presence: 'online',
    }
    await setDoc(memberRef, member, { merge: true })
    return room
  }

  // Local Mode
  let roomId = localStorage.getItem(LOCAL_CODE_PREFIX + upperCode)
  if (!roomId && upperCode === 'COUPLE') {
    roomId = 'couple-cinema-room'
  }
  if (!roomId) throw new AppError('ROOM_NOT_FOUND')

  let state = getLocalRoomState(roomId)
  if (!state && upperCode === 'COUPLE') {
    // Initialize default couple room
    const now = Date.now()
    const defaultRoom: RoomDoc = {
      id: roomId,
      code: 'COUPLE',
      createdBy: opts.uid,
      createdAt: now,
      pin: null,
      memberUids: [opts.uid],
      controlMode: 'BOTH',
      pauseOnPartnerBuffer: true,
      activeWatchSourceId: null,
      expiresAt: now + ROOM_TTL_MS,
    }
    state = { room: defaultRoom, members: {} }
  }

  if (!state) throw new AppError('ROOM_NOT_FOUND')

  if (state.room.pin && state.room.pin !== opts.pin) {
    throw new AppError('NOT_ALLOWED')
  }

  if (!state.room.memberUids.includes(opts.uid)) {
    if (state.room.memberUids.length >= 2) throw new AppError('ROOM_FULL')
    state.room.memberUids.push(opts.uid)
  }

  const existingMember = state.members[opts.uid]
  const role: MemberRole = existingMember ? existingMember.role : (state.room.createdBy === opts.uid ? 'host' : 'partner')

  state.members[opts.uid] = {
    uid: opts.uid,
    displayName: opts.displayName,
    photoURL: opts.photoURL,
    role,
    joinedAt: existingMember ? existingMember.joinedAt : Date.now(),
    lastSeen: Date.now(),
    presence: 'online',
  }

  saveLocalRoomState(roomId, state)
  return state.room
}

export async function getOrCreateSharedRoom(opts: {
  code?: string
  uid: string
  displayName: string
  photoURL: string | null
}): Promise<RoomDoc> {
  const code = (opts.code || 'COUPLE').toUpperCase()
  try {
    return await joinRoomByCode({
      code,
      uid: opts.uid,
      displayName: opts.displayName,
      photoURL: opts.photoURL,
    })
  } catch {
    const now = Date.now()
    if (isFirebaseConfigured() && db) {
      const roomRef = doc(collection(db, 'rooms'))
      const room: RoomDoc = {
        id: roomRef.id,
        code,
        createdBy: opts.uid,
        createdAt: now,
        pin: null,
        memberUids: [opts.uid],
        controlMode: 'BOTH',
        pauseOnPartnerBuffer: true,
        activeWatchSourceId: null,
        expiresAt: now + ROOM_TTL_MS,
      }
      await setDoc(roomRef, { ...room, createdAt: serverTimestamp() })
      await setDoc(doc(db, 'rooms', roomRef.id, 'members', opts.uid), {
        uid: opts.uid,
        displayName: opts.displayName,
        photoURL: opts.photoURL,
        role: 'host',
        joinedAt: now,
        lastSeen: now,
        presence: 'online',
      })
      await publishRoomCodeIndex(roomRef.id, code)
      return room
    }

    // Local
    const roomId = 'couple-cinema-room'
    const room: RoomDoc = {
      id: roomId,
      code,
      createdBy: opts.uid,
      createdAt: now,
      pin: null,
      memberUids: [opts.uid],
      controlMode: 'BOTH',
      pauseOnPartnerBuffer: true,
      activeWatchSourceId: null,
      expiresAt: now + ROOM_TTL_MS,
    }
    const member: RoomMember = {
      uid: opts.uid,
      displayName: opts.displayName,
      photoURL: opts.photoURL,
      role: 'host',
      joinedAt: now,
      lastSeen: now,
      presence: 'online',
    }
    saveLocalRoomState(roomId, {
      room,
      members: { [opts.uid]: member },
    })
    localStorage.setItem(LOCAL_CODE_PREFIX + code, roomId)
    return room
  }
}

export async function publishRoomCodeIndex(roomId: string, code: string) {
  if (isFirebaseConfigured() && db) {
    await setDoc(doc(db, 'roomCodes', code.toUpperCase()), { roomId, createdAt: serverTimestamp() })
  } else {
    localStorage.setItem(LOCAL_CODE_PREFIX + code.toUpperCase(), roomId)
  }
}

export function subscribeToRoom(roomId: string, cb: (room: RoomDoc | null) => void): () => void {
  if (isFirebaseConfigured() && db) {
    return onSnapshot(doc(db, 'rooms', roomId), (snap) => {
      cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as RoomDoc) : null)
    })
  }

  // Local subscription
  const update = () => {
    const state = getLocalRoomState(roomId)
    cb(state ? state.room : null)
  }
  update()

  const onMsg = (e: MessageEvent) => {
    if (e.data?.type === 'ROOM_UPDATED' && e.data?.roomId === roomId) {
      update()
    }
  }

  roomBroadcast?.addEventListener('message', onMsg)
  const poll = setInterval(update, 1000)

  return () => {
    roomBroadcast?.removeEventListener('message', onMsg)
    clearInterval(poll)
  }
}

export function subscribeToMembers(roomId: string, cb: (members: RoomMember[]) => void): () => void {
  if (isFirebaseConfigured() && db) {
    return onSnapshot(collection(db, 'rooms', roomId, 'members'), (snap) => {
      cb(snap.docs.map((d) => d.data() as RoomMember))
    })
  }

  // Local subscription
  const update = () => {
    const state = getLocalRoomState(roomId)
    cb(state ? Object.values(state.members) : [])
  }
  update()

  const onMsg = (e: MessageEvent) => {
    if (e.data?.type === 'ROOM_UPDATED' && e.data?.roomId === roomId) {
      update()
    }
  }

  roomBroadcast?.addEventListener('message', onMsg)
  const poll = setInterval(update, 1000)

  return () => {
    roomBroadcast?.removeEventListener('message', onMsg)
    clearInterval(poll)
  }
}

export async function updatePresence(roomId: string, uid: string, presence: RoomMember['presence']) {
  if (isFirebaseConfigured() && db) {
    await updateDoc(doc(db, 'rooms', roomId, 'members', uid), { presence, lastSeen: Date.now() })
    return
  }

  const state = getLocalRoomState(roomId)
  if (state && state.members[uid]) {
    state.members[uid].presence = presence
    state.members[uid].lastSeen = Date.now()
    saveLocalRoomState(roomId, state)
  }
}

export async function setControlMode(roomId: string, mode: RoomDoc['controlMode']) {
  if (isFirebaseConfigured() && db) {
    await updateDoc(doc(db, 'rooms', roomId), { controlMode: mode })
    return
  }

  const state = getLocalRoomState(roomId)
  if (state) {
    state.room.controlMode = mode
    saveLocalRoomState(roomId, state)
  }
}

export async function setPauseOnBuffer(roomId: string, value: boolean) {
  if (isFirebaseConfigured() && db) {
    await updateDoc(doc(db, 'rooms', roomId), { pauseOnPartnerBuffer: value })
    return
  }

  const state = getLocalRoomState(roomId)
  if (state) {
    state.room.pauseOnPartnerBuffer = value
    saveLocalRoomState(roomId, state)
  }
}

export async function leaveRoom(roomId: string, uid: string) {
  await updatePresence(roomId, uid, 'offline')
}

export async function endRoom(roomId: string) {
  if (isFirebaseConfigured() && db) {
    await deleteDoc(doc(db, 'rooms', roomId))
    return
  }
  localStorage.removeItem(LOCAL_ROOMS_PREFIX + roomId)
}
