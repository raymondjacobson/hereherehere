import { describe, expect, it } from 'vitest';
import { BloomFilter } from './bloom';

describe('BloomFilter', () => {
  it('never reports a false negative', () => {
    const b = BloomFilter.forCount(200, 512);
    const items = Array.from({ length: 200 }, (_, i) => `msg-${i}`);
    items.forEach((x) => b.add(x));
    for (const x of items) expect(b.mayContain(x)).toBe(true);
  });

  it('keeps the false-positive rate low when properly sized', () => {
    const b = BloomFilter.forCount(200, 512);
    for (let i = 0; i < 200; i++) b.add(`present-${i}`);
    let fp = 0;
    const trials = 2000;
    for (let i = 0; i < trials; i++) if (b.mayContain(`absent-${i}`)) fp++;
    expect(fp / trials).toBeLessThan(0.05);
  });

  it('round-trips through serialize/deserialize', () => {
    const b = BloomFilter.forCount(50, 128);
    ['a', 'b', 'c'].forEach((x) => b.add(x));
    const restored = BloomFilter.deserialize(b.serialize());
    expect(restored.mBits).toBe(b.mBits);
    expect(restored.k).toBe(b.k);
    for (const x of ['a', 'b', 'c']) expect(restored.mayContain(x)).toBe(true);
  });
});
