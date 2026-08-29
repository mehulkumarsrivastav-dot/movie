/**
 * Movie Night Sync Companion — content script
 *
 * WHAT THIS DOES:
 * Finds the largest <video> element currently playing on the page (the page
 * the user has voluntarily navigated to, in a tab they control) and relays
 * its PLAY / PAUSE / SEEK / TIME events to the extension's background
 * script, which can forward them to the Movie Night web app.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO:
 *  - It does not intercept, decrypt, or touch DRM/EME license requests.
 *  - It does not read video pixel data, network requests, cookies, or
 *    session tokens.
 *  - It does not inject any script into iframes it doesn't already have
 *    normal content-script access to, and it doesn't attempt to defeat
 *    any site's frame/embedding restrictions.
 *  - It only observes standard, publicly-documented HTMLMediaElement
 *    events (play/pause/seeking/timeupdate) that are already exposed to
 *    any page script running in that tab.
 *
 * This file is a working STARTING POINT, not a finished product — see
 * README "Optional future browser extension" for what's left to build
 * (a UI popup, per-site enable toggle, and the background<->web-app
 * message bridge with origin validation).
 */

function findPrimaryVideo() {
  const videos = Array.from(document.querySelectorAll('video'))
  if (videos.length === 0) return null
  return videos.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0]
}

let attachedVideo = null
let lastSentAt = 0

function attach(video) {
  if (attachedVideo === video) return
  attachedVideo = video

  const send = (type) => {
    const now = Date.now()
    if (type === 'TIME_UPDATE' && now - lastSentAt < 2000) return // throttle
    lastSentAt = now
    chrome.runtime.sendMessage({
      source: 'movie-night-extension',
      type,
      currentTime: video.currentTime,
      playbackRate: video.playbackRate,
      paused: video.paused,
      url: location.href,
      title: document.title,
      sentAt: now,
    })
  }

  video.addEventListener('play', () => send('PLAY'))
  video.addEventListener('pause', () => send('PAUSE'))
  video.addEventListener('seeked', () => send('SEEK'))
  video.addEventListener('timeupdate', () => send('TIME_UPDATE'))
}

const observer = new MutationObserver(() => {
  const video = findPrimaryVideo()
  if (video) attach(video)
})
observer.observe(document.documentElement, { childList: true, subtree: true })

const initial = findPrimaryVideo()
if (initial) attach(initial)
