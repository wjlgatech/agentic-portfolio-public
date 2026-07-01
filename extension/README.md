# Agentic Portfolio — LinkedIn Importer (browser extension)

The **one-click** way to pull your LinkedIn posts into your portfolio. No DevTools,
no console paste, no credentials, no server. A button appears on your LinkedIn
activity page; click it and your posts land in your portfolio's import flow.

This exists because LinkedIn's activity feed is **login-walled** — a server can't read
it. The agent that does the work therefore lives *in your own logged-in browser*
(that's what a content script is), so your session and your data never leave your
machine. It's the [console harvester](../public/linkedin-harvest.js) turned into a
button.

## Why an extension and not a "computer-use agent"

A server-side computer-use agent would need your LinkedIn **credentials** and would
trip LinkedIn's anti-bot defenses (account-ban risk), cost minutes per run, and be
*more* brittle (it reads pixels). This extension runs as **you**, in your session,
using the same self-healing DOM signals — faster, safer, and zero-trust. It honors the
portfolio's own principles: **own your data** (12X #5), **agent-native surfaces**
(#3), **verify don't vibe** (#4 — it self-diagnoses instead of failing silent), and
**build in the open** (#6 — the source is right here, loaded unpacked, not a black box).

## Install (load unpacked — 30 seconds)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select this `extension/` folder.
4. (Optional, for a fork) edit `background.js` → `PORTFOLIO_URL` and the portfolio
   `matches` in `manifest.json` to your own deploy origin.

## Use

1. Go to your LinkedIn activity page: `https://www.linkedin.com/in/<you>/recent-activity/all/`.
2. Two buttons appear bottom-right:
   - **⚡ Send latest posts** — fast (~3s): grabs the most recent screens (recent posts are
     at the top). Re-click anytime as a 1-click **“load just what's new”** — import de-dupes.
   - **⬆ Send ALL history (slower)** — scrolls your whole feed for a first full import.
   Either harvests + opens your portfolio.
3. In your portfolio, make sure you're in **owner mode** (🔒 badge, bottom-left). The
   posts import automatically, de-duplicated by URL and title. If you're not unlocked
   yet, you'll see a prompt; unlock and they apply instantly.

## How the handoff works (all local)

```
LinkedIn tab (content-linkedin.js)        Portfolio tab (content-portfolio.js)
   harvest in your session                   read chrome.storage.local
   → chrome.storage.local  ──────────────▶   → page localStorage["portfolio-pending-import"]
   → ask background to open portfolio        → Portfolio.tsx imports (owner-gated)
```

No `fetch`, no external endpoint. The only permissions are `storage` (the local
stash) and `tabs` (to open your portfolio). The collection algorithm is the shared,
unit-tested [`harvest-core.js`](harvest-core.js) (`node ../scripts/test-harvest.mjs`).

## If it ever collects 0 posts

LinkedIn changed its markup. The button copies a **DIAGNOSTIC** to your clipboard —
paste it to your portfolio agent (or the developer) and the harvester gets fixed from
that data. It won't pretend it worked.
