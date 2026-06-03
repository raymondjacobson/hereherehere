import type { EventPack } from './types';

export type Suggestion = {
  key: string;
  label: string;
  /** When this corresponds to a scheduled set, its end time (for "until" default). */
  setEndsAt?: number;
  sublabel?: string;
  kind: 'set' | 'place';
};

export function buildSuggestions(packs: EventPack[]): Suggestion[] {
  const out: Suggestion[] = [];
  for (const pack of packs) {
    const stageById = new Map(pack.places.map((p) => [p.id, p.label]));
    for (const set of pack.schedule) {
      const stage = stageById.get(set.stagePlaceId) ?? '';
      out.push({
        key: `set:${pack.id}:${set.id}`,
        // Artist only — keeps chips short; the stage stays as a subtle sublabel
        // (shown in the full picker, still searchable).
        label: set.artist,
        sublabel: stage || 'set',
        setEndsAt: set.endsAt,
        kind: 'set',
      });
    }
    for (const place of pack.places) {
      out.push({
        key: `place:${pack.id}:${place.id}`,
        label: place.label,
        sublabel: place.type,
        kind: 'place',
      });
    }
  }
  return out;
}

function haystack(s: Suggestion): string {
  return `${s.label} ${s.sublabel ?? ''}`.toLowerCase();
}

export function filterSuggestions(all: Suggestion[], query: string, limit = 8): Suggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    // With no query, surface upcoming sets first, then places.
    return all.slice().sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'set' ? -1 : 1)).slice(0, limit);
  }
  const scored = all
    .map((s) => {
      const h = haystack(s);
      const idx = h.indexOf(q);
      return { s, score: idx < 0 ? Infinity : idx };
    })
    .filter((x) => x.score !== Infinity)
    .sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((x) => x.s);
}
