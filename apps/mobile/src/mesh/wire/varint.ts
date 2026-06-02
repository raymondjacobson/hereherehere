/**
 * Unsigned LEB128 varints.
 *
 * Bitwise ops in JS are 32-bit, but our timestamps are millisecond epochs
 * (~1.7e12), so we use plain arithmetic to stay correct up to
 * Number.MAX_SAFE_INTEGER (2^53 - 1).
 */

export function writeVarUint(out: number[], value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`varuint must be a non-negative finite number, got ${value}`);
  }
  if (value > Number.MAX_SAFE_INTEGER) {
    throw new RangeError(`varuint exceeds safe integer range: ${value}`);
  }
  let v = value;
  do {
    let byte = v % 128;
    v = Math.floor(v / 128);
    if (v > 0) byte |= 0x80;
    out.push(byte);
  } while (v > 0);
}

export function readVarUint(buf: Uint8Array, offset: number): { value: number; next: number } {
  let result = 0;
  let scale = 1;
  let pos = offset;
  for (;;) {
    if (pos >= buf.length) throw new RangeError('varuint: unexpected end of buffer');
    const byte = buf[pos++];
    result += (byte & 0x7f) * scale;
    if ((byte & 0x80) === 0) break;
    scale *= 128;
    if (scale > Number.MAX_SAFE_INTEGER) throw new RangeError('varuint: encoding too long');
  }
  return { value: result, next: pos };
}
