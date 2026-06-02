export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/** "9:45 PM" */
export function clockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Compact relative time, e.g. "8m", "2h", "3d". */
export function shortAgo(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/** "Now → 9:45 PM" style window, collapsing "now" when start is ~current. */
export function windowLabel(startsAt: number, endsAt: number, now: number): string {
  const start = startsAt <= now + 2 * MIN ? 'Now' : clockTime(startsAt);
  return `${start} → ${clockTime(endsAt)}`;
}

/** "15m left" / "1h 5m left" / "2h left" — for an active window. */
export function timeLeftLabel(endsAt: number, now: number): string {
  const ms = endsAt - now;
  if (ms <= 0) return 'ended';
  const mins = Math.ceil(ms / MIN);
  if (mins < 60) return `${mins}m left`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h left` : `${h}h ${m}m left`;
}

/** "Posted 8:32 PM · received 8:39 PM" — receivedAt optional. */
export function provenanceLabel(createdAt: number, receivedAt?: number): string {
  const posted = `Posted ${clockTime(createdAt)}`;
  if (receivedAt && receivedAt - createdAt > MIN) return `${posted} · received ${clockTime(receivedAt)}`;
  return posted;
}
