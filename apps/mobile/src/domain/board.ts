import { DAY } from '@/util/time';
import type { Friend, Here } from './types';

export type HereState = 'active' | 'expired';

export type BoardEntry = {
  friend: Friend;
  here: Here;
  state: HereState;
};

export type Board = {
  /** Friends with a here that is active or expired within the last 24h. */
  primary: BoardEntry[];
  /** Friends with no here, or whose here expired more than 24h ago. */
  quiet: Friend[];
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
  const quiet: Friend[] = [];

  for (const friend of friends) {
    const here = latestByAuthor.get(friend.id);
    // Hidden when no here, or expired more than 24h ago.
    if (!here || now - here.endsAt > DAY) {
      quiet.push(friend);
      continue;
    }
    primary.push({ friend, here, state: hereState(here, now) });
  }

  // Most recently posted first.
  primary.sort((a, b) => b.here.createdAt - a.here.createdAt);
  quiet.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return { primary, quiet };
}
