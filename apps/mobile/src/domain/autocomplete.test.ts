import { describe, expect, it } from 'vitest';
import { buildSuggestions, filterSuggestions } from './autocomplete';
import type { EventPack } from './types';

const H = 3_600_000;
const pack: EventPack = {
  id: 'p',
  name: 'P',
  startsAt: 0,
  endsAt: 100 * H,
  timezone: 'UTC',
  places: [
    { id: 'main', label: 'Main Stage', type: 'stage' },
    { id: 'wc', label: 'bathrooms', type: 'bathroom', aliases: ['restroom'] },
  ],
  schedule: [
    { id: 'late', artist: 'Late Act', stagePlaceId: 'main', startsAt: 10 * H, endsAt: 11 * H },
    { id: 'early', artist: 'Early Act', stagePlaceId: 'main', startsAt: 1 * H, endsAt: 2 * H },
    { id: 'mid', artist: 'Mid Act', stagePlaceId: 'main', startsAt: 5 * H, endsAt: 6 * H, aliases: ['skrillex'] },
  ],
  crowdRefreshes: [],
};

describe('autocomplete', () => {
  const all = buildSuggestions([pack]);

  it('orders sets by start time and labels them with time + stage', () => {
    const sets = all.filter((s) => s.kind === 'set');
    expect(sets.map((s) => s.label)).toEqual(['Early Act', 'Mid Act', 'Late Act']);
    expect(sets[0].sublabel).toMatch(/Main Stage/);
    expect(sets[0].sublabel).toMatch(/1:00 AM/);
  });

  it('with no query, surfaces what is on or upcoming before finished sets, then places', () => {
    const now = 5.5 * H; // Mid Act is on, Early Act is over
    expect(filterSuggestions(all, '', 8, now).map((s) => s.label)).toEqual([
      'Mid Act',
      'Late Act',
      'Early Act',
      'Main Stage',
      'bathrooms',
    ]);
  });

  it('matches aliases', () => {
    expect(filterSuggestions(all, 'skrill', 8, 0).map((s) => s.label)).toEqual(['Mid Act']);
    expect(filterSuggestions(all, 'restroom', 8, 0).map((s) => s.label)).toEqual(['bathrooms']);
  });

  it('respects the limit', () => {
    expect(filterSuggestions(all, '', 2, 0)).toHaveLength(2);
  });
});
