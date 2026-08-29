# Movie Night Sync Companion (extension — skeleton)

This is an **optional, unfinished companion browser extension**, scoped
exactly as requested: architecture in place, clearly marked TODOs, and
explicit guardrails against anything that would bypass DRM, paywalls, or
frame/embedding protections.

## What it does today

- A content script watches the largest `<video>` element on whatever page
  the tab is currently on and relays standard `play`/`pause`/`seeked`/
  `timeupdate` events to the extension's background service worker.
- The background worker relays those messages to any Movie Night web app
  tab connected via `externally_connectable`.

## What it does NOT do, and never will

- Decrypt or intercept DRM/EME license exchanges.
- Read cookies, session storage, or authentication tokens.
- Strip or bypass CSP / X-Frame-Options / frame-ancestors.
- Download or proxy protected video streams.

## What's left to build before this is real

1. A popup UI showing connection status and a per-site enable toggle
   (right now it runs on every page, which is noisy and not appropriate
   for a shipped extension).
2. Wiring this relay into the main app's `useWatchSync` — currently the web
   app has no code that listens for these extension messages. You'd add a
   `chrome.runtime.connect(EXTENSION_ID)` call in the web app (behind a
   feature flag, since most users won't have the extension installed) and
   feed incoming events into the same `SyncEvent` pipeline already used for
   DIRECT_MEDIA/YOUTUBE.
3. A real extension icon/action, a Chrome Web Store listing (if you want to
   distribute it beyond "load unpacked"), and updating the
   `externally_connectable.matches` origin in `manifest.json` to your real
   deployed domain.
4. Tab-to-room association, so events only flow to the Movie Night room the
   sending tab's owner is actually in.

## Loading it locally for testing

1. Go to `chrome://extensions`, enable "Developer mode".
2. Click "Load unpacked", select this `extension/` folder.
3. Note the generated Extension ID and add it to `externally_connectable`
   in `manifest.json` if you build the web-app side of the bridge.

This intentionally ships as a skeleton rather than a finished feature — the
core call/sync/watch-together experience was prioritized per the brief's
stated priority order.
