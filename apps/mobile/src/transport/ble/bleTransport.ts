import type { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { fromB64, toB64 } from '@/crypto/codec';
import type { MeshEngine } from '@/mesh/engine';
import { PeerSession } from '@/mesh/session/protocol';
import type { SessionProgress, SessionResult, Transport } from '../types';
import { DEFAULT_LINK_MTU, HHH_RX_CHAR_UUID, HHH_SERVICE_UUID, HHH_TX_CHAR_UUID, SESSION_BUDGET_MS } from './constants';
import { FrameChannel, GattLink, runSessionOverLink } from './link';

/**
 * Real BLE transport — DORMANT until an Expo dev client exists.
 *
 * It is never imported by the app bundle, and `react-native-ble-plx` is loaded
 * via a dynamic import inside runSession, so merely shipping this file does NOT
 * pull the native module into Expo Go. Activating it requires a dev client
 * (prebuild + @config-plugins/react-native-ble-plx + EAS/local build).
 *
 * v1 is central-role only (scan + connect): react-native-ble-plx has no GATT
 * server / advertising API, so the peripheral half (advertising the service +
 * serving characteristics) needs a separate native module. The frame protocol
 * is symmetric, so a peripheral implementation drops in behind the same
 * GattLink without touching the mesh layer.
 */
export class BleTransport implements Transport {
  private node: MeshEngine | null = null;
  private manager: BleManager | null = null;
  private scanning = false;
  private aborted = false;
  private nearby = 0;
  private readonly nearbyHandlers = new Set<(n: number) => void>();
  private readonly seenPeers = new Set<string>();

  configure(node: MeshEngine): void {
    this.node = node;
  }

  private async ensureManager(): Promise<BleManager> {
    if (!this.manager) {
      // Dynamic import keeps the native module out of the Expo Go bundle.
      const { BleManager: Manager } = await import('react-native-ble-plx');
      this.manager = new Manager();
    }
    return this.manager;
  }

  getNearby(): number {
    return this.nearby;
  }

  onNearby(handler: (n: number) => void): () => void {
    this.nearbyHandlers.add(handler);
    handler(this.nearby);
    return () => this.nearbyHandlers.delete(handler);
  }

  private setNearby(n: number): void {
    if (n === this.nearby) return;
    this.nearby = n;
    this.nearbyHandlers.forEach((h) => h(n));
  }

  async startAmbient(): Promise<void> {
    if (this.scanning) return;
    const manager = await this.ensureManager();
    this.scanning = true;
    this.seenPeers.clear();
    manager.startDeviceScan([HHH_SERVICE_UUID], { allowDuplicates: false }, (error, device) => {
      if (error || !device) return;
      this.seenPeers.add(device.id);
      this.setNearby(this.seenPeers.size);
    });
  }

  stopAmbient(): void {
    if (!this.scanning) return;
    this.manager?.stopDeviceScan();
    this.scanning = false;
  }

  stopSession(): void {
    this.aborted = true;
  }

  async runSession(
    durationMs: number,
    onProgress?: (p: SessionProgress) => void,
  ): Promise<SessionResult> {
    this.aborted = false;
    const node = this.node;
    if (!node) {
      onProgress?.({ phase: 'done', fraction: 1, peersSeen: 0 });
      return { updatedAuthors: [], peersSynced: 0 };
    }

    const before = new Map<string, number>();
    for (const [author, h] of node.heres) before.set(author, h.sequence);

    const manager = await this.ensureManager();
    onProgress?.({ phase: 'scanning', fraction: 0.1, peersSeen: 0 });

    const peers = await this.scanForPeers(manager, durationMs * 0.4);
    let peersSynced = 0;
    for (const device of peers) {
      if (this.aborted) break;
      onProgress?.({
        phase: 'trading',
        fraction: 0.4 + 0.5 * (peersSynced / Math.max(1, peers.length)),
        peersSeen: peersSynced,
      });
      const ok = await this.syncWithDevice(node, device).catch(() => false);
      if (ok) peersSynced++;
    }

    const updatedAuthors: string[] = [];
    for (const [author, h] of node.heres) {
      if (author !== node.signPk && (before.get(author) ?? -1) < h.sequence) {
        updatedAuthors.push(author);
      }
    }
    onProgress?.({ phase: 'done', fraction: 1, peersSeen: peersSynced });
    return { updatedAuthors, peersSynced };
  }

  /** Collect peers advertising our service for a bounded window. */
  private scanForPeers(manager: BleManager, windowMs: number): Promise<Device[]> {
    return new Promise((resolve) => {
      const found = new Map<string, Device>();
      manager.startDeviceScan([HHH_SERVICE_UUID], { allowDuplicates: false }, (error, device) => {
        if (!error && device) found.set(device.id, device);
      });
      setTimeout(() => {
        manager.stopDeviceScan();
        resolve([...found.values()]);
      }, windowMs);
    });
  }

  /** Connect, run one anti-entropy session as central, then disconnect. */
  private async syncWithDevice(node: MeshEngine, device: Device): Promise<boolean> {
    // Holder object so the closure assignment is visible to the finally block.
    const sub: { current?: Subscription } = {};
    try {
      const connected = await device.connect();
      await connected.discoverAllServicesAndCharacteristics();

      const link: GattLink = {
        write: async (bytes) => {
          await connected.writeCharacteristicWithResponseForService(
            HHH_SERVICE_UUID,
            HHH_RX_CHAR_UUID,
            toB64(bytes),
          );
        },
        subscribe: (onChunk) => {
          sub.current = connected.monitorCharacteristicForService(
            HHH_SERVICE_UUID,
            HHH_TX_CHAR_UUID,
            (error, char) => {
              if (!error && char?.value) onChunk(fromB64(char.value));
            },
          );
        },
        close: () => sub.current?.remove(),
      };

      const channel = new FrameChannel(link, DEFAULT_LINK_MTU);
      const { completed } = await runSessionOverLink(new PeerSession(node), channel, Date.now(), {
        timeoutMs: SESSION_BUDGET_MS,
      });
      return completed;
    } finally {
      sub.current?.remove();
      await device.cancelConnection().catch(() => undefined);
    }
  }
}
