import { sign, verify } from '@/crypto/seal';
import { deriveMessageId } from './messageId';

/**
 * The relay envelope — the unit that moves through the mesh. This is the v1
 * evolution of the app's `RelayPacket`:
 *  - `messageId` is a content hash (stable dedupe key across hops, computable
 *    by blind relays) instead of a sliced-string id.
 *  - `relayUntil` (stop forwarding) is split from `expiresAt` (hard display
 *    drop). Both are author-fixed and signed in v1.
 *  - `objectType` widens 'here' to allow relayable receipts.
 *
 * `ttl` is the only mutable field — it decrements per hop, so it is excluded
 * from both the signature and the messageId.
 */
export type ObjectType = 'here' | 'receipt';

export type Envelope = {
  version: number;
  objectType: ObjectType;
  messageId: string; // base64, content hash of the immutable fields
  senderSignPk: string;
  senderBoxPk: string;
  recipientId: string;
  createdAt: number;
  relayUntil: number;
  expiresAt: number;
  sequence: number;
  ttl: number; // remaining hops — mutable, excluded from sig + messageId
  nonce: string;
  ciphertext: string;
  signature: string; // Ed25519 over canonicalEnvelope()
};

export const ENVELOPE_VERSION = 1;

/** Immutable fields used for signing + messageId (excludes ttl/signature/messageId). */
export type EnvelopeCore = Omit<Envelope, 'signature' | 'ttl' | 'messageId'>;

/** Canonical string signed by the author and hashed into the messageId. */
export function canonicalEnvelope(e: EnvelopeCore): string {
  return [
    e.version,
    e.objectType,
    e.senderSignPk,
    e.senderBoxPk,
    e.recipientId,
    e.createdAt,
    e.relayUntil,
    e.expiresAt,
    e.sequence,
    e.nonce,
    e.ciphertext,
  ].join('|');
}

/** Finalize a core envelope: derive its messageId and sign it. */
export function finalizeEnvelope(core: EnvelopeCore, ttl: number, signSk: string): Envelope {
  const canonical = canonicalEnvelope(core);
  return {
    ...core,
    ttl,
    messageId: deriveMessageId(core),
    signature: sign(canonical, signSk),
  };
}

/**
 * Verify an envelope's signature and that its messageId matches its content.
 * Does NOT check expiry — callers check liveness separately (clock is injected).
 */
export function verifyEnvelope(e: Envelope): boolean {
  if (e.messageId !== deriveMessageId(e)) return false;
  return verify(canonicalEnvelope(e), e.signature, e.senderSignPk);
}

/** True if the envelope is still worth relaying at `now`. */
export function isRelayable(e: Envelope, now: number): boolean {
  return e.ttl > 0 && e.relayUntil > now;
}

/** True if the envelope should still be retained/displayed at `now`. */
export function isLive(e: Envelope, now: number): boolean {
  return e.expiresAt > now;
}
