import type { EventPack } from '@/domain/types';

/**
 * Portola 2026 event pack — Pier 80, San Francisco, Sat Sep 26 + Sun Sep 27.
 *
 * Set times are transcribed from the official schedule graphics published at
 * https://portolamusicfestival.com/set-times/ (2026-Portola-SetTimes-Saturday.jpg
 * and -Sunday.jpg). Doors open 1 PM both days. Set times are subject to change
 * by the festival; if they shift, update the entries below and ship an update.
 */

// Late September in San Francisco is Pacific Daylight Time (UTC-7).
const PDT = '-07:00';
type Day = '2026-09-26' | '2026-09-27';
function t(day: Day, hhmm: string): number {
  return Date.parse(`${day}T${hhmm}:00${PDT}`);
}

const PLACES: EventPack['places'] = [
  { id: 'pier', label: 'Pier Stage', type: 'stage', aliases: ['pier'] },
  { id: 'crane', label: 'Crane Stage', type: 'stage', aliases: ['crane'] },
  { id: 'warehouse', label: 'Warehouse', type: 'stage', aliases: ['the warehouse'] },
  { id: 'ship', label: 'Ship Tent', type: 'stage', aliases: ['ship', 'the ship'] },
  { id: 'despacio', label: 'Despacio', type: 'stage', aliases: ['despacio'] },
  { id: 'entrance', label: 'the entrance', type: 'landmark', aliases: ['gates', 'entry'] },
  { id: 'food', label: 'food trucks', type: 'food', aliases: ['food', 'eats'] },
  { id: 'bar', label: 'the bar', type: 'bar', aliases: ['bar', 'drinks'] },
  { id: 'water', label: 'water refill', type: 'water', aliases: ['water'] },
  { id: 'merch', label: 'merch tent', type: 'merch', aliases: ['merch'] },
  { id: 'bathrooms', label: 'bathrooms', type: 'bathroom', aliases: ['bathroom', 'restroom', 'toilets'] },
];

type SetRow = [id: string, artist: string, stage: string, start: string, end: string, aliases?: string[]];

function day(d: Day, rows: SetRow[]): EventPack['schedule'] {
  return rows.map(([id, artist, stagePlaceId, start, end, aliases]) => ({
    id,
    artist,
    stagePlaceId,
    startsAt: t(d, start),
    endsAt: t(d, end),
    ...(aliases ? { aliases } : null),
  }));
}

// ---- Saturday, September 26 ----
const SATURDAY: EventPack['schedule'] = day('2026-09-26', [
  // Pier Stage
  ['sat-pier-1', 'Airwolf Paradise', 'pier', '13:30', '14:30'],
  ['sat-pier-2', 'Gelli Haha', 'pier', '14:40', '15:30'],
  ['sat-pier-3', 'Oskar Med K', 'pier', '15:40', '16:30'],
  ['sat-pier-4', 'Fcukers', 'pier', '16:40', '17:30'],
  ['sat-pier-5', 'Tove Lo', 'pier', '17:40', '18:30'],
  ['sat-pier-6', 'Robyn', 'pier', '19:10', '20:10'],
  ['sat-pier-7', 'Dog Blood', 'pier', '21:00', '22:15', ['skrillex', 'boys noize']],
  // Crane Stage
  ['sat-crane-1', 'Erika b2b SFCowboy', 'crane', '13:30', '15:00', ['erika', 'sf cowboy']],
  ['sat-crane-2', 'Tricky', 'crane', '15:20', '16:10'],
  ['sat-crane-3', 'nimino', 'crane', '16:25', '17:15'],
  ['sat-crane-4', 'DJ Shadow', 'crane', '17:30', '18:30', ['endtroducing']],
  ['sat-crane-5', 'Skepta', 'crane', '18:45', '19:35'],
  ['sat-crane-6', 'Fatboy Slim', 'crane', '19:55', '21:25'],
  ['sat-crane-7', 'Soulwax', 'crane', '21:55', '22:55'],
  // Warehouse
  ['sat-wh-1', 'Sam Alfred', 'warehouse', '13:30', '14:45'],
  ['sat-wh-2', 'Ranger Trucco b2b Alisha', 'warehouse', '14:45', '15:45', ['ranger trucco', 'alisha']],
  ['sat-wh-3', 'Chloé Caillet', 'warehouse', '15:45', '16:45', ['chloe caillet']],
  ['sat-wh-4', 'Groove Armada', 'warehouse', '16:45', '18:00'],
  ['sat-wh-5', 'Max Styler', 'warehouse', '18:00', '19:15'],
  ['sat-wh-6', 'Kettama', 'warehouse', '19:15', '20:30'],
  ['sat-wh-7', 'Beltran b2b Ben Sterling', 'warehouse', '20:30', '21:45', ['beltran', 'ben sterling']],
  ['sat-wh-8', 'Prospa', 'warehouse', '21:45', '23:00'],
  // Ship Tent
  ['sat-ship-1', 'Felly Fell', 'ship', '13:40', '14:40'],
  ['sat-ship-2', 'MGNA Crrrta', 'ship', '14:50', '15:30', ['mgna']],
  ['sat-ship-3', 'Six Sex', 'ship', '15:40', '16:20'],
  ['sat-ship-4', 'Mike D 5D', 'ship', '16:40', '17:30', ['mike d']],
  ['sat-ship-5', 'Jyoty', 'ship', '17:40', '18:40'],
  ['sat-ship-6', 'Bassvictim', 'ship', '18:50', '19:40'],
  ['sat-ship-7', 'Jigitz', 'ship', '19:50', '20:40'],
  ['sat-ship-8', 'nate sib', 'ship', '20:55', '21:35'],
  ['sat-ship-9', 'Melanie C (DJ set)', 'ship', '21:50', '22:30', ['melanie c']],
  // Despacio
  ['sat-desp-1', 'Despacio', 'despacio', '14:45', '21:45'],
]);

// ---- Sunday, September 27 ----
const SUNDAY: EventPack['schedule'] = day('2026-09-27', [
  // Pier Stage
  ['sun-pier-1', 'Clearcast', 'pier', '13:30', '14:20'],
  ['sun-pier-2', 'Mind Enterprises', 'pier', '14:30', '15:20'],
  ['sun-pier-3', 'Channel Tres', 'pier', '15:30', '16:20'],
  ['sun-pier-4', 'SG Lewis (Live)', 'pier', '16:30', '17:25', ['sg lewis']],
  ['sun-pier-5', 'Mochakk', 'pier', '17:35', '18:35'],
  ['sun-pier-6', 'Zara Larsson', 'pier', '19:05', '20:05'],
  ['sun-pier-7', 'Swedish House Mafia', 'pier', '20:45', '22:00', ['shm']],
  // Crane Stage
  ['sun-crane-1', 'Torren Foot', 'crane', '13:30', '14:30'],
  ['sun-crane-2', 'Azzecca', 'crane', '14:30', '15:30'],
  ['sun-crane-3', 'ADÉLA', 'crane', '15:50', '16:30', ['adela']],
  ['sun-crane-4', 'ZULAN', 'crane', '16:45', '17:35', ['zulan']],
  ['sun-crane-5', 'underscores', 'crane', '17:50', '18:40'],
  ['sun-crane-6', 'Ninajirachi', 'crane', '19:00', '19:50'],
  ['sun-crane-7', 'horsegiirL', 'crane', '20:10', '21:00', ['horsegirl']],
  ['sun-crane-8', 'Parcels', 'crane', '21:30', '22:45'],
  // Warehouse
  ['sun-wh-1', 'Dean Turnley', 'warehouse', '13:30', '14:30'],
  ['sun-wh-2', 'Silva Bumpa', 'warehouse', '14:30', '15:30'],
  ['sun-wh-3', 'Brunello', 'warehouse', '15:30', '16:30'],
  ['sun-wh-4', 'VTSS', 'warehouse', '16:30', '17:30'],
  ['sun-wh-5', 'Marlon Hoffstadt', 'warehouse', '17:30', '18:45'],
  ['sun-wh-6', 'Tiësto', 'warehouse', '18:45', '20:15', ['tiesto']],
  ['sun-wh-7', 'Overmono', 'warehouse', '20:20', '21:20'],
  ['sun-wh-8', 'Four Tet', 'warehouse', '21:30', '23:00'],
  // Ship Tent
  ['sun-ship-1', 'Kaytree', 'ship', '13:40', '14:55'],
  ['sun-ship-2', 'riria', 'ship', '14:55', '16:10'],
  ['sun-ship-3', 'ear', 'ship', '16:20', '17:00'],
  ['sun-ship-4', 'Ben UFO', 'ship', '17:10', '18:30'],
  ['sun-ship-5', 'Daphni', 'ship', '18:30', '19:50'],
  ['sun-ship-6', 'Kelela', 'ship', '20:05', '20:50'],
  ['sun-ship-7', 'JT', 'ship', '21:00', '21:30'],
  ['sun-ship-8', 'Baby J', 'ship', '21:40', '22:30'],
  // Despacio
  ['sun-desp-1', 'Despacio', 'despacio', '15:30', '22:30'],
]);

const SCHEDULE: EventPack['schedule'] = [...SATURDAY, ...SUNDAY];

/**
 * Crowd refreshes: a few moments each day when everyone gets nudged to open
 * the app at the same time, timed just before the big stage changeovers so
 * "where are you for the next set?" messages actually make it across.
 */
const CROWD_REFRESHES: EventPack['crowdRefreshes'] = [
  // Saturday
  { id: 'sat-cr-1', startsAt: t('2026-09-26', '16:30'), label: 'Crowd refresh before Fcukers + Groove Armada', relatedScheduleIds: ['sat-pier-4', 'sat-wh-4'] },
  { id: 'sat-cr-2', startsAt: t('2026-09-26', '18:35'), label: 'Crowd refresh before Skepta', relatedScheduleIds: ['sat-crane-5', 'sat-ship-6'] },
  { id: 'sat-cr-3', startsAt: t('2026-09-26', '19:45'), label: 'Crowd refresh before Fatboy Slim', relatedScheduleIds: ['sat-crane-6', 'sat-ship-7'] },
  { id: 'sat-cr-4', startsAt: t('2026-09-26', '20:50'), label: 'Crowd refresh before Dog Blood', relatedScheduleIds: ['sat-pier-7'] },
  { id: 'sat-cr-5', startsAt: t('2026-09-26', '21:45'), label: 'Crowd refresh before Soulwax + Prospa', relatedScheduleIds: ['sat-crane-7', 'sat-wh-8'] },
  // Sunday
  { id: 'sun-cr-1', startsAt: t('2026-09-27', '16:25'), label: 'Crowd refresh before SG Lewis + VTSS', relatedScheduleIds: ['sun-pier-4', 'sun-wh-4'] },
  { id: 'sun-cr-2', startsAt: t('2026-09-27', '18:35'), label: 'Crowd refresh before Tiësto', relatedScheduleIds: ['sun-wh-6'] },
  { id: 'sun-cr-3', startsAt: t('2026-09-27', '19:55'), label: 'Crowd refresh before Kelela + horsegiirL', relatedScheduleIds: ['sun-ship-6', 'sun-crane-7', 'sun-wh-7'] },
  { id: 'sun-cr-4', startsAt: t('2026-09-27', '20:35'), label: 'Crowd refresh before Swedish House Mafia', relatedScheduleIds: ['sun-pier-7'] },
  { id: 'sun-cr-5', startsAt: t('2026-09-27', '21:20'), label: 'Crowd refresh before Four Tet + Parcels', relatedScheduleIds: ['sun-wh-8', 'sun-crane-8'] },
];

export const PORTOLA_PACK: EventPack = {
  id: 'portola-2026',
  name: 'Portola 2026',
  startsAt: t('2026-09-26', '13:00'),
  endsAt: t('2026-09-27', '23:30'),
  timezone: 'America/Los_Angeles',
  places: PLACES,
  schedule: SCHEDULE,
  crowdRefreshes: CROWD_REFRESHES,
};

/** Event packs available to install in this build. */
export const AVAILABLE_PACKS: EventPack[] = [PORTOLA_PACK];
