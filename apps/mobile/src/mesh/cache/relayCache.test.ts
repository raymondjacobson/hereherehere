import { describe, expect, it } from 'vitest';
import { fakeMeta } from '../testutil/factories';
import { compareEvictability, RelayCache } from './relayCache';

const LIMITS = { maxObjects: 100, maxBytes: 1_000_000 };
const NOW = 5_000;

describe('RelayCache insert + dedupe', () => {
  it('merges a duplicate and bumps heardCount', () => {
    const c = new RelayCache(LIMITS);
    const m = fakeMeta({ envelope: { messageId: 'dup' } });
    expect(c.insert(m, NOW).stored).toBe(true);
    const second = c.insert(fakeMeta({ envelope: { messageId: 'dup' } }), NOW + 1);
    expect(second.stored).toBe(false);
    expect(second.meta.heardCount).toBe(2);
    expect(c.size).toBe(1);
  });

  it('rejects an object already past expiresAt', () => {
    const c = new RelayCache(LIMITS);
    const r = c.insert(fakeMeta({ envelope: { expiresAt: 1_000 } }), NOW);
    expect(r.rejected).toBe(true);
    expect(c.size).toBe(0);
  });

  it('tracks byte size and frees it on remove', () => {
    const c = new RelayCache(LIMITS);
    c.insert(fakeMeta({ envelope: { messageId: 'x' }, sizeBytes: 300 }), NOW);
    expect(c.byteSize).toBe(300);
    c.remove('x');
    expect(c.byteSize).toBe(0);
  });
});

describe('RelayCache supersede', () => {
  it('marks an older status from the same author superseded (newer inserted first)', () => {
    const c = new RelayCache(LIMITS);
    c.insert(fakeMeta({ envelope: { messageId: 'new', senderSignPk: 'A', sequence: 2 } }), NOW);
    c.insert(fakeMeta({ envelope: { messageId: 'old', senderSignPk: 'A', sequence: 1 } }), NOW);
    expect(c.get('old')!.superseded).toBe(true);
    expect(c.get('new')!.superseded).toBe(false);
  });

  it('handles the supersede race (older inserted first)', () => {
    const c = new RelayCache(LIMITS);
    c.insert(fakeMeta({ envelope: { messageId: 'old', senderSignPk: 'A', sequence: 1 } }), NOW);
    c.insert(fakeMeta({ envelope: { messageId: 'new', senderSignPk: 'A', sequence: 2 } }), NOW);
    expect(c.get('old')!.superseded).toBe(true);
    expect(c.get('new')!.superseded).toBe(false);
  });

  it('does not supersede across different authors', () => {
    const c = new RelayCache(LIMITS);
    c.insert(fakeMeta({ envelope: { messageId: 'a', senderSignPk: 'A', sequence: 1 } }), NOW);
    c.insert(fakeMeta({ envelope: { messageId: 'b', senderSignPk: 'B', sequence: 2 } }), NOW);
    expect(c.get('a')!.superseded).toBe(false);
  });
});

describe('compareEvictability ordering', () => {
  const more = (a: ReturnType<typeof fakeMeta>, b: ReturnType<typeof fakeMeta>) =>
    compareEvictability(a, b, NOW) < 0; // a evicted before b

  it('evicts relay-dead before live', () => {
    const dead = fakeMeta({ envelope: { relayUntil: 1_000 } }); // < NOW
    const live = fakeMeta({ envelope: { relayUntil: 1_000_000 } });
    expect(more(dead, live)).toBe(true);
  });

  it('evicts invalid (decryptable but unverified) before valid', () => {
    const invalid = fakeMeta({ decryptable: true, verified: false });
    const valid = fakeMeta({ decryptable: true, verified: true });
    expect(more(invalid, valid)).toBe(true);
  });

  it('evicts superseded before current', () => {
    expect(more(fakeMeta({ superseded: true }), fakeMeta({ superseded: false }))).toBe(true);
  });

  it('evicts higher heardCount, then higher relayCount, then larger, then older', () => {
    expect(more(fakeMeta({ heardCount: 9 }), fakeMeta({ heardCount: 1 }))).toBe(true);
    expect(
      more(fakeMeta({ heardCount: 1, relayCount: 9 }), fakeMeta({ heardCount: 1, relayCount: 1 })),
    ).toBe(true);
    expect(more(fakeMeta({ sizeBytes: 900 }), fakeMeta({ sizeBytes: 100 }))).toBe(true);
    expect(more(fakeMeta({ firstSeenAt: 1 }), fakeMeta({ firstSeenAt: 100 }))).toBe(true);
  });
});

describe('RelayCache eviction within budget', () => {
  it('evicts by object count', () => {
    const c = new RelayCache({ maxObjects: 2, maxBytes: 1_000_000 });
    c.insert(fakeMeta({ envelope: { messageId: 'a' }, firstSeenAt: 1 }), NOW);
    c.insert(fakeMeta({ envelope: { messageId: 'b' }, firstSeenAt: 2 }), NOW);
    c.insert(fakeMeta({ envelope: { messageId: 'c' }, firstSeenAt: 3 }), NOW);
    expect(c.size).toBe(2);
    expect(c.has('a')).toBe(false); // oldest evicted
  });

  it('evicts by byte budget independently of count', () => {
    const c = new RelayCache({ maxObjects: 1000, maxBytes: 500 });
    c.insert(fakeMeta({ envelope: { messageId: 'a' }, sizeBytes: 300, firstSeenAt: 1 }), NOW);
    c.insert(fakeMeta({ envelope: { messageId: 'b' }, sizeBytes: 300, firstSeenAt: 2 }), NOW);
    expect(c.byteSize).toBeLessThanOrEqual(500);
    expect(c.has('a')).toBe(false);
  });

  it('never evicts our own latest, even when largest + oldest', () => {
    const c = new RelayCache({ maxObjects: 2, maxBytes: 1_000_000 }, { ownSignPk: 'ME' });
    // own latest: oldest + largest -> would normally be evicted first
    c.insert(
      fakeMeta({
        envelope: { messageId: 'mine', senderSignPk: 'ME', sequence: 1 },
        firstSeenAt: 0,
        sizeBytes: 10_000,
      }),
      NOW,
    );
    c.insert(fakeMeta({ envelope: { messageId: 'f1' }, firstSeenAt: 10 }), NOW);
    c.insert(fakeMeta({ envelope: { messageId: 'f2' }, firstSeenAt: 20 }), NOW);
    c.insert(fakeMeta({ envelope: { messageId: 'f3' }, firstSeenAt: 30 }), NOW);
    expect(c.has('mine')).toBe(true);
    expect(c.size).toBeLessThanOrEqual(2);
  });

  it('keeps the latest status per friend', () => {
    const c = new RelayCache(
      { maxObjects: 2, maxBytes: 1_000_000 },
      { friendSignPks: new Set(['FR']) },
    );
    c.insert(fakeMeta({ envelope: { messageId: 'fr-old', senderSignPk: 'FR', sequence: 1 } }), NOW);
    c.insert(fakeMeta({ envelope: { messageId: 'fr-new', senderSignPk: 'FR', sequence: 2 } }), NOW);
    c.insert(fakeMeta({ envelope: { messageId: 'pad1' }, firstSeenAt: 50 }), NOW);
    c.insert(fakeMeta({ envelope: { messageId: 'pad2' }, firstSeenAt: 60 }), NOW);
    expect(c.has('fr-new')).toBe(true); // latest friend status pinned
  });

  it('forRelay excludes superseded and expired objects', () => {
    const c = new RelayCache(LIMITS);
    c.insert(fakeMeta({ envelope: { messageId: 'new', senderSignPk: 'A', sequence: 2 } }), NOW);
    c.insert(fakeMeta({ envelope: { messageId: 'old', senderSignPk: 'A', sequence: 1 } }), NOW);
    c.insert(fakeMeta({ envelope: { messageId: 'dead', relayUntil: 1_000 } }), NOW);
    const relayable = c.forRelay(NOW).map((m) => m.messageId);
    expect(relayable).toContain('new');
    expect(relayable).not.toContain('old');
    expect(relayable).not.toContain('dead');
  });
});
