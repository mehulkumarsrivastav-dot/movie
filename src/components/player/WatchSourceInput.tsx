import { useState, useRef } from 'react'
import { Link2, Sparkles, FileVideo, MonitorUp, PlayCircle } from 'lucide-react'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

interface WatchSourceInputProps {
  onSubmit: (url: string, title?: string) => void
  onPickLocalFile?: (file: File) => void
  onShareScreen?: () => void
  errorMessage?: string | null
}

const DEMO_PRESETS = [
  {
    name: 'Big Buck Bunny (Direct 4K MP4)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    tag: 'Direct MP4',
  },
  {
    name: 'Tears of Steel (Direct 4K MP4)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    tag: 'Direct MP4',
  },
  {
    name: 'Lo-Fi Romance Anime Video (YouTube)',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    tag: 'YouTube',
  },
  {
    name: 'Elephants Dream (Direct WebM)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    tag: 'Direct MP4',
  },
]

export function WatchSourceInput({ onSubmit, onPickLocalFile, onShareScreen, errorMessage }: WatchSourceInputProps) {
  const [value, setValue] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    if (!value.trim()) return
    onSubmit(value.trim())
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (onPickLocalFile) {
      onPickLocalFile(file)
    } else {
      const blobUrl = URL.createObjectURL(file)
      onSubmit(blobUrl, file.name)
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs text-cinema-mist font-medium">
          <Sparkles size={13} className="text-rose-glow" /> Paste something to watch together
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cinema-mist" />
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Paste YouTube, Vimeo, direct MP4/HLS link, or any site…"
              className="pl-10 text-sm"
            />
          </div>
          <Button onClick={submit} className="shrink-0">
            Watch Together
          </Button>
        </div>
        {errorMessage && <p className="mt-2 text-xs text-rose-glow">{errorMessage}</p>}
      </div>

      {/* Local File & Screen Share Options */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          icon={<FileVideo size={15} className="text-rose-glow" />}
        >
          Pick Local Video File
        </Button>

        {onShareScreen && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onShareScreen}
            icon={<MonitorUp size={15} className="text-rose-glow" />}
          >
            Stream Tab / Screen into Cinema
          </Button>
        )}
      </div>

      {/* Quick Test Presets */}
      <div className="rounded-2xl border border-white/5 bg-cinema-charcoal/50 p-4">
        <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wider text-cinema-mist">
          Quick Demo Presets (1-Click Test)
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DEMO_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                setValue(preset.url)
                onSubmit(preset.url, preset.name)
              }}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-2.5 text-left text-xs text-cinema-fog transition hover:border-rose-glow/40 hover:bg-white/[0.07] hover:text-white"
            >
              <div className="flex items-center gap-2 truncate">
                <PlayCircle size={14} className="shrink-0 text-rose-glow" />
                <span className="truncate">{preset.name}</span>
              </div>
              <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-cinema-mist">
                {preset.tag}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
