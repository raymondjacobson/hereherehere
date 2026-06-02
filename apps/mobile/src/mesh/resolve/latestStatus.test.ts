import { describe, expect, it } from 'vitest';
import { isNewer } from './latestStatus';

describe('isNewer conflict resolution', () => {
  it('treats any candidate as newer than nothing', () => {
    expect(isNewer({ sequence: 1, createdAt: 1 }, null)).toBe(true);
    expect(isNewer({ sequence: 1, createdAt: 1 }, undefined)).toBe(true);
  });

  it('higher sequence wins regardless of createdAt', () => {
    // candidate has LOWER createdAt but HIGHER sequence -> still newer
    expect(isNewer({ sequence: 5, createdAt: 10 }, { sequence: 4, createdAt: 9999 })).toBe(true);
    expect(isNewer({ sequence: 3, createdAt: 9999 }, { sequence: 4, createdAt: 10 })).toBe(false);
  });

  it('breaks sequence ties by createdAt', () => {
    expect(isNewer({ sequence: 4, createdAt: 20 }, { sequence: 4, createdAt: 10 })).toBe(true);
    expect(isNewer({ sequence: 4, createdAt: 10 }, { sequence: 4, createdAt: 20 })).toBe(false);
  });

  it('breaks full ties by lexicographic messageId', () => {
    const base = { sequence: 4, createdAt: 10 };
    expect(isNewer({ ...base, messageId: 'b' }, { ...base, messageId: 'a' })).toBe(true);
    expect(isNewer({ ...base, messageId: 'a' }, { ...base, messageId: 'b' })).toBe(false);
  });

  it('is stable on exact ties (no flapping)', () => {
    const x = { sequence: 4, createdAt: 10, messageId: 'same' };
    expect(isNewer(x, x)).toBe(false);
  });

  it('does not let a future createdAt override a higher sequence (clock skew)', () => {
    // a skewed peer sends an older status stamped in the future
    const current = { sequence: 9, createdAt: 1000 };
    const skewed = { sequence: 8, createdAt: 9_999_999_999 };
    expect(isNewer(skewed, current)).toBe(false);
  });
});
