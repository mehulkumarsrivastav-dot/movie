# Movie Night ❤️

A private virtual cinema for two — real video calling, watch-together with
synchronized playback, and small romantic touches, built as a real,
working application (not a mockup).

This README assumes **no prior experience**. Follow it top to bottom and
you'll have your own private link to send your partner.

---

## Table of contents

1. [What you're getting](#1-what-youre-getting)
2. [Requirements](#2-requirements)
3. [Install the project](#3-install-the-project)
4. [Create your Firebase project](#4-create-your-firebase-project)
5. [Turn on Firebase Authentication](#5-turn-on-firebase-authentication)
6. [Turn on Firestore](#6-turn-on-firestore)
7. [Deploy Firestore security rules](#7-deploy-firestore-security-rules)
8. [Set up the two-person allowlist](#8-set-up-the-two-person-allowlist)
9. [TURN server configuration (important!)](#9-turn-server-configuration-important)
10. [Environment variables](#10-environment-variables)
11. [Run it locally](#11-run-it-locally)
12. [Testing with two computers](#12-testing-with-two-computers)
13. [Deployment](#13-deployment)
14. [Troubleshooting](#14-troubleshooting)
15. [Production checklist](#15-production-checklist)
16. [Honest limitations](#16-honest-limitations)

---

## 1. What you're getting

- **Real WebRTC video calling** between exactly two people, with Firestore
  used only as the signaling channel (no video/audio ever passes through
  Firebase — media flows peer-to-peer, or via your TURN server when a
  direct path isn't possible).
- **A URL resolver** that inspects a pasted link and picks the best
  legitimate way to watch it: play it directly, embed it via a provider
  that officially allows embedding, or fall back to an external
  synchronized "open together" mode.
- **Drift-corrected playback sync** over a WebRTC DataChannel for videos we
  control directly (direct media files and YouTube).
- **Floating, draggable camera bubbles**, chat, reactions, and small couple
  features (Miss You, Kiss, movie night counters, and a memories log).
- **Firestore security rules** that actually enforce the two-person
  boundary server-side.

## 2. Requirements

- **Node.js 20 or newer** — check with `node -v`. Get it from
  [nodejs.org](https://nodejs.org) if needed.
- **A free Google/Firebase account.**
- **A TURN server** (see step 9) if you want calls to work across
  different networks — this is the single most important step people skip
  and then wonder why calls fail on mobile data or campus WiFi.
- A code editor (VS Code is fine) and basic comfort pasting commands into a
  terminal. You don't need to know how to write code.

## 3. Install the project

Open a terminal in this folder and run:

```bash
npm install
```

This downloads all the libraries the app needs. It only needs to be done
once (and again any time `package.json` changes).

## 4. Create your Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com).
2. Click **Add project**, give it a name (e.g. `movie-night-us`), and
   finish the wizard (you can turn off Google Analytics — not needed).
3. Once created, click the **Web** icon (`</>`) to register a web app.
   Give it a nickname, skip Firebase Hosting for now (we'll cover it in
   step 13).
4. Firebase will show you a config object like:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "movie-night-us.firebaseapp.com",
     projectId: "movie-night-us",
     storageBucket: "movie-night-us.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef",
   };
   ```
   Keep this tab open — you'll copy these values into `.env.local` in
   step 10.

## 5. Turn on Firebase Authentication

1. In the Firebase console sidebar, go to **Build → Authentication**.
2. Click **Get started**.
3. Under **Sign-in method**, enable:
   - **Google** (turn it on, pick a support email, save).
   - **Email/Password** (turn it on, save).
4. That's it — no further config needed here.

## 6. Turn on Firestore

1. In the sidebar, go to **Build → Firestore Database**.
2. Click **Create database**.
3. Choose a location close to you and your partner (pick one you're both
   reasonably close to — this affects latency for chat/signaling, not
   video quality, since video never touches Firestore).
4. Start in **production mode** (we'll deploy real rules next, so this is
   safe — don't use "test mode", which allows anyone to read/write
   everything).

## 7. Deploy Firestore security rules

This project ships with a real `firestore.rules` file (not
`allow read, write: if true`). Deploy it using the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # pick your project, give it an alias like "default"
firebase deploy --only firestore:rules,firestore:indexes
```

If you'd rather not install the CLI, you can paste the contents of
`firestore.rules` directly into **Firestore → Rules** in the console and
click **Publish** — but the CLI is recommended so future updates are one
command.

## 8. Set up the two-person allowlist

The app's *real* access control lives in Firestore, in a document at
`allowlist/config`, checked by every security rule. The frontend env var
(`VITE_ALLOWED_USERS_HINT`) is only a UX shortcut that shows a fast
"you're not invited" screen — it is **not** what actually protects your
data.

Create the document:

1. Firestore console → **Start collection** → collection ID `allowlist`.
2. Document ID: `config`.
3. Add a field: `emails` (type: **array**), with two string values — your
   email and your partner's email, exactly as they'll sign in with (Google
   account email, or the email you'll use for email/password sign-in).
4. Save.

Only these two emails will ever be allowed into any room.

## 9. TURN server configuration (important!)

**STUN alone is not enough.** STUN (the free Google server used by
default) only helps when at least one of you has a straightforward NAT.
The moment one of you is on a hotel/campus/office WiFi, mobile data, or a
symmetric NAT (common on carrier-grade NAT for mobile networks), calls
will fail to connect without a TURN server, which relays media when a
direct peer-to-peer path can't be found.

You have two practical options:

### Option A — Managed TURN (recommended, easiest)

Use a managed provider. All of these have a free or cheap tier suitable
for two people:

- **[Metered.ca](https://www.metered.ca/tools/openrelay/)** — has a free
  TURN tier, simplest to set up.
- **[Twilio Network Traversal Service](https://www.twilio.com/docs/stun-turn)**
- **[Cloudflare Calls TURN](https://developers.cloudflare.com/calls/turn/)**
- **[Xirsys](https://xirsys.com/)**

Sign up, create a TURN credential, and you'll get a URL, username, and
password/credential — these go into `VITE_TURN_URL`,
`VITE_TURN_USERNAME`, and `VITE_TURN_PASSWORD` in step 10.

### Option B — Run your own coturn server

If you have a cheap VPS (e.g. a $5/month DigitalOcean droplet):

```bash
sudo apt update && sudo apt install coturn -y
```

Edit `/etc/turnserver.conf`:

```
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
user=movienight:choose-a-strong-password
realm=yourdomain.com
total-quota=100
stale-nonce=600
cert=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
pkey=/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

Enable and start it:

```bash
sudo systemctl enable coturn
sudo systemctl restart coturn
```

Open ports `3478/udp`, `3478/tcp`, `5349/tcp` (and a UDP relay range,
typically `49152-65535`) in your firewall/security group.

Your env values would then be:
```
VITE_TURN_URL=turn:yourdomain.com:3478,turns:yourdomain.com:5349
VITE_TURN_USERNAME=movienight
VITE_TURN_PASSWORD=choose-a-strong-password
```

**If you skip this step**, the app still works — but only when you're both
on the same WiFi network. You'll see this clearly in the connection
debugger (candidate type will show `host` or `srflx` but connections will
fail whenever a relay is actually needed).

## 10. Environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in every value from steps 4, 8, and 9. Never
commit this file — it's already covered by `.gitignore`.

## 11. Run it locally

```bash
npm run dev
```

Open the printed `http://localhost:5173` URL, sign in with one of your two
allowlisted accounts, and click **Create Our Room**.

## 12. Testing with two computers

To actually test calling, you need two separate browser sessions signed in
as your two different allowlisted accounts (two computers, or one computer
plus your phone, or two browser profiles).

- **Same WiFi network**: should work even without TURN configured.
- **Different networks** (e.g. your phone on mobile data): this is the
  real test of your TURN setup. If the call never connects, open the
  hidden connection debugger (press **Ctrl/Cmd+Shift+D** while in a room)
  and check the ICE state and candidate type.
- To test from your phone against a locally-running dev server, this
  project's `vite.config.ts` already sets `server.host: true` — run
  `npm run dev`, then on your phone (same WiFi) open
  `http://YOUR-COMPUTER-LOCAL-IP:5173`.

## 13. Deployment

### Option A — Vercel (recommended for the frontend)

1. Push this project to a GitHub repo (private is fine).
2. Go to [vercel.com](https://vercel.com), import the repo.
3. In the Vercel project's **Environment Variables** settings, add every
   variable from your `.env.local`.
4. Deploy. Vercel will run `npm run build` automatically.
5. Set `VITE_APP_HOSTNAME` to your real Vercel domain and redeploy (used
   for the Twitch embed `parent` parameter).

### Option B — Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

`firebase.json` in this repo is already configured to serve `dist/` with
SPA rewrites.

### Either way — don't forget

- Add your production domain to Firebase Authentication's **authorized
  domains** (Authentication → Settings → Authorized domains).
- If you're using the optional browser extension, update its
  `externally_connectable` origin to your real deployed domain.

## 14. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Blank screen, console error about Firebase config | Missing/incorrect `.env.local` values | Re-check step 10 against your Firebase console |
| "This app is private" screen for an allowed email | `allowlist/config.emails` doesn't exactly match the sign-in email | Check for typos/casing in Firestore |
| Camera/mic permission errors | Browser blocked access | Click the camera icon in the address bar, allow, reload |
| Call never connects across networks | No TURN configured, or wrong credentials | Revisit step 9; check the debug panel's ICE state and candidate type |
| Call connects then drops after ~30s on flaky WiFi | Normal — the app auto-attempts an ICE restart; watch the "Reconnecting…" indicator | If it never recovers, check TURN server uptime |
| YouTube video won't sync | Ad-blockers sometimes block the YouTube IFrame API script | Temporarily disable extensions and retry |
| A pasted link "can't be played inside Movie Night" | Expected — that site doesn't allow embedding | Use the External Watch or tab-share fallback shown |
| Screen/tab share shows black video | The tab you shared is DRM-protected content the browser/OS refuses to capture | Expected and by design — we never attempt to bypass this |

## 15. Production checklist

- [ ] Firestore rules deployed (not left in "test mode")
- [ ] `allowlist/config` contains exactly your two emails
- [ ] TURN server configured and tested from two different networks
- [ ] `.env.local` never committed (`git status` shows it ignored)
- [ ] Production domain added to Firebase Auth authorized domains
- [ ] Ran `npm run build` locally with zero errors before deploying
- [ ] Tested: camera/mic denied → friendly error, not a crash
- [ ] Tested: refreshing mid-call as host and as partner
- [ ] Tested: pasting a direct .mp4 link, a YouTube link, and an
      arbitrary streaming site link (to see the External fallback)

## 16. Honest limitations

Read this section — it tells you exactly what's real, what needs your own
credentials, and what this app deliberately does not do.

### Fully implemented and real
- Two-person room creation/joining with an atomic Firestore transaction
  preventing a third person from joining.
- Raw WebRTC calling: real `RTCPeerConnection`, real Firestore-based
  signaling, real ICE restart on network loss, real device switching
  (camera/mic) via `replaceTrack`, real live `getStats()` feeding the
  connection quality badge and hidden debugger.
- URL resolution into DIRECT_MEDIA / YOUTUBE / SUPPORTED_EMBED / EXTERNAL,
  with honest fallback — nothing is faked as "working" when it isn't.
- Drift-corrected sync (soft playbackRate nudge vs. hard seek) with
  ping/pong clock-offset estimation, for DIRECT_MEDIA and YOUTUBE.
- Tab/window sharing via `getDisplayMedia`, added as a real extra WebRTC
  track.
- Firestore security rules enforcing membership, message ownership, and
  the 2-person cap server-side.
- Floating draggable camera bubbles that persist through fullscreen
  (the whole "stage" — player + bubbles — is what goes fullscreen, not
  just the raw `<video>`), chat, reactions, Miss You / Kiss, movie
  memories and stats.

### Requires you to bring your own credentials/services
- A Firebase project (free tier is enough for two people).
- A TURN server (see step 9) — **without this, cross-network calling will
  frequently fail.** This is not optional for a "just works" experience.

### Real browser/platform limitations (not bugs)
- **We cannot programmatically detect X-Frame-Options/CSP blocking.**
  Browsers deliberately don't expose this to embedding-page JavaScript.
  For the small allowlist of providers we know support embedding
  (Vimeo, Google Drive preview, Dailymotion, Twitch), we show the iframe
  and ask "can you see it?" rather than claiming certainty. Every other
  URL goes straight to honest External Watch mode.
- **Speaker (output device) selection** only works in Chromium-based
  browsers (Chrome, Edge) that support `setSinkId`; Firefox and Safari
  will simply not show that option.
- **Picture-in-picture** support varies by browser; not all browsers
  support the Document PiP API for arbitrary content.
- **Presence detection** uses Firestore document writes plus a
  `beforeunload` handler, which is best-effort — a true instant
  disconnect (e.g. yanking out an ethernet cable) is only detected once
  the WebRTC connection itself reports `disconnected`/`failed`, not via
  presence. A more robust solution would use Firebase Realtime Database's
  `onDisconnect()` hooks, which Firestore doesn't have an equivalent for —
  documented here as a known gap rather than silently accepted.
- **DASH playback** (`.mpd` links) is detected by the URL resolver but
  intentionally not wired to a player — it needs an additional library
  (dash.js or shaka-player) that isn't included. HLS (`.m3u8`) and
  MP4/WebM are fully working.
- **Tab-share of DRM-protected video** will show a black frame or throw —
  this is the browser's own content protection working as intended, and
  we do not attempt to defeat it.

### Not implemented (clearly marked, not faked)
- The `/extension` folder is a working **skeleton**, not a finished
  product — see `extension/README.md` for exactly what's left.
- Call recording — explicitly out of scope per the privacy requirements
  in this brief; camera/audio streams are never stored anywhere.
- Server-side push notifications for "your partner started a movie night"
  — would need a Cloud Function + FCM, not included.

---

Built for two. ❤️
