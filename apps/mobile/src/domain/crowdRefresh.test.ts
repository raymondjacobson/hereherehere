import { describe, expect, it } from 'vitest';
import { planCrowdRefreshReminders } from './crowdRefresh';
import type { EventPack } from './types';

const pack = (id: string, refreshes: EventPack['crowdRefreshes']): EventPack => ({
  id,
  name: id,
  startsAt: 0,
  endsAt: 10_000,
  timezone: 'UTC',
  places: [],
  schedule: [],
  crowdRefreshes: refreshes,
});

describe('planCrowdRefreshReminders', () => {
  it('keeps only future refreshes, earliest first', () => {
    const p = pack('p', [
      { id: 'late', startsAt: 3000, label: 'Crowd refresh before B' },
      { id: 'past', startsAt: 500, label: 'Crowd refresh before A' },
      { id: 'soon', startsAt: 2000, label: 'Crowd refresh before C' },
    ]);
    const plan = planCrowdRefreshReminders([p], 1000);
    expect(plan.map((r) => r.refreshId)).toEqual(['soon', 'late']);
    expect(plan[0].id).toBe('p:soon');
    expect(plan[0].fireAt).toBe(2000);
  });

  it('turns the label into a title and dedupes across packs', () => {
    const p = pack('portola', [{ id: 'x', startsAt: 5, label: 'Crowd refresh before Robyn' }]);
    const plan = planCrowdRefreshReminders([p, p], 0);
    expect(plan).toHaveLength(1);
    expect(plan[0].title).toBe('Crowd refresh before Robyn');
    expect(plan[0].body).toMatch(/hereherehere/);
  });

  it('falls back to a generic title when the label is bare', () => {
    const p = pack('p', [{ id: 'x', startsAt: 5, label: 'Crowd refresh' }]);
    expect(planCrowdRefreshReminders([p], 0)[0].title).toBe('Crowd refresh time');
  });
});
