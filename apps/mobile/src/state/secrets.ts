import * as SecureStore from 'expo-secure-store';
import type { KeyPairSet } from '@/crypto/keys';

/**
 * Secret key material lives only in the device keychain (SecureStore), never in
 * regular app storage and never on any server. Public keys live in the app store.
 */
const SIGN_SK = 'hhh.signSk';
const BOX_SK = 'hhh.boxSk';

let cache: { signSk: string; boxSk: string } | null = null;

export async function storeSecrets(keys: KeyPairSet): Promise<void> {
  await SecureStore.setItemAsync(SIGN_SK, keys.signSk);
  await SecureStore.setItemAsync(BOX_SK, keys.boxSk);
  cache = { signSk: keys.signSk, boxSk: keys.boxSk };
}

export async function loadSecrets(): Promise<{ signSk: string; boxSk: string } | null> {
  if (cache) return cache;
  const signSk = await SecureStore.getItemAsync(SIGN_SK);
  const boxSk = await SecureStore.getItemAsync(BOX_SK);
  if (!signSk || !boxSk) return null;
  cache = { signSk, boxSk };
  return cache;
}

export function getSecretsSync(): { signSk: string; boxSk: string } | null {
  return cache;
}

export async function clearSecrets(): Promise<void> {
  await SecureStore.deleteItemAsync(SIGN_SK);
  await SecureStore.deleteItemAsync(BOX_SK);
  cache = null;
}
