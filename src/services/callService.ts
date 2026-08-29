import {
  addDoc,
  collection,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { AppError } from '../utils/errors'
import type { CallStats, MediaSettings, NetworkQuality } from '../types/call'

type SignalType = 'offer' | 'answer' | 'ice-candidate' | 'bye' | 'ice-restart' | 'screen-share-start' | 'screen-share-stop'

interface SignalPayload {
  from: string
  to: string
  type: SignalType
  payload: string
  createdAt?: unknown
}

export type CallServiceEvent =
  | { type: 'remote-stream'; stream: MediaStream }
  | { type: 'remote-stream-removed' }
  | { type: 'remote-screen-stream'; stream: MediaStream | null }
  | { type: 'connection-state'; state: RTCPeerConnectionState }
  | { type: 'ice-state'; state: RTCIceConnectionState }
  | { type: 'data-message'; data: string }
  | { type: 'data-channel-open' }
  | { type: 'stats'; stats: CallStats }
  | { type: 'error'; error: AppError }

export type CallServiceListener = (event: CallServiceEvent) => void

export class CallService {
  private pc: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private localStream: MediaStream | null = null
  private screenStream: MediaStream | null = null
  private remoteCameraStream: MediaStream | null = null
  private remoteScreenStream: MediaStream | null = null
  private unsubscribeSignals: (() => void) | null = null
  private broadcastChannel: BroadcastChannel | null = null
  private listeners = new Set<CallServiceListener>()
  private statsInterval: ReturnType<typeof setInterval> | null = null
  private makingOffer = false
  private ignoreOffer = false
  private isPolite: boolean
  private roomId: string
  private myUid: string
  private partnerUid: string
  private closed = false
  private prevStatsSnapshot: { timestamp: number; bytesSent: number; bytesReceived: number } | null = null

  constructor(roomId: string, myUid: string, partnerUid: string) {
    this.roomId = roomId
    this.myUid = myUid
    this.partnerUid = partnerUid
    this.isPolite = myUid > partnerUid
  }

  on(listener: CallServiceListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: CallServiceEvent) {
    this.listeners.forEach((l) => l(event))
  }

  private getIceServers(): RTCIceServer[] {
    const stunUrls = (import.meta.env.VITE_STUN_URLS ?? 'stun:stun.l.google.com:19302')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)

    const servers: RTCIceServer[] = [{ urls: stunUrls }]

    const turnUrl = import.meta.env.VITE_TURN_URL
    const turnUsername = import.meta.env.VITE_TURN_USERNAME
    const turnPassword = import.meta.env.VITE_TURN_PASSWORD

    if (turnUrl && turnUsername && turnPassword) {
      servers.push({
        urls: turnUrl.split(',').map((s: string) => s.trim()),
        username: turnUsername,
        credential: turnPassword,
      })
    }
    return servers
  }

  async getLocalMedia(settings: Partial<MediaSettings> = {}): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      video: settings.cameraEnabled === false
        ? false
        : { deviceId: settings.cameraId ? { exact: settings.cameraId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: settings.microphoneEnabled === false
        ? false
        : {
            deviceId: settings.microphoneId ? { exact: settings.microphoneId } : undefined,
            echoCancellation: settings.echoCancellation ?? true,
            noiseSuppression: settings.noiseSuppression ?? true,
            autoGainControl: settings.autoGainControl ?? true,
          },
    }
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      return this.localStream
    } catch {
      // Fallback 1: try audio only
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        return this.localStream
      } catch {
        // Fallback 2: return empty stream so call connection and data sync proceed smoothly
        this.localStream = new MediaStream()
        return this.localStream
      }
    }
  }

  async listDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return {
        cameras: devices.filter((d) => d.kind === 'videoinput'),
        microphones: devices.filter((d) => d.kind === 'audioinput'),
        speakers: devices.filter((d) => d.kind === 'audiooutput'),
      }
    } catch {
      return { cameras: [], microphones: [], speakers: [] }
    }
  }

  private createPeerConnection() {
    const pc = new RTCPeerConnection({ iceServers: this.getIceServers(), iceCandidatePoolSize: 4 })

    pc.onicecandidate = (e) => {
      if (e.candidate) this.sendSignal('ice-candidate', e.candidate.toJSON())
    }

    pc.ontrack = (e) => {
      const incomingStream = e.streams[0] || new MediaStream([e.track])
      
      // Determine if this is a screen share stream or camera stream
      // If we already have a camera stream and a new video track arrives, it's screen share
      if (this.remoteCameraStream && incomingStream.id !== this.remoteCameraStream.id) {
        this.remoteScreenStream = incomingStream
        this.emit({ type: 'remote-screen-stream', stream: incomingStream })
        e.track.onended = () => {
          this.remoteScreenStream = null
          this.emit({ type: 'remote-screen-stream', stream: null })
        }
      } else if (!this.remoteCameraStream) {
        this.remoteCameraStream = incomingStream
        this.emit({ type: 'remote-stream', stream: incomingStream })
      } else {
        // Additional track added to existing camera stream
        this.emit({ type: 'remote-stream', stream: this.remoteCameraStream })
      }
    }

    pc.onconnectionstatechange = () => {
      this.emit({ type: 'connection-state', state: pc.connectionState })
      if (pc.connectionState === 'failed') {
        this.attemptIceRestart()
      }
    }

    pc.oniceconnectionstatechange = () => {
      this.emit({ type: 'ice-state', state: pc.iceConnectionState })
      if (pc.iceConnectionState === 'disconnected') {
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') this.attemptIceRestart()
        }, 3000)
      }
    }

    pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true
        await pc.setLocalDescription()
        this.sendSignal('offer', pc.localDescription!.toJSON())
      } catch (err) {
        this.emit({ type: 'error', error: new AppError('ICE_FAILED', err) })
      } finally {
        this.makingOffer = false
      }
    }

    pc.ondatachannel = (e) => {
      this.attachDataChannel(e.channel)
    }

    this.pc = pc
    return pc
  }

  private attachDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel
    channel.onopen = () => this.emit({ type: 'data-channel-open' })
    channel.onmessage = (e) => this.emit({ type: 'data-message', data: e.data })
    channel.onclose = () => {
      /* renegotiation / reconnect will recreate as needed */
    }
  }

  sendData(data: string): boolean {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(data)
        return true
      } catch {
        return false
      }
    }
    return false
  }

  async start(localStream: MediaStream) {
    const pc = this.createPeerConnection()
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream))

    if (!this.isPolite) {
      const channel = pc.createDataChannel('sync', { ordered: true })
      this.attachDataChannel(channel)
    }

    this.subscribeSignals()
    this.startStatsLoop()
  }

  private subscribeSignals() {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, 'rooms', this.roomId, 'signals'),
        where('to', '==', this.myUid)
      )
      this.unsubscribeSignals = onSnapshot(q, (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type !== 'added') return
          const data = change.doc.data() as SignalPayload
          void this.handleSignal(data)
          void deleteDoc(change.doc.ref)
        })
      })
      return
    }

    // Local BroadcastChannel signaling
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(`movie-night-signal-${this.roomId}`)
      this.broadcastChannel = bc
      bc.onmessage = (e) => {
        const data = e.data as SignalPayload
        if (data && data.to === this.myUid) {
          void this.handleSignal(data)
        }
      }
    }
  }

  private async handleSignal(sig: SignalPayload) {
    if (!this.pc) this.createPeerConnection()
    const pc = this.pc!
    try {
      if (sig.type === 'offer') {
        const description = JSON.parse(sig.payload) as RTCSessionDescriptionInit
        const offerCollision = description.type === 'offer' && (this.makingOffer || pc.signalingState !== 'stable')
        this.ignoreOffer = !this.isPolite && offerCollision
        if (this.ignoreOffer) return

        if (offerCollision) {
          await Promise.all([
            pc.setLocalDescription({ type: 'rollback' }),
            pc.setRemoteDescription(description),
          ])
        } else {
          await pc.setRemoteDescription(description)
        }
        await pc.setLocalDescription()
        this.sendSignal('answer', pc.localDescription!.toJSON())
      } else if (sig.type === 'answer') {
        const description = JSON.parse(sig.payload) as RTCSessionDescriptionInit
        await pc.setRemoteDescription(description)
      } else if (sig.type === 'ice-candidate') {
        const candidate = JSON.parse(sig.payload) as RTCIceCandidateInit
        try {
          await pc.addIceCandidate(candidate)
        } catch (err) {
          if (!this.ignoreOffer) throw err
        }
      } else if (sig.type === 'screen-share-start') {
        // Partner initiated screen share
      } else if (sig.type === 'screen-share-stop') {
        this.remoteScreenStream = null
        this.emit({ type: 'remote-screen-stream', stream: null })
      } else if (sig.type === 'ice-restart') {
        if (pc.signalingState === 'stable') {
          this.makingOffer = true
          await pc.setLocalDescription(await pc.createOffer({ iceRestart: true }))
          this.sendSignal('offer', pc.localDescription!.toJSON())
          this.makingOffer = false
        }
      } else if (sig.type === 'bye') {
        this.emit({ type: 'remote-stream-removed' })
      }
    } catch (err) {
      this.emit({ type: 'error', error: new AppError('ICE_FAILED', err) })
    }
  }

  private async sendSignal(type: SignalType, payload: unknown) {
    if (isFirebaseConfigured() && db) {
      await addDoc(collection(db, 'rooms', this.roomId, 'signals'), {
        from: this.myUid,
        to: this.partnerUid,
        type,
        payload: JSON.stringify(payload),
        createdAt: serverTimestamp(),
      })
      return
    }

    // BroadcastChannel signaling
    this.broadcastChannel?.postMessage({
      from: this.myUid,
      to: this.partnerUid,
      type,
      payload: JSON.stringify(payload),
    } satisfies SignalPayload)
  }

  async attemptIceRestart() {
    if (this.closed || !this.pc) return
    this.emit({ type: 'connection-state', state: 'connecting' as RTCPeerConnectionState })
    await this.sendSignal('ice-restart', {})
  }

  async replaceVideoTrack(track: MediaStreamTrack | null) {
    if (!this.pc) return
    const sender = this.pc.getSenders().find((s) => s.track?.kind === 'video')
    if (sender) await sender.replaceTrack(track)
  }

  async replaceAudioTrack(track: MediaStreamTrack | null) {
    if (!this.pc) return
    const sender = this.pc.getSenders().find((s) => s.track?.kind === 'audio')
    if (sender) await sender.replaceTrack(track)
  }

  async addExtraTrack(track: MediaStreamTrack, stream: MediaStream) {
    if (!this.pc) return
    this.screenStream = stream
    this.pc.addTrack(track, stream)
    await this.sendSignal('screen-share-start', {})
  }

  async removeTrack(track: MediaStreamTrack) {
    if (!this.pc) return
    const sender = this.pc.getSenders().find((s) => s.track === track)
    if (sender) this.pc.removeTrack(sender)
    await this.sendSignal('screen-share-stop', {})
  }

  private startStatsLoop() {
    this.statsInterval = setInterval(() => void this.collectStats(), 2000)
  }

  private async collectStats() {
    if (!this.pc) return
    try {
      const report = await this.pc.getStats()
      let candidateType: RTCIceCandidate['type'] | null = null
      let packetsLost = 0
      let packetsReceived = 0
      let jitterMs = 0
      let roundTripTimeMs = 0
      let bytesSent = 0
      let bytesReceived = 0
      let frameWidth = 0
      let frameHeight = 0
      let fps = 0
      let audioLevel = 0

      report.forEach((stat) => {
        if (stat.type === 'candidate-pair' && stat.state === 'succeeded' && stat.nominated) {
          roundTripTimeMs = (stat.currentRoundTripTime ?? 0) * 1000
        }
        if (stat.type === 'remote-candidate' || stat.type === 'local-candidate') {
          if (stat.candidateType) candidateType = stat.candidateType
        }
        if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
          packetsLost += stat.packetsLost ?? 0
          packetsReceived += stat.packetsReceived ?? 0
          jitterMs = (stat.jitter ?? 0) * 1000
          bytesReceived += stat.bytesReceived ?? 0
          frameWidth = stat.frameWidth ?? frameWidth
          frameHeight = stat.frameHeight ?? frameHeight
          fps = stat.framesPerSecond ?? fps
        }
        if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
          audioLevel = stat.audioLevel ?? audioLevel
        }
        if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
          bytesSent += stat.bytesSent ?? 0
        }
      })

      const now = Date.now()
      let localBitrateKbps = 0
      let remoteBitrateKbps = 0
      if (this.prevStatsSnapshot) {
        const dtSec = (now - this.prevStatsSnapshot.timestamp) / 1000
        if (dtSec > 0) {
          localBitrateKbps = ((bytesSent - this.prevStatsSnapshot.bytesSent) * 8) / 1000 / dtSec
          remoteBitrateKbps = ((bytesReceived - this.prevStatsSnapshot.bytesReceived) * 8) / 1000 / dtSec
        }
      }
      this.prevStatsSnapshot = { timestamp: now, bytesSent, bytesReceived }

      const packetLossPct = packetsReceived > 0 ? (packetsLost / (packetsReceived + packetsLost)) * 100 : 0
      const quality: NetworkQuality = this.deriveQuality(roundTripTimeMs, packetLossPct)

      this.emit({
        type: 'stats',
        stats: {
          quality,
          candidateType,
          localBitrateKbps: Math.max(0, Math.round(localBitrateKbps)),
          remoteBitrateKbps: Math.max(0, Math.round(remoteBitrateKbps)),
          packetLossPct: Math.round(packetLossPct * 10) / 10,
          jitterMs: Math.round(jitterMs),
          roundTripTimeMs: Math.round(roundTripTimeMs),
          videoResolution: frameWidth ? `${frameWidth}x${frameHeight}` : '—',
          fps: Math.round(fps),
          audioLevel: Math.round(audioLevel * 100) / 100,
          iceState: this.pc.iceConnectionState,
          signalingState: this.pc.signalingState,
          connectionState: this.pc.connectionState,
        },
      })
    } catch {
      /* ignore stats poll failure */
    }
  }

  private deriveQuality(rttMs: number, lossPct: number): NetworkQuality {
    if (!this.pc) return 'unknown'
    const state = this.pc.iceConnectionState
    if (state === 'disconnected' || state === 'checking') return 'reconnecting'
    if (state === 'failed') return 'reconnecting'
    if (rttMs === 0 && lossPct === 0) return 'excellent'
    if (rttMs < 150 && lossPct < 1) return 'excellent'
    if (rttMs < 350 && lossPct < 4) return 'good'
    return 'weak'
  }

  async hangUp() {
    if (this.closed) return
    this.closed = true
    try {
      await this.sendSignal('bye', {})
    } catch {
      /* best effort */
    }
    this.cleanup()
  }

  cleanup() {
    if (this.statsInterval) clearInterval(this.statsInterval)
    this.statsInterval = null
    this.unsubscribeSignals?.()
    this.unsubscribeSignals = null
    this.broadcastChannel?.close()
    this.broadcastChannel = null
    this.dataChannel?.close()
    this.dataChannel = null
    this.pc?.getSenders().forEach((s) => s.track?.stop())
    this.pc?.close()
    this.pc = null
    this.localStream?.getTracks().forEach((t) => t.stop())
    this.screenStream?.getTracks().forEach((t) => t.stop())
    this.screenStream = null
    this.remoteCameraStream = null
    this.remoteScreenStream = null
    this.listeners.clear()
  }

  getLocalScreenStream(): MediaStream | null {
    return this.screenStream
  }

  getRemoteScreenStream(): MediaStream | null {
    return this.remoteScreenStream
  }

  getRemoteCameraStream(): MediaStream | null {
    return this.remoteCameraStream
  }
}
