# hereherehere — monorepo

npm-workspaces monorepo. See [README.md](./README.md) and the product spec [hereherehere_prd.md](./hereherehere_prd.md).

```
apps/mobile/   Expo SDK 56 + React Native app (the product). Its own CLAUDE.md/AGENTS.md.
apps/web/      Vite static site for hereherehere.app (landing + /friend redirect).
```

## Toolchain note

Node is installed via **nvm (v24.16.0) and is NOT on the default PATH** in non-interactive shells. Prefix shell commands with:

```sh
export NVM_DIR="$HOME/.nvm"; \. "$NVM_DIR/nvm.sh";
```

Full Xcode is installed but `xcode-select` points at CommandLineTools, so the iOS simulator isn't available without `sudo xcode-select -s /Applications/Xcode.app`. Preview the app via **Expo Go on a physical iPhone** instead.

## Commands (from repo root)

- `npm run mobile` — Expo dev server
- `npm run web` — Vite dev server for the static site
- `npm run web:build` — build static site to `apps/web/dist`

When working inside `apps/mobile`, read its `AGENTS.md` (Expo is version-sensitive).
