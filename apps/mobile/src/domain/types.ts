/** Core domain types for hereherehere. */

export type LocalIdentity = {
  displayName: string;
  signPk: string; // base64 — also the friend id
  boxPk: string; // base64
  createdAt: number;
};

/** A friend the user has added (one-way: I added them). */
export type Friend = {
  id: string; // = signPk
  displayName: string;
  signPk: string;
  boxPk: string;
  addedAt: number;
  colorIndex: number; // for avatar tint
};

/** A here: where someone will be, and until when. No GPS in v1. */
export type Here = {
  id: string;
  authorId: string; // signPk of author
  eventPackId?: string;

  whereText: string;
  note?: string;

  startsAt: number;
  endsAt: number;
  createdAt: number;
  sequence: number;
};

/**
 * The encrypted unit that travels through the mesh is the mesh `Envelope`
 * (see src/mesh/model/envelope.ts), which supersedes the old RelayPacket.
 */

/** The public payload encoded into a QR / friend link. */
export type FriendCodePayload = {
  v: number;
  n: string; // displayName
  s: string; // signPk (base64)
  b: string; // boxPk (base64)
  t: number; // createdAt
};

export type EventPackPlace = {
  id: string;
  label: string;
  aliases?: string[];
  type: 'stage' | 'landmark' | 'bar' | 'bathroom' | 'food' | 'water' | 'merch' | 'other';
};

export type EventPackSet = {
  id: string;
  artist: string;
  stagePlaceId: string;
  startsAt: number;
  endsAt: number;
  aliases?: string[];
};

export type EventPackCrowdRefresh = {
  id: string;
  startsAt: number;
  label: string;
  relatedScheduleIds?: string[];
};

export type EventPack = {
  id: string;
  name: string;
  startsAt: number;
  endsAt: number;
  timezone: string;
  places: EventPackPlace[];
  schedule: EventPackSet[];
  crowdRefreshes: EventPackCrowdRefresh[];
};
