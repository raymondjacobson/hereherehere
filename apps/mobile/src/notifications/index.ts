import * as Notifications from 'expo-notifications';
import type { EventPack } from '@/domain/types';
import { planCrowdRefreshReminders } from '@/domain/crowdRefresh';

/** Tag on every notification we schedule, so we only ever cancel our own. */
export const CROWD_REFRESH_KIND = 'crowd-refresh';

/**
 * Show crowd-refresh reminders even while the app is foregrounded (the point
 * is "open it now, together"). Called once at app start.
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Make the OS's pending local notifications match the installed packs: cancel
 * every crowd-refresh reminder we previously scheduled, then (if the user has
 * allowed notifications) schedule one per future crowd refresh. Safe to call
 * often; resolves with how many are now scheduled. Never throws — a missing
 * notifications module (e.g. some Expo Go builds) just means no reminders.
 */
export async function syncCrowdRefreshReminders(packs: EventPack[], now = Date.now()): Promise<number> {
  try {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      pending
        .filter((n) => n.content.data?.kind === CROWD_REFRESH_KIND)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );

    const perms = await Notifications.getPermissionsAsync();
    if (perms.status !== 'granted') return 0;

    const plan = planCrowdRefreshReminders(packs, now);
    for (const r of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: {
          title: r.title,
          body: r.body,
          data: { kind: CROWD_REFRESH_KIND, packId: r.packId, refreshId: r.refreshId },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.fireAt) },
      });
    }
    if (__DEV__) console.log(`[notifications] scheduled ${plan.length} crowd-refresh reminder(s)`);
    return plan.length;
  } catch (e) {
    if (__DEV__) console.warn('[notifications] could not schedule reminders', e);
    return 0;
  }
}

/** True if a notification response is one of our crowd-refresh reminders. */
export function isCrowdRefreshResponse(response: Notifications.NotificationResponse | null | undefined): boolean {
  return response?.notification.request.content.data?.kind === CROWD_REFRESH_KIND;
}
