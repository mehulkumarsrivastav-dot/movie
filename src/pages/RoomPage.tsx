import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Bug, Sparkles, Copy, Check, Heart, Maximize, Minimize } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useRoom } from '../hooks/useRoom'
import { useCall } from '../hooks/useCall'
import { useWatchSync } from '../hooks/useWatchSync'
import { useScreenShare } from '../hooks/useScreenShare'
import { usePresenceLabel } from '../hooks/usePresence'
import { usePlayerStore } from '../stores/usePlayerStore'
import { useUiStore } from '../stores/useUiStore'

import { CameraBubble } from '../components/call/CameraBubble'
import { CallControls } from '../components/call/CallControls'
import { ConnectionQualityBadge } from '../components/call/ConnectionQualityBadge'
import { MoviePlayer } from '../components/player/MoviePlayer'
import { ChatDrawer } from '../components/chat/ChatDrawer'
import { ReactionBar } from '../components/reactions/ReactionBar'
import { FloatingReactions } from '../components/reactions/FloatingReactions'
import { CoupleFeatures } from '../components/room/CoupleFeatures'
import { RateTonightModal } from '../components/room/RateTonightModal'
import { ConnectionDebugger } from '../components/debug/ConnectionDebugger'
import { Card } from '../components/ui/Card'

import { sendChatMessage, subscribeToChat } from '../services/chatService'
import { saveMovieMemory, subscribeToStats } from '../services/memoryService'
import { signOut } from '../services/authService'
import type { ChatMessage, ReactionEmoji, ReactionEvent } from '../types/chat'
import type { RoomStats } from '../types/memory'
import type { YouTubePlayerAdapter } from '../utils/youtubeAdapter'
import { formatCallDuration } from '../utils/time'

const SOCIAL_CHANNEL = 'movie-night-social-v1'
type SocialEnvelope =
  | { channel: typeof SOCIAL_CHANNEL; kind: 'reaction'; emoji: ReactionEmoji; id: string }
  | { channel: typeof SOCIAL_CHANNEL; kind: 'miss-you' }
  | { channel: typeof SOCIAL_CHANNEL; kind: 'kiss' }

export function RoomPage() {
  const { code } = useParams<{ code: string }>()
  const roomCode = (code || 'COUPLE').toUpperCase()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [copiedLink, setCopiedLink] = useState(false)
  const uiStore = useUiStore()

  const roomHook = useRoom({
    uid: user?.uid ?? null,
    displayName: user?.displayName ?? user?.email?.split('@')[0] ?? 'Me',
    photoURL: user?.photoURL ?? null,
  })
  const { room, self, partner, error: roomError, enterSharedRoom, leave, setControlMode, setPauseOnBuffer } = roomHook

  const joinedRef = useRef(false)
  useEffect(() => {
    if (!user || joinedRef.current) return
    joinedRef.current = true
    void enterSharedRoom(roomCode)
  }, [user, roomCode, enterSharedRoom])

  // Initialize responsive bubble layouts on load
  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window.innerWidth
    const h = window.innerHeight
    const isMobile = w < 640

    if (isMobile) {
      uiStore.setPartnerLayout({ x: Math.max(10, w - 145), y: 55, size: 'sm', minimized: false })
      uiStore.setSelfLayout({ x: Math.max(10, w - 145), y: Math.max(100, h - 210), size: 'sm', minimized: false })
    } else {
      uiStore.setPartnerLayout({ x: Math.max(20, w - 210), y: 60, size: 'md', minimized: false })
      uiStore.setSelfLayout({ x: Math.max(20, w - 210), y: Math.max(100, h - 230), size: 'md', minimized: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Connect call as soon as room is active
  const call = useCall({
    roomId: room?.id ?? null,
    myUid: user?.uid ?? null,
    partnerUid: partner?.uid ?? (user?.uid?.includes('host') ? 'local-partner-cinema' : 'local-host-cinema'),
    shouldConnect: Boolean(room),
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const youtubeAdapterRef = useRef<YouTubePlayerAdapter | null>(null)
  const activeSourceMode = usePlayerStore((s) => s.source?.mode)

  const activeMediaRef = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    const id = setInterval(() => {
      activeMediaRef.current =
        activeSourceMode === 'YOUTUBE' ? (youtubeAdapterRef.current as unknown as HTMLVideoElement | null) : videoRef.current
    }, 250)
    return () => clearInterval(id)
  }, [activeSourceMode])

  const sync = useWatchSync({
    roomId: room?.id ?? null,
    myUid: user?.uid ?? null,
    isHost: self?.role === 'host',
    sendData: call.sendData,
    onDataMessage: call.onDataMessage,
    videoRef: activeMediaRef,
  })

  const screenShare = useScreenShare(() => call.serviceRef.current)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [reactions, setReactions] = useState<ReactionEvent[]>([])
  const [incomingMissYou, setIncomingMissYou] = useState(false)
  const [incomingKiss, setIncomingKiss] = useState(false)
  const [stats, setStats] = useState<RoomStats | null>(null)
  const [rateModalOpen, setRateModalOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [frontCamera, setFrontCamera] = useState(true)
  const stageRef = useRef<HTMLDivElement>(null)
  const watchStartedAt = useRef<number | null>(null)

  const playerState = usePlayerStore((s) => s.state)
  const source = usePlayerStore((s) => s.source)
  const lastDriftMs = usePlayerStore((s) => s.lastDriftMs)

  // ---- chat subscription ----
  useEffect(() => {
    if (!room) return
    return subscribeToChat(room.id, setChatMessages)
  }, [room])

  // ---- stats subscription ----
  useEffect(() => {
    if (!room) return
    return subscribeToStats(room.id, setStats)
  }, [room])

  // ---- social datachannel messages ----
  useEffect(() => {
    return call.onDataMessage((raw) => {
      let env: SocialEnvelope
      try {
        env = JSON.parse(raw)
      } catch {
        return
      }
      if (env.channel !== SOCIAL_CHANNEL) return
      if (env.kind === 'reaction') {
        setReactions((r) => [...r, { id: env.id, emoji: env.emoji, senderId: partner?.uid ?? 'partner', createdAt: Date.now() }])
        setTimeout(() => setReactions((r) => r.filter((x) => x.id !== env.id)), 3000)
      } else if (env.kind === 'miss-you') {
        setIncomingMissYou(true)
        setTimeout(() => setIncomingMissYou(false), 3000)
      } else if (env.kind === 'kiss') {
        setIncomingKiss(true)
        setTimeout(() => setIncomingKiss(false), 1800)
      }
    })
  }, [call, partner])

  const sendReaction = useCallback(
    (emoji: ReactionEmoji) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      call.sendData(JSON.stringify({ channel: SOCIAL_CHANNEL, kind: 'reaction', emoji, id } satisfies SocialEnvelope))
      setReactions((r) => [...r, { id, emoji, senderId: user?.uid ?? 'me', createdAt: Date.now() }])
      setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 3000)
    },
    [call, user]
  )
  const sendMissYou = useCallback(() => call.sendData(JSON.stringify({ channel: SOCIAL_CHANNEL, kind: 'miss-you' } satisfies SocialEnvelope)), [call])
  const sendKiss = useCallback(() => call.sendData(JSON.stringify({ channel: SOCIAL_CHANNEL, kind: 'kiss' } satisfies SocialEnvelope)), [call])

  useEffect(() => {
    uiStore.setCinemaMode(Boolean(source) && (playerState === 'PLAYING' || playerState === 'BUFFERING'))
  }, [source, playerState]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (playerState === 'PLAYING' && !watchStartedAt.current) watchStartedAt.current = Date.now()
  }, [playerState])

  const prevPlayerStateRef = useRef(playerState)
  useEffect(() => {
    if (playerState === 'ENDED' && prevPlayerStateRef.current !== 'ENDED') setRateModalOpen(true)
    prevPlayerStateRef.current = playerState
  }, [playerState])

  // Fullscreen
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) void stageRef.current?.requestFullscreen()
    else void document.exitFullscreen()
  }

  const handleFlipCamera = async () => {
    const newFacing = !frontCamera
    setFrontCamera(newFacing)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing ? 'user' : 'environment' },
      })
      const track = stream.getVideoTracks()[0]
      if (track) {
        await call.serviceRef.current?.replaceVideoTrack(track)
      }
    } catch {
      /* ignore */
    }
  }

  const handleLeave = async () => {
    await call.endCall()
    await leave()
    await signOut()
    navigate('/')
  }

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(window.location.origin + window.location.pathname)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleSaveMemory = (rating: number, note: string) => {
    if (!room || !user || !source) return
    const watchedSec = watchStartedAt.current ? (Date.now() - watchStartedAt.current) / 1000 : 0
    void saveMovieMemory({
      roomId: room.id,
      title: source.title,
      originalUrl: source.originalUrl,
      watchMode: source.mode,
      date: Date.now(),
      durationWatchedSec: watchedSec,
      ratingHost: self?.role === 'host' ? rating : null,
      ratingPartner: self?.role === 'partner' ? rating : null,
      note,
      createdBy: user.uid,
    })
    watchStartedAt.current = null
  }

  const partnerPresence = usePresenceLabel(partner)
  const isPartnerOnline = partnerPresence === 'online' || Boolean(call.remoteStream)

  if (!user) return null

  if (roomError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-white">{roomError.friendlyMessage}</p>
        <button className="text-sm text-rose-glow underline" onClick={() => navigate('/')}>Retry</button>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cinema-void">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-glow border-t-transparent" />
          <p className="text-xs text-cinema-mist font-medium">Entering Our Cinema…</p>
        </div>
      </div>
    )
  }

  const selfBubble = uiStore.bubblesSwapped ? uiStore.partnerLayout : uiStore.selfLayout
  const partnerBubble = uiStore.bubblesSwapped ? uiStore.selfLayout : uiStore.partnerLayout

  return (
    <div ref={stageRef} className="relative flex h-screen w-screen flex-col overflow-hidden bg-cinema-void">
      <div className="grain-overlay" />

      {/* Top Header */}
      <AnimatePresence>
        {!uiStore.cinemaMode && (
          <motion.header
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="z-20 flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3 border-b border-white/5 bg-cinema-void/90 backdrop-blur-md"
          >
            <div className="flex items-center gap-2 sm:gap-3 text-sm text-white">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Sparkles size={16} className="text-rose-glow animate-pulse" />
                <span className="font-display text-sm sm:text-base font-medium tracking-wide">Movie Night</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-cinema-charcoal px-2 sm:px-2.5 py-0.5 text-[11px] sm:text-xs text-cinema-mist border border-white/5 truncate max-w-[100px] sm:max-w-[140px]">
                <Heart size={10} className="text-rose-glow fill-rose-glow/20 shrink-0" /> <span className="truncate">{user.displayName || 'Me'}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3">
              <ConnectionQualityBadge quality={call.stats.quality} durationLabel={formatCallDuration(call.callStartedAt)} />
              
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-cinema-mist bg-cinema-charcoal/80 px-2 sm:px-2.5 py-1 rounded-full border border-white/5">
                <span className={`h-2 w-2 rounded-full ${isPartnerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-cinema-mist'}`} />
                <span className="hidden sm:inline">Partner: </span>
                <strong className={isPartnerOnline ? 'text-emerald-400 font-medium' : 'text-cinema-fog'}>
                  {isPartnerOnline ? 'Online ❤️' : 'Ready'}
                </strong>
              </div>

              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 text-[11px] sm:text-xs text-cinema-mist hover:text-white bg-white/5 px-2 sm:px-2.5 py-1 rounded-full transition"
                title="Copy website link for your partner"
              >
                {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <button onClick={toggleFullscreen} className="text-cinema-mist hover:text-white p-1" aria-label="Toggle Fullscreen">
                {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
              </button>

              <button onClick={() => uiStore.toggleDebugPanel()} className="text-cinema-mist hover:text-white p-1" aria-label="Toggle debugger">
                <Bug size={14} />
              </button>

              <button onClick={handleLeave} className="flex items-center gap-1 text-[11px] sm:text-xs text-cinema-mist hover:text-rose-glow pl-1.5 sm:pl-2 border-l border-white/10">
                <LogOut size={13} /> <span className="hidden sm:inline">Exit</span>
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Main Cinema Stage */}
      <div className="relative flex-1">
        <MoviePlayer
          source={source}
          playerState={playerState}
          onSubmitUrl={(url, title) => {
            try {
              sync.setSource(url, title)
            } catch {
              /* handled via sync.error */
            }
          }}
          onPickLocalFile={(file) => {
            const blobUrl = URL.createObjectURL(file)
            try {
              sync.setSource(blobUrl, file.name)
            } catch {
              /* handled */
            }
          }}
          onShareScreen={() => (screenShare.sharing ? void screenShare.stop() : void screenShare.start())}
          urlError={sync.error?.friendlyMessage ?? null}
          videoRef={videoRef}
          youtubeAdapterRef={youtubeAdapterRef}
          onPlay={sync.play}
          onPause={sync.pause}
          onSeek={sync.seek}
          canControl={sync.canControl}
          externalReady={sync.externalReady}
          externalCountdown={sync.externalCountdown}
          onExternalOpen={() => {}}
          onExternalMarkReady={sync.markExternalReady}
          pauseOnPartnerBuffer={room.pauseOnPartnerBuffer}
          partnerScreenShareStream={call.remoteScreenStream}
          localScreenShareStream={screenShare.stream}
          onStopScreenShare={screenShare.stop}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        <FloatingReactions reactions={reactions} />

        {/* Partner Camera Bubble (Top-Right Default) */}
        <CameraBubble
          stream={call.remoteStream}
          label={partner?.displayName ? `${partner.displayName} ❤️` : 'Partner ❤️'}
          cameraOff={!call.remoteStream}
          muted={false}
          minimized={partnerBubble.minimized}
          pinned={uiStore.partnerPinned}
          size={partnerBubble.size}
          x={partnerBubble.x}
          y={partnerBubble.y}
          containerRef={stageRef}
          onMove={(x, y) => (uiStore.bubblesSwapped ? uiStore.setSelfLayout({ x, y }) : uiStore.setPartnerLayout({ x, y }))}
          onToggleMinimize={() =>
            uiStore.bubblesSwapped
              ? uiStore.setSelfLayout({ minimized: !selfBubble.minimized })
              : uiStore.setPartnerLayout({ minimized: !partnerBubble.minimized })
          }
          onTogglePin={() => uiStore.togglePartnerPinned()}
          quality={call.stats.quality}
        />

        {/* Self Camera Bubble (Bottom-Right Default) */}
        {!uiStore.selfBubbleHidden && (
          <CameraBubble
            stream={call.localStream}
            label={user.displayName ? `${user.displayName} (Me)` : 'Me'}
            isSelf
            muted={true}
            cameraOff={!call.settings.cameraEnabled}
            micOff={!call.settings.microphoneEnabled}
            minimized={selfBubble.minimized}
            size={selfBubble.size}
            x={selfBubble.x}
            y={selfBubble.y}
            containerRef={stageRef}
            onFlipCamera={handleFlipCamera}
            onMove={(x, y) => (uiStore.bubblesSwapped ? uiStore.setPartnerLayout({ x, y }) : uiStore.setSelfLayout({ x, y }))}
            onToggleMinimize={() =>
              uiStore.bubblesSwapped
                ? uiStore.setPartnerLayout({ minimized: !partnerBubble.minimized })
                : uiStore.setSelfLayout({ minimized: !selfBubble.minimized })
            }
          />
        )}
      </div>

      {/* Bottom Control Dock (Touch & Mobile Optimized) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 sm:bottom-6 z-20 flex flex-col items-center gap-2 sm:gap-3 px-2">
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 max-w-full overflow-x-auto py-1">
          <ReactionBar onReact={sendReaction} />
          <CoupleFeatures onMissYou={sendMissYou} onKiss={sendKiss} incomingMissYou={incomingMissYou} incomingKiss={incomingKiss} />
        </div>
        <div className="pointer-events-auto">
          <CallControls
            micOn={call.settings.microphoneEnabled}
            cameraOn={call.settings.cameraEnabled}
            onToggleMic={call.toggleMic}
            onToggleCamera={call.toggleCamera}
            onEndCall={handleLeave}
            onShareScreen={() => (screenShare.sharing ? void screenShare.stop() : void screenShare.start())}
            sharingScreen={screenShare.sharing}
            devices={call.devices}
            settings={call.settings}
            onSwitchCamera={call.switchCamera}
            onSwitchMicrophone={call.switchMicrophone}
            onSetSpeaker={call.setSpeaker}
            onOpenChat={() => uiStore.toggleChat()}
          />
        </div>
      </div>

      <ChatDrawer
        open={uiStore.chatOpen}
        onClose={() => uiStore.toggleChat()}
        messages={chatMessages}
        myUid={user.uid}
        onSend={(text) => void sendChatMessage(room.id, user.uid, self?.displayName ?? (user.displayName || 'Me'), text)}
      />

      <ConnectionDebugger open={uiStore.debugPanelOpen} onClose={() => uiStore.toggleDebugPanel()} stats={call.stats} driftMs={lastDriftMs} />

      <RateTonightModal open={rateModalOpen} onClose={() => setRateModalOpen(false)} onSave={handleSaveMemory} />

      {stats && stats.movieNightsCount > 0 && !uiStore.cinemaMode && (
        <div className="absolute right-5 top-16 z-10 hidden lg:block">
          <Card className="p-3 text-center">
            <p className="font-display text-lg text-white">{stats.movieNightsCount}</p>
            <p className="text-[10px] text-cinema-mist">movie nights ❤️</p>
          </Card>
        </div>
      )}

      <div className="hidden">
        <button onClick={() => setControlMode('HOST_ONLY')}>host only</button>
        <button onClick={() => setControlMode('BOTH')}>both</button>
        <button onClick={() => setPauseOnBuffer(!room.pauseOnPartnerBuffer)}>toggle pause on buffer</button>
      </div>
    </div>
  )
}
