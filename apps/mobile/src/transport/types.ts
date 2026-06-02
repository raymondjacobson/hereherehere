import type { MeshEngine } from '@/mesh/engine';

export type SessionPhase = 'scanning' | 'trading' | 'checking' | 'updating' | 'done';

export type SessionProgress = {
  phase: SessionPhase;
  /** 0..1 */
  fraction: number;
  peersSeen: number;
};

export type SessionResult = {
  /** Author signPks whose latest status changed for us this session. */
  updatedAuthors: string[];
  /** Number of peers we actually synced with. */
  peersSynced: number;
};

/**
 * The mesh transport abstraction. The product layer never knows whether sync
 * happens over a simulated mesh or real Bluetooth — only this contract matters.
 *
 * A transport drives PeerSessions between the local MeshEngine and discovered
 * peers; the engine ingests received objects during the session. Real BLE will
 * implement this same interface behind a native module + dev client, with no
 * changes to the product code above it.
 */
export interface Transport {
  /** Bind the local node whose sessions this transport will drive. */
  configure(node: MeshEngine): void;

  /**
   * Run one crowd-refresh session for ~durationMs: discover peers, run
   * anti-entropy sync, and let the engine ingest. Resolves with a summary of
   * what changed.
   */
  runSession(durationMs: number, onProgress?: (p: SessionProgress) => void): Promise<SessionResult>;

  /** Abort an in-flight session. */
  stopSession(): void;

  /** Current count of nearby reachable peers. */
  getNearby(): number;

  /** Subscribe to changes in the nearby-peer count. Fires immediately with the
   *  current value. Returns an unsubscribe fn. */
  onNearby(handler: (count: number) => void): () => void;

  /** Start/stop ambient peer discovery while the app is foregrounded. */
  startAmbient(): void;
  stopAmbient(): void;
}
