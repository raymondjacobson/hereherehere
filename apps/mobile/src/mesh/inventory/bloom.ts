import { ByteReader, ByteWriter } from '../wire/buffer';

/**
 * Compact Bloom filter for inventory summaries (spec §9.1). Lets a peer learn
 * roughly which messageIds we already hold so it can skip sending them.
 *
 * Bloom filters can false-POSITIVE (say "present" when absent) but never
 * false-negative. So they are safe for "don't bother sending me this", but must
 * NEVER be used for local receive dedupe — that uses an exact set (DedupeSet).
 */

function fnv1a(str: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class BloomFilter {
  private readonly bits: Uint8Array;

  constructor(
    readonly mBits: number,
    readonly k: number,
    bits?: Uint8Array,
  ) {
    this.bits = bits ?? new Uint8Array(Math.ceil(mBits / 8));
  }

  /** Build a filter sized to hold ~expectedN items in `bytes` bytes. */
  static forCount(expectedN: number, bytes: number): BloomFilter {
    const mBits = bytes * 8;
    const n = Math.max(1, expectedN);
    const k = Math.max(1, Math.min(16, Math.round((mBits / n) * Math.LN2)));
    return new BloomFilter(mBits, k);
  }

  private indexes(item: string): number[] {
    // Double hashing (Kirsch–Mitzenmacher): h_i = h1 + i*h2 (mod m).
    const h1 = fnv1a(item, 0x811c9dc5);
    const h2 = (fnv1a(item, 0x7ee3623b) | 1) >>> 0; // force odd for better spread
    const out: number[] = [];
    for (let i = 0; i < this.k; i++) {
      // Wrap to unsigned 32-bit BEFORE the modulo: Math.imul is signed, so the
      // sum can go negative, which would yield an out-of-range bit index.
      const combined = (h1 + Math.imul(i, h2)) >>> 0;
      out.push(combined % this.mBits);
    }
    return out;
  }

  add(item: string): void {
    for (const idx of this.indexes(item)) {
      this.bits[idx >>> 3] |= 1 << (idx & 7);
    }
  }

  mayContain(item: string): boolean {
    for (const idx of this.indexes(item)) {
      if ((this.bits[idx >>> 3] & (1 << (idx & 7))) === 0) return false;
    }
    return true;
  }

  serialize(): Uint8Array {
    return new ByteWriter().varuint(this.mBits).u8(this.k).raw(this.bits).finish();
  }

  static deserialize(bytes: Uint8Array): BloomFilter {
    const r = new ByteReader(bytes);
    const mBits = r.varuint();
    const k = r.u8();
    const bits = r.raw(Math.ceil(mBits / 8));
    return new BloomFilter(mBits, k, Uint8Array.from(bits));
  }
}
