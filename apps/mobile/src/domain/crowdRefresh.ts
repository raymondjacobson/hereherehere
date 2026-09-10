import type { EventPack } from './types';

/**
 * A local reminder to open the app for a crowd refresh. Pure planning logic —
 * the expo-notifications glue lives in src/notifications so this stays testable.
 */
export type PlannedReminder = {
  /** Stable notification identifier: `<packId>:<refreshId>`. */
  id: string;
  packId: string;
  refreshId: string;
  fireAt: number;
  title: string;
  body: string;
};

/** "Crowd refresh before Robyn" → "before Robyn"; anything else passes through. */
function moment(label: string): string {
  return label.replace(/^crowd refresh\s*/i, '').trim();
}

/**
 * Plan reminders for every installed pack's crowd refreshes that are still in
 * the future, earliest first. Past refreshes are dropped so an install mid-event
 * only schedules what's left.
 */
export function planCrowdRefreshReminders(packs: EventPack[], now: number): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  const seen = new Set<string>();
  for (const pack of packs) {
    for (const cr of pack.crowdRefreshes) {
      if (cr.startsAt <= now) continue;
      const id = `${pack.id}:${cr.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const m = moment(cr.label);
      out.push({
        id,
        packId: pack.id,
        refreshId: cr.id,
        fireAt: cr.startsAt,
        title: m ? `Crowd refresh ${m}` : 'Crowd refresh time',
        body: 'Open hereherehere for a few seconds so messages can hop between the phones around you.',
      });
    }
  }
  return out.sort((a, b) => a.fireAt - b.fireAt);
}
