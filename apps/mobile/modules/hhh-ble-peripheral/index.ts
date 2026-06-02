import { requireOptionalNativeModule } from 'expo-modules-core';

/** A central wrote bytes to our RX characteristic. */
export type ReceiveEvent = { centralId: string; data: string };
/** A central subscribed to / unsubscribed from our TX characteristic. */
export type CentralEvent = { centralId: string };
export type StateEvent = { state: number };

type Subscription = { remove(): void };

export type HhhBlePeripheralModule = {
  /**
   * Start advertising the given GATT service with a writable RX characteristic
   * (central → us) and a notify TX characteristic (us → central). Idempotent;
   * begins as soon as Bluetooth powers on.
   */
  startAdvertising(serviceUUID: string, rxUUID: string, txUUID: string): Promise<void>;
  /** Stop advertising and tear down the service. */
  stopAdvertising(): void;
  /**
   * Notify `dataB64` to a subscribed central on the TX characteristic. Resolves
   * false if the BLE stack's transmit queue was full (it will flush and the
   * caller should retry); the link layer serializes writes so this is rare.
   */
  notify(centralId: string, dataB64: string): Promise<boolean>;
  addListener(event: 'onReceive', listener: (e: ReceiveEvent) => void): Subscription;
  addListener(event: 'onCentralConnect' | 'onCentralDisconnect', listener: (e: CentralEvent) => void): Subscription;
  addListener(event: 'onStateChange', listener: (e: StateEvent) => void): Subscription;
};

/**
 * The CoreBluetooth peripheral module — the advertising/serving half of the
 * mesh that `react-native-ble-plx` (central-only) can't provide. Null in Expo
 * Go and any build without the native module compiled in, so callers must
 * null-check (the transport selector only reaches for it in native builds).
 */
export const HhhBlePeripheral = requireOptionalNativeModule<HhhBlePeripheralModule>('HhhBlePeripheral');

export const isPeripheralAvailable = HhhBlePeripheral != null;
