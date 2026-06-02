import { seal } from '@/crypto/seal';
import type { Friend, Here, LocalIdentity } from '@/domain/types';
import { DEFAULTS, expiresAtFor, relayUntilFor } from '../defaults';
import { ENVELOPE_VERSION, Envelope, EnvelopeCore, finalizeEnvelope } from './envelope';

type Secrets = { signSk: string; boxSk: string };

/**
 * Build one signed + sealed `here` envelope addressed to a single friend.
 * Mirrors the legacy `buildPacketsForHere` but produces the evolved envelope
 * (content-hash messageId + relay/display expiry split).
 */
export function buildHereEnvelope(
  here: Here,
  identity: LocalIdentity & Secrets,
  recipient: Friend,
  ttl: number = DEFAULTS.normalTtl,
): Envelope {
  const sealed = seal(JSON.stringify(here), recipient.boxPk, identity.boxSk);
  const core: EnvelopeCore = {
    version: ENVELOPE_VERSION,
    objectType: 'here',
    senderSignPk: identity.signPk,
    senderBoxPk: identity.boxPk,
    recipientId: recipient.id,
    createdAt: here.createdAt,
    relayUntil: relayUntilFor(here.createdAt, here.endsAt),
    expiresAt: expiresAtFor(here.createdAt),
    sequence: here.sequence,
    nonce: sealed.nonce,
    ciphertext: sealed.ciphertext,
  };
  return finalizeEnvelope(core, ttl, identity.signSk);
}

/** Build a here envelope for each friend recipient (one sealed copy each). */
export function buildHereEnvelopes(
  here: Here,
  identity: LocalIdentity & Secrets,
  friends: Friend[],
  ttl?: number,
): Envelope[] {
  return friends.map((f) => buildHereEnvelope(here, identity, f, ttl));
}
