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
    <div className="relative flex items-center gap-1.5 sm:gap-3 rounded-full border border-white/10 bg-black/50 px-2.5 sm:px-4 py-2 sm:py-2.5 backdrop-blur-xl shadow-2xl">
      <IconButton label={micOn ? 'Mute mic' : 'Unmute mic'} active={!micOn} danger={!micOn} onClick={onToggleMic}>
        {micOn ? <Mic size={16} className="sm:w-[18px] sm:h-[18px]" /> : <MicOff size={16} className="sm:w-[18px] sm:h-[18px]" />}
      </IconButton>
      <IconButton label={cameraOn ? 'Turn camera off' : 'Turn camera on'} active={!cameraOn} danger={!cameraOn} onClick={onToggleCamera}>
        {cameraOn ? <Video size={16} className="sm:w-[18px] sm:h-[18px]" /> : <VideoOff size={16} className="sm:w-[18px] sm:h-[18px]" />}
      </IconButton>
      <IconButton label="Stream Tab / Screen" active={sharingScreen} onClick={onShareScreen}>
        <MonitorUp size={16} className="sm:w-[18px] sm:h-[18px]" />
      </IconButton>
      <IconButton label="Chat" onClick={onOpenChat}>
        <MessageCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
        {unreadChat > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-glow text-[9px] font-bold text-cinema-void">
            {unreadChat}
          </span>
        )}
      </IconButton>
      <div className="relative">
        <IconButton label="Device settings" active={devicesOpen} onClick={() => setDevicesOpen((v) => !v)}>
          <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
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
      <div className="mx-0.5 sm:mx-1 h-5 sm:h-6 w-px bg-white/15" />
      <IconButton label="Exit Cinema" danger onClick={onEndCall}>
        <PhoneOff size={16} className="sm:w-[18px] sm:h-[18px]" />
      </IconButton>
    </div>
  )
}
