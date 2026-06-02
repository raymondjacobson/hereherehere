/**
 * Latest-status conflict resolution (spec §2.1). For a given author:
 *   1. higher sequence wins
 *   2. tie -> higher createdAt wins
 *   3. tie -> lexicographically higher messageId wins
 *
 * Arrival time is NEVER used to overwrite a newer status with an older one.
 * Extracted from the inline comparator in state/store.ts so the store and the
 * relay cache's supersede logic share one definition.
 */
export type Versioned = {
  sequence: number;
  createdAt: number;
  messageId?: string;
};

export function isNewer(candidate: Versioned, current?: Versioned | null): boolean {
  if (!current) return true;
  if (candidate.sequence !== current.sequence) return candidate.sequence > current.sequence;
  if (candidate.createdAt !== current.createdAt) return candidate.createdAt > current.createdAt;
  if (candidate.messageId != null && current.messageId != null) {
    return candidate.messageId > current.messageId;
  }
  return false;
}
