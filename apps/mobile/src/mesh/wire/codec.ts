import { ByteReader, ByteWriter } from './buffer';
import { crc32 } from './crc32';
import { FRAME_VERSION, Frame, FrameError, SESSION_ID_BYTES } from './frames';

/**
 * Frame wire format (big-endian, CRC-checked):
 *
 *   version:u8 | type:u8 | seq:u16 | sessionId:8 | payloadLen:varuint | payload | crc32:u32
 *
 * The crc32 covers everything before it. Decoding an unknown frame `type` is
 * fine here — the payload stays opaque and the session layer decides how to
 * respond — so this stays forward-compatible.
 */

// version(1) + type(1) + seq(2) + sessionId(8) + payloadLen(>=1) + crc32(4)
const MIN_FRAME_LEN = 1 + 1 + 2 + SESSION_ID_BYTES + 1 + 4;

function normalizeSessionId(sid: Uint8Array): Uint8Array {
  if (sid.length === SESSION_ID_BYTES) return sid;
  const out = new Uint8Array(SESSION_ID_BYTES);
  out.set(sid.subarray(0, SESSION_ID_BYTES));
  return out;
}

export function encodeFrame(frame: Omit<Frame, 'version'> & { version?: number }): Uint8Array {
  const body = new ByteWriter()
    .u8(frame.version ?? FRAME_VERSION)
    .u8(frame.type)
    .u16(frame.seq)
    .raw(normalizeSessionId(frame.sessionId))
    .varuint(frame.payload.length)
    .raw(frame.payload)
    .finish();

  return new ByteWriter().raw(body).u32(crc32(body)).finish();
}

export function decodeFrame(bytes: Uint8Array): Frame {
  if (bytes.length < MIN_FRAME_LEN) {
    throw new FrameError(`frame too short: ${bytes.length} bytes`);
  }

  const body = bytes.subarray(0, bytes.length - 4);
  const expected = crc32(body);
  const got =
    (bytes[bytes.length - 4] * 0x1000000 +
      (bytes[bytes.length - 3] << 16) +
      (bytes[bytes.length - 2] << 8) +
      bytes[bytes.length - 1]) >>>
    0;
  if (got !== expected) {
    throw new FrameError('frame crc mismatch (corrupt or truncated)');
  }

  const r = new ByteReader(body);
  const version = r.u8();
  const type = r.u8();
  const seq = r.u16();
  const sessionId = r.raw(SESSION_ID_BYTES);
  const payloadLen = r.varuint();
  const payload = r.raw(payloadLen);
  if (!r.atEnd()) {
    throw new FrameError('frame has trailing bytes after payload');
  }
  return { version, type, seq, sessionId, payload };
}
