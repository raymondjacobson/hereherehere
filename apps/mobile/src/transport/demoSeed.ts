import { MeshEngine } from '@/mesh/engine';
import { PeerSession, pumpSessions } from '@/mesh/session/protocol';
import type { Friend, Here } from '@/domain/types';
import { HOUR, MIN } from '@/util/time';
import type { SyntheticPeer } from './syntheticPeers';

function peerFriend(peer: SyntheticPeer, now: number): Friend {
  return {
    id: peer.keys.signPk,
    displayName: peer.displayName,
    signPk: peer.keys.signPk,
    boxPk: peer.keys.boxPk,
    addedAt: now,
    colorIndex: 0,
  };
}

function peerEngine(peer: SyntheticPeer, now: number, friends: Friend[]): MeshEngine {
  return new MeshEngine(
    {
      displayName: peer.displayName,
      createdAt: now,
      signPk: peer.keys.signPk,
      boxPk: peer.keys.boxPk,
      signSk: peer.keys.signSk,
      boxSk: peer.keys.boxSk,
    },
    friends,
  );
}

/**
 * Simulate the crowd's blind-relay traffic: each demo peer posts statuses
 * addressed to *other* demo peers (not us), so when we ingest them the local
 * engine can only carry-and-forward them — it can't decrypt them. This is the
 * real "messages you're helping send" path, just seeded so the counters are
 * alive before there's an actual crowd. Returns how many were carried.
 */
export function seedRelayTraffic(local: MeshEngine, peers: SyntheticPeer[], now: number, rounds = 3): number {
  if (peers.length < 2) return 0;
  let carried = 0;
  for (let r = 0; r < rounds; r++) {
    peers.forEach((sender, i) => {
      const recipient = peers[(i + r + 1) % peers.length];
      if (recipient.keys.signPk === sender.keys.signPk) return;
      const engine = peerEngine(sender, now, [peerFriend(recipient, now)]);
      const here: Here = {
        id: `${sender.keys.signPk.slice(0, 8)}-relay-${r}-${i}-${now}`,
        authorId: sender.keys.signPk,
        whereText: 'somewhere in the crowd',
        startsAt: now,
        endsAt: now + 3 * HOUR,
        createdAt: now,
        sequence: r + 1,
      };
      // Sealed to `recipient` only → undecryptable to us → pure blind relay.
      for (const e of engine.postHere(here, now)) {
        if (local.ingest(e, now).status === 'cached') carried += 1;
      }
    });
  }
  return carried;
}

/**
 * Inject one fresh signed + sealed status from each demo peer into the local
 * engine, so demo friends show up on the board in **any** transport — including
 * real BLE, where there are no live synthetic peers to sync with. Each peer
 * runs a throwaway MeshEngine (friends with the local user) and posts a status,
 * which we pump into the local engine through the real anti-entropy path.
 *
 * In the simulated transport these same peers also keep updating live; in BLE
 * mode this is a one-time seed (frozen statuses) — enough to demo the board.
 */
export function seedDemoStatuses(
  local: MeshEngine,
  localFriend: Friend,
  peers: SyntheticPeer[],
  now: number,
): void {
  peers.forEach((peer, i) => {
    const engine = new MeshEngine(
      {
        displayName: peer.displayName,
        createdAt: now,
        signPk: peer.keys.signPk,
        boxPk: peer.keys.boxPk,
        signSk: peer.keys.signSk,
        boxSk: peer.keys.boxSk,
      },
      [localFriend],
    );
    const where = peer.placePool[i % Math.max(1, peer.placePool.length)] ?? 'the festival';
    const note = peer.notePool.find(Boolean) || undefined;
    const durMin = 45 + ((i * 17) % 60); // 45–104 min, deterministic-ish spread
    const here: Here = {
      id: `${peer.keys.signPk.slice(0, 8)}-${now}`,
      authorId: peer.keys.signPk,
      whereText: where,
      note,
      startsAt: now,
      endsAt: now + durMin * MIN,
      createdAt: now - (i % 5) * MIN,
      sequence: 1,
    };
    engine.postHere(here, now);
    pumpSessions(new PeerSession(local), new PeerSession(engine), now);
  });
}
