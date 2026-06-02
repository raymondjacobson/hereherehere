import { describe, expect, it } from 'vitest';
import { decodeFrame, encodeFrame } from './codec';
import { FrameError, FrameType } from './frames';

const sid = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]);

describe('frame codec', () => {
  it('round-trips a frame of every type', () => {
    for (const type of Object.values(FrameType).filter((v) => typeof v === 'number') as number[]) {
      const payload = Uint8Array.from([type, 0xde, 0xad, 0xbe, 0xef]);
      const decoded = decodeFrame(encodeFrame({ type, seq: 42, sessionId: sid, payload }));
      expect(decoded.type).toBe(type);
      expect(decoded.seq).toBe(42);
      expect(Array.from(decoded.sessionId)).toEqual(Array.from(sid));
      expect(Array.from(decoded.payload)).toEqual(Array.from(payload));
    }
  });

  it('round-trips an empty payload', () => {
    const decoded = decodeFrame(
      encodeFrame({ type: FrameType.GOODBYE, seq: 0, sessionId: sid, payload: new Uint8Array(0) }),
    );
    expect(decoded.payload.length).toBe(0);
  });

  it('round-trips a large payload (multi-byte length prefix)', () => {
    const payload = new Uint8Array(5000).map((_, i) => i & 0xff);
    const decoded = decodeFrame(
      encodeFrame({ type: FrameType.ENVELOPE, seq: 1, sessionId: sid, payload }),
    );
    expect(decoded.payload.length).toBe(5000);
    expect(Array.from(decoded.payload)).toEqual(Array.from(payload));
  });

  it('rejects a frame with a corrupted byte (crc mismatch)', () => {
    const frame = encodeFrame({
      type: FrameType.HELLO,
      seq: 7,
      sessionId: sid,
      payload: Uint8Array.from([9, 9, 9]),
    });
    frame[5] ^= 0xff; // flip a byte inside the body
    expect(() => decodeFrame(frame)).toThrow(FrameError);
  });

  it('rejects a truncated frame', () => {
    const frame = encodeFrame({
      type: FrameType.HELLO,
      seq: 7,
      sessionId: sid,
      payload: Uint8Array.from([9, 9, 9]),
    });
    expect(() => decodeFrame(frame.subarray(0, frame.length - 1))).toThrow(FrameError);
    expect(() => decodeFrame(new Uint8Array(3))).toThrow(FrameError);
  });

  it('tolerates an unknown frame type (forward compatibility)', () => {
    const decoded = decodeFrame(
      encodeFrame({ type: 0x7f, seq: 1, sessionId: sid, payload: Uint8Array.from([1]) }),
    );
    expect(decoded.type).toBe(0x7f);
  });

  it('pads or truncates a non-8-byte sessionId', () => {
    const decoded = decodeFrame(
      encodeFrame({ type: FrameType.HELLO, seq: 1, sessionId: Uint8Array.from([1, 2]), payload: new Uint8Array(0) }),
    );
    expect(Array.from(decoded.sessionId)).toEqual([1, 2, 0, 0, 0, 0, 0, 0]);
  });
});
