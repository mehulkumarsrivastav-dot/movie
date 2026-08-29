import { useState } from 'react'
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, Settings, MessageCircle } from 'lucide-react'
import { IconButton } from '../ui/IconButton'
import { DeviceSelector } from './DeviceSelector'
import type { DeviceOptions, MediaSettings } from '../../types/call'

interface CallControlsProps {
  micOn: boolean
  cameraOn: boolean
  onToggleMic: () => void
  onToggleCamera: () => void
  onEndCall: () => void
  onShareScreen: () => void
  sharingScreen: boolean
  devices: DeviceOptions
  settings: MediaSettings
  onSwitchCamera: (id: string) => void
  onSwitchMicrophone: (id: string) => void
  onSetSpeaker: (id: string) => void
  onOpenChat: () => void
  unreadChat?: number
}

export function CallControls({
  micOn,
  cameraOn,
  onToggleMic,
  onToggleCamera,
  onEndCall,
  onShareScreen,
  sharingScreen,
  devices,
  settings,
  onSwitchCamera,
  onSwitchMicrophone,
  onSetSpeaker,
  onOpenChat,
  unreadChat = 0,
}: CallControlsProps) {
  const [devicesOpen, setDevicesOpen] = useState(false)

  return (
    <div className="relative flex items-center gap-3 rounded-full border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-xl">
      <IconButton label={micOn ? 'Mute microphone' : 'Unmute microphone'} active={!micOn} danger={!micOn} onClick={onToggleMic}>
        {micOn ? <Mic size={18} /> : <MicOff size={18} />}
      </IconButton>
      <IconButton label={cameraOn ? 'Turn camera off' : 'Turn camera on'} active={!cameraOn} danger={!cameraOn} onClick={onToggleCamera}>
        {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
      </IconButton>
      <IconButton label="Share a browser tab" active={sharingScreen} onClick={onShareScreen}>
        <MonitorUp size={18} />
      </IconButton>
      <IconButton label="Chat" onClick={onOpenChat}>
        <MessageCircle size={18} />
        {unreadChat > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-glow text-[9px] font-bold text-cinema-void">
            {unreadChat}
          </span>
        )}
      </IconButton>
      <div className="relative">
        <IconButton label="Device settings" active={devicesOpen} onClick={() => setDevicesOpen((v) => !v)}>
          <Settings size={18} />
        </IconButton>
        {devicesOpen && (
          <DeviceSelector
            devices={devices}
            settings={settings}
            onSwitchCamera={onSwitchCamera}
            onSwitchMicrophone={onSwitchMicrophone}
            onSetSpeaker={onSetSpeaker}
            onClose={() => setDevicesOpen(false)}
          />
        )}
      </div>
      <div className="mx-1 h-6 w-px bg-white/15" />
      <IconButton label="End call" danger onClick={onEndCall}>
        <PhoneOff size={18} />
      </IconButton>
    </div>
  )
}
