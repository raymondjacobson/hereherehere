import { DEFAULTS } from '../defaults';
import { clamp } from '../util/rng';

/**
 * Crowd-density awareness (spec §10.5). We track how many unique peers we've
 * seen recently; in a dense crowd FEWER devices should relay each object, in a
 * sparse area MORE should. This keeps propagation working at both house-party
 * and festival-stage scales without a broadcast storm.
 */
export class DensityTracker {
  private readonly peers = new Map<string, number>(); // peerId -> lastSeen

  constructor(private readonly windowMs: number = DEFAULTS.densityWindowMs) {}

  observe(peerId: string, now: number): void {
    this.peers.set(peerId, now);
  }

  uniquePeers(now: number): number {
    const cutoff = now - this.windowMs;
    let n = 0;
    for (const [id, last] of this.peers) {
      if (last > cutoff) n++;
      else this.peers.delete(id);
    }
    return n;
  }
}

/**
 * Probability that THIS device should relay an object, given crowd density.
 * Urgent objects relay more aggressively. Inversely proportional to density
 * with priority-specific floors/ceilings.
 */
export function relayProbability(priority: 'normal' | 'urgent', uniquePeers: number): number {
  const denom = Math.max(uniquePeers, 1);
  if (priority === 'urgent') return clamp(0.6, 0.95, 4 / denom);
  return clamp(0.15, 0.7, 3 / denom);
}
