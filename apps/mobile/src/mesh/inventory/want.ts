import { DEFAULTS } from '../defaults';
import { ObjectMeta } from '../model/objectMeta';
import { isNewer } from '../resolve/latestStatus';
import { InventorySummary } from './summary';

/**
 * Want list (spec §9.2) — a bounded request computed from a peer's inventory
 * summary and what we already hold. We ask for:
 *  - specific messageIds the peer advertised (receipts) that we lack
 *  - the peer's latest status for any sender where theirs is newer than ours
 */
export type WantList = {
  messageIds: string[];
  latestForSenders: string[]; // senderSignPks
  maxObjects: number;
  maxBytes: number;
};

export function computeWantList(
  remote: InventorySummary,
  localMetas: ObjectMeta[],
  limits?: { maxObjects?: number; maxBytes?: number },
): WantList {
  const haveIds = new Set(localMetas.map((m) => m.messageId));

  // Local latest 'here' per sender, to compare against the peer's.
  const localLatest = new Map<string, { sequence: number; createdAt: number; messageId: string }>();
  for (const m of localMetas) {
    if (m.envelope.objectType !== 'here') continue;
    const e = m.envelope;
    const entry = { sequence: e.sequence, createdAt: e.createdAt, messageId: m.messageId };
    const cur = localLatest.get(e.senderSignPk);
    if (!cur || isNewer(entry, cur)) localLatest.set(e.senderSignPk, entry);
  }

  const latestForSenders: string[] = [];
  for (const s of remote.latestBySender) {
    if (isNewer(s, localLatest.get(s.senderSignPk) ?? null)) {
      latestForSenders.push(s.senderSignPk);
    }
  }

  const messageIds = remote.receiptMessageIds.filter((id) => !haveIds.has(id));

  return {
    messageIds,
    latestForSenders,
    maxObjects: limits?.maxObjects ?? DEFAULTS.maxWantObjectsPerSession,
    maxBytes: limits?.maxBytes ?? DEFAULTS.maxWantBytesPerSession,
  };
}
