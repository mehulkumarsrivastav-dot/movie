/**
 * Central catalog of user-facing errors. Every thrown AppError carries:
 *  - `code`      machine-readable, used in tests / debug panel
 *  - `message`   friendly, shown to the user
 *  - `detail`    technical detail, logged to console for developers only
 */
export type AppErrorCode =
  | 'CAMERA_BLOCKED'
  | 'MIC_BLOCKED'
  | 'NO_CAMERA'
  | 'NO_MIC'
  | 'TURN_FAILED'
  | 'ICE_FAILED'
  | 'NETWORK_DISCONNECTED'
  | 'PARTNER_DISCONNECTED'
  | 'INVALID_URL'
  | 'EMBED_REFUSED'
  | 'UNSUPPORTED_MEDIA'
  | 'SCREEN_SHARE_CANCELLED'
  | 'SCREEN_SHARE_UNAVAILABLE'
  | 'AUTH_FAILED'
  | 'NOT_ALLOWED'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_EXPIRED'
  | 'SYNC_FAILED'
  | 'UNKNOWN'

const FRIENDLY: Record<AppErrorCode, string> = {
  CAMERA_BLOCKED: "We need your camera so she can see your beautiful face. Your browser blocked it — check the camera icon in your address bar and allow access.",
  MIC_BLOCKED: "We need your mic so she can hear you too. Allow microphone access in your browser's address bar and try again.",
  NO_CAMERA: "We couldn't find a camera on this device. You can still join with audio only.",
  NO_MIC: "We couldn't find a microphone on this device. You can still join with video only.",
  TURN_FAILED: "The relay server that helps connect you across networks isn't responding. Calls may fail on strict WiFi (hotel, campus, office). Check your TURN configuration.",
  ICE_FAILED: "We couldn't find a path between your devices. This usually means both STUN and TURN failed — check your network or TURN server credentials.",
  NETWORK_DISCONNECTED: "Your internet dropped. We'll try to reconnect automatically.",
  PARTNER_DISCONNECTED: "Connection lost — trying to bring you back together.",
  INVALID_URL: "That doesn't look like a link we can open. Double check the URL and try again.",
  EMBED_REFUSED: "This website doesn't allow playback inside Movie Night.",
  UNSUPPORTED_MEDIA: "We can't play this file format directly. Try a direct .mp4, .webm, or HLS (.m3u8) link.",
  SCREEN_SHARE_CANCELLED: "Screen sharing was cancelled.",
  SCREEN_SHARE_UNAVAILABLE: "Your browser doesn't support tab sharing, or the selected tab refused to be captured (this happens with some protected video).",
  AUTH_FAILED: "We couldn't sign you in. Please try again.",
  NOT_ALLOWED: "This app is private — your account isn't on the guest list.",
  ROOM_NOT_FOUND: "We couldn't find that room. Check the code and try again.",
  ROOM_FULL: "This room already has two people in it.",
  ROOM_EXPIRED: "This room has expired. Start a new Movie Night.",
  SYNC_FAILED: "Playback sync hit a snag — we're retrying.",
  UNKNOWN: "Something specific went wrong, but we didn't catch what. Check the console for details.",
}

export class AppError extends Error {
  code: AppErrorCode
  detail?: unknown

  constructor(code: AppErrorCode, detail?: unknown) {
    super(FRIENDLY[code])
    this.name = 'AppError'
    this.code = code
    this.detail = detail
    if (detail) {
      // eslint-disable-next-line no-console
      console.error(`[AppError:${code}]`, detail)
    }
  }

  get friendlyMessage() {
    return FRIENDLY[this.code]
  }
}

export function toAppError(err: unknown, fallback: AppErrorCode = 'UNKNOWN'): AppError {
  if (err instanceof AppError) return err
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') return new AppError('CAMERA_BLOCKED', err)
    if (err.name === 'NotFoundError') return new AppError('NO_CAMERA', err)
  }
  return new AppError(fallback, err)
}
