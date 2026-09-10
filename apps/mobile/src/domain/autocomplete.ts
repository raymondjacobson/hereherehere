import type { EventPack } from './types';

export type Suggestion = {
  key: string;
  label: string;
  /** When this corresponds to a scheduled set, its start/end (for ordering and the "until" default). */
  startsAt?: number;
  setEndsAt?: number;
  sublabel?: string;
  /** Extra search terms (e.g. "skrillex" for Dog Blood, "restroom" for bathrooms). */
  aliases?: string[];
  kind: 'set' | 'place';
};

/** "Sat 4:40 PM" in the pack's own timezone, so it reads right anywhere. */
function whenLabel(ts: number, timeZone: string): string {
  try {
    return new Date(ts).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone });
  } catch {
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
}

export function buildSuggestions(packs: EventPack[]): Suggestion[] {
  const out: Suggestion[] = [];
  for (const pack of packs) {
    const stageById = new Map(pack.places.map((p) => [p.id, p.label]));
    const sets = pack.schedule.slice().sort((a, b) => a.startsAt - b.startsAt);
    for (const set of sets) {
      const stage = stageById.get(set.stagePlaceId) ?? '';
      out.push({
        key: `set:${pack.id}:${set.id}`,
        // Artist only — keeps chips short; the stage and time stay as a subtle
        // sublabel (shown in the full picker, still searchable).
        label: set.artist,
        sublabel: [whenLabel(set.startsAt, pack.timezone), stage].filter(Boolean).join(' · '),
        startsAt: set.startsAt,
        setEndsAt: set.endsAt,
        aliases: set.aliases,
        kind: 'set',
      });
    }
    for (const place of pack.places) {
      out.push({
        key: `place:${pack.id}:${place.id}`,
        label: place.label,
        sublabel: place.type,
        aliases: place.aliases,
        kind: 'place',
      });
    }
  }
  return out;
}

function haystack(s: Suggestion): string {
  return `${s.label} ${s.sublabel ?? ''} ${(s.aliases ?? []).join(' ')}`.toLowerCase();
}

/**
 * Rank suggestions for the composer. With no query: sets that are on now or
 * still to come (soonest first), then sets already finished, then places. With
 * a query: substring match over label, sublabel, and aliases, earliest match
 * position first.
 */
export function filterSuggestions(all: Suggestion[], query: string, limit = 8, now = Date.now()): Suggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    const rank = (s: Suggestion) => (s.kind === 'place' ? 2 : (s.setEndsAt ?? 0) > now ? 0 : 1);
    return all
      .slice()
      .sort((a, b) => rank(a) - rank(b) || (a.startsAt ?? 0) - (b.startsAt ?? 0))
      .slice(0, limit);
  }
  const scored = all
    .map((s) => {
      const h = haystack(s);
      const idx = h.indexOf(q);
      return { s, score: idx < 0 ? Infinity : idx };
    })
    .filter((x) => x.score !== Infinity)
    .sort((a, b) => a.score - b.score || (a.s.startsAt ?? 0) - (b.s.startsAt ?? 0));
  return scored.slice(0, limit).map((x) => x.s);
}
