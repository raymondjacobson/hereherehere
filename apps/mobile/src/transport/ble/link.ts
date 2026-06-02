import { decodeFrame, encodeFrame } from '@/mesh/wire/codec';
import { Frame } from '@/mesh/wire/frames';
import { PeerSession } from '@/mesh/session/protocol';
import { DEFAULT_LINK_MTU, SESSION_BUDGET_MS } from './constants';

/**
 * A duplex byte link to one connected peer — the thin seam between the mesh
 * protocol and a concrete transport (a pair of BLE GATT characteristics, or an
 * in-memory pipe in tests). Bytes may arrive in arbitrary chunks.
 */
export interface GattLink {
  write(bytes: Uint8Array<ArrayBufferLike>): Promise<void>;
  subscribe(onChunk: (chunk: Uint8Array) => void): void;
  close(): void;
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function readU32(b: Uint8Array, o: number): number {
  return (b[o] * 0x1000000 + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]) >>> 0;
}

/**
 * Frames a GattLink: each frame is length-prefixed and written in MTU-sized
 * chunks; inbound chunks are accumulated and split back into whole frames. The
 * frame's own crc32 (from encodeFrame) guards integrity on top of this.
 */
export class FrameChannel {
  private inbound: Uint8Array = new Uint8Array(0);
  private frameCb?: (f: Frame) => void;
  // Serialize all writes so concurrent sendFrame() calls can't interleave their
  // MTU chunks and corrupt the length-prefixed stream.
  private sendChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly link: GattLink,
    private readonly mtu: number = DEFAULT_LINK_MTU,
  ) {
    link.subscribe((chunk) => this.onChunk(chunk));
  }

  onFrame(cb: (f: Frame) => void): void {
    this.frameCb = cb;
  }

  sendFrame(frame: Frame): Promise<void> {
    const body = encodeFrame(frame);
    const out = new Uint8Array(4 + body.length);
    out[0] = (body.length >>> 24) & 0xff;
    out[1] = (body.length >>> 16) & 0xff;
    out[2] = (body.length >>> 8) & 0xff;
    out[3] = body.length & 0xff;
    out.set(body, 4);
    this.sendChain = this.sendChain.then(() => this.rawSend(out));
    return this.sendChain;
  }

  private async rawSend(out: Uint8Array): Promise<void> {
    for (let i = 0; i < out.length; i += this.mtu) {
      await this.link.write(out.subarray(i, i + this.mtu));
    }
  }

  private onChunk(chunk: Uint8Array): void {
    this.inbound = concat(this.inbound, chunk);
    while (this.inbound.length >= 4) {
      const len = readU32(this.inbound, 0);
      if (this.inbound.length < 4 + len) break;
      const body = this.inbound.slice(4, 4 + len);
      this.inbound = this.inbound.slice(4 + len);
      this.frameCb?.(decodeFrame(body));
    }
  }
}

/**
 * Drive a PeerSession to completion over a FrameChannel: send the opening
 * frames, then for each inbound frame feed the session and send its responses,
 * until the session reports done or the budget elapses (best-effort — a
 * truncated session just yields a partial sync, which is fine).
 */
export function runSessionOverLink(
  session: PeerSession,
  channel: FrameChannel,
  now: number,
  opts: { timeoutMs?: number } = {},
): Promise<{ completed: boolean }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (completed: boolean) => {
      if (settled) return;
      settled = true;
      resolve({ completed });
    };
    const timer = setTimeout(() => finish(false), opts.timeoutMs ?? SESSION_BUDGET_MS);

    channel.onFrame((frame) => {
      try {
        for (const r of session.receive(frame, now)) void channel.sendFrame(r);
        if (session.done) {
          clearTimeout(timer);
          finish(true);
        }
      } catch (e) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(e);
      }
    });

    (async () => {
      for (const f of session.open(now)) await channel.sendFrame(f);
    })().catch((e) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(e);
      }
    });
  });
}

/**
 * Two in-memory GattLinks wired to each other, delivering writes as async
 * chunks. Used in tests and as a loopback for the dormant BLE path.
 */
export function makeInMemoryLinkPair(): [GattLink, GattLink] {
  const subs: Array<((c: Uint8Array) => void) | undefined> = [undefined, undefined];
  const make = (self: number, other: number): GattLink => ({
    write(bytes) {
      const copy = bytes.slice();
      return Promise.resolve().then(() => subs[other]?.(copy));
    },
    subscribe(cb) {
      subs[self] = cb;
    },
    close() {
      subs[self] = undefined;
    },
  });
  return [make(0, 1), make(1, 0)];
}
