import { ByteReader, ByteWriter } from '../wire/buffer';

/**
 * Object fragmentation (spec §13). We keep objects under the MTU so this is
 * rarely needed, but implement it for safety. A FRAGMENT frame carries one
 * piece of a larger encoded object, keyed by the object's messageId.
 */
export type Fragment = {
  messageId: string;
  index: number;
  count: number;
  totalLen: number;
  bytes: Uint8Array;
};

export function fragment(messageId: string, payload: Uint8Array, maxFragmentBytes: number): Fragment[] {
  if (maxFragmentBytes <= 0) throw new RangeError('maxFragmentBytes must be positive');
  const count = Math.max(1, Math.ceil(payload.length / maxFragmentBytes));
  const out: Fragment[] = [];
  for (let i = 0; i < count; i++) {
    const start = i * maxFragmentBytes;
    out.push({
      messageId,
      index: i,
      count,
      totalLen: payload.length,
      bytes: payload.subarray(start, start + maxFragmentBytes),
    });
  }
  return out;
}

export function encodeFragment(f: Fragment): Uint8Array {
  return new ByteWriter()
    .lenStr(f.messageId)
    .varuint(f.index)
    .varuint(f.count)
    .varuint(f.totalLen)
    .lenBytes(f.bytes)
    .finish();
}

export function decodeFragment(bytes: Uint8Array): Fragment {
  const r = new ByteReader(bytes);
  const messageId = r.lenStr();
  const index = r.varuint();
  const count = r.varuint();
  const totalLen = r.varuint();
  const frag = Uint8Array.from(r.lenBytes());
  return { messageId, index, count, totalLen, bytes: frag };
}
