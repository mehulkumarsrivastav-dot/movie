/**
 * Movie Night Sync Companion — background service worker.
 *
 * Receives PLAY/PAUSE/SEEK/TIME_UPDATE messages from content-script.js and
 * relays them to whichever Movie Night web app tabs are connected via
 * `externally_connectable` (see manifest.json — update those match
 * patterns to your real deployed domain before shipping this to a browser
 * store or loading it unpacked for real use).
 *
 * TODO (not implemented in this skeleton):
 *  - A popup UI to see current relay status and enable/disable per site.
 *  - Associating a specific browser tab with a specific Movie Night room
 *    (right now this naively broadcasts to all connected web-app tabs).
 *  - Origin allowlisting beyond manifest's externally_connectable, if you
 *    want stricter runtime validation.
 */

const connectedPorts = new Set()

chrome.runtime.onMessage.addListener((message) => {
  if (message?.source !== 'movie-night-extension') return
  for (const port of connectedPorts) {
    try {
      port.postMessage(message)
    } catch {
      connectedPorts.delete(port)
    }
  }
})

chrome.runtime.onConnectExternal.addListener((port) => {
  connectedPorts.add(port)
  port.onDisconnect.addListener(() => connectedPorts.delete(port))
})
