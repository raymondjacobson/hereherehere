/**
 * Test-only shim for `expo-crypto`, backed by Node's CSPRNG.
 *
 * Only `getRandomBytes` is used in app code (crypto/prng.ts wires it into
 * tweetnacl's PRNG). Keep this in sync if other expo-crypto APIs get used.
 */
import { randomBytes } from 'node:crypto';

export function getRandomBytes(n: number): Uint8Array {
  return new Uint8Array(randomBytes(n));
}

export function getRandomBytesAsync(n: number): Promise<Uint8Array> {
  return Promise.resolve(getRandomBytes(n));
}
