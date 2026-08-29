import { useCallback, useRef, useState } from 'react'
import type { CallService } from '../services/callService'
import { AppError, toAppError } from '../utils/errors'

export function useScreenShare(callService: () => CallService | null, onSharingStateChange?: (sharing: boolean) => void) {
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stop = useCallback(async () => {
    const activeStream = streamRef.current
    const service = callService()
    if (activeStream) {
      for (const track of activeStream.getTracks()) {
        if (service) await service.removeTrack(track)
        track.stop()
      }
    }
    streamRef.current = null
    setStream(null)
    setSharing(false)
    onSharingStateChange?.(false)
  }, [callService, onSharingStateChange])

  const start = useCallback(async () => {
    setError(null)
    if (!navigator.mediaDevices?.getDisplayMedia) {
      const e = new AppError('SCREEN_SHARE_UNAVAILABLE')
      setError(e)
      throw e
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 30, max: 60 },
          displaySurface: 'browser',
        },
        audio: true, // captures tab/system audio where the browser supports it
      })
      streamRef.current = displayStream
      setStream(displayStream)
      const service = callService()
      if (service) {
        for (const track of displayStream.getTracks()) {
          await service.addExtraTrack(track, displayStream)
          track.onended = () => {
            void stop()
          }
        }
      }
      setSharing(true)
      onSharingStateChange?.(true)
      return displayStream
    } catch (err) {
      const domErr = err as DOMException
      const e = domErr.name === 'NotAllowedError' ? new AppError('SCREEN_SHARE_CANCELLED', err) : toAppError(err, 'SCREEN_SHARE_UNAVAILABLE')
      setError(e)
      throw e
    }
  }, [callService, stop, onSharingStateChange])

  return { sharing, error, start, stop, stream }
}
