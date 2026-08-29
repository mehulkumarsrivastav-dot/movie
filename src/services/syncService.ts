import type { DriftCorrectionConfig, SyncEvent } from '../types/player'

/**
 * Pure, unit-testable drift-correction logic — deliberately has no
 * dependency on the DOM or a real <video> element so it can be tested in
 * isolation and reused for both the direct-media player and (in future) the
 * browser-extension bridge.
 */

export type DriftAction =
  | { kind: 'none' }
  | { kind: 'soft-correct'; rate: number }
  | { kind: 'hard-seek'; toTime: number }

/**
 * @param localTime current local playback position, seconds
 * @param remoteTime partner's reported playback position, seconds, already
 *   adjusted for clock offset and one-way network delay by the caller
 * @param currentLocalRate the rate currently applied locally (so we know
 *   whether we're already correcting and can relax back to 1.0)
 */
export function computeDriftAction(
  localTime: number,
  remoteTime: number,
  currentLocalRate: number,
  config: DriftCorrectionConfig
): DriftAction {
  const driftMs = (remoteTime - localTime) * 1000

  if (Math.abs(driftMs) < config.toleranceMs) {
    // Within tolerance. If we were mid soft-correction, relax back to normal speed.
    if (currentLocalRate !== 1) return { kind: 'soft-correct', rate: 1 }
    return { kind: 'none' }
  }

  if (Math.abs(driftMs) >= config.hardSeekMs) {
    return { kind: 'hard-seek', toTime: remoteTime }
  }

  // Soft window: nudge playback rate rather than seeking, to avoid jarring jumps.
  const rate = driftMs > 0 ? 1 + config.rateNudge : 1 - config.rateNudge
  return { kind: 'soft-correct', rate }
}

/** Estimates one-way network delay + clock offset from a ping/pong exchange. */
export interface ClockSample {
  offsetMs: number // amount to ADD to local Date.now() to get partner's clock
  rttMs: number
}

export function computeClockOffset(pingSentAt: number, pongEchoedPingSentAt: number, pongSentAt: number, pongReceivedAt: number): ClockSample {
  const rttMs = pongReceivedAt - pingSentAt
  // Assume symmetric latency: partner's clock read "pongSentAt" at roughly
  // (pingSentAt + rttMs/2) on our clock.
  const estimatedLocalTimeAtPartnerSend = pingSentAt + rttMs / 2
  const offsetMs = pongSentAt - estimatedLocalTimeAtPartnerSend
  void pongEchoedPingSentAt
  return { offsetMs, rttMs }
}

/** Rolling median of recent offset samples — resistant to one bad/jittery sample. */
export class ClockSync {
  private samples: ClockSample[] = []
  private maxSamples = 7

  addSample(sample: ClockSample) {
    this.samples.push(sample)
    if (this.samples.length > this.maxSamples) this.samples.shift()
  }

  get offsetMs(): number {
    if (this.samples.length === 0) return 0
    const sorted = [...this.samples].sort((a, b) => a.offsetMs - b.offsetMs)
    return sorted[Math.floor(sorted.length / 2)].offsetMs
  }

  get lastRttMs(): number {
    return this.samples.at(-1)?.rttMs ?? 0
  }
}

let sequenceCounter = 0
export function nextSequence(): number {
  sequenceCounter += 1
  return sequenceCounter
}

export function buildSyncEvent(
  type: SyncEvent['type'],
  roomId: string,
  senderId: string,
  currentTime: number,
  playbackRate: number,
  payload?: Record<string, unknown>
): SyncEvent {
  return {
    type,
    roomId,
    senderId,
    currentTime,
    playbackRate,
    sentAt: Date.now(),
    sequence: nextSequence(),
    payload,
  }
}
