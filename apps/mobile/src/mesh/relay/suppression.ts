import { DEFAULTS } from '../defaults';

/**
 * Broadcast-storm suppression (spec §10.6). If we've heard the same messageId
 * from peers many times in a short window, others clearly already have it, so
 * we stop actively relaying it. This is one of the most important
 * anti-flood mechanisms.
 *
 * "Within the window" means age strictly less than windowMs, so a hearing
 * exactly windowMs old has aged out.
 */
export class SuppressionTracker {
  private readonly heard = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number = DEFAULTS.heardSuppressionWindowMs,
    private readonly threshold: number = DEFAULTS.heardSuppressionThreshold,
  ) {}

  /** Record one hearing of `id` at `now`. */
  record(id: string, now: number): void {
    const list = this.heard.get(id) ?? [];
    list.push(now);
    this.heard.set(id, this.prune(list, now));
  }

  heardCount(id: string, now: number): number {
    const list = this.heard.get(id);
    if (!list) return 0;
    const live = this.prune(list, now);
    this.heard.set(id, live);
    return live.length;
  }

  shouldSuppress(id: string, now: number): boolean {
    return this.heardCount(id, now) >= this.threshold;
  }

  /** Drop tracking state for ids with no live hearings (call periodically). */
  gc(now: number): void {
    for (const [id, list] of this.heard) {
      const live = this.prune(list, now);
      if (live.length === 0) this.heard.delete(id);
      else this.heard.set(id, live);
    }
  }

  private prune(list: number[], now: number): number[] {
    const cutoff = now - this.windowMs;
    return list.filter((t) => t > cutoff);
  }
}
