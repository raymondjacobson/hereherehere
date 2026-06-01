# hereherehere

> Find your friends at a festival when cell and wifi are down. Post where you'll be and until when — your phone carries it through the crowd, like a message in a bottle. Only friends you've added can read your heres.

This is **not** chat, not a map, not live tracking. The core object is a **here**: a short, timestamped, encrypted status. Full spec in [`hereherehere_prd.md`](./hereherehere_prd.md).

## Monorepo layout

```
apps/
  mobile/   Expo (SDK 56) + React Native app — the product
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

A zero-framework-ish static site (Vite, multipage). Two pages:

- **`/`** — landing page.
- **`/friend`** — friend-link target. Decodes the friend payload from the URL **fragment** (so it never reaches the host), shows who's adding you, then deep-links into the app or points to install instructions.

Deploy `apps/web/dist` to any static host (the plan is `hereherehere.app`).

## Privacy posture

No account, no phone number, no backend, no GPS. Private keys live only on-device. Friends you add can read your heres; other phones can only carry them.
