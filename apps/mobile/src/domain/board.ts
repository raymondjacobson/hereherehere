import { DAY } from '@/util/time';
import type { Friend, Here } from './types';

export type HereState = 'active' | 'expired';

export type BoardEntry = {
  friend: Friend;
  here: Here;
  state: HereState;
};

export type QuietEntry = {
  friend: Friend;
  /** Their most recent here, if they have ever sent one (always expired here). */
  here?: Here;
};

export type Board = {
  /** Friends with a here that is active or expired within the last 24h. */
  primary: BoardEntry[];
  /** Friends with no here, or whose here expired more than 24h ago. */
  quiet: QuietEntry[];
};

export function hereState(here: Here, now: number): HereState {
  return now < here.endsAt ? 'active' : 'expired';
}

/**
 * Build the people board per PRD §5.3 ordering rules.
 * `latestByAuthor` maps a friend id to that friend's most recent here.
 */
export function computeBoard(
  friends: Friend[],
  latestByAuthor: Map<string, Here>,
  now: number,
): Board {
  const primary: BoardEntry[] = [];
  const quiet: QuietEntry[] = [];

  for (const friend of friends) {
    const here = latestByAuthor.get(friend.id);
    // Hidden when no here, or expired more than 24h ago. Their last message
    // (if any) still rides along so it can be shown when expanded.
    if (!here || now - here.endsAt > DAY) {
      quiet.push({ friend, here });
      continue;
    }
    primary.push({ friend, here, state: hereState(here, now) });
  }

  // Most recently posted first.
  primary.sort((a, b) => b.here.createdAt - a.here.createdAt);
  quiet.sort((a, b) => a.friend.displayName.localeCompare(b.friend.displayName));

  return { primary, quiet };
}
