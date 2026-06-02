import { MeshEngine } from '@/mesh/engine';
import { PeerSession, pumpSessions } from '@/mesh/session/protocol';
import type { Friend, Here } from '@/domain/types';
import { MIN } from '@/util/time';
import type { SessionPhase, SessionProgress, SessionResult, Transport } from './types';
import type { SyntheticPeer } from './syntheticPeers';

const DURATIONS = [30, 60, 90, 120];

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

type PeerNode = { engine: MeshEngine; peer: SyntheticPeer };

/**
 * Simulated mesh. Each synthetic peer runs a REAL MeshEngine that has added the
 * local user as a friend, so peers produce genuinely signed + sealed statuses
 * and sync happens through the real PeerSession anti-entropy protocol — the
 * exact code path BLE will drive. Swappable for the BLE transport behind the
 * Transport interface.
 */
export class MockTransport implements Transport {
  private node: MeshEngine | null = null;
  private peers: PeerNode[] = [];
  private aborted = false;

  private nearby = 0;
  private nearbyHandlers = new Set<(n: number) => void>();
  private ambientTimer: ReturnType<typeof setInterval> | null = null;

  configure(node: MeshEngine) {
    this.node = node;
  }

  /** (Re)build synthetic peer engines, each friends with the local user. */
  setPeers(peers: SyntheticPeer[], local: Friend) {
    this.peers = peers.map((peer) => {
      const engine = new MeshEngine(
        {
          displayName: peer.displayName,
          createdAt: Date.now(),
          signPk: peer.keys.signPk,
          boxPk: peer.keys.boxPk,
          signSk: peer.keys.signSk,
          boxSk: peer.keys.boxSk,
        },
        [local],
      );
      return { engine, peer };
    });
  }

  // --- Ambient nearby-peer reporting --------------------------------------

  getNearby() {
    return this.nearby;
  }

  onNearby(handler: (n: number) => void) {
    this.nearbyHandlers.add(handler);
    handler(this.nearby);
    return () => this.nearbyHandlers.delete(handler);
  }

  private setNearby(n: number) {
    if (n === this.nearby) return;
    this.nearby = n;
    this.nearbyHandlers.forEach((h) => h(n));
  }

  private rollNearby() {
    const base = this.peers.length;
    if (base === 0) return this.setNearby(0);
    const lo = Math.floor(base * 0.4);
    this.setNearby(lo + Math.floor(Math.random() * (base - lo + 1)));
  }

  startAmbient() {
    if (this.ambientTimer) return;
    this.rollNearby();
    this.ambientTimer = setInterval(() => this.rollNearby(), 3500);
  }

  stopAmbient() {
    if (this.ambientTimer) {
      clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
  }

  stopSession() {
    this.aborted = true;
  }

  private peerPostsStatus(node: PeerNode, now: number) {
    const { engine, peer } = node;
    const whereText = peer.placePool[Math.floor(Math.random() * peer.placePool.length)] ?? 'the festival';
    const note = peer.notePool[Math.floor(Math.random() * peer.notePool.length)] || undefined;
    const durMin = DURATIONS[Math.floor(Math.random() * DURATIONS.length)];
    const seq = (engine.heres.get(engine.signPk)?.sequence ?? 0) + 1;
    const here: Here = {
      id: `${engine.signPk.slice(0, 8)}-${now}`,
      authorId: engine.signPk,
      whereText,
      note,
      startsAt: now,
      endsAt: now + durMin * MIN,
      createdAt: now - Math.floor(Math.random() * 6 * MIN),
      sequence: seq,
    };
    engine.postHere(here, now);
  }

  async runSession(
    durationMs: number,
    onProgress?: (p: SessionProgress) => void,
  ): Promise<SessionResult> {
    this.aborted = false;
    const node = this.node;
    if (!node) {
      onProgress?.({ phase: 'done', fraction: 1, peersSeen: 0 });
      return { updatedAuthors: [], peersSynced: 0 };
    }

    const now = Date.now();
    // A random subset of peers have a fresh status to share this session.
    const updating = this.peers.filter(() => Math.random() < 0.6);

    // Snapshot our board so we can report what changed.
    const before = new Map<string, number>();
    for (const [author, h] of node.heres) before.set(author, h.sequence);

    const steps: { phase: SessionPhase; ms: number }[] = [
      { phase: 'scanning', ms: durationMs * 0.25 },
      { phase: 'trading', ms: durationMs * 0.4 },
      { phase: 'checking', ms: durationMs * 0.2 },
      { phase: 'updating', ms: durationMs * 0.15 },
    ];

    let peersSeen = 0;
    let elapsed = 0;
    for (const step of steps) {
      const start = elapsed;
      const slice = 60;
      for (let t = 0; t < step.ms; t += slice) {
        if (this.aborted) break;
        await sleep(slice);
        elapsed += slice;

        // During trading, progressively meet + sync with each updating peer.
        if (step.phase === 'trading' && updating.length) {
          const idx = Math.floor((t / step.ms) * updating.length);
          if (idx >= peersSeen && peersSeen < updating.length) {
            const node2 = updating[peersSeen++];
            this.peerPostsStatus(node2, now);
            pumpSessions(new PeerSession(node), new PeerSession(node2.engine), now);
          }
        }
      }
      onProgress?.({
        phase: step.phase,
        fraction: Math.min(1, (start + step.ms) / durationMs),
        peersSeen,
      });
      if (this.aborted) break;
    }

    // Sync any remaining (non-"updating") peers quietly so relays still flow.
    if (!this.aborted) {
      for (const p of this.peers) {
        if (!updating.includes(p)) {
          pumpSessions(new PeerSession(node), new PeerSession(p.engine), now);
        }
      }
    }

    const updatedAuthors: string[] = [];
    for (const [author, h] of node.heres) {
      if (author === node.signPk) continue;
      if ((before.get(author) ?? -1) < h.sequence) updatedAuthors.push(author);
    }

    onProgress?.({ phase: 'done', fraction: 1, peersSeen });
    return { updatedAuthors, peersSynced: peersSeen };
  }
}

export const mockTransport = new MockTransport();
