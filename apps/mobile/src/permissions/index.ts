import * as Notifications from 'expo-notifications';
import { transport, isSimulatedTransport } from '@/transport';

/**
 * Permission requests, in one place so the priming screen and Settings share
 * the same calls.
 *
 * Notifications use the real OS prompt (expo-notifications). Bluetooth, in a
 * native build, primes CoreBluetooth via the active transport so the iOS prompt
 * fires here (e.g. when the user taps Allow in onboarding) rather than later
 * when the board starts scanning. In Expo Go the mesh is simulated, so there's
 * nothing to prompt for and we just reflect intent.
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
  // Expo Go / simulated mesh: nothing to prompt for.
  if (isSimulatedTransport) return true;
  // Native build: trigger the iOS Bluetooth prompt now by priming CoreBluetooth.
  return transport.requestPermission?.() ?? true;
}
