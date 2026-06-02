import { describe, expect, it } from 'vitest';
import { decodeFragment, encodeFragment, fragment } from './fragmenter';
import { Reassembler } from './reassembler';

function payload(n: number): Uint8Array {
  return new Uint8Array(n).map((_, i) => i & 0xff);
}

describe('fragment + reassemble', () => {
  it('round-trips at MTU, MTU+1, and exact-multiple sizes', () => {
    const mtu = 100;
    for (const size of [mtu, mtu + 1, mtu * 3, 1, mtu * 3 - 1]) {
      const data = payload(size);
      const frags = fragment('mid', data, mtu);
      const r = new Reassembler({ maxFragments: 64, timeoutMs: 30_000 });
      let out: Uint8Array | null = null;
      for (const f of frags) out = r.add(f, 0) ?? out;
      expect(out).not.toBeNull();
      expect(Array.from(out!)).toEqual(Array.from(data));
    }
  });

  it('encodes/decodes a fragment frame payload', () => {
    const [f] = fragment('mid', payload(10), 100);
    const decoded = decodeFragment(encodeFragment(f));
    expect(decoded.messageId).toBe('mid');
    expect(decoded.index).toBe(0);
    expect(decoded.count).toBe(1);
    expect(Array.from(decoded.bytes)).toEqual(Array.from(f.bytes));
  });

  it('is idempotent under duplicate and out-of-order fragments', () => {
    const data = payload(250);
    const frags = fragment('mid', data, 100); // 3 fragments
    const r = new Reassembler({ maxFragments: 64, timeoutMs: 30_000 });
    expect(r.add(frags[2], 0)).toBeNull();
    expect(r.add(frags[2], 0)).toBeNull(); // duplicate
    expect(r.add(frags[0], 0)).toBeNull();
    const out = r.add(frags[1], 0);
    expect(out).not.toBeNull();
    expect(Array.from(out!)).toEqual(Array.from(data));
  });

  it('rejects an object claiming too many fragments', () => {
    const r = new Reassembler({ maxFragments: 4, timeoutMs: 30_000 });
    const frags = fragment('mid', payload(500), 100); // 5 fragments
    expect(() => r.add(frags[0], 0)).toThrow(RangeError);
  });

  it('drops a partial object after the reassembly timeout', () => {
    const data = payload(250);
    const frags = fragment('mid', data, 100);
    const r = new Reassembler({ maxFragments: 64, timeoutMs: 30_000 });
    r.add(frags[0], 0);
    r.gc(40_000); // past timeout -> buffer dropped
    expect(r.pending).toBe(0);
    // a late-arriving final fragment starts a new (still incomplete) buffer
    expect(r.add(frags[1], 41_000)).toBeNull();
  });
});
