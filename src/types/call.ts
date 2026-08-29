export type CallState =
  | 'DISCONNECTED'
  | 'REQUESTING_PERMISSIONS'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'FAILED'

export type NetworkQuality = 'excellent' | 'good' | 'weak' | 'reconnecting' | 'unknown'

export interface CallStats {
  quality: NetworkQuality
  candidateType: RTCIceCandidate['type'] | null
  localBitrateKbps: number
  remoteBitrateKbps: number
  packetLossPct: number
  jitterMs: number
  roundTripTimeMs: number
  videoResolution: string
  fps: number
  audioLevel: number
  iceState: RTCIceConnectionState
  signalingState: RTCSignalingState
  connectionState: RTCPeerConnectionState
}

export interface DeviceOptions {
  cameras: MediaDeviceInfo[]
  microphones: MediaDeviceInfo[]
  speakers: MediaDeviceInfo[]
}

export interface MediaSettings {
  cameraId: string | null
  microphoneId: string | null
  speakerId: string | null
  cameraEnabled: boolean
  microphoneEnabled: boolean
  noiseSuppression: boolean
  echoCancellation: boolean
  autoGainControl: boolean
}
