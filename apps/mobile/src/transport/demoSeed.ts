import { MeshEngine } from '@/mesh/engine';
import { PeerSession, pumpSessions } from '@/mesh/session/protocol';
import type { Friend, Here } from '@/domain/types';
import { MIN } from '@/util/time';
import type { SyntheticPeer } from './syntheticPeers';

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
