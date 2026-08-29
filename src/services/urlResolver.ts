import type { MediaKind, WatchMode, WatchSource } from '../types/player'

interface EmbedProvider {
  name: string
  test: (url: URL) => boolean
  buildEmbedUrl: (url: URL) => string
}

const EMBED_PROVIDERS: EmbedProvider[] = [
  {
    name: 'Vimeo',
    test: (u) => /(^|\.)vimeo\.com$/.test(u.hostname),
    buildEmbedUrl: (u) => {
      const id = u.pathname.split('/').filter(Boolean).pop()
      return `https://player.vimeo.com/video/${id}?autoplay=1`
    },
  },
  {
    name: 'Google Drive',
    test: (u) => /(^|\.)drive\.google\.com$/.test(u.hostname) && u.pathname.includes('/file/d/'),
    buildEmbedUrl: (u) => {
      const match = u.pathname.match(/\/file\/d\/([^/]+)/)
      const id = match?.[1] ?? ''
      return `https://drive.google.com/file/d/${id}/preview`
    },
  },
  {
    name: 'Loom',
    test: (u) => /(^|\.)loom\.com$/.test(u.hostname) && u.pathname.includes('/share/'),
    buildEmbedUrl: (u) => {
      const id = u.pathname.split('/share/')[1]?.split('?')[0] ?? ''
      return `https://www.loom.com/embed/${id}`
    },
  },
  {
    name: 'Streamable',
    test: (u) => /(^|\.)streamable\.com$/.test(u.hostname),
    buildEmbedUrl: (u) => {
      const id = u.pathname.split('/').filter(Boolean).pop() ?? ''
      return `https://streamable.com/e/${id}`
    },
  },
  {
    name: 'Internet Archive',
    test: (u) => /(^|\.)archive\.org$/.test(u.hostname) && u.pathname.includes('/details/'),
    buildEmbedUrl: (u) => {
      const id = u.pathname.split('/details/')[1]?.split('?')[0] ?? ''
      return `https://archive.org/embed/${id}`
    },
  },
  {
    name: 'Bilibili',
    test: (u) => /(^|\.)bilibili\.com$/.test(u.hostname),
    buildEmbedUrl: (u) => {
      const match = u.pathname.match(/\/video\/([a-zA-Z0-9]+)/)
      const bvid = match?.[1] ?? ''
      return `https://player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&danmaku=0`
    },
  },
  {
    name: 'Dailymotion',
    test: (u) => /(^|\.)dailymotion\.com$/.test(u.hostname),
    buildEmbedUrl: (u) => {
      const id = u.pathname.split('/').pop()?.split('_')[0] ?? ''
      return `https://www.dailymotion.com/embed/video/${id}`
    },
  },
  {
    name: 'Twitch',
    test: (u) => /(^|\.)twitch\.tv$/.test(u.hostname),
    buildEmbedUrl: (u) => {
      const parentDomain = typeof window !== 'undefined' ? window.location.hostname : (import.meta.env.VITE_APP_HOSTNAME || 'localhost')
      const channel = u.pathname.split('/').filter(Boolean)[0] ?? ''
      return `https://player.twitch.tv/?channel=${channel}&parent=${parentDomain}`
    },
  },
]

const DIRECT_MEDIA_EXTENSIONS: Record<string, MediaKind> = {
  mp4: 'mp4',
  m4v: 'mp4',
  mov: 'mp4',
  webm: 'webm',
  ogv: 'webm',
  ogg: 'webm',
  m3u8: 'hls',
  mpd: 'dash',
}

function detectYouTube(u: URL): { videoId: string; start?: number } | null {
  let videoId: string | null = null
  let start: number | undefined

  const timeParam = u.searchParams.get('t') || u.searchParams.get('start')
  if (timeParam) {
    const parsed = parseInt(timeParam.replace('s', ''), 10)
    if (!isNaN(parsed)) start = parsed
  }

  if (/(^|\.)(youtube\.com|youtube-nocookie\.com)$/.test(u.hostname)) {
    if (u.pathname === '/watch') {
      videoId = u.searchParams.get('v')
    } else if (u.pathname.startsWith('/embed/')) {
      videoId = u.pathname.replace('/embed/', '').split('?')[0]
    } else if (u.pathname.startsWith('/live/')) {
      videoId = u.pathname.replace('/live/', '').split('?')[0]
    } else if (u.pathname.startsWith('/shorts/')) {
      videoId = u.pathname.replace('/shorts/', '').split('?')[0]
    }
  } else if (/(^|\.)youtu\.be$/.test(u.hostname)) {
    videoId = u.pathname.slice(1).split('?')[0]
  }

  if (videoId) {
    return { videoId, start }
  }
  return null
}

function detectDirectMedia(u: URL): MediaKind | null {
  const pathname = u.pathname.toLowerCase()
  const ext = pathname.split('.').pop()?.split('?')[0] ?? ''
  if (DIRECT_MEDIA_EXTENSIONS[ext]) {
    return DIRECT_MEDIA_EXTENSIONS[ext]
  }
  return null
}

function detectDropboxDirect(u: URL): string | null {
  if (/(^|\.)dropbox\.com$/.test(u.hostname)) {
    const rawUrl = new URL(u.toString())
    rawUrl.searchParams.delete('dl')
    rawUrl.searchParams.set('raw', '1')
    return rawUrl.toString()
  }
  return null
}

function titleFromUrl(u: URL): string {
  const last = u.pathname.split('/').filter(Boolean).pop() ?? u.hostname
  return decodeURIComponent(last).replace(/[-_]/g, ' ').replace(/\.[a-z0-9]+$/i, '') || u.hostname
}

export function resolveWatchSource(rawUrl: string, customTitle?: string): WatchSource {
  const trimmed = rawUrl.trim()

  // Handle local blob video URL
  if (trimmed.startsWith('blob:')) {
    return {
      mode: 'DIRECT_MEDIA',
      provider: 'Local File',
      embedUrl: null,
      mediaUrl: trimmed,
      mediaKind: 'mp4',
      title: customTitle || 'Local Movie File',
      originalUrl: trimmed,
      officiallyEmbeddable: true,
    }
  }

  let u: URL
  try {
    u = new URL(trimmed)
  } catch {
    throw new Error('INVALID_URL')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('INVALID_URL')
  }

  // 1. YouTube
  const youtube = detectYouTube(u)
  if (youtube) {
    const startParam = youtube.start ? `&start=${youtube.start}` : ''
    const mode: WatchMode = 'YOUTUBE'
    return {
      mode,
      provider: 'YouTube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtube.videoId}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1${startParam}`,
      mediaUrl: null,
      mediaKind: null,
      title: customTitle || 'YouTube Video',
      originalUrl: rawUrl,
      officiallyEmbeddable: true,
    }
  }

  // 2. Dropbox Direct Stream
  const dropboxDirect = detectDropboxDirect(u)
  if (dropboxDirect) {
    return {
      mode: 'DIRECT_MEDIA',
      provider: 'Dropbox',
      embedUrl: null,
      mediaUrl: dropboxDirect,
      mediaKind: 'mp4',
      title: customTitle || titleFromUrl(u),
      originalUrl: rawUrl,
      officiallyEmbeddable: true,
    }
  }

  // 3. Direct Media (.mp4, .webm, .m3u8, etc.)
  const directKind = detectDirectMedia(u)
  if (directKind) {
    return {
      mode: 'DIRECT_MEDIA',
      provider: u.hostname,
      embedUrl: null,
      mediaUrl: rawUrl,
      mediaKind: directKind,
      title: customTitle || titleFromUrl(u),
      originalUrl: rawUrl,
      officiallyEmbeddable: true,
    }
  }

  // 4. Curated Embed Providers (Vimeo, Google Drive, Loom, Streamable, Twitch, etc.)
  const embedProvider = EMBED_PROVIDERS.find((p) => p.test(u))
  if (embedProvider) {
    return {
      mode: 'SUPPORTED_EMBED',
      provider: embedProvider.name,
      embedUrl: embedProvider.buildEmbedUrl(u),
      mediaUrl: null,
      mediaKind: null,
      title: customTitle || titleFromUrl(u),
      originalUrl: rawUrl,
      officiallyEmbeddable: true,
    }
  }

  // 5. External Synchronized Watch Fallback
  return {
    mode: 'EXTERNAL',
    provider: u.hostname,
    embedUrl: null,
    mediaUrl: null,
    mediaKind: null,
    title: customTitle || titleFromUrl(u),
    originalUrl: rawUrl,
    officiallyEmbeddable: false,
  }
}
