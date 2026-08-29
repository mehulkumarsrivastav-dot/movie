import { useCallback, useEffect, useRef, useState } from 'react'
import { CallService } from '../services/callService'
import type { CallState, CallStats, DeviceOptions, MediaSettings } from '../types/call'
import { toAppError, type AppError } from '../utils/errors'

const DEFAULT_STATS: CallStats = {
  quality: 'unknown',
  candidateType: null,
  localBitrateKbps: 0,
  remoteBitrateKbps: 0,
  packetLossPct: 0,
  jitterMs: 0,
  roundTripTimeMs: 0,
  videoResolution: '—',
  fps: 0,
  audioLevel: 0,
  iceState: 'new',
  signalingState: 'stable',
  connectionState: 'new',
}

interface UseCallArgs {
  roomId: string | null
  myUid: string | null
  partnerUid: string | null
  shouldConnect: boolean
}

export function useCall({ roomId, myUid, partnerUid, shouldConnect }: UseCallArgs) {
  const [callState, setCallState] = useState<CallState>('DISCONNECTED')
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | null>(null)
  const [stats, setStats] = useState<CallStats>(DEFAULT_STATS)
  const [devices, setDevices] = useState<DeviceOptions>({ cameras: [], microphones: [], speakers: [] })
  const [error, setError] = useState<AppError | null>(null)
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null)
  const [settings, setSettings] = useState<MediaSettings>({
    cameraId: null,
    microphoneId: null,
    speakerId: null,
    cameraEnabled: true,
    microphoneEnabled: true,
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true,
  })

  const serviceRef = useRef<CallService | null>(null)
  const connectingRef = useRef(false)
  const dataListenersRef = useRef(new Set<(data: string) => void>())

  const onDataMessage = useCallback((cb: (data: string) => void) => {
    dataListenersRef.current.add(cb)
    return () => {
      dataListenersRef.current.delete(cb)
    }
  }, [])

  const sendData = useCallback((data: string) => serviceRef.current?.sendData(data) ?? false, [])

  const refreshDevices = useCallback(async () => {
    try {
      const list = await serviceRef.current?.listDevices()
      if (list) setDevices(list)
    } catch {
      /* ignore */
    }
  }, [])

  const startCall = useCallback(async () => {
    if (!roomId || !myUid || !partnerUid || connectingRef.current || serviceRef.current) return
    connectingRef.current = true
    setCallState('CONNECTING')
    setError(null)
    try {
      const service = new CallService(roomId, myUid, partnerUid)
      serviceRef.current = service
      const stream = await service.getLocalMedia(settings)
      setLocalStream(stream)
      void refreshDevices()

      service.on((event) => {
        switch (event.type) {
          case 'remote-stream':
            setRemoteStream(event.stream)
            setCallState('CONNECTED')
            setCallStartedAt((prev) => prev ?? Date.now())
            break
          case 'remote-stream-removed':
            setRemoteStream(null)
            break
          case 'remote-screen-stream':
            setRemoteScreenStream(event.stream)
            break
          case 'connection-state':
            if (event.state === 'connected') setCallState('CONNECTED')
            else if (event.state === 'connecting') setCallState('CONNECTING')
            else if (event.state === 'disconnected') setCallState('RECONNECTING')
            else if (event.state === 'failed') setCallState('FAILED')
            break
          case 'ice-state':
            if (event.state === 'disconnected' || event.state === 'checking') setCallState('RECONNECTING')
            break
          case 'data-message':
            dataListenersRef.current.forEach((l) => l(event.data))
            break
          case 'stats':
            setStats(event.stats)
            break
          case 'error':
            setError(event.error)
            break
        }
      })

      await service.start(stream)
    } catch (err) {
      const e = toAppError(err)
      setError(e)
      setCallState('CONNECTED') // Still allow connected state for data & media
    } finally {
      connectingRef.current = false
    }
  }, [roomId, myUid, partnerUid, refreshDevices, settings])

  const endCall = useCallback(async () => {
    connectingRef.current = false
    await serviceRef.current?.hangUp()
    serviceRef.current = null
    setLocalStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop())
      return null
    })
    setRemoteStream(null)
    setRemoteScreenStream(null)
    setCallState('DISCONNECTED')
    setCallStartedAt(null)
  }, [])

  useEffect(() => {
    if (shouldConnect && !serviceRef.current && !connectingRef.current) {
      void startCall()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldConnect])

  useEffect(() => {
    return () => {
      serviceRef.current?.cleanup()
    }
  }, [])

  const toggleCamera = useCallback(() => {
    if (!localStream) return
    const track = localStream.getVideoTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setSettings((s) => ({ ...s, cameraEnabled: track.enabled }))
    }
  }, [localStream])

  const toggleMic = useCallback(() => {
    if (!localStream) return
    const track = localStream.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setSettings((s) => ({ ...s, microphoneEnabled: track.enabled }))
    }
  }, [localStream])

  const switchCamera = useCallback(
    async (deviceId: string) => {
      if (!serviceRef.current) return
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } })
        const newTrack = newStream.getVideoTracks()[0]
        await serviceRef.current.replaceVideoTrack(newTrack)
        setLocalStream((prev) => {
          if (!prev) return newStream
          const oldTrack = prev.getVideoTracks()[0]
          if (oldTrack) {
            prev.removeTrack(oldTrack)
            oldTrack.stop()
          }
          prev.addTrack(newTrack)
          return prev
        })
        setSettings((s) => ({ ...s, cameraId: deviceId }))
      } catch (err) {
        setError(toAppError(err))
      }
    },
    []
  )

  const switchMicrophone = useCallback(async (deviceId: string) => {
    if (!serviceRef.current) return
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      const newTrack = newStream.getAudioTracks()[0]
      await serviceRef.current.replaceAudioTrack(newTrack)
      setLocalStream((prev) => {
        if (!prev) return newStream
        const oldTrack = prev.getAudioTracks()[0]
        if (oldTrack) {
          prev.removeTrack(oldTrack)
          oldTrack.stop()
        }
        prev.addTrack(newTrack)
        return prev
      })
      setSettings((s) => ({ ...s, microphoneId: deviceId }))
    } catch (err) {
      setError(toAppError(err))
    }
  }, [])

  const setSpeaker = useCallback((deviceId: string) => setSettings((s) => ({ ...s, speakerId: deviceId })), [])

  return {
    callState,
    localStream,
    remoteStream,
    remoteScreenStream,
    stats,
    devices,
    settings,
    error,
    callStartedAt,
    startCall,
    endCall,
    toggleCamera,
    toggleMic,
    switchCamera,
    switchMicrophone,
    setSpeaker,
    refreshDevices,
    sendData,
    onDataMessage,
    serviceRef,
  }
}
