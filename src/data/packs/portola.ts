import type { EventPack } from '@/domain/types';

/**
 * Portola Festival event pack (Pier 80, San Francisco).
 * Schedule data here is illustrative placeholder content for the MVP — the real
 * source of truth (lineup + set times) gets dropped in before launch.
 */

// PDT is UTC-7. Build set times from local festival clock.
const PDT = '-07:00';
function t(day: '2026-09-26' | '2026-09-27', hhmm: string): number {
  return Date.parse(`${day}T${hhmm}:00${PDT}`);
}

const PLACES: EventPack['places'] = [
  { id: 'crane', label: 'Crane Stage', type: 'stage', aliases: ['crane'] },
  { id: 'pier', label: 'Pier Stage', type: 'stage', aliases: ['pier'] },
  { id: 'warehouse', label: 'Warehouse', type: 'stage', aliases: ['the warehouse'] },
  { id: 'gobi', label: 'Gobi Tent', type: 'stage', aliases: ['gobi'] },
  { id: 'main-disco', label: 'main disco ball', type: 'landmark' },
  { id: 'ferris', label: 'the ferris wheel', type: 'landmark' },
  { id: 'food', label: 'food trucks', type: 'food', aliases: ['food', 'eats'] },
  { id: 'bar-1', label: 'main bar', type: 'bar', aliases: ['bar'] },
  { id: 'water-pier', label: 'water station by Pier', type: 'water', aliases: ['water'] },
  { id: 'merch', label: 'merch tent', type: 'merch', aliases: ['merch'] },
  { id: 'bathroom-crane', label: 'bathrooms by Crane', type: 'bathroom', aliases: ['bathroom', 'restroom'] },
];

const SCHEDULE: EventPack['schedule'] = [
  // Day 1
  { id: 's1', artist: 'Justice', stagePlaceId: 'crane', startsAt: t('2026-09-26', '21:15'), endsAt: t('2026-09-26', '22:45') },
  { id: 's2', artist: 'Fcukers', stagePlaceId: 'crane', startsAt: t('2026-09-26', '18:30'), endsAt: t('2026-09-26', '19:30'), aliases: ['fcukers'] },
  { id: 's3', artist: 'Jamie xx', stagePlaceId: 'pier', startsAt: t('2026-09-26', '20:00'), endsAt: t('2026-09-26', '21:15') },
  { id: 's4', artist: 'Overmono', stagePlaceId: 'warehouse', startsAt: t('2026-09-26', '19:45'), endsAt: t('2026-09-26', '21:00') },
  { id: 's5', artist: 'Confidence Man', stagePlaceId: 'gobi', startsAt: t('2026-09-26', '18:45'), endsAt: t('2026-09-26', '19:45') },
  // Day 2
  { id: 's6', artist: 'Charli xcx', stagePlaceId: 'crane', startsAt: t('2026-09-27', '21:00'), endsAt: t('2026-09-27', '22:30') },
  { id: 's7', artist: 'Four Tet', stagePlaceId: 'pier', startsAt: t('2026-09-27', '20:00'), endsAt: t('2026-09-27', '21:15') },
  { id: 's8', artist: 'Floating Points', stagePlaceId: 'warehouse', startsAt: t('2026-09-27', '19:30'), endsAt: t('2026-09-27', '20:45') },
];

const CROWD_REFRESHES: EventPack['crowdRefreshes'] = [
  { id: 'cr1', startsAt: t('2026-09-26', '18:20'), label: 'Crowd refresh before the evening sets', relatedScheduleIds: ['s2', 's5'] },
  { id: 'cr2', startsAt: t('2026-09-26', '19:50'), label: 'Crowd refresh before Jamie xx + Justice', relatedScheduleIds: ['s1', 's3'] },
  { id: 'cr3', startsAt: t('2026-09-26', '21:05'), label: 'Crowd refresh before Justice', relatedScheduleIds: ['s1'] },
  { id: 'cr4', startsAt: t('2026-09-27', '19:20'), label: 'Crowd refresh before the night', relatedScheduleIds: ['s8'] },
  { id: 'cr5', startsAt: t('2026-09-27', '20:50'), label: 'Crowd refresh before Charli xcx', relatedScheduleIds: ['s6'] },
];

export const PORTOLA_PACK: EventPack = {
  id: 'portola-2026',
  name: 'Portola 2026',
  startsAt: t('2026-09-26', '12:00'),
  endsAt: t('2026-09-27', '23:30'),
  timezone: 'America/Los_Angeles',
  places: PLACES,
  schedule: SCHEDULE,
  crowdRefreshes: CROWD_REFRESHES,
};

/** Event packs available to install in this build. */
export const AVAILABLE_PACKS: EventPack[] = [PORTOLA_PACK];
