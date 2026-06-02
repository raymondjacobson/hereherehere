import { DEFAULTS } from '../defaults';
import { isLive, isRelayable } from '../model/envelope';
import { ObjectMeta } from '../model/objectMeta';
import { isNewer } from '../resolve/latestStatus';

/**
 * Store-carry-forward relay cache (spec §11). Bounded by BOTH object count and
 * total bytes. When over budget, evicts in a defined order and never drops the
 * objects we must always keep (our own latest, the latest per friend, and
 * receipts addressed to us).
 *
 * Supersede: inserting a newer status from an author marks that author's older
 * statuses superseded, so they sink in the eviction order and stop relaying.
 */
export type CacheLimits = {
  maxObjects: number;
  maxBytes: number;
};

export type CachePins = {
  /** Our own signing key — our latest status is never evicted. */
  ownSignPk?: string;
  /** Friend signing keys — the latest status from each is never evicted. */
  friendSignPks?: ReadonlySet<string>;
};

export type InsertResult = {
  /** true if a new entry was stored (vs a duplicate that was merged). */
  stored: boolean;
  /** the resident meta for this messageId after the operation. */
  meta: ObjectMeta;
  /** true if the insert was rejected outright (e.g. already expired). */
  rejected?: boolean;
};

export class RelayCache {
  private readonly entries = new Map<string, ObjectMeta>();
  private bytes = 0;

  constructor(
    private readonly limits: CacheLimits = {
      maxObjects: DEFAULTS.maxCacheObjects,
      maxBytes: DEFAULTS.maxCacheBytes,
    },
    private pins: CachePins = {},
  ) {}

  get size(): number {
    return this.entries.size;
  }

  get byteSize(): number {
    return this.bytes;
  }

  setPins(pins: CachePins): void {
    this.pins = pins;
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  get(id: string): ObjectMeta | undefined {
    return this.entries.get(id);
  }

  all(): ObjectMeta[] {
    return [...this.entries.values()];
  }

  /** Entries still worth relaying right now (live, in-budget, not superseded). */
  forRelay(now: number): ObjectMeta[] {
    return this.all().filter((m) => !m.superseded && isRelayable(m.envelope, now));
  }

  remove(id: string): void {
    const existing = this.entries.get(id);
    if (existing) {
      this.bytes -= existing.sizeBytes;
      this.entries.delete(id);
    }
  }

  /**
   * Insert (or merge a duplicate of) an object. A duplicate bumps heardCount and
   * lastHeardAt. Already-dead objects (past expiresAt) are rejected. After
   * insertion the cache applies supersede and evicts down to budget.
   */
  insert(meta: ObjectMeta, now: number): InsertResult {
    const existing = this.entries.get(meta.messageId);
    if (existing) {
      existing.heardCount += 1;
      existing.lastHeardAt = now;
      // upgrade trust if this copy was decryptable/verified
      existing.decryptable = existing.decryptable || meta.decryptable;
      existing.verified = existing.verified || meta.verified;
      return { stored: false, meta: existing };
    }

    if (!isLive(meta.envelope, now)) {
      return { stored: false, meta, rejected: true };
    }

    this.entries.set(meta.messageId, meta);
    this.bytes += meta.sizeBytes;
    this.applySupersede(meta);
    this.evictToBudget(now);
    return { stored: this.entries.has(meta.messageId), meta };
  }

  /** Mark older 'here' objects from the same author as superseded by `meta`. */
  private applySupersede(meta: ObjectMeta): void {
    if (meta.envelope.objectType !== 'here') return;
    const author = meta.envelope.senderSignPk;
    for (const other of this.entries.values()) {
      if (other === meta) continue;
      if (other.envelope.objectType !== 'here') continue;
      if (other.envelope.senderSignPk !== author) continue;
      if (other.envelope.recipientId !== meta.envelope.recipientId) continue;
      if (isNewer(toVersioned(meta), toVersioned(other))) other.superseded = true;
      else if (isNewer(toVersioned(other), toVersioned(meta))) meta.superseded = true;
    }
  }

  /** Evict until within both the object-count and byte budgets. */
  evictToBudget(now: number): void {
    if (this.size <= this.limits.maxObjects && this.bytes <= this.limits.maxBytes) return;

    const pinned = this.pinnedIds();
    const candidates = this.all()
      .filter((m) => !pinned.has(m.messageId))
      .sort((a, b) => compareEvictability(a, b, now));

    let i = 0;
    while (
      (this.size > this.limits.maxObjects || this.bytes > this.limits.maxBytes) &&
      i < candidates.length
    ) {
      this.remove(candidates[i++].messageId);
    }
  }

  /** messageIds that must never be evicted (always-keep rules). */
  private pinnedIds(): Set<string> {
    const keep = new Set<string>();
    const { ownSignPk, friendSignPks } = this.pins;

    // latest 'here' per author we care about
    const latestByAuthor = new Map<string, ObjectMeta>();
    for (const m of this.entries.values()) {
      if (m.envelope.objectType !== 'here') continue;
      const author = m.envelope.senderSignPk;
      const watched = author === ownSignPk || friendSignPks?.has(author);
      if (!watched) continue;
      const cur = latestByAuthor.get(author);
      if (!cur || isNewer(toVersioned(m), toVersioned(cur))) latestByAuthor.set(author, m);
    }
    for (const m of latestByAuthor.values()) keep.add(m.messageId);

    // receipts addressed to us that are still live
    if (ownSignPk) {
      for (const m of this.entries.values()) {
        if (m.envelope.objectType === 'receipt' && m.envelope.recipientId === ownSignPk) {
          keep.add(m.messageId);
        }
      }
    }
    return keep;
  }
}

function toVersioned(m: ObjectMeta) {
  return {
    sequence: m.envelope.sequence,
    createdAt: m.envelope.createdAt,
    messageId: m.messageId,
  };
}

/**
 * Eviction ordering (spec §11): the entry that sorts first is evicted first.
 *   1. past relayUntil (no longer relay-worthy)
 *   2. invalid (decryptable but failed verification)
 *   3. superseded
 *   4. higher heardCount
 *   5. higher relayCount
 *   6. lower keep-priority (blind < receipt < verified here)
 *   7. larger size
 *   8. older firstSeenAt
 */
export function compareEvictability(a: ObjectMeta, b: ObjectMeta, now: number): number {
  const key = (m: ObjectMeta): number[] => [
    isRelayable(m.envelope, now) ? 1 : 0, // dead-for-relay first
    m.decryptable && !m.verified ? 0 : 1, // invalid first
    m.superseded ? 0 : 1, // superseded first
    -m.heardCount, // higher heard first
    -m.relayCount, // higher relayed first
    keepPriority(m), // lower priority first
    -m.sizeBytes, // larger first
    m.firstSeenAt, // older first
  ];
  const ka = key(a);
  const kb = key(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return ka[i] - kb[i];
  }
  return 0;
}

function keepPriority(m: ObjectMeta): number {
  if (m.verified && m.decryptable) return 2; // a status/receipt we can read & trust
  if (m.envelope.objectType === 'receipt') return 1;
  return 0; // opaque blind-relay object
}
