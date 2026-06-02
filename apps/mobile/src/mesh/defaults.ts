/**
 * Protocol tuning parameters (spec §20). These are starting values to be tuned
 * with the simulator and real phones — not assumed correct.
 */
const MIN = 60_000;
const HOUR = 60 * MIN;

export const DEFAULTS = {
  // TTL (max relay hops) by object class
  normalTtl: 4,
  urgentTtl: 6,
  receiptTtl: 3,
  tombstoneTtl: 4,

  // object size
  maxObjectBytes: 1024,
  idealObjectBytes: 512,

  // relay/display expiry split
  statusRelayGraceMs: 30 * MIN, // relay a bit past statusUntil
  maxRelayLifetimeMs: 12 * HOUR, // never relay older than this
  displayLifetimeMs: 48 * HOUR, // hard drop from storage

  // dedupe + suppression
  exactDedupeSize: 4096,
  heardSuppressionThreshold: 3,
  heardSuppressionWindowMs: 2 * MIN,
  densityWindowMs: 2 * MIN,

  // relay delay jitter [min, max] ms
  normalRelayDelayMs: [2_000, 20_000] as const,
  denseRelayDelayMs: [5_000, 45_000] as const,
  urgentRelayDelayMs: [500, 5_000] as const,

  // anti-entropy session bounds
  maxWantObjectsPerSession: 32,
  maxWantBytesPerSession: 16_384,
  bloomFilterBytes: 512,

  // cache budgets (event/foreground mode)
  maxCacheObjects: 5000,
  maxCacheBytes: 20 * 1024 * 1024,
} as const;

/**
 * Default relay/display expiry for a status created at `createdAt` whose
 * display window ends at `statusUntil` (the here's endsAt).
 */
export function relayUntilFor(createdAt: number, statusUntil: number): number {
  return Math.min(statusUntil + DEFAULTS.statusRelayGraceMs, createdAt + DEFAULTS.maxRelayLifetimeMs);
}

export function expiresAtFor(createdAt: number): number {
  return createdAt + DEFAULTS.displayLifetimeMs;
}
