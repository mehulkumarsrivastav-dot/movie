import { useEffect, useRef } from 'react'
import type { DeviceOptions, MediaSettings } from '../../types/call'

interface DeviceSelectorProps {
  devices: DeviceOptions
  settings: MediaSettings
  onSwitchCamera: (id: string) => void
  onSwitchMicrophone: (id: string) => void
  onSetSpeaker: (id: string) => void
  onClose: () => void
}

export function DeviceSelector({ devices, settings, onSwitchCamera, onSwitchMicrophone, onSetSpeaker, onClose }: DeviceSelectorProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [onClose])

  const canSelectSpeaker = typeof (HTMLMediaElement.prototype as unknown as { setSinkId?: unknown }).setSinkId === 'function'

  return (
    <div
      ref={ref}
      className="absolute bottom-14 right-0 w-64 rounded-2xl border border-cinema-line bg-cinema-black p-3 text-xs shadow-2xl"
    >
      <Field label="Camera">
        <select
          className="w-full rounded-lg bg-cinema-charcoal p-2 text-cinema-fog"
          value={settings.cameraId ?? ''}
          onChange={(e) => onSwitchCamera(e.target.value)}
        >
          <option value="" disabled>Choose camera…</option>
          {devices.cameras.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>
          ))}
        </select>
      </Field>
      <Field label="Microphone">
        <select
          className="w-full rounded-lg bg-cinema-charcoal p-2 text-cinema-fog"
          value={settings.microphoneId ?? ''}
          onChange={(e) => onSwitchMicrophone(e.target.value)}
        >
          <option value="" disabled>Choose microphone…</option>
          {devices.microphones.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>
          ))}
        </select>
      </Field>
      {canSelectSpeaker ? (
        <Field label="Speaker">
          <select
            className="w-full rounded-lg bg-cinema-charcoal p-2 text-cinema-fog"
            value={settings.speakerId ?? ''}
            onChange={(e) => onSetSpeaker(e.target.value)}
          >
            <option value="" disabled>Choose speaker…</option>
            {devices.speakers.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || 'Speaker'}</option>
            ))}
          </select>
        </Field>
      ) : (
        <p className="mt-2 text-[10px] text-cinema-mist">
          Your browser doesn't support choosing a speaker output (Chrome/Edge desktop only).
        </p>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 last:mb-0">
      <label className="mb-1 block text-cinema-mist">{label}</label>
      {children}
    </div>
  )
}
