import { X } from 'lucide-react'
import type { CallStats } from '../../types/call'
import { IconButton } from '../ui/IconButton'

interface ConnectionDebuggerProps {
  open: boolean
  onClose: () => void
  stats: CallStats
  driftMs: number
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b border-cinema-line/60 py-1.5 text-xs">
      <span className="text-cinema-mist">{label}</span>
      <span className="font-mono text-cinema-fog">{value}</span>
    </div>
  )
}

/**
 * Hidden diagnostics panel — toggle with Ctrl/Cmd+Shift+D (see RoomPage) or
 * the debug icon. Not linked from the main UI so it doesn't clutter the
 * romantic experience, but it's real, live WebRTC/getStats() data, not
 * placeholders.
 */
export function ConnectionDebugger({ open, onClose, stats, driftMs }: ConnectionDebuggerProps) {
  if (!open) return null
  return (
    <div className="fixed bottom-4 left-4 z-[60] w-72 rounded-2xl border border-cinema-line bg-cinema-black/95 p-4 font-mono shadow-2xl backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-glow">Connection Debugger</h4>
        <IconButton label="Close" onClick={onClose}>
          <X size={14} />
        </IconButton>
      </div>
      <Row label="Connection state" value={stats.connectionState} />
      <Row label="ICE state" value={stats.iceState} />
      <Row label="Signaling state" value={stats.signalingState} />
      <Row label="Candidate type" value={stats.candidateType ?? '—'} />
      <Row label="RTT" value={`${stats.roundTripTimeMs} ms`} />
      <Row label="Jitter" value={`${stats.jitterMs} ms`} />
      <Row label="Packet loss" value={`${stats.packetLossPct}%`} />
      <Row label="Local bitrate" value={`${stats.localBitrateKbps} kbps`} />
      <Row label="Remote bitrate" value={`${stats.remoteBitrateKbps} kbps`} />
      <Row label="Resolution" value={stats.videoResolution} />
      <Row label="FPS" value={stats.fps} />
      <Row label="Audio level" value={stats.audioLevel} />
      <Row label="Playback drift" value={`${Math.round(driftMs)} ms`} />
    </div>
  )
}
