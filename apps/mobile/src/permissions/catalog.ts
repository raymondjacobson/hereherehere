import type { ImageSourcePropType } from 'react-native';
import { requestBluetooth, requestNotifications } from '.';

export type PermissionKey = 'bluetooth' | 'notifications';

export type PermissionInfo = {
  key: PermissionKey;
  image: ImageSourcePropType;
  title: string;
  body: string;
  cta: string;
  request: () => Promise<boolean>;
};

/** Shared so the app-start priming screen and Settings show identical copy. */
export const PERMISSIONS: PermissionInfo[] = [
  {
    key: 'bluetooth',
    image: require('../../assets/permissions/nearby-bluetooth.png'),
    title: 'Bluetooth & nearby phones',
    body: 'hereherehere uses Bluetooth to pass messages between phones around you when there’s no signal. It never tracks your location.',
    cta: 'Allow Bluetooth',
    request: requestBluetooth,
  },
  {
    key: 'notifications',
    image: require('../../assets/permissions/notifications-ping.png'),
    title: 'Notifications',
    body: 'Get a nudge when it’s time to open the app for a crowd refresh, so your friends’ updates can reach you.',
    cta: 'Allow notifications',
    request: requestNotifications,
  },
];
