import { describe, expect, it } from 'vitest';
import { MeshEngine } from '../engine';
import { friendOf, makeHere, makeIdentity, TestIdentity } from '../testutil/factories';
import { PeerSession, pumpSessions, SessionOptions } from './protocol';

const NOW = 2_100_000;

function engineFor(id: TestIdentity, friends: TestIdentity[]): MeshEngine {
  return new MeshEngine(id, friends.map((f) => friendOf(f)));
}

function syncEngines(a: MeshEngine, b: MeshEngine, opts?: SessionOptions): number {
  return pumpSessions(new PeerSession(a, opts), new PeerSession(b, opts), NOW);
}

describe('PeerSession end-to-end', () => {
  it('delivers a friend status across one encounter', () => {
    const alice = makeIdentity('alice');
    const bob = makeIdentity('bob');
    const eAlice = engineFor(alice, [bob]);
    const eBob = engineFor(bob, [alice]);

    eAlice.postHere(makeHere(alice), NOW);
    syncEngines(eAlice, eBob);

    expect(eBob.heres.get(alice.signPk)?.whereText).toBe('Crane Stage left rail');
  });

  it('returns a delivery receipt to the author on a later encounter', () => {
    const alice = makeIdentity('alice');
    const bob = makeIdentity('bob');
    const eAlice = engineFor(alice, [bob]);
    const eBob = engineFor(bob, [alice]);

    const [status] = eAlice.postHere(makeHere(alice), NOW);
    syncEngines(eAlice, eBob); // bob receives + mints a receipt
    expect(eBob.heres.get(alice.signPk)).toBeDefined();

    syncEngines(eAlice, eBob); // receipt flows back to alice
    expect(eAlice.receiptsForMe.has(status.messageId)).toBe(true);
  });

  it('carries a status through a blind relay that cannot read it', () => {
    const alice = makeIdentity('alice');
    const bob = makeIdentity('bob');
    const carol = makeIdentity('carol'); // friends with nobody here

    const eAlice = engineFor(alice, [bob]);
    const eBob = engineFor(bob, [alice]);
    const eCarol = engineFor(carol, []);

    eAlice.postHere(makeHere(alice), NOW);

    // Alice only ever meets Carol; Carol later meets Bob.
    syncEngines(eAlice, eCarol);
    expect(eCarol.heres.get(alice.signPk)).toBeUndefined(); // carol can't decrypt
    expect(eCarol.localMetas().some((m) => m.envelope.senderSignPk === alice.signPk)).toBe(true);

    syncEngines(eCarol, eBob);
    expect(eBob.heres.get(alice.signPk)?.whereText).toBe('Crane Stage left rail');
  });

  it('does not re-send objects the peer already has (bloom-driven)', () => {
    const alice = makeIdentity('alice');
    const bob = makeIdentity('bob');
    const eAlice = engineFor(alice, [bob]);
    const eBob = engineFor(bob, [alice]);

    eAlice.postHere(makeHere(alice), NOW);
    const first = syncEngines(eAlice, eBob); // status -> bob
    syncEngines(eAlice, eBob); // receipt -> alice
    // Fully converged: a further encounter carries only handshake frames, and
    // neither cache grows (nothing re-delivered).
    const beforeAlice = eAlice.cache.size;
    const beforeBob = eBob.cache.size;
    const converged = syncEngines(eAlice, eBob);
    expect(converged).toBeLessThan(first);
    expect(eAlice.cache.size).toBe(beforeAlice);
    expect(eBob.cache.size).toBe(beforeBob);
  });

  it('fragments and reassembles a large envelope', () => {
    const alice = makeIdentity('alice');
    const bob = makeIdentity('bob');
    const eAlice = engineFor(alice, [bob]);
    const eBob = engineFor(bob, [alice]);

    eAlice.postHere(makeHere(alice, { whereText: 'left rail near the soundboard' }), NOW);
    // tiny MTU forces fragmentation of the envelope
    syncEngines(eAlice, eBob, { maxPayloadBytes: 60 });

    expect(eBob.heres.get(alice.signPk)?.whereText).toBe('left rail near the soundboard');
  });
});

describe('PeerSession scripted edge cases', () => {
  it('responds to an unknown frame type with ERROR and ends', () => {
    const alice = makeIdentity('alice');
    const session = new PeerSession(engineFor(alice, []));
    session.open(NOW);
    const reply = session.receive(
      { version: 1, type: 0x7f, seq: 9, sessionId: new Uint8Array(8), payload: new Uint8Array(0) },
      NOW,
    );
    expect(reply[0].type).toBe(0x0a); // ERROR
  });
});
