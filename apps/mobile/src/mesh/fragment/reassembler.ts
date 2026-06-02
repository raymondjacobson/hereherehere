import { Fragment } from './fragmenter';

/**
 * Fragment reassembly (spec §13). Buffers fragments per messageId until the
 * object is complete, then returns the full payload. Guards:
 *  - reject objects claiming more than `maxFragments` pieces (no allocation)
 *  - drop buffers older than `timeoutMs` (no memory leak from partial objects)
 *  - never return a partial object; duplicates and out-of-order are idempotent
 */
export type ReassemblerOptions = {
  maxFragments: number;
  timeoutMs: number;
};

type Buffer = {
  count: number;
  totalLen: number;
  pieces: Map<number, Uint8Array>;
  firstSeenAt: number;
};

export class Reassembler {
  private readonly buffers = new Map<string, Buffer>();

  constructor(private readonly opts: ReassemblerOptions) {}

  /**
   * Add a fragment. Returns the complete payload once all pieces have arrived,
   * otherwise null. Throws if the fragment is malformed or over the limit.
   */
  add(frag: Fragment, now: number): Uint8Array | null {
    if (frag.count <= 0 || frag.index < 0 || frag.index >= frag.count) {
      throw new RangeError('fragment index/count out of range');
    }
    if (frag.count > this.opts.maxFragments) {
      throw new RangeError(`fragment count ${frag.count} exceeds max ${this.opts.maxFragments}`);
    }

    let buf = this.buffers.get(frag.messageId);
    // If the existing buffer has timed out, start fresh.
    if (buf && now - buf.firstSeenAt >= this.opts.timeoutMs) {
      this.buffers.delete(frag.messageId);
      buf = undefined;
    }
    if (!buf) {
      buf = { count: frag.count, totalLen: frag.totalLen, pieces: new Map(), firstSeenAt: now };
      this.buffers.set(frag.messageId, buf);
    }

    // Ignore inconsistent metadata for an in-flight object.
    if (buf.count !== frag.count || buf.totalLen !== frag.totalLen) {
      throw new RangeError('fragment metadata mismatch for in-flight object');
    }

    buf.pieces.set(frag.index, Uint8Array.from(frag.bytes)); // duplicate -> overwrite (idempotent)
    if (buf.pieces.size < buf.count) return null;

    const out = new Uint8Array(buf.totalLen);
    let offset = 0;
    for (let i = 0; i < buf.count; i++) {
      const piece = buf.pieces.get(i)!;
      out.set(piece, offset);
      offset += piece.length;
    }
    this.buffers.delete(frag.messageId);
    return out;
  }

  /** Drop partial buffers that have exceeded the reassembly timeout. */
  gc(now: number): void {
    for (const [id, buf] of this.buffers) {
      if (now - buf.firstSeenAt >= this.opts.timeoutMs) this.buffers.delete(id);
    }
  }

  get pending(): number {
    return this.buffers.size;
  }
}
