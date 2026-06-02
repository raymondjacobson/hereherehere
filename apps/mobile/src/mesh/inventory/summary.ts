import { DEFAULTS } from '../defaults';
import { ObjectMeta } from '../model/objectMeta';
import { isNewer } from '../resolve/latestStatus';
import { BloomFilter } from './bloom';

/**
 * Inventory summary (spec §9.1) — what we hold, compactly. A peer uses it to
 * decide what to send us:
 *  - `bloom` of all our messageIds (skip what we already have)
 *  - `latestBySender` so the peer can send a newer status it has for an author
 *  - explicit small id lists for high-priority objects (urgent, receipts)
 */
export type SenderLatest = {
  senderSignPk: string;
  sequence: number;
  createdAt: number;
  messageId: string;
};

export type InventorySummary = {
  bloom: Uint8Array; // serialized BloomFilter of messageIds
  latestBySender: SenderLatest[];
  receiptMessageIds: string[];
  objectCount: number;
};

export function buildInventorySummary(
  metas: ObjectMeta[],
  opts?: { bloomBytes?: number },
): InventorySummary {
  const bloom = BloomFilter.forCount(
    Math.max(1, metas.length),
    opts?.bloomBytes ?? DEFAULTS.bloomFilterBytes,
  );
  const latest = new Map<string, SenderLatest>();
  const receiptMessageIds: string[] = [];

  for (const m of metas) {
    bloom.add(m.messageId);
    const e = m.envelope;
    if (e.objectType === 'here') {
      const entry: SenderLatest = {
        senderSignPk: e.senderSignPk,
        sequence: e.sequence,
        createdAt: e.createdAt,
        messageId: m.messageId,
      };
      const cur = latest.get(e.senderSignPk);
      if (!cur || isNewer(entry, cur)) latest.set(e.senderSignPk, entry);
    } else if (e.objectType === 'receipt') {
      receiptMessageIds.push(m.messageId);
    }
  }

  return {
    bloom: bloom.serialize(),
    latestBySender: [...latest.values()],
    receiptMessageIds,
    objectCount: metas.length,
  };
}

/** Deserialize the bloom in a summary (peers send the bytes, not the object). */
export function summaryBloom(summary: InventorySummary): BloomFilter {
  return BloomFilter.deserialize(summary.bloom);
}
