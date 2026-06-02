import { bytesToUtf8, utf8ToBytes } from '@/crypto/codec';
import { readVarUint, writeVarUint } from './varint';

/**
 * Minimal big-endian binary writer/reader for canonical frame encoding.
 *
 * Length-prefixed fields use varints; fixed integers use big-endian. Strings
 * are length-prefixed UTF-8. Base64 key/ciphertext fields ride as strings in
 * v1 (correctness first); switching them to raw bytes is a later size win.
 */
export class ByteWriter {
  private bytes: number[] = [];

  u8(v: number): this {
    this.bytes.push(v & 0xff);
    return this;
  }

  u16(v: number): this {
    this.bytes.push((v >>> 8) & 0xff, v & 0xff);
    return this;
  }

  u32(v: number): this {
    this.bytes.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
    return this;
  }

  varuint(v: number): this {
    writeVarUint(this.bytes, v);
    return this;
  }

  raw(b: Uint8Array): this {
    for (let i = 0; i < b.length; i++) this.bytes.push(b[i]);
    return this;
  }

  lenBytes(b: Uint8Array): this {
    this.varuint(b.length);
    return this.raw(b);
  }

  lenStr(s: string): this {
    return this.lenBytes(utf8ToBytes(s));
  }

  get length(): number {
    return this.bytes.length;
  }

  finish(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

export class ByteReader {
  private pos = 0;

  constructor(private readonly buf: Uint8Array) {}

  private need(n: number): void {
    if (this.pos + n > this.buf.length) {
      throw new RangeError('ByteReader: unexpected end of buffer');
    }
  }

  u8(): number {
    this.need(1);
    return this.buf[this.pos++];
  }

  u16(): number {
    this.need(2);
    return ((this.buf[this.pos++] << 8) | this.buf[this.pos++]) >>> 0;
  }

  u32(): number {
    this.need(4);
    return (
      (this.buf[this.pos++] * 0x1000000 +
        (this.buf[this.pos++] << 16) +
        (this.buf[this.pos++] << 8) +
        this.buf[this.pos++]) >>>
      0
    );
  }

  varuint(): number {
    const { value, next } = readVarUint(this.buf, this.pos);
    this.pos = next;
    return value;
  }

  raw(n: number): Uint8Array {
    this.need(n);
    const slice = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return slice;
  }

  lenBytes(): Uint8Array {
    return this.raw(this.varuint());
  }

  lenStr(): string {
    return bytesToUtf8(this.lenBytes());
  }

  get remaining(): number {
    return this.buf.length - this.pos;
  }

  atEnd(): boolean {
    return this.pos >= this.buf.length;
  }
}
