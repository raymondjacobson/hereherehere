import { describe, expect, it } from 'vitest';
import { fakeMeta } from '../testutil/factories';
import { buildInventorySummary, summaryBloom } from './summary';
import { computeWantList } from './want';

describe('inventory summary', () => {
  it('captures latest-per-sender, receipts, and a membership bloom', () => {
    const metas = [
      fakeMeta({ envelope: { messageId: 'A1', senderSignPk: 'A', sequence: 1 } }),
      fakeMeta({ envelope: { messageId: 'A2', senderSignPk: 'A', sequence: 2 } }),
      fakeMeta({ envelope: { messageId: 'R1', senderSignPk: 'C', objectType: 'receipt' } }),
    ];
    const summary = buildInventorySummary(metas);

    const a = summary.latestBySender.find((s) => s.senderSignPk === 'A')!;
    expect(a.sequence).toBe(2);
    expect(summary.receiptMessageIds).toEqual(['R1']);
    expect(summary.objectCount).toBe(3);

    const bloom = summaryBloom(summary);
    expect(bloom.mayContain('A2')).toBe(true);
  });
});

describe('computeWantList', () => {
  it('wants newer-per-sender and unheld receipts', () => {
    const remote = buildInventorySummary([
      fakeMeta({ envelope: { messageId: 'rA2', senderSignPk: 'A', sequence: 2 } }),
      fakeMeta({ envelope: { messageId: 'rB1', senderSignPk: 'B', sequence: 1 } }),
      fakeMeta({ envelope: { messageId: 'rcpt1', senderSignPk: 'C', objectType: 'receipt' } }),
    ]);
    const local = [fakeMeta({ envelope: { messageId: 'lA1', senderSignPk: 'A', sequence: 1 } })];

    const want = computeWantList(remote, local);
    expect(want.latestForSenders.sort()).toEqual(['A', 'B']); // A newer, B unknown
    expect(want.messageIds).toEqual(['rcpt1']);
  });

  it('wants nothing when fully caught up', () => {
    const metas = [fakeMeta({ envelope: { messageId: 'X', senderSignPk: 'A', sequence: 5 } })];
    const remote = buildInventorySummary(metas);
    const want = computeWantList(remote, metas);
    expect(want.latestForSenders).toEqual([]);
    expect(want.messageIds).toEqual([]);
  });
});
