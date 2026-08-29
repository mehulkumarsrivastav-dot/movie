export interface ChatMessage {
  id: string
  roomId: string
  senderId: string
  senderName: string
  text: string
  createdAt: number
  kind: 'text' | 'system'
}

export type ReactionEmoji = '❤️' | '😂' | '😭' | '😘' | '🍿' | '👀' | '😱'

export interface ReactionEvent {
  id: string
  emoji: ReactionEmoji
  senderId: string
  createdAt: number
}
