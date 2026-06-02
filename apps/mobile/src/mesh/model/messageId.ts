import nacl from 'tweetnacl';
import { toB64, utf8ToBytes } from '@/crypto/codec';
import { canonicalEnvelope, EnvelopeCore } from './envelope';

/**
 * Content-addressed message id: BLAKE3 isn't bundled, so we use tweetnacl's
 * SHA-512 (already a dependency) truncated to 32 bytes. Derived from the
 * immutable envelope fields, so the same logical object hashes identically on
 * every hop (ttl is excluded) and any byte change yields a different id.
 *
 * A blind relay that cannot decrypt the object can still compute and dedupe by
 * this id, because every input field is on the wire in clear.
 */
export const MESSAGE_ID_BYTES = 32;

export function deriveMessageId(core: EnvelopeCore): string {
  const digest = nacl.hash(utf8ToBytes(canonicalEnvelope(core)));
  return toB64(digest.subarray(0, MESSAGE_ID_BYTES));
}
