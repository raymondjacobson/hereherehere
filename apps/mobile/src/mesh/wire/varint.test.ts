import { describe, expect, it } from 'vitest';
import { readVarUint, writeVarUint } from './varint';

function roundTrip(value: number): number {
  const out: number[] = [];
  writeVarUint(out, value);
  const { value: decoded, next } = readVarUint(Uint8Array.from(out), 0);
  expect(next).toBe(out.length);
  return decoded;
}

describe('varuint', () => {
  it('round-trips small and boundary values', () => {
    for (const v of [0, 1, 127, 128, 255, 256, 16383, 16384, 0xffff, 0x10000]) {
      expect(roundTrip(v)).toBe(v);
    }
  });

  it('round-trips millisecond-epoch timestamps (above 2^32)', () => {
    const ts = 1_900_000_000_000; // ~2030 in ms
    expect(roundTrip(ts)).toBe(ts);
    expect(roundTrip(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('rejects negative, non-finite, and out-of-range values', () => {
    expect(() => writeVarUint([], -1)).toThrow(RangeError);
    expect(() => writeVarUint([], 2 ** 60)).toThrow(RangeError);
    expect(() => writeVarUint([], Number.NaN)).toThrow(RangeError);
  });

  it('throws on a truncated varint', () => {
    expect(() => readVarUint(Uint8Array.from([0x80]), 0)).toThrow(RangeError);
  });

  it('decodes from a non-zero offset', () => {
    const out: number[] = [0xaa, 0xbb];
    writeVarUint(out, 300);
    const { value } = readVarUint(Uint8Array.from(out), 2);
    expect(value).toBe(300);
  });
});
