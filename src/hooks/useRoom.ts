import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoomDoc, RoomMember, RoomState } from '../types/room'
import {
  createRoom,
  joinRoomByCode,
  getOrCreateSharedRoom,
  publishRoomCodeIndex,
  subscribeToMembers,
  subscribeToRoom,
  updatePresence,
  leaveRoom as leaveRoomService,
  setControlMode as setControlModeService,
  setPauseOnBuffer as setPauseOnBufferService,
} from '../services/roomService'
import { toAppError } from '../utils/errors'
import type { AppError } from '../utils/errors'

interface UseRoomArgs {
  uid: string | null
  displayName: string
  photoURL: string | null
}

export function useRoom({ uid, displayName, photoURL }: UseRoomArgs) {
  const [room, setRoom] = useState<RoomDoc | null>(null)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [state, setState] = useState<RoomState>('IDLE')
  const [error, setError] = useState<AppError | null>(null)
  const unsubRoom = useRef<(() => void) | null>(null)
  const unsubMembers = useRef<(() => void) | null>(null)

  const attachSubscriptions = useCallback((roomId: string) => {
    unsubRoom.current?.()
    unsubMembers.current?.()
    unsubRoom.current = subscribeToRoom(roomId, (r) => {
      setRoom(r)
      if (!r) setState('ENDED')
    })
    unsubMembers.current = subscribeToMembers(roomId, setMembers)
  }, [])

  const enterSharedRoom = useCallback(
    async (code = 'COUPLE') => {
      if (!uid) return
      setState('CREATING')
      setError(null)
      try {
        const r = await getOrCreateSharedRoom({ code, uid, displayName, photoURL })
        attachSubscriptions(r.id)
        setState('CONNECTED')
        return r
      } catch (err) {
        const e = toAppError(err)
        setError(e)
        setState('IDLE')
        throw e
      }
    },
    [uid, displayName, photoURL, attachSubscriptions]
  )

  const create = useCallback(
    async (pin?: string) => {
      if (!uid) return
      setState('CREATING')
      setError(null)
      try {
        const r = await createRoom({ uid, displayName, photoURL, pin: pin ?? null })
        await publishRoomCodeIndex(r.id, r.code)
        attachSubscriptions(r.id)
        setState('CONNECTED')
        return r
      } catch (err) {
        const e = toAppError(err)
        setError(e)
        setState('IDLE')
        throw e
      }
    },
    [uid, displayName, photoURL, attachSubscriptions]
  )

  const join = useCallback(
    async (code: string, pin?: string) => {
      if (!uid) return
      setState('CREATING')
      setError(null)
      try {
        const r = await joinRoomByCode({ code, uid, displayName, photoURL, pin })
        attachSubscriptions(r.id)
        setState('CONNECTED')
        return r
      } catch (err) {
        const e = toAppError(err, 'ROOM_NOT_FOUND')
        setError(e)
        setState('IDLE')
        throw e
      }
    },
    [uid, displayName, photoURL, attachSubscriptions]
  )

  useEffect(() => {
    if (!room || !uid) return
    updatePresence(room.id, uid, 'online')
    const onBeforeUnload = () => {
      void updatePresence(room.id, uid, 'offline')
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [room, uid])

  const leave = useCallback(async () => {
    if (room && uid) await leaveRoomService(room.id, uid)
    unsubRoom.current?.()
    unsubMembers.current?.()
    setRoom(null)
    setMembers([])
    setState('IDLE')
  }, [room, uid])

  const setControlMode = useCallback(
    (mode: 'HOST_ONLY' | 'BOTH') => {
      if (room) void setControlModeService(room.id, mode)
    },
    [room]
  )

  const setPauseOnBuffer = useCallback(
    (value: boolean) => {
      if (room) void setPauseOnBufferService(room.id, value)
    },
    [room]
  )

  useEffect(() => {
    return () => {
      unsubRoom.current?.()
      unsubMembers.current?.()
    }
  }, [])

  const partner = members.find((m) => m.uid !== uid) ?? null
  const self = members.find((m) => m.uid === uid) ?? null

  return { room, members, self, partner, state, error, enterSharedRoom, create, join, leave, setControlMode, setPauseOnBuffer }
}
