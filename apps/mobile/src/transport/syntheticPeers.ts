import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateKeyPairSet, type KeyPairSet } from '@/crypto/keys';

/**
 * Dev-only simulated friends. These hold full keypairs (secret keys included)
 * so the mock transport can fabricate genuinely signed + sealed packets to the
 * local user — exercising the real crypto path end to end. Throwaway identities
 * persisted locally only so the demo survives reloads.
 *
 * None of this ships in the BLE build; it lives behind the transport boundary.
 */
export type SyntheticPeer = {
  keys: KeyPairSet;
  displayName: string;
  colorIndex: number;
  placePool: string[];
  notePool: string[];
};

const KEY = 'hhh.dev.syntheticPeers.v1';

const NAMES = ['Maya', 'Sam', 'Tariq', 'Priya', 'Jonah', 'Wren', 'Diego', 'Noor'];

const PLACES = [
  'Crane Stage',
  'Pier Stage',
  'Warehouse',
  'Gobi Tent',
  'Fcukers @ Crane Stage',
  'the food trucks',
  'water station by Pier',
  'merch tent',
  'main disco ball',
];

const NOTES = [
  'under the main disco ball',
  'left side by the sound booth',
  'near the back, by the bar',
  'by the bathrooms',
  'front rail, come find me',
  'on the grass to the right',
  '',
  '',
];

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

export function generatePeers(count = 5): SyntheticPeer[] {
  const names = pickN(NAMES, Math.min(count, NAMES.length));
  return names.map((displayName, i) => ({
    keys: generateKeyPairSet(),
    displayName,
    colorIndex: i % 6,
    placePool: pickN(PLACES, 4),
    notePool: pickN(NOTES, 3),
  }));
}

export async function loadPeers(): Promise<SyntheticPeer[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SyntheticPeer[];
  } catch {
    return [];
  }
}

export async function savePeers(peers: SyntheticPeer[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(peers));
}

export async function clearPeers(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
