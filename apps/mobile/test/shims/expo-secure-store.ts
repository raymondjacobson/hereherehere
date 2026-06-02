/**
 * Test-only shim for `expo-secure-store`, backed by an in-memory map.
 * Mirrors the async API surface used by state/secrets.ts.
 */
const store = new Map<string, string>();

export function setItemAsync(key: string, value: string): Promise<void> {
  store.set(key, value);
  return Promise.resolve();
}

export function getItemAsync(key: string): Promise<string | null> {
  return Promise.resolve(store.has(key) ? store.get(key)! : null);
}

export function deleteItemAsync(key: string): Promise<void> {
  store.delete(key);
  return Promise.resolve();
}
