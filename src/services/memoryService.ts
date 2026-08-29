import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import type { MovieMemory, RoomStats } from '../types/memory'

const LOCAL_MEMORIES_KEY = 'movie_night_memories'
const LOCAL_STATS_PREFIX = 'movie_night_stats_'
const memoryBroadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('movie-night-memory-bus')
  : null

function getLocalMemories(): MovieMemory[] {
  try {
    const raw = localStorage.getItem(LOCAL_MEMORIES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as MovieMemory[]
  } catch {
    return []
  }
}

function saveLocalMemories(memories: MovieMemory[]) {
  try {
    localStorage.setItem(LOCAL_MEMORIES_KEY, JSON.stringify(memories))
    memoryBroadcast?.postMessage({ type: 'MEMORIES_UPDATED' })
  } catch {
    /* ignore */
  }
}

function getLocalStats(roomId: string): RoomStats | null {
  try {
    const raw = localStorage.getItem(LOCAL_STATS_PREFIX + roomId)
    if (!raw) return null
    return JSON.parse(raw) as RoomStats
  } catch {
    return null
  }
}

function saveLocalStats(roomId: string, stats: RoomStats) {
  try {
    localStorage.setItem(LOCAL_STATS_PREFIX + roomId, JSON.stringify(stats))
    memoryBroadcast?.postMessage({ type: 'STATS_UPDATED', roomId, stats })
  } catch {
    /* ignore */
  }
}

export async function saveMovieMemory(memory: Omit<MovieMemory, 'id'>) {
  if (isFirebaseConfigured() && db) {
    await addDoc(collection(db, 'memories'), { ...memory, date: serverTimestamp() })
    await updateRoomStats(memory.roomId, memory.durationWatchedSec, true)
    return
  }

  // Local Mode
  const memories = getLocalMemories()
  const newMemory: MovieMemory = {
    ...memory,
    id: `mem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    date: Date.now(),
  }
  memories.unshift(newMemory)
  saveLocalMemories(memories)
  await updateRoomStats(memory.roomId, memory.durationWatchedSec, true)
}

export function subscribeToMemories(roomId: string, cb: (memories: MovieMemory[]) => void): () => void {
  if (isFirebaseConfigured() && db) {
    const q = query(collection(db, 'memories'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => {
      cb(
        snap.docs
          .map((d) => {
            const data = d.data()
            return { id: d.id, ...data, date: data.date?.toMillis?.() ?? Date.now() } as MovieMemory
          })
          .filter((m) => m.roomId === roomId)
      )
    })
  }

  // Local Mode
  const update = () => {
    cb(getLocalMemories().filter((m) => m.roomId === roomId))
  }
  update()

  const onMsg = () => update()
  memoryBroadcast?.addEventListener('message', onMsg)
  return () => {
    memoryBroadcast?.removeEventListener('message', onMsg)
  }
}

export async function updateRoomStats(roomId: string, watchedSec: number, completed: boolean) {
  if (isFirebaseConfigured() && db) {
    const ref = doc(db, 'rooms', roomId, 'meta', 'stats')
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, {
        movieNightsCount: 1,
        totalWatchTimeSec: watchedSec,
        moviesCompletedCount: completed ? 1 : 0,
        lastMovieNightAt: Date.now(),
      })
      return
    }
    await updateDoc(ref, {
      movieNightsCount: increment(1),
      totalWatchTimeSec: increment(watchedSec),
      moviesCompletedCount: increment(completed ? 1 : 0),
      lastMovieNightAt: Date.now(),
    })
    return
  }

  // Local Mode
  const existing = getLocalStats(roomId)
  const updated: RoomStats = existing
    ? {
        movieNightsCount: existing.movieNightsCount + 1,
        totalWatchTimeSec: existing.totalWatchTimeSec + watchedSec,
        moviesCompletedCount: existing.moviesCompletedCount + (completed ? 1 : 0),
        lastMovieNightAt: Date.now(),
      }
    : {
        movieNightsCount: 1,
        totalWatchTimeSec: watchedSec,
        moviesCompletedCount: completed ? 1 : 0,
        lastMovieNightAt: Date.now(),
      }

  saveLocalStats(roomId, updated)
}

export function subscribeToStats(roomId: string, cb: (stats: RoomStats | null) => void): () => void {
  if (isFirebaseConfigured() && db) {
    return onSnapshot(doc(db, 'rooms', roomId, 'meta', 'stats'), (snap) => {
      cb(snap.exists() ? (snap.data() as RoomStats) : null)
    })
  }

  // Local Mode
  const update = () => {
    cb(getLocalStats(roomId))
  }
  update()

  const onMsg = (e: MessageEvent) => {
    if (e.data?.type === 'STATS_UPDATED' && e.data?.roomId === roomId) {
      cb(e.data.stats as RoomStats)
    }
  }

  memoryBroadcast?.addEventListener('message', onMsg)
  return () => {
    memoryBroadcast?.removeEventListener('message', onMsg)
  }
}
