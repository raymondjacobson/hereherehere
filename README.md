<p align="center">
  <img src=".github/hero.png" alt="hereherehere" width="100%" />
</p>

<h1 align="center">hereherehere</h1>

<p align="center">
  <strong>Find your friends when service disappears.</strong><br/>
  A way to find each other in crowded places when cell service and wifi are down.
</p>

---

Post where you'll be and until when — your phone carries it through the crowd, like a message in a bottle. Only friends you've added can read it. No cell, wifi, or GPS needed.

This is **not** chat, not a map, not live tracking. The core object is a **here**: a short, timestamped, encrypted status saying where you'll be and until when. Full spec in [`hereherehere_prd.md`](./hereherehere_prd.md).

## How it works

1. **When service disappears** — hereherehere lets you share where you'll be when cell service and wifi are down. It uses nearby phones to carry your messages through a crowd, like a message in a bottle.
2. **Privacy first** — your messages are encrypted so only friends you've added can see them. Other phones may help carry them, but they can't read them.
3. **Open to broadcast** — phones can only pass messages while the app is open. During your event, we'll remind everyone around the same time to open hereherehere for a quick crowd refresh.

## Monorepo layout

```
apps/
  mobile/   Expo (SDK 54) + React Native app — the product
  web/      Static site for hereherehere.app — landing + /friend redirect
```

npm workspaces; one lockfile at the root.

## Getting started

Node 24 (via nvm). From the repo root:

```sh
npm install            # installs both workspaces

npm run mobile         # start the Expo dev server (scan with Expo Go)
npm run web            # start the static site dev server (Vite)
npm run web:build      # build the static site to apps/web/dist
```

### apps/mobile

The React Native app. Runs in **Expo Go** today — crypto is pure JS, the mesh is simulated behind a swappable `Transport` interface, and real BLE drops in later with no product changes. See [apps/mobile/README.md](./apps/mobile/README.md) for architecture and the security model.

### apps/web

A zero-framework-ish static site (Vite, multipage):

- **`/`** — landing page.
- **`/how`** — how it works.
- **`/friend`** — friend-link target. Decodes the friend payload from the URL **fragment** (so it never reaches the host), shows who's adding you, then deep-links into the app or points to install instructions.

Deployed to `hereherehere.app` (Cloudflare Pages).

## Privacy

No account, no phone number, no backend, no GPS. Private keys live only on-device. Friends you add can read your heres; other phones can only carry them — they can't read them.

## Support

This software is entirely free to use. Please consider [supporting it](https://donate.stripe.com/7sY6oG6Wi9DifGL9OTdAk00).
