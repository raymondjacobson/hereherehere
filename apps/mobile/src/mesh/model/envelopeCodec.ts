import { ByteReader, ByteWriter } from '../wire/buffer';
import { Envelope, ObjectType } from './envelope';

/**
 * Binary codec for an Envelope — this is the ENVELOPE frame payload.
 *
 * Field order is fixed and canonical. Base64 string fields (keys, nonce,
 * ciphertext, signature, messageId) ride as length-prefixed UTF-8 in v1.
 */

const OBJECT_TYPE_CODE: Record<ObjectType, number> = { here: 0, receipt: 1 };
const OBJECT_TYPE_NAME: Record<number, ObjectType> = { 0: 'here', 1: 'receipt' };

export function encodeEnvelope(e: Envelope): Uint8Array {
  return new ByteWriter()
    .u8(e.version)
    .u8(OBJECT_TYPE_CODE[e.objectType])
    .lenStr(e.messageId)
    .lenStr(e.senderSignPk)
    .lenStr(e.senderBoxPk)
    .lenStr(e.recipientId)
    .varuint(e.createdAt)
    .varuint(e.relayUntil)
    .varuint(e.expiresAt)
    .varuint(e.sequence)
    .u8(e.ttl)
    .lenStr(e.nonce)
    .lenStr(e.ciphertext)
    .lenStr(e.signature)
    .finish();
}

export function decodeEnvelope(bytes: Uint8Array): Envelope {
  const r = new ByteReader(bytes);
  const version = r.u8();
  const typeCode = r.u8();
  const objectType = OBJECT_TYPE_NAME[typeCode];
  if (!objectType) throw new RangeError(`unknown objectType code ${typeCode}`);
  return {
    version,
    objectType,
    messageId: r.lenStr(),
    senderSignPk: r.lenStr(),
    senderBoxPk: r.lenStr(),
    recipientId: r.lenStr(),
    createdAt: r.varuint(),
    relayUntil: r.varuint(),
    expiresAt: r.varuint(),
    sequence: r.varuint(),
    ttl: r.u8(),
    nonce: r.lenStr(),
    ciphertext: r.lenStr(),
    signature: r.lenStr(),
  };
}

/** Encoded size in bytes (used for cache byte-budgeting). */
export function envelopeSize(e: Envelope): number {
  return encodeEnvelope(e).length;
}
