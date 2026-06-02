/**
 * Exact LRU dedupe set keyed by messageId (spec §9, §10.1 step 5-6).
 *
 * Bloom filters are only for compact inventory summaries — local receive
 * dedupe must be EXACT to avoid dropping a real object on a false positive.
 * A Map preserves insertion order, which we use as recency.
 */
export class DedupeSet {
  private readonly ids = new Map<string, true>();

  constructor(private readonly capacity: number) {}

  get size(): number {
    return this.ids.size;
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  /**
   * Record that we've seen `id`. Returns true if it is NEW (not seen before),
   * false if it was already known. Touching a known id refreshes its recency
   * so frequently-seen ids survive eviction.
   */
  markSeen(id: string): boolean {
    if (this.ids.has(id)) {
      this.ids.delete(id);
      this.ids.set(id, true); // move to most-recent
      return false;
    }
    this.ids.set(id, true);
    if (this.ids.size > this.capacity) {
      const oldest = this.ids.keys().next().value;
      if (oldest !== undefined) this.ids.delete(oldest);
    }
    return true;
  }
}
