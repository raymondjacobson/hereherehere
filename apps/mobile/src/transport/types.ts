import type { RelayPacket } from '@/domain/types';

export type SessionPhase = 'scanning' | 'trading' | 'checking' | 'updating' | 'done';

export type SessionProgress = {
  phase: SessionPhase;
  /** 0..1 */
  fraction: number;
  peersSeen: number;
};

export type InboundHandler = (packets: RelayPacket[]) => void;

/**
 * The mesh transport abstraction. The product layer never knows whether packets
 * arrive over a simulated mesh or real Bluetooth — only this contract matters.
 *
 * Real BLE will implement this same interface behind a native module + dev
 * client, with no changes to the product code above it.
 */
export interface Transport {
  /** Identify the local device so the transport can address/relay correctly. */
  configure(local: { signPk: string; boxPk: string }): void;

  /** Queue our own outgoing packets to be advertised/relayed during sessions. */
  enqueue(packets: RelayPacket[]): void;

  /** Subscribe to packets arriving from the mesh. Returns an unsubscribe fn. */
  onInbound(handler: InboundHandler): () => void;

  /**
   * Run one crowd-refresh session for ~durationMs. Discovers peers, trades
   * packet inventories, emits inbound packets via onInbound, and resolves with
   * everything received this session.
   */
  runSession(durationMs: number, onProgress?: (p: SessionProgress) => void): Promise<RelayPacket[]>;

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
