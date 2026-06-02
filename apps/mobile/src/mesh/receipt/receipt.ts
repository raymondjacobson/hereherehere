import { open, seal } from '@/crypto/seal';
import type { LocalIdentity } from '@/domain/types';
import { DEFAULTS, expiresAtFor, relayUntilFor } from '../defaults';
import { ENVELOPE_VERSION, Envelope, EnvelopeCore, finalizeEnvelope } from '../model/envelope';

/**
 * Delivery receipts (spec §12.2). When we decrypt and verify a friend's status,
 * we can mint a receipt sealed back to that friend. It rides the mesh like any
 * other relay object, so the original author eventually learns "Seen by Kevin".
 *
 * Receipts are bonus proof, never required for correctness — see spec §12.4.
 */
export type DeliveryReceipt = {
  version: 1;
  originalMessageId: string;
  recipientProfileKey: string; // signPk of whoever received the status (us)
  receivedAtMs: number;
};

type Secrets = { signSk: string; boxSk: string };

/**
 * Build a receipt for `original` (a here we just opened) addressed back to its
 * author. Returns null if `original` is our own status (we don't receipt
 * ourselves) or isn't a here.
 */
export function buildDeliveryReceipt(
  original: Envelope,
  me: LocalIdentity & Secrets,
  now: number,
  sequence = 0,
): Envelope | null {
  if (original.objectType !== 'here') return null;
  if (original.senderSignPk === me.signPk) return null; // don't receipt our own posts

  const payload: DeliveryReceipt = {
    version: 1,
    originalMessageId: original.messageId,
    recipientProfileKey: me.signPk,
    receivedAtMs: now,
  };
  // Sealed to the original author so only they can read it.
  const sealed = seal(JSON.stringify(payload), original.senderBoxPk, me.boxSk);
  const core: EnvelopeCore = {
    version: ENVELOPE_VERSION,
    objectType: 'receipt',
    senderSignPk: me.signPk,
    senderBoxPk: me.boxPk,
    recipientId: original.senderSignPk,
    createdAt: now,
    relayUntil: relayUntilFor(now, now),
    expiresAt: expiresAtFor(now),
    sequence,
    nonce: sealed.nonce,
    ciphertext: sealed.ciphertext,
  };
  return finalizeEnvelope(core, DEFAULTS.receiptTtl, me.signSk);
}

/**
 * If this receipt is addressed to us, open it. Returns the DeliveryReceipt or
 * null if it isn't ours / can't be decrypted.
 */
export function tryOpenReceipt(e: Envelope, me: LocalIdentity & Secrets): DeliveryReceipt | null {
  if (e.objectType !== 'receipt') return null;
  if (e.recipientId !== me.signPk) return null;
  const plaintext = open({ nonce: e.nonce, ciphertext: e.ciphertext }, e.senderBoxPk, me.boxSk);
  if (!plaintext) return null;
  try {
    const r = JSON.parse(plaintext) as DeliveryReceipt;
    return r.version === 1 ? r : null;
  } catch {
    return null;
  }
}
