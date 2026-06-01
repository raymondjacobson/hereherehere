import './prng';
import nacl from 'tweetnacl';
import { fromB64, toB64 } from './codec';

/**
 * A device's cryptographic identity.
 *
 * - sign keypair (Ed25519): stable identity + packet signatures.
 *   The public signing key, base64-encoded, IS the friend id.
 * - box keypair (X25519): authenticated encryption of here payloads to friends.
 *
 * Secret keys live only in secure storage; public keys travel in friend codes.
 */
export type KeyPairSet = {
  signPk: string; // base64, 32 bytes -> friend id
  signSk: string; // base64, 64 bytes (secret)
  boxPk: string; // base64, 32 bytes
  boxSk: string; // base64, 32 bytes (secret)
};

export type PublicKeys = {
  signPk: string;
  boxPk: string;
};

export function generateKeyPairSet(): KeyPairSet {
  const sign = nacl.sign.keyPair();
  const box = nacl.box.keyPair();
  return {
    signPk: toB64(sign.publicKey),
    signSk: toB64(sign.secretKey),
    boxPk: toB64(box.publicKey),
    boxSk: toB64(box.secretKey),
  };
}

export function publicOf(keys: KeyPairSet): PublicKeys {
  return { signPk: keys.signPk, boxPk: keys.boxPk };
}

/** The friend id is the base64 signing public key. */
export function friendIdOf(pk: { signPk: string }): string {
  return pk.signPk;
}

/**
 * Short human-readable fingerprint of an identity, shown when adding a friend
 * so two people can eyeball-verify they added the right person.
 */
export function fingerprint(signPk: string): string {
  const bytes = fromB64(signPk);
  // group into 3 blocks of letters derived from the key bytes
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += alphabet[bytes[i] % alphabet.length];
    if (i === 1 || i === 3) out += '-';
  }
  return out;
}
