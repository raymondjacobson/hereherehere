import { describe, expect, it } from 'vitest';
import { MeshEngine } from '@/mesh/engine';
import { PeerSession } from '@/mesh/session/protocol';
import { friendOf, makeHere, makeIdentity } from '@/mesh/testutil/factories';
import { Frame, FRAME_VERSION, FrameType } from '@/mesh/wire/frames';
import { FrameChannel, makeInMemoryLinkPair, runSessionOverLink } from './link';

const NOW = 2_100_000;
const flush = () => new Promise((r) => setTimeout(r, 0));

function frame(type: FrameType, payload: Uint8Array): Frame {
  return { version: FRAME_VERSION, type, seq: 0, sessionId: new Uint8Array(8), payload };
}

describe('FrameChannel chunking', () => {
  it('reassembles frames split across tiny MTU writes, in order', async () => {
    const [a, b] = makeInMemoryLinkPair();
    const chanA = new FrameChannel(a, 8); // 8-byte MTU forces many chunks
    const chanB = new FrameChannel(b, 8);

    const received: Frame[] = [];
    chanB.onFrame((f) => received.push(f));

    const big = new Uint8Array(100).map((_, i) => i & 0xff);
    await chanA.sendFrame(frame(FrameType.ENVELOPE, big));
    await chanA.sendFrame(frame(FrameType.GOODBYE, new Uint8Array(0)));
    await flush();

    expect(received).toHaveLength(2);
    expect(received[0].type).toBe(FrameType.ENVELOPE);
    expect(Array.from(received[0].payload)).toEqual(Array.from(big));
    expect(received[1].type).toBe(FrameType.GOODBYE);
  });
});

describe('runSessionOverLink end-to-end', () => {
  it('delivers a status over the byte link with a tiny MTU', async () => {
    const alice = makeIdentity('alice');
    const bob = makeIdentity('bob');
    const eAlice = new MeshEngine(alice, [friendOf(bob)]);
    const eBob = new MeshEngine(bob, [friendOf(alice)]);
    eAlice.postHere(makeHere(alice), NOW);

    const [la, lb] = makeInMemoryLinkPair();
    const chanA = new FrameChannel(la, 16);
    const chanB = new FrameChannel(lb, 16);

    const [ra, rb] = await Promise.all([
      runSessionOverLink(new PeerSession(eAlice), chanA, NOW),
      runSessionOverLink(new PeerSession(eBob), chanB, NOW),
    ]);

    expect(ra.completed).toBe(true);
    expect(rb.completed).toBe(true);
    expect(eBob.heres.get(alice.signPk)?.whereText).toBe('Crane Stage left rail');
  });
});
