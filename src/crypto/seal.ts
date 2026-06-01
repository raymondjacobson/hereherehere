import './prng';
import nacl from 'tweetnacl';
import { fromB64, toB64, utf8ToBytes, bytesToUtf8 } from './codec';

/**
 * Authenticated encryption of a here payload from a sender to one friend.
 * Uses nacl.box (X25519 + XSalsa20-Poly1305): only the friend's box secret key
 * can open it, and the friend can verify it came from this sender's box key.
 */
export type SealedBox = {
  nonce: string; // base64
  ciphertext: string; // base64
};

export function seal(plaintext: string, recipientBoxPk: string, senderBoxSk: string): SealedBox {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const ct = nacl.box(utf8ToBytes(plaintext), nonce, fromB64(recipientBoxPk), fromB64(senderBoxSk));
  return { nonce: toB64(nonce), ciphertext: toB64(ct) };
}

export function open(box: SealedBox, senderBoxPk: string, recipientBoxSk: string): string | null {
  const out = nacl.box.open(
    fromB64(box.ciphertext),
    fromB64(box.nonce),
    fromB64(senderBoxPk),
    fromB64(recipientBoxSk),
  );
  if (!out) return null;
  return bytesToUtf8(out);
}

/** Detached Ed25519 signature over arbitrary message bytes. */
export function sign(message: string, signSk: string): string {
  return toB64(nacl.sign.detached(utf8ToBytes(message), fromB64(signSk)));
}

export function verify(message: string, signature: string, signPk: string): boolean {
  try {
    return nacl.sign.detached.verify(utf8ToBytes(message), fromB64(signature), fromB64(signPk));
  } catch {
    return false;
  }
}
