import type { Transport } from './types';
import { mockTransport } from './mock';
import { bleTransport } from './ble/bleTransport';
import { isPeripheralAvailable } from '../../modules/hhh-ble-peripheral';

/**
 * The active transport for this runtime.
 *
 * A native build ships the CoreBluetooth peripheral module, so we use **real
 * Bluetooth** (`bleTransport`). In Expo Go — and any build without the native
 * module — that module is absent, so we fall back to the **simulated mesh**
 * (`mockTransport`) and the app stays fully demoable with synthetic peers.
 *
 * Product code imports `transport` and never branches on which one it is; the
 * mock-only synthetic-peer wiring is gated on `isSimulatedTransport`.
 */
export const transport: Transport = isPeripheralAvailable ? bleTransport : mockTransport;

/** True when running on the simulated mesh (Expo Go) rather than real BLE. */
export const isSimulatedTransport = !isPeripheralAvailable;
