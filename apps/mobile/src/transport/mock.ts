import { buildPacketsForHere } from '@/domain/packet';
import type { Friend, Here, LocalIdentity, RelayPacket } from '@/domain/types';
import { MIN } from '@/util/time';
import type { InboundHandler, SessionPhase, SessionProgress, Transport } from './types';
import type { SyntheticPeer } from './syntheticPeers';

const DURATIONS = [30, 60, 90, 120];

/** Length of one crowd-refresh session. Shared by the ambient board indicator
 *  and the full-screen notification ceremony so they stay in lockstep. */
export const SESSION_MS = 25_000;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Simulated mesh. Generates real signed + sealed packets from synthetic peers
 * addressed to the local user, so the whole crypto/relay/board path runs for
 * real. Swappable for a BLE implementation behind the Transport interface.
 */
export class MockTransport implements Transport {
  private local: { signPk: string; boxPk: string } | null = null;
  private peers: SyntheticPeer[] = [];
  private outgoing: RelayPacket[] = [];
  private handlers = new Set<InboundHandler>();
  private aborted = false;
  private seq = Math.floor(Date.now() / 1000);

  private nearby = 0;
  private nearbyHandlers = new Set<(n: number) => void>();
  private ambientTimer: ReturnType<typeof setInterval> | null = null;
  private trickleTimer: ReturnType<typeof setInterval> | null = null;

  configure(local: { signPk: string; boxPk: string }) {
    this.local = local;
  }

  setPeers(peers: SyntheticPeer[]) {
    this.peers = peers;
  }

  enqueue(packets: RelayPacket[]) {
    this.outgoing.push(...packets);
  }

  onInbound(handler: InboundHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  stopSession() {
    this.aborted = true;
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
    // Simulate phones drifting in and out of range. Only the synthetic demo
    // peers count as nearby in this build, so the indicator stays honest: it
    // reads 0 until demo friends are added.
    const base = this.peers.length;
    if (base === 0) return this.setNearby(0);
    const lo = Math.floor(base * 0.4);
    this.setNearby(lo + Math.floor(Math.random() * (base - lo + 1)));
  }

  startAmbient() {
    if (this.ambientTimer) return;
    this.rollNearby();
    this.ambientTimer = setInterval(() => this.rollNearby(), 3500);
    // While the app is open we're always listening: occasionally a friend's
    // fresh message trickles in on its own (no manual refresh required).
    this.trickleTimer = setInterval(() => this.trickle(), 8000);
  }

  stopAmbient() {
    if (this.ambientTimer) {
      clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    if (this.trickleTimer) {
      clearInterval(this.trickleTimer);
      this.trickleTimer = null;
    }
  }

  /** Occasionally deliver one peer's fresh message — the always-on live sync. */
  private trickle() {
    if (!this.peers.length || Math.random() > 0.5) return;
    const peer = this.peers[Math.floor(Math.random() * this.peers.length)];
    this.emit(this.packetsFromPeer(peer, Date.now()));
  }

  /**
   * A high-intensity scan burst (pull-to-refresh): immediately pull fresh
   * messages from a handful of nearby peers. Resolves when the burst settles.
   */
  async boost(): Promise<number> {
    const pool = [...this.peers];
    const k = Math.min(pool.length, 1 + Math.floor(Math.random() * 3));
    for (let i = 0; i < k; i++) {
      const peer = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      this.emit(this.packetsFromPeer(peer, Date.now()));
    }
    await sleep(1100);
    return k;
  }

  private emit(packets: RelayPacket[]) {
    if (packets.length) this.handlers.forEach((h) => h(packets));
  }

  private makeHere(peer: SyntheticPeer, now: number): Here {
    const whereText = peer.placePool[Math.floor(Math.random() * peer.placePool.length)] ?? 'the festival';
    const note = peer.notePool[Math.floor(Math.random() * peer.notePool.length)] || undefined;
    const durMin = DURATIONS[Math.floor(Math.random() * DURATIONS.length)];
    return {
      id: `${peer.keys.signPk.slice(0, 8)}-${this.seq}`,
      authorId: peer.keys.signPk,
      whereText,
      note,
      startsAt: now,
      endsAt: now + durMin * MIN,
      createdAt: now - Math.floor(Math.random() * 6 * MIN), // posted a few min ago
      sequence: this.seq++,
    };
  }

  private packetsFromPeer(peer: SyntheticPeer, now: number): RelayPacket[] {
    if (!this.local) return [];
    const here = this.makeHere(peer, now);
    const identity: LocalIdentity & { signSk: string; boxSk: string } = {
      displayName: peer.displayName,
      signPk: peer.keys.signPk,
      boxPk: peer.keys.boxPk,
      signSk: peer.keys.signSk,
      boxSk: peer.keys.boxSk,
      createdAt: now,
    };
    const recipient: Friend = {
      id: this.local.signPk,
      displayName: 'me',
      signPk: this.local.signPk,
      boxPk: this.local.boxPk,
      addedAt: now,
      colorIndex: 0,
    };
    return buildPacketsForHere(here, identity, [recipient]);
  }

  async runSession(
    durationMs: number,
    onProgress?: (p: SessionProgress) => void,
  ): Promise<RelayPacket[]> {
    this.aborted = false;
    const received: RelayPacket[] = [];
    const steps: { phase: SessionPhase; ms: number }[] = [
      { phase: 'scanning', ms: durationMs * 0.25 },
      { phase: 'trading', ms: durationMs * 0.4 },
      { phase: 'checking', ms: durationMs * 0.2 },
      { phase: 'updating', ms: durationMs * 0.15 },
    ];

    // Decide which peers have a fresh update this session.
    const updating = this.peers
      .filter(() => Math.random() < 0.6)
      .slice(0, Math.max(1, Math.min(3, this.peers.length)));
    let peersSeen = 0;

    let elapsed = 0;
    for (const step of steps) {
      const slice = 60; // ms granularity
      for (let t = 0; t < step.ms; t += slice) {
        if (this.aborted) break;
        await sleep(slice);
        elapsed += slice;

        // During trading, reveal peers + emit their packets progressively.
        if (step.phase === 'trading' && updating.length) {
          const idx = Math.floor(((t / step.ms) * updating.length));
          if (idx >= peersSeen && peersSeen < updating.length) {
            const peer = updating[peersSeen++];
            const packets = this.packetsFromPeer(peer, Date.now());
            received.push(...packets);
            this.emit(packets);
          }
        }

        // Report progress on every tick so the countdown ticks down smoothly
        // instead of jumping once per phase.
        onProgress?.({
          phase: step.phase,
          fraction: Math.min(1, elapsed / durationMs),
          peersSeen,
        });
      }
      if (this.aborted) break;
    }

    onProgress?.({ phase: 'done', fraction: 1, peersSeen });
    return received;
  }
}

export const mockTransport = new MockTransport();
