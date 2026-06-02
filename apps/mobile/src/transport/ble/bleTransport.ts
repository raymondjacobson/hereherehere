import type { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { fromB64, toB64 } from '@/crypto/codec';
import type { MeshEngine } from '@/mesh/engine';
import { PeerSession } from '@/mesh/session/protocol';
import type { SessionProgress, SessionResult, Transport } from '../types';
import { DEFAULT_LINK_MTU, HHH_RX_CHAR_UUID, HHH_SERVICE_UUID, HHH_TX_CHAR_UUID, SESSION_BUDGET_MS } from './constants';
import { FrameChannel, GattLink, runSessionOverLink } from './link';
import { HhhBlePeripheral } from '../../../modules/hhh-ble-peripheral';

/**
 * Real BLE transport — dual role.
 *
 * As a **central** it scans for and connects to peers advertising our service
 * (`react-native-ble-plx`, loaded via dynamic import so the native module never
 * enters the Expo Go bundle). As a **peripheral** it advertises the service and
 * serves the RX/TX characteristics via the `hhh-ble-peripheral` native module
 * (CoreBluetooth, which `react-native-ble-plx` can't do). Both roles run at
 * once: two phones each scan and advertise, so whoever discovers whom, a session
 * runs. The mesh layer is anti-entropy with dedupe, so a redundant session
 * between the same pair is harmless — no connection arbitration needed.
 *
 * Requires a native build (dev client / EAS / local). In Expo Go the peripheral
 * module is absent and the transport selector falls back to the simulator.
 */
export class BleTransport implements Transport {
  private node: MeshEngine | null = null;
  private manager: BleManager | null = null;
  private scanning = false;
  private aborted = false;
  private nearby = 0;
  private readonly nearbyHandlers = new Set<(n: number) => void>();
  private readonly updateHandlers = new Set<() => void>();
  private readonly seenPeers = new Set<string>();

  // Peripheral role: advertising state, native event subscriptions, and one
  // inbound-chunk dispatcher per connected central.
  private advertising = false;
  private peripheralSubs: Array<{ remove(): void }> = [];
  private readonly peripheralLinks = new Map<string, (chunk: Uint8Array) => void>();

  configure(node: MeshEngine): void {
    this.node = node;
  }

  onUpdate(handler: () => void): () => void {
    this.updateHandlers.add(handler);
    return () => this.updateHandlers.delete(handler);
  }

  private notifyUpdate(): void {
    this.updateHandlers.forEach((h) => h());
  }

  /** Pull-to-refresh: a short scan + sync burst. */
  async boost(): Promise<number> {
    const result = await this.runSession(2_000);
    this.notifyUpdate();
    return result.peersSynced;
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
    this.startPeripheral();
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
    this.stopPeripheral();
    if (!this.scanning) return;
    this.manager?.stopDeviceScan();
    this.scanning = false;
  }

  // --- Peripheral role (advertise + serve), via the native CoreBluetooth module ---

  private startPeripheral(): void {
    if (this.advertising || !HhhBlePeripheral) return;
    this.advertising = true;
    this.peripheralSubs.push(
      HhhBlePeripheral.addListener('onReceive', (e) => this.peripheralLinks.get(e.centralId)?.(fromB64(e.data))),
      HhhBlePeripheral.addListener('onCentralConnect', (e) => this.onCentralConnect(e.centralId)),
      HhhBlePeripheral.addListener('onCentralDisconnect', (e) => this.peripheralLinks.delete(e.centralId)),
    );
    HhhBlePeripheral.startAdvertising(HHH_SERVICE_UUID, HHH_RX_CHAR_UUID, HHH_TX_CHAR_UUID).catch(() => undefined);
  }

  private stopPeripheral(): void {
    if (!this.advertising) return;
    this.advertising = false;
    HhhBlePeripheral?.stopAdvertising();
    this.peripheralSubs.forEach((s) => s.remove());
    this.peripheralSubs = [];
    this.peripheralLinks.clear();
  }

  /** A central subscribed to our TX characteristic — run a responder session
   *  over a link backed by native notify (out) and RX writes (in). */
  private onCentralConnect(centralId: string): void {
    const node = this.node;
    if (!node || !HhhBlePeripheral || this.peripheralLinks.has(centralId)) return;
    const peripheral = HhhBlePeripheral;
    let onChunk: ((chunk: Uint8Array) => void) | undefined;
    const link: GattLink = {
      write: async (bytes) => {
        await peripheral.notify(centralId, toB64(bytes));
      },
      subscribe: (cb) => {
        onChunk = cb;
      },
      close: () => this.peripheralLinks.delete(centralId),
    };
    const channel = new FrameChannel(link, DEFAULT_LINK_MTU);
    this.peripheralLinks.set(centralId, (chunk) => onChunk?.(chunk));
    runSessionOverLink(new PeerSession(node), channel, Date.now(), { timeoutMs: SESSION_BUDGET_MS })
      .then(() => this.notifyUpdate())
      .catch(() => undefined)
      .finally(() => this.peripheralLinks.delete(centralId));
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

/** Process-wide BLE transport (real Bluetooth). Used in native builds; in Expo
 *  Go the selector falls back to the simulator. */
export const bleTransport = new BleTransport();
