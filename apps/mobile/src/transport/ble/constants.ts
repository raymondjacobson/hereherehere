/**
 * BLE GATT service definition for the hereherehere mesh (spec §4.3). One
 * service UUID per protocol family lets the OS filter scans efficiently.
 *
 * Frame types are logical — either side sends the same frame types over
 * whichever characteristic direction is available (spec §4.3), so the protocol
 * tolerates one-sided role availability.
 */
export const HHH_SERVICE_UUID = 'b9a7e6c0-1f2d-4a3b-8c5e-7d6f9a0b1c2d';

/** Central writes control/data frames here (peripheral's RX). */
export const HHH_RX_CHAR_UUID = 'b9a7e6c1-1f2d-4a3b-8c5e-7d6f9a0b1c2d';

/** Peripheral notifies frames here (central's TX / inbound). */
export const HHH_TX_CHAR_UUID = 'b9a7e6c2-1f2d-4a3b-8c5e-7d6f9a0b1c2d';

/** Conservative default characteristic write size before BLE MTU negotiation. */
export const DEFAULT_LINK_MTU = 180;

/** Per-session wall-clock budget (spec §5.1 background wake). */
export const SESSION_BUDGET_MS = 8_000;
