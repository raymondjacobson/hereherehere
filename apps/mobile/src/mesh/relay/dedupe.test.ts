import { describe, expect, it } from 'vitest';
import { DedupeSet } from './dedupe';

describe('DedupeSet', () => {
  it('reports new vs already-seen ids', () => {
    const d = new DedupeSet(10);
    expect(d.markSeen('a')).toBe(true);
    expect(d.markSeen('a')).toBe(false);
    expect(d.has('a')).toBe(true);
    expect(d.has('b')).toBe(false);
  });

  it('evicts the oldest id at capacity', () => {
    const d = new DedupeSet(3);
    d.markSeen('a');
    d.markSeen('b');
    d.markSeen('c');
    d.markSeen('d'); // evicts 'a'
    expect(d.has('a')).toBe(false);
    expect(d.has('d')).toBe(true);
    expect(d.size).toBe(3);
    // re-seeing an evicted id counts as new again
    expect(d.markSeen('a')).toBe(true);
  });

  it('refreshes recency on touch so hot ids survive', () => {
    const d = new DedupeSet(3);
    d.markSeen('a');
    d.markSeen('b');
    d.markSeen('c');
    d.markSeen('a'); // touch 'a' -> now most-recent, 'b' is oldest
    d.markSeen('d'); // evicts 'b'
    expect(d.has('a')).toBe(true);
    expect(d.has('b')).toBe(false);
  });
});
