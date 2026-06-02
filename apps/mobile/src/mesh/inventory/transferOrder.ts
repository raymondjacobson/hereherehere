import { isLive, isRelayable } from '../model/envelope';
import { ObjectMeta } from '../model/objectMeta';
import { isNewer } from '../resolve/latestStatus';
import { WantList } from './want';

/**
 * Transfer prioritization (spec §9.3). Send in this order so the freshest,
 * most useful objects go first and never get blocked by stale ones:
 *   0. our own latest status
 *   1. latest status from a known friend
 *   2. delivery receipts
 *   3. other statuses, low relay-count first (blind objects that have spread
 *      least are the most worth carrying)
 *   5. superseded / older — last
 */
export type TransferContext = {
  ownSignPk?: string;
  friendSignPks?: ReadonlySet<string>;
};

/** author signPk -> messageId of their newest 'here' in this set. */
export function latestHereByAuthor(metas: ObjectMeta[]): Map<string, string> {
  const best = new Map<string, { messageId: string; sequence: number; createdAt: number }>();
  for (const m of metas) {
    if (m.envelope.objectType !== 'here') continue;
    const e = m.envelope;
    const entry = { messageId: m.messageId, sequence: e.sequence, createdAt: e.createdAt };
    const cur = best.get(e.senderSignPk);
    if (!cur || isNewer(entry, cur)) best.set(e.senderSignPk, entry);
  }
  const out = new Map<string, string>();
  for (const [author, v] of best) out.set(author, v.messageId);
  return out;
}

export function priorityClass(
  meta: ObjectMeta,
  ctx: TransferContext,
  latest: Map<string, string>,
): number {
  if (meta.superseded) return 5;
  const e = meta.envelope;
  if (e.objectType === 'receipt') return 2;
  const isLatest = latest.get(e.senderSignPk) === meta.messageId;
  if (e.objectType === 'here' && isLatest) {
    if (e.senderSignPk === ctx.ownSignPk) return 0;
    if (ctx.friendSignPks?.has(e.senderSignPk)) return 1;
  }
  return 3;
}

export function transferOrder(metas: ObjectMeta[], ctx: TransferContext): ObjectMeta[] {
  const latest = latestHereByAuthor(metas);
  return [...metas].sort((a, b) => {
    const ca = priorityClass(a, ctx, latest);
    const cb = priorityClass(b, ctx, latest);
    if (ca !== cb) return ca - cb;
    // within a class: fewer relays first (spread the rarest), then newer first
    if (a.relayCount !== b.relayCount) return a.relayCount - b.relayCount;
    if (a.envelope.createdAt !== b.envelope.createdAt) {
      return b.envelope.createdAt - a.envelope.createdAt;
    }
    return a.messageId < b.messageId ? -1 : a.messageId > b.messageId ? 1 : 0;
  });
}

/**
 * Choose which local objects to send in response to a peer's WantList: the
 * specific ids they asked for, our latest for each sender they want, plus our
 * own latest (always sent first, spec §22.6). Bounded by the want limits.
 */
export function selectForWant(
  localMetas: ObjectMeta[],
  want: WantList,
  ctx: TransferContext,
  now: number,
): ObjectMeta[] {
  const live = localMetas.filter((m) => isLive(m.envelope, now));
  const latest = latestHereByAuthor(live);
  const wantedIds = new Set(want.messageIds);
  const wantedSenders = new Set(want.latestForSenders);

  const chosen = new Map<string, ObjectMeta>();
  for (const m of live) {
    const e = m.envelope;
    const isOwnLatest = e.senderSignPk === ctx.ownSignPk && latest.get(e.senderSignPk) === m.messageId;
    const isWantedLatest = wantedSenders.has(e.senderSignPk) && latest.get(e.senderSignPk) === m.messageId;
    if (wantedIds.has(m.messageId) || isWantedLatest || isOwnLatest) {
      chosen.set(m.messageId, m);
    }
  }

  const ordered = transferOrder([...chosen.values()], ctx);

  const out: ObjectMeta[] = [];
  let bytes = 0;
  for (const m of ordered) {
    if (out.length >= want.maxObjects) break;
    if (bytes + m.sizeBytes > want.maxBytes) continue;
    out.push(m);
    bytes += m.sizeBytes;
  }
  return out;
}

/**
 * Choose which local objects to send to a specific peer, driven by the peer's
 * inventory bloom (`peerHas`) — we send what they lack. Two tiers:
 *   1. ADDRESSED to this peer (recipientId === peerSignPk) — they can decrypt;
 *      send while the object is still live (even if relay TTL is exhausted,
 *      final delivery still matters).
 *   2. BLIND relay objects (addressed to someone else) — they carry these
 *      onward; only send while still relayable, rarest (low relay count) first.
 *
 * This is what makes both addressed delivery and blind relay work over one
 * anti-entropy exchange (spec §10, Milestone 5).
 */
export function selectForPeer(
  localMetas: ObjectMeta[],
  peerHas: (messageId: string) => boolean,
  peerSignPk: string,
  ctx: TransferContext,
  now: number,
  limits: { maxObjects: number; maxBytes: number },
): ObjectMeta[] {
  const addressed: ObjectMeta[] = [];
  const blind: ObjectMeta[] = [];
  for (const m of localMetas) {
    if (m.superseded) continue;
    if (peerHas(m.messageId)) continue;
    if (m.envelope.recipientId === peerSignPk) {
      if (isLive(m.envelope, now)) addressed.push(m);
    } else if (isRelayable(m.envelope, now)) {
      blind.push(m);
    }
  }

  const orderedAddressed = transferOrder(addressed, ctx);
  blind.sort((a, b) =>
    a.relayCount !== b.relayCount
      ? a.relayCount - b.relayCount
      : b.envelope.createdAt - a.envelope.createdAt,
  );

  const out: ObjectMeta[] = [];
  let bytes = 0;
  for (const m of [...orderedAddressed, ...blind]) {
    if (out.length >= limits.maxObjects) break;
    if (bytes + m.sizeBytes > limits.maxBytes) continue;
    out.push(m);
    bytes += m.sizeBytes;
  }
  return out;
}
