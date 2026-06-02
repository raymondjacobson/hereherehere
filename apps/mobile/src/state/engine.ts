import { MeshEngine } from '@/mesh/engine';
import type { Friend, LocalIdentity } from '@/domain/types';

/**
 * Process-wide singleton MeshEngine — the live mesh brain. It is NOT persisted
 * (the relay cache is rebuilt each launch as sessions run); the durable board
 * lives in the Zustand store's `heres`. Kept out of Zustand state because it's a
 * class instance, not serializable.
 */
let engine: MeshEngine | null = null;

export function getEngine(): MeshEngine | null {
  return engine;
}

export function createEngine(
  identity: LocalIdentity & { signSk: string; boxSk: string },
  friends: Friend[],
): MeshEngine {
  engine = new MeshEngine(identity, friends);
  return engine;
}

export function clearEngine(): void {
  engine = null;
}
