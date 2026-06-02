import { describe, expect, it } from 'vitest';
import { fakeMeta } from '../testutil/factories';
import { priorityClass, selectForWant, transferOrder, latestHereByAuthor } from './transferOrder';

const ctx = { ownSignPk: 'ME', friendSignPks: new Set(['FR']) };

describe('transferOrder priority', () => {
  it('orders own latest, friend latest, receipts, blind, superseded', () => {
    const ownLatest = fakeMeta({ envelope: { messageId: 'own', senderSignPk: 'ME', sequence: 2 } });
    const friendLatest = fakeMeta({ envelope: { messageId: 'fr', senderSignPk: 'FR', sequence: 2 } });
    const receipt = fakeMeta({ envelope: { messageId: 'rc', senderSignPk: 'X', objectType: 'receipt' } });
    const blind = fakeMeta({ envelope: { messageId: 'bl', senderSignPk: 'Z', sequence: 1 } });
    const superseded = fakeMeta({ envelope: { messageId: 'sup', senderSignPk: 'Q' }, superseded: true });

    const ordered = transferOrder([blind, superseded, receipt, friendLatest, ownLatest], ctx).map(
      (m) => m.messageId,
    );
    expect(ordered).toEqual(['own', 'fr', 'rc', 'bl', 'sup']);
  });

  it('classifies only the newest here from an author as that author latest', () => {
    const metas = [
      fakeMeta({ envelope: { messageId: 'ME1', senderSignPk: 'ME', sequence: 1 } }),
      fakeMeta({ envelope: { messageId: 'ME2', senderSignPk: 'ME', sequence: 2 } }),
    ];
    const latest = latestHereByAuthor(metas);
    expect(latest.get('ME')).toBe('ME2');
    expect(priorityClass(metas[1], ctx, latest)).toBe(0); // own latest
    expect(priorityClass(metas[0], ctx, latest)).toBe(3); // older own -> not latest
  });
});

describe('selectForWant', () => {
  const now = 5_000;

  it('fulfills wanted ids + latest-per-wanted-sender + always our own latest', () => {
    const local = [
      fakeMeta({ envelope: { messageId: 'own', senderSignPk: 'ME', sequence: 9 } }),
      fakeMeta({ envelope: { messageId: 'frNew', senderSignPk: 'FR', sequence: 4 } }),
      fakeMeta({ envelope: { messageId: 'frOld', senderSignPk: 'FR', sequence: 1 } }),
      fakeMeta({ envelope: { messageId: 'rc', objectType: 'receipt', senderSignPk: 'X' } }),
    ];
    const want = {
      messageIds: ['rc'],
      latestForSenders: ['FR'],
      maxObjects: 32,
      maxBytes: 16_384,
    };
    const ids = selectForWant(local, want, ctx, now).map((m) => m.messageId);
    expect(ids).toContain('own'); // own latest always
    expect(ids).toContain('frNew'); // latest for wanted sender
    expect(ids).toContain('rc'); // explicitly wanted
    expect(ids).not.toContain('frOld'); // not latest, not requested
  });

  it('respects the maxObjects bound', () => {
    const local = Array.from({ length: 10 }, (_, i) =>
      fakeMeta({ envelope: { messageId: `m${i}`, senderSignPk: `S${i}`, sequence: 1 } }),
    );
    const want = {
      messageIds: local.map((m) => m.messageId),
      latestForSenders: [],
      maxObjects: 3,
      maxBytes: 1_000_000,
    };
    expect(selectForWant(local, want, ctx, now).length).toBe(3);
  });

  it('skips objects that would blow the byte budget', () => {
    const local = [
      fakeMeta({ envelope: { messageId: 'big' }, sizeBytes: 2_000 }),
      fakeMeta({ envelope: { messageId: 'small' }, sizeBytes: 100 }),
    ];
    const want = { messageIds: ['big', 'small'], latestForSenders: [], maxObjects: 32, maxBytes: 500 };
    const ids = selectForWant(local, want, ctx, now).map((m) => m.messageId);
    expect(ids).toContain('small');
    expect(ids).not.toContain('big');
  });
});
