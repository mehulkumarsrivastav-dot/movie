import { create } from 'zustand'
import type { PlayerState, WatchSource } from '../types/player'
import { DEFAULT_DRIFT_CONFIG } from '../types/player'
import type { DriftCorrectionConfig } from '../types/player'

interface PlayerStoreState {
  source: WatchSource | null
  state: PlayerState
  controlMode: 'HOST_ONLY' | 'BOTH'
  pauseOnPartnerBuffer: boolean
  driftConfig: DriftCorrectionConfig
  lastDriftMs: number
  externalReady: { me: boolean; partner: boolean }
  externalCountdown: number | null
  setSource: (s: WatchSource | null) => void
  setState: (s: PlayerState) => void
  setControlMode: (m: 'HOST_ONLY' | 'BOTH') => void
  setPauseOnPartnerBuffer: (v: boolean) => void
  setDriftConfig: (c: Partial<DriftCorrectionConfig>) => void
  setLastDriftMs: (v: number) => void
  setExternalReady: (who: 'me' | 'partner', ready: boolean) => void
  setExternalCountdown: (v: number | null) => void
  reset: () => void
}

export const usePlayerStore = create<PlayerStoreState>((set) => ({
  source: null,
  state: 'EMPTY',
  controlMode: 'BOTH',
  pauseOnPartnerBuffer: true,
  driftConfig: DEFAULT_DRIFT_CONFIG,
  lastDriftMs: 0,
  externalReady: { me: false, partner: false },
  externalCountdown: null,
  setSource: (source) => set({ source, state: source ? 'LOADING' : 'EMPTY' }),
  setState: (state) => set({ state }),
  setControlMode: (controlMode) => set({ controlMode }),
  setPauseOnPartnerBuffer: (pauseOnPartnerBuffer) => set({ pauseOnPartnerBuffer }),
  setDriftConfig: (c) => set((s) => ({ driftConfig: { ...s.driftConfig, ...c } })),
  setLastDriftMs: (lastDriftMs) => set({ lastDriftMs }),
  setExternalReady: (who, ready) => set((s) => ({ externalReady: { ...s.externalReady, [who]: ready } })),
  setExternalCountdown: (externalCountdown) => set({ externalCountdown }),
  reset: () =>
    set({
      source: null,
      state: 'EMPTY',
      externalReady: { me: false, partner: false },
      externalCountdown: null,
    }),
}))
