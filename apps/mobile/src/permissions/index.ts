import * as Notifications from 'expo-notifications';

/**
 * Permission requests, in one place so the priming screen and Settings share
 * the same calls.
 *
 * Notifications use the real OS prompt (expo-notifications). Bluetooth is
 * modeled as app state for now: the mesh is still *simulated* (see
 * transport/mock) and the app ships no native Core Bluetooth module, so there
 * is no OS Bluetooth dialog to trigger from JS yet. When the real BLE transport
 * lands, swap `requestBluetooth` for the native request (e.g. instantiating a
 * CBCentralManager) — the call sites won't have to change.
 */

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function getNotificationsStatus(): Promise<PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

export async function requestNotifications(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.status === 'granted';
  // Only the first request shows a dialog; after that iOS returns the cached
  // status, so re-requesting is a safe no-op.
  if (!granted && existing.canAskAgain !== false) {
    const res = await Notifications.requestPermissionsAsync();
    granted = res.status === 'granted';
  }
  return granted;
}

export async function requestBluetooth(): Promise<boolean> {
  // No native BLE module yet — see file header. Reflect the user's intent so
  // the (simulated) mesh and the priming UI share one switch.
  return true;
}
