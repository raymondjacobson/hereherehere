/**
 * Wire tweetnacl's PRNG to expo-crypto.
 *
 * tweetnacl has no random source in React Native by default. expo-crypto's
 * getRandomBytes is a synchronous CSPRNG available in Expo Go (no native dev
 * client required). Import this module once before any nacl key generation.
 */
import nacl from 'tweetnacl';
import * as Crypto from 'expo-crypto';

let installed = false;

export function ensurePRNG() {
  if (installed) return;
  nacl.setPRNG((x, n) => {
    const bytes = Crypto.getRandomBytes(n);
    for (let i = 0; i < n; i++) x[i] = bytes[i];
  });
  installed = true;
}

ensurePRNG();
