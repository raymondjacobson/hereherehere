import { Envelope } from './envelope';
import { envelopeSize } from './envelopeCodec';

/**
 * Local-only metadata wrapping an Envelope in the relay cache. NONE of these
 * fields travel on the wire — they're our private bookkeeping for gossip
 * decisions (suppression, eviction, supersede). Derived priority and relay
 * counts cannot be trusted from peers, so we compute them ourselves.
 */
export type ObjectMeta = {
  envelope: Envelope;
  messageId: string;
  sizeBytes: number;
  firstSeenAt: number;
  lastHeardAt: number;
  lastRelayedAt?: number;
  heardCount: number; // distinct times we've received this object
  relayCount: number; // times WE have forwarded it
  decryptable: boolean; // we could open it (addressed to us, known friend)
  verified: boolean; // signature + messageId checked out
  superseded: boolean; // a newer status from the same author exists
};

export function metaFromEnvelope(
  envelope: Envelope,
  now: number,
  opts?: { decryptable?: boolean; verified?: boolean; sizeBytes?: number },
): ObjectMeta {
  return {
    envelope,
    messageId: envelope.messageId,
    sizeBytes: opts?.sizeBytes ?? envelopeSize(envelope),
    firstSeenAt: now,
    lastHeardAt: now,
    heardCount: 1,
    relayCount: 0,
    decryptable: opts?.decryptable ?? false,
    verified: opts?.verified ?? false,
    superseded: false,
  };
}

/**
 * Hop count proxy: how many hops the object has already travelled, inferred
 * from the remaining ttl. Avoids putting a separate hop counter on the wire.
 */
export function hopCount(envelope: Envelope, originalTtl: number): number {
  return Math.max(0, originalTtl - envelope.ttl);
}
