# hereherehere

> A friend-only Bluetooth-mesh status board for finding your people at a festival when cell and wifi are down.

Post where you'll be and until when. Your phone carries it through the crowd. Only friends you've added can read your heres — other phones can help carry them, but can't read them.

## Running it

This build runs in **Expo Go** (no native dev client needed yet — crypto is pure JS, storage/camera use Expo modules).

```sh
nvm use            # Node 24
npm install
npx expo start     # scan the QR with Expo Go on your iPhone
```

To feel the whole loop: **Settings → Add demo friends → Refresh the crowd**. The demo "friends" are throwaway identities whose heres are genuinely signed and sealed to your public key, so the real crypto + relay + board path all run.

## Architecture

```
src/
  app/          Expo Router screens (onboarding, board, compose, refresh, friends, settings)
  components/   UI primitives (Text, Button, Card, Chip, Avatar, HereCard, …)
  theme/        Warm pastel light/dark palettes, spacing, type scale
  crypto/       PRNG wiring, base64/utf8 codec, identity keys, seal/sign
  domain/       Pure logic: types, packets, board selectors, friend codes, autocomplete
  transport/    Transport interface + simulated mesh (MockTransport) + synthetic peers
  state/        Zustand store (persisted) + SecureStore secrets
  data/packs/   Event packs (Portola)
```

### The transport boundary

The product never knows whether packets travel over a simulated mesh or real Bluetooth. Everything above `src/transport/types.ts` (`Transport` interface) is transport-agnostic. Real BLE will implement the same interface in a custom dev client with no changes to product code.

### Security model

- Each device generates an Ed25519 signing keypair (its public key **is** the friend id) and an X25519 box keypair. Secret keys live only in `expo-secure-store` (keychain), never in app storage or any server.
- A here is JSON, sealed per-friend with `nacl.box` (only that friend can open it) and the packet is signed with Ed25519 (recipients verify the sender; replay is bounded by per-sender sequence numbers + expiry).
- Relays can dedupe and forward by `packetId`/`ttl` but cannot read contents or display unknown senders.

There is no account, no phone number, no backend, and no GPS.
