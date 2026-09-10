import { describe, expect, it } from 'vitest';
import { PORTOLA_PACK } from './portola';

const LA = 'America/Los_Angeles';
function laParts(ts: number) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LA,
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(ts));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { weekday: get('weekday'), hour: Number(get('hour')) % 24, minute: Number(get('minute')) };
}

describe('Portola 2026 pack', () => {
  const { schedule, places, crowdRefreshes } = PORTOLA_PACK;
  const placeIds = new Set(places.map((p) => p.id));

  it('has unique ids and valid stages', () => {
    const ids = schedule.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of schedule) expect(placeIds.has(s.stagePlaceId)).toBe(true);
  });

  it('every set has a positive duration inside the festival window', () => {
    for (const s of schedule) {
      expect(s.endsAt).toBeGreaterThan(s.startsAt);
      expect(s.startsAt).toBeGreaterThanOrEqual(PORTOLA_PACK.startsAt);
      expect(s.endsAt).toBeLessThanOrEqual(PORTOLA_PACK.endsAt);
    }
  });

  it('sets on one stage never overlap', () => {
    for (const stage of placeIds) {
      const sets = schedule.filter((s) => s.stagePlaceId === stage).sort((a, b) => a.startsAt - b.startsAt);
      for (let i = 1; i < sets.length; i++) {
        expect(sets[i].startsAt).toBeGreaterThanOrEqual(sets[i - 1].endsAt);
      }
    }
  });

  it('lands on the right local day and clock time in San Francisco', () => {
    const robyn = schedule.find((s) => s.artist === 'Robyn')!;
    expect(laParts(robyn.startsAt)).toEqual({ weekday: 'Sat', hour: 19, minute: 10 });
    const fourTet = schedule.find((s) => s.artist === 'Four Tet')!;
    expect(laParts(fourTet.endsAt)).toEqual({ weekday: 'Sun', hour: 23, minute: 0 });
    for (const s of schedule) {
      const day = s.id.startsWith('sat-') ? 'Sat' : 'Sun';
      expect(laParts(s.startsAt).weekday).toBe(day);
    }
  });

  it('crowd refreshes sit inside the window and point at real sets', () => {
    const setIds = new Set(schedule.map((s) => s.id));
    const ids = crowdRefreshes.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const cr of crowdRefreshes) {
      expect(cr.startsAt).toBeGreaterThan(PORTOLA_PACK.startsAt);
      expect(cr.startsAt).toBeLessThan(PORTOLA_PACK.endsAt);
      for (const id of cr.relatedScheduleIds ?? []) {
        expect(setIds.has(id)).toBe(true);
        // A refresh is a nudge *before* the related sets start.
        expect(cr.startsAt).toBeLessThanOrEqual(schedule.find((s) => s.id === id)!.startsAt);
      }
    }
  });

  it('covers the full lineup', () => {
    expect(schedule.filter((s) => s.id.startsWith('sat-'))).toHaveLength(32);
    expect(schedule.filter((s) => s.id.startsWith('sun-'))).toHaveLength(32);
  });
});
