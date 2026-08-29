import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import type { ChatMessage } from '../types/chat'

const LOCAL_CHAT_PREFIX = 'movie_night_chat_'
const chatBroadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('movie-night-chat-bus')
  : null

function getLocalMessages(roomId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_CHAT_PREFIX + roomId)
    if (!raw) return []
    return JSON.parse(raw) as ChatMessage[]
  } catch {
    return []
  }
}

function saveLocalMessages(roomId: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(LOCAL_CHAT_PREFIX + roomId, JSON.stringify(messages))
    chatBroadcast?.postMessage({ type: 'CHAT_UPDATED', roomId, messages })
  } catch {
    /* ignore */
  }
}

export async function sendChatMessage(roomId: string, senderId: string, senderName: string, text: string) {
  const trimmed = text.trim().slice(0, 1000)
  if (!trimmed) return

  if (isFirebaseConfigured() && db) {
    await addDoc(collection(db, 'rooms', roomId, 'messages'), {
      roomId,
      senderId,
      senderName,
      text: trimmed,
      kind: 'text',
      createdAt: serverTimestamp(),
    })
    return
  }

  // Local Mode
  const messages = getLocalMessages(roomId)
  const newMsg: ChatMessage = {
    id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    roomId,
    senderId,
    senderName,
    text: trimmed,
    kind: 'text',
    createdAt: Date.now(),
  }
  messages.push(newMsg)
  saveLocalMessages(roomId, messages)
}

export function subscribeToChat(roomId: string, cb: (messages: ChatMessage[]) => void): () => void {
  if (isFirebaseConfigured() && db) {
    const q = query(collection(db, 'rooms', roomId, 'messages'), orderBy('createdAt', 'asc'), limit(200))
    return onSnapshot(q, (snap) => {
      cb(
        snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            roomId,
            senderId: data.senderId,
            senderName: data.senderName,
            text: data.text,
            kind: data.kind ?? 'text',
            createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
          } as ChatMessage
        })
      )
    })
  }

  // Local subscription
  const update = () => {
    cb(getLocalMessages(roomId))
  }
  update()

  const onMsg = (e: MessageEvent) => {
    if (e.data?.type === 'CHAT_UPDATED' && e.data?.roomId === roomId) {
      cb(e.data.messages as ChatMessage[])
    }
  }

  chatBroadcast?.addEventListener('message', onMsg)
  return () => {
    chatBroadcast?.removeEventListener('message', onMsg)
  }
}
