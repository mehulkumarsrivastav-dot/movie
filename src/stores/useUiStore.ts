import { create } from 'zustand'

interface CameraBubbleLayout {
  x: number
  y: number
  size: 'sm' | 'md' | 'lg'
  minimized: boolean
}

interface UiState {
  cinemaMode: boolean
  chatOpen: boolean
  debugPanelOpen: boolean
  selfBubbleHidden: boolean
  partnerPinned: boolean
  bubblesSwapped: boolean
  selfLayout: CameraBubbleLayout
  partnerLayout: CameraBubbleLayout
  setCinemaMode: (v: boolean) => void
  toggleChat: () => void
  toggleDebugPanel: () => void
  toggleSelfHidden: () => void
  togglePartnerPinned: () => void
  swapBubbles: () => void
  setSelfLayout: (l: Partial<CameraBubbleLayout>) => void
  setPartnerLayout: (l: Partial<CameraBubbleLayout>) => void
}

export const useUiStore = create<UiState>((set) => ({
  cinemaMode: false,
  chatOpen: false,
  debugPanelOpen: false,
  selfBubbleHidden: false,
  partnerPinned: false,
  bubblesSwapped: false,
  selfLayout: { x: 24, y: 24, size: 'md', minimized: false },
  partnerLayout: { x: 24, y: 120, size: 'md', minimized: false },
  setCinemaMode: (v) => set({ cinemaMode: v }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  toggleDebugPanel: () => set((s) => ({ debugPanelOpen: !s.debugPanelOpen })),
  toggleSelfHidden: () => set((s) => ({ selfBubbleHidden: !s.selfBubbleHidden })),
  togglePartnerPinned: () => set((s) => ({ partnerPinned: !s.partnerPinned })),
  swapBubbles: () => set((s) => ({ bubblesSwapped: !s.bubblesSwapped })),
  setSelfLayout: (l) => set((s) => ({ selfLayout: { ...s.selfLayout, ...l } })),
  setPartnerLayout: (l) => set((s) => ({ partnerLayout: { ...s.partnerLayout, ...l } })),
}))
