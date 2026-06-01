import { buildPacketsForHere } from '@/domain/packet';
import type { Friend, Here, LocalIdentity, RelayPacket } from '@/domain/types';
import { MIN } from '@/util/time';
import type { InboundHandler, SessionPhase, SessionProgress, Transport } from './types';
import type { SyntheticPeer } from './syntheticPeers';

const DURATIONS = [30, 60, 90, 120];

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
      const start = elapsed;
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
      }
      onProgress?.({
        phase: step.phase,
        fraction: Math.min(1, (start + step.ms) / durationMs),
        peersSeen,
      });
      if (this.aborted) break;
    }

    onProgress?.({ phase: 'done', fraction: 1, peersSeen });
    return received;
  }
}

export const mockTransport = new MockTransport();
