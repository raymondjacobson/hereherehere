import { describe, expect, it } from 'vitest';
import { MeshEngine } from './engine';
import { buildHereEnvelope } from './model/build';
import { friendOf, makeHere, makeIdentity, TestIdentity } from './testutil/factories';

const NOW = 2_100_000;

function engineFor(id: TestIdentity, friends: TestIdentity[]): MeshEngine {
  return new MeshEngine(id, friends.map((f) => friendOf(f)));
}

describe('MeshEngine.postHere', () => {
  it('builds a sealed envelope per friend and caches them', () => {
    const me = makeIdentity('me');
    const f1 = makeIdentity('f1');
    const f2 = makeIdentity('f2');
    const engine = engineFor(me, [f1, f2]);

    const envs = engine.postHere(makeHere(me), NOW);
    expect(envs).toHaveLength(2);
    expect(engine.cache.size).toBe(2);
    expect(engine.heres.get(me.signPk)?.whereText).toBe('Crane Stage left rail');
  });
});

describe('MeshEngine.ingest', () => {
  it('decrypts a friend status, updates the board, and mints a receipt', () => {
    const me = makeIdentity('me');
    const friend = makeIdentity('friend');
    const engine = engineFor(me, [friend]);

    const env = buildHereEnvelope(makeHere(friend), friend, friendOf(me));
    const out = engine.ingest(env, NOW);

    expect(out.status).toBe('new-status');
    expect(out.here?.whereText).toBe('Crane Stage left rail');
    expect(engine.heres.get(friend.signPk)).toBeDefined();
    expect(out.receipt?.objectType).toBe('receipt');
    expect(out.receipt?.recipientId).toBe(friend.signPk);
  });

  it('dedupes a repeated envelope', () => {
    const me = makeIdentity('me');
    const friend = makeIdentity('friend');
    const engine = engineFor(me, [friend]);
    const env = buildHereEnvelope(makeHere(friend), friend, friendOf(me));

    expect(engine.ingest(env, NOW).status).toBe('new-status');
    expect(engine.ingest(env, NOW).status).toBe('duplicate');
  });

  it('caches but cannot read an envelope addressed to someone else (blind relay)', () => {
    const me = makeIdentity('me');
    const author = makeIdentity('author');
    const other = makeIdentity('other');
    const engine = engineFor(me, []); // me is friends with nobody

    const env = buildHereEnvelope(makeHere(author), author, friendOf(other));
    const out = engine.ingest(env, NOW);
    expect(out.status).toBe('cached');
    expect(out.here).toBeUndefined();
    expect(engine.cache.has(env.messageId)).toBe(true); // carried for relay
  });

  it('rejects an expired envelope', () => {
    const me = makeIdentity('me');
    const friend = makeIdentity('friend');
    const engine = engineFor(me, [friend]);
    const env = buildHereEnvelope(makeHere(friend), friend, friendOf(me));
    expect(engine.ingest(env, env.expiresAt + 1).status).toBe('expired');
  });

  it('rejects a tampered envelope', () => {
    const me = makeIdentity('me');
    const friend = makeIdentity('friend');
    const engine = engineFor(me, [friend]);
    const env = buildHereEnvelope(makeHere(friend), friend, friendOf(me));
    expect(engine.ingest({ ...env, sequence: env.sequence + 99 }, NOW).status).toBe('invalid');
  });

  it('rejects an oversize envelope', () => {
    const me = makeIdentity('me');
    const friend = makeIdentity('friend');
    const engine = engineFor(me, [friend]);
    const big = makeHere(friend, { whereText: 'x'.repeat(4000) });
    const env = buildHereEnvelope(big, friend, friendOf(me));
    expect(engine.ingest(env, NOW).status).toBe('oversize');
  });

  it('opens a receipt addressed to us', () => {
    const me = makeIdentity('me');
    const friend = makeIdentity('friend');
    const engineMe = engineFor(me, [friend]);
    const engineFriend = engineFor(friend, [me]);

    // me posts a status to friend; friend ingests and mints a receipt back to me
    const myStatus = buildHereEnvelope(makeHere(me), me, friendOf(friend));
    const receipt = engineFriend.ingest(myStatus, NOW).receipt!;

    const out = engineMe.ingest(receipt, NOW);
    expect(out.deliveryReceipt?.originalMessageId).toBe(myStatus.messageId);
    expect(engineMe.receiptsForMe.has(myStatus.messageId)).toBe(true);
  });
});
