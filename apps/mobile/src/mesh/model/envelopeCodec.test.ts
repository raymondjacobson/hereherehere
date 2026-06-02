import { describe, expect, it } from 'vitest';
import { open } from '@/crypto/seal';
import type { Here } from '@/domain/types';
import { buildHereEnvelope } from './build';
import { isLive, isRelayable, verifyEnvelope } from './envelope';
import { decodeEnvelope, encodeEnvelope, envelopeSize } from './envelopeCodec';
import { friendOf, makeHere, makeIdentity } from '../testutil/factories';

describe('envelope codec + verify', () => {
  it('round-trips an envelope through binary encoding', () => {
    const author = makeIdentity('author');
    const env = buildHereEnvelope(makeHere(author), author, friendOf(makeIdentity('f')));
    const decoded = decodeEnvelope(encodeEnvelope(env));
    expect(decoded).toEqual(env);
  });

  it('a decoded envelope still verifies and decrypts', () => {
    const author = makeIdentity('author');
    const friendId = makeIdentity('friend');
    const here = makeHere(author);
    const env = buildHereEnvelope(here, author, friendOf(friendId));

    const decoded = decodeEnvelope(encodeEnvelope(env));
    expect(verifyEnvelope(decoded)).toBe(true);

    const plaintext = open(
      { nonce: decoded.nonce, ciphertext: decoded.ciphertext },
      decoded.senderBoxPk,
      friendId.boxSk,
    );
    expect(plaintext).not.toBeNull();
    expect((JSON.parse(plaintext!) as Here).whereText).toBe(here.whereText);
  });

  it('verify fails if the signature is tampered', () => {
    const author = makeIdentity('author');
    const env = buildHereEnvelope(makeHere(author), author, friendOf(makeIdentity('f')));
    expect(verifyEnvelope({ ...env, sequence: env.sequence + 1 })).toBe(false);
  });

  it('verify fails if messageId does not match content', () => {
    const author = makeIdentity('author');
    const env = buildHereEnvelope(makeHere(author), author, friendOf(makeIdentity('f')));
    expect(verifyEnvelope({ ...env, messageId: 'AAAA' })).toBe(false);
  });

  it('ttl can change without breaking verification (excluded from sig)', () => {
    const author = makeIdentity('author');
    const env = buildHereEnvelope(makeHere(author), author, friendOf(makeIdentity('f')));
    expect(verifyEnvelope({ ...env, ttl: env.ttl - 2 })).toBe(true);
  });

  it('splits relay expiry from display expiry', () => {
    const author = makeIdentity('author', 0);
    const here = makeHere(author, { createdAt: 1000, endsAt: 1000 + 60_000 });
    const env = buildHereEnvelope(here, author, friendOf(makeIdentity('f')));
    // relayUntil is shorter than expiresAt
    expect(env.relayUntil).toBeLessThan(env.expiresAt);
    expect(isRelayable(env, env.relayUntil - 1)).toBe(true);
    expect(isRelayable(env, env.relayUntil + 1)).toBe(false);
    expect(isLive(env, env.relayUntil + 1)).toBe(true);
    expect(isLive(env, env.expiresAt + 1)).toBe(false);
  });

  it('reports a realistic encoded size', () => {
    const author = makeIdentity('author');
    const env = buildHereEnvelope(makeHere(author), author, friendOf(makeIdentity('f')));
    const size = envelopeSize(env);
    expect(size).toBeGreaterThan(100);
    expect(size).toBeLessThan(1024); // within the v1 maxObjectBytes budget
  });
});
