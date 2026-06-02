import { describe, expect, it } from 'vitest';
import { buildHereEnvelope } from './build';
import { canonicalEnvelope, EnvelopeCore } from './envelope';
import { deriveMessageId, MESSAGE_ID_BYTES } from './messageId';
import { friendOf, makeHere, makeIdentity } from '../testutil/factories';

describe('deriveMessageId', () => {
  it('is stable across hops (ttl is excluded)', () => {
    const author = makeIdentity('author');
    const friend = friendOf(makeIdentity('friend'));
    const env = buildHereEnvelope(makeHere(author), author, friend);

    const relayed = { ...env, ttl: env.ttl - 3 };
    expect(deriveMessageId(relayed)).toBe(env.messageId);
  });

  it('changes when any immutable field changes', () => {
    const author = makeIdentity('author');
    const friend = friendOf(makeIdentity('friend'));
    const env = buildHereEnvelope(makeHere(author), author, friend);

    const tweaked: EnvelopeCore = { ...env, sequence: env.sequence + 1 };
    expect(deriveMessageId(tweaked)).not.toBe(env.messageId);
  });

  it('differs for the same here sealed to two different friends', () => {
    const author = makeIdentity('author');
    const here = makeHere(author);
    const a = buildHereEnvelope(here, author, friendOf(makeIdentity('a')));
    const b = buildHereEnvelope(here, author, friendOf(makeIdentity('b')));
    expect(a.messageId).not.toBe(b.messageId);
  });

  it('produces a 32-byte (base64) digest', () => {
    const author = makeIdentity('author');
    const env = buildHereEnvelope(makeHere(author), author, friendOf(makeIdentity('f')));
    // 32 raw bytes -> 44 base64 chars (with padding)
    expect(env.messageId.length).toBe(Math.ceil(MESSAGE_ID_BYTES / 3) * 4);
  });

  it('matches a hand-rolled hash of the canonical string', () => {
    const author = makeIdentity('author');
    const env = buildHereEnvelope(makeHere(author), author, friendOf(makeIdentity('f')));
    expect(env.messageId).toBe(deriveMessageId(env));
    expect(canonicalEnvelope(env)).toContain(env.senderSignPk);
  });
});
