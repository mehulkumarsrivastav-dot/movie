import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { PlayerState, SyncEvent, WatchSource } from '../types/player'
import { resolveWatchSource } from '../services/urlResolver'
import { buildSyncEvent, computeClockOffset, computeDriftAction, ClockSync } from '../services/syncService'
import { usePlayerStore } from '../stores/usePlayerStore'
import { AppError } from '../utils/errors'

interface UseWatchSyncArgs {
  roomId: string | null
  myUid: string | null
  isHost: boolean
  sendData: (data: string) => boolean
  onDataMessage: (cb: (data: string) => void) => () => void
  /** ref to the <video> element for DIRECT_MEDIA / YOUTUBE iframe player is handled separately */
  videoRef: RefObject<HTMLVideoElement | null>
}

interface RemotePosition {
  currentTime: number
  playbackRate: number
  sentAt: number // partner's clock, i.e. already offset-corrected
  playing: boolean
}

const SYNC_ENVELOPE = 'movie-night-sync-v1'
interface SyncEnvelope {
  channel: typeof SYNC_ENVELOPE
  event: SyncEvent
}

export function useWatchSync({ roomId, myUid, isHost, sendData, onDataMessage, videoRef }: UseWatchSyncArgs) {
  const {
    source,
    setSource: storeSetSource,
    state: playerState,
    setState: setPlayerState,
    controlMode,
    driftConfig,
    setLastDriftMs,
    externalReady,
    setExternalReady,
    externalCountdown,
    setExternalCountdown,
  } = usePlayerStore()

  const [error, setError] = useState<AppError | null>(null)
  const remotePosition = useRef<RemotePosition | null>(null)
  const clockSync = useRef(new ClockSync())
  const applyingRemote = useRef(false)
  const driftTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const canControl = useCallback(() => (controlMode === 'BOTH' ? true : isHost), [controlMode, isHost])

  const publish = useCallback(
    (type: SyncEvent['type'], extra?: Record<string, unknown>) => {
      if (!roomId || !myUid) return
      const video = videoRef.current
      const event = buildSyncEvent(
        type,
        roomId,
        myUid,
        video?.currentTime ?? 0,
        video?.playbackRate ?? 1,
        extra
      )
      const envelope: SyncEnvelope = { channel: SYNC_ENVELOPE, event }
      sendData(JSON.stringify(envelope))
    },
    [roomId, myUid, sendData, videoRef]
  )

  const setSource = useCallback(
    (rawUrl: string, customTitle?: string) => {
      try {
        const resolved: WatchSource = resolveWatchSource(rawUrl, customTitle)
        storeSetSource(resolved)
        setExternalReady('me', false)
        setExternalReady('partner', false)
        setExternalCountdown(null)
        setError(null)
        publish('MEDIA_CHANGED', { source: resolved })
        return resolved
      } catch {
        const e = new AppError('INVALID_URL')
        setError(e)
        throw e
      }
    },
    [storeSetSource, setExternalReady, setExternalCountdown, publish]
  )

  // ---- Local player actions (only take effect / broadcast if this user may control) ----
  const play = useCallback(() => {
    const video = videoRef.current
    if (!video || !canControl()) return
    void video.play()
    publish('PLAY')
  }, [videoRef, canControl, publish])

  const pause = useCallback(() => {
    const video = videoRef.current
    if (!video || !canControl()) return
    video.pause()
    publish('PAUSE')
  }, [videoRef, canControl, publish])

  const seek = useCallback(
    (time: number) => {
      const video = videoRef.current
      if (!video || !canControl()) return
      video.currentTime = time
      publish('SEEK')
    },
    [videoRef, canControl, publish]
  )

  const markExternalReady = useCallback(() => {
    if (!myUid) return
    setExternalReady('me', true)
    publish('EXTERNAL_READY')
  }, [myUid, setExternalReady, publish])

  // ---- Incoming data-channel messages ----
  useEffect(() => {
    const unsub = onDataMessage((raw) => {
      let envelope: SyncEnvelope
      try {
        envelope = JSON.parse(raw)
      } catch {
        return
      }
      if (envelope.channel !== SYNC_ENVELOPE) return
      const { event } = envelope

      if (event.type === 'PING') {
        publish('PONG', { echo: event.sentAt })
        remotePosition.current = {
          currentTime: event.currentTime,
          playbackRate: event.playbackRate,
          sentAt: event.sentAt,
          playing: playerState === 'PLAYING',
        }
        return
      }
      if (event.type === 'PONG') {
        const now = Date.now()
        const echoedPingSentAt = (event.payload?.echo as number) ?? event.sentAt
        const sample = computeClockOffset(echoedPingSentAt, echoedPingSentAt, event.sentAt, now)
        clockSync.current.addSample(sample)
        remotePosition.current = {
          currentTime: event.currentTime,
          playbackRate: event.playbackRate,
          sentAt: event.sentAt + sample.offsetMs,
          playing: true,
        }
        return
      }

      const video = videoRef.current
      applyingRemote.current = true
      switch (event.type) {
        case 'MEDIA_CHANGED':
          if (event.payload?.source) storeSetSource(event.payload.source as WatchSource)
          break
        case 'PLAY':
          if (video) void video.play()
          setPlayerState('PLAYING')
          break
        case 'PAUSE':
          if (video) video.pause()
          setPlayerState('PAUSED')
          break
        case 'SEEK':
          if (video) video.currentTime = event.currentTime
          break
        case 'BUFFERING':
          setPlayerState('BUFFERING')
          break
        case 'READY':
          setPlayerState('READY')
          break
        case 'EXTERNAL_READY':
          setExternalReady('partner', true)
          break
        case 'EXTERNAL_COUNTDOWN':
          setExternalCountdown((event.payload?.value as number) ?? null)
          break
      }
      // Release the guard on next tick so the resulting DOM events (which we
      // listen to below) are recognized as remote-originated and not re-broadcast.
      queueMicrotask(() => {
        applyingRemote.current = false
      })

      remotePosition.current = {
        currentTime: event.currentTime,
        playbackRate: event.playbackRate,
        sentAt: event.sentAt + clockSync.current.offsetMs,
        playing: event.type === 'PLAY',
      }
    })
    return unsub
  }, [onDataMessage, publish, videoRef, storeSetSource, setPlayerState, setExternalReady, setExternalCountdown, playerState])

  // ---- Both-users-ready external countdown (host drives it) ----
  useEffect(() => {
    if (source?.mode !== 'EXTERNAL') return
    if (externalReady.me && externalReady.partner && externalCountdown === null && isHost) {
      let count = 3
      setExternalCountdown(count)
      publish('EXTERNAL_COUNTDOWN', { value: count })
      const interval = setInterval(() => {
        count -= 1
        setExternalCountdown(count >= 0 ? count : null)
        publish('EXTERNAL_COUNTDOWN', { value: count >= 0 ? count : null })
        if (count < 0) clearInterval(interval)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [externalReady, externalCountdown, isHost, source, publish, setExternalCountdown])

  // ---- Clock-sync heartbeat (also carries current playback position for drift correction) ----
  useEffect(() => {
    if (!source) return
    heartbeatTimer.current = setInterval(() => publish('PING'), 4000)
    return () => {
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current)
    }
  }, [source, publish])

  // ---- Drift correction loop, only meaningful for DIRECT_MEDIA / YOUTUBE where we control a real element ----
  useEffect(() => {
    if (source?.mode !== 'DIRECT_MEDIA' && source?.mode !== 'YOUTUBE') return
    driftTimer.current = setInterval(() => {
      const video = videoRef.current
      const remote = remotePosition.current
      if (!video || !remote || video.paused) return

      const elapsedSinceRemoteSample = (Date.now() - remote.sentAt) / 1000
      const extrapolatedRemoteTime = remote.playing
        ? remote.currentTime + elapsedSinceRemoteSample * remote.playbackRate
        : remote.currentTime

      const action = computeDriftAction(video.currentTime, extrapolatedRemoteTime, video.playbackRate, driftConfig)
      setLastDriftMs((extrapolatedRemoteTime - video.currentTime) * 1000)

      if (action.kind === 'hard-seek') {
        video.currentTime = action.toTime
        video.playbackRate = 1
      } else if (action.kind === 'soft-correct') {
        video.playbackRate = action.rate
      }
    }, driftConfig.checkIntervalMs)
    return () => {
      if (driftTimer.current) clearInterval(driftTimer.current)
    }
  }, [source, driftConfig, videoRef, setLastDriftMs])

  // ---- Wire native <video> events so LOCAL user-driven changes broadcast, but
  //      remote-applied changes (guarded above) do not create an event loop ----
  // ---- Wire native <video>/adapter events so LOCAL user-driven changes broadcast, but
  //      remote-applied changes (guarded above) do not create an event loop.
  //      This polls for the active element rather than relying on effect
  //      dependency identity, because the element can mount asynchronously
  //      (e.g. the YouTube adapter attaches only after the IFrame API loads)
  //      well after this hook's own effects first run. ----
  useEffect(() => {
    let attached: HTMLVideoElement | null = null
    let detach: (() => void) | null = null

    const attach = (video: HTMLVideoElement) => {
      const onPlay = () => {
        if (applyingRemote.current) return
        setPlayerState('PLAYING')
      }
      const onPause = () => {
        if (applyingRemote.current) return
        setPlayerState('PAUSED')
      }
      const onWaiting = () => {
        setPlayerState('BUFFERING')
        publish('BUFFERING')
      }
      const onPlaying = () => {
        setPlayerState('PLAYING')
        publish('READY')
      }
      const onEnded = () => setPlayerState('ENDED')
      video.addEventListener('play', onPlay)
      video.addEventListener('pause', onPause)
      video.addEventListener('waiting', onWaiting)
      video.addEventListener('playing', onPlaying)
      video.addEventListener('ended', onEnded)
      return () => {
        video.removeEventListener('play', onPlay)
        video.removeEventListener('pause', onPause)
        video.removeEventListener('waiting', onWaiting)
        video.removeEventListener('playing', onPlaying)
        video.removeEventListener('ended', onEnded)
      }
    }

    const poll = setInterval(() => {
      const current = videoRef.current
      if (current !== attached) {
        detach?.()
        detach = null
        attached = current
        if (current) detach = attach(current)
      }
    }, 250)

    return () => {
      clearInterval(poll)
      detach?.()
    }
  }, [videoRef, setPlayerState, publish])

  return {
    source,
    setSource,
    playerState: playerState as PlayerState,
    error,
    play,
    pause,
    seek,
    canControl: canControl(),
    markExternalReady,
    externalReady,
    externalCountdown,
    driftMs: usePlayerStore.getState().lastDriftMs,
  }
}
