import { DEFAULTS } from '../defaults';
import { Envelope, isRelayable } from '../model/envelope';
import { randRange, Rng } from '../util/rng';
import { relayProbability } from './density';

/**
 * The relay decision (spec §10.2, §10.4, §10.5). Combines hard eligibility
 * (TTL + relay expiry), suppression, density-aware probability, and randomized
 * jitter so devices don't all relay at once (broadcast-storm avoidance).
 *
 * All randomness comes from the injected `rng`, so decisions are reproducible.
 */
export type RelayPriority = 'normal' | 'urgent';

export type RelayDecision = {
  relay: boolean;
  delayMs: number;
  reason: 'ok' | 'expired' | 'suppressed' | 'probability';
};

/** Above this many nearby peers we treat the crowd as dense (longer jitter). */
export const DENSE_PEER_THRESHOLD = 8;

const NO_RELAY = (reason: RelayDecision['reason']): RelayDecision => ({
  relay: false,
  delayMs: 0,
  reason,
});

export function decideRelay(params: {
  envelope: Envelope;
  priority: RelayPriority;
  uniquePeers: number;
  suppressed: boolean;
  now: number;
  rng: Rng;
}): RelayDecision {
  const { envelope, priority, uniquePeers, suppressed, now, rng } = params;

  // Hard gate: dead by TTL or past relayUntil never relays (covers ttl === 0).
  if (!isRelayable(envelope, now)) return NO_RELAY('expired');

  // Heard too many times recently — others already carry it.
  if (suppressed) return NO_RELAY('suppressed');

  // Density-aware coin flip.
  const p = relayProbability(priority, uniquePeers);
  if (rng() >= p) return NO_RELAY('probability');

  const [lo, hi] =
    priority === 'urgent'
      ? DEFAULTS.urgentRelayDelayMs
      : uniquePeers >= DENSE_PEER_THRESHOLD
        ? DEFAULTS.denseRelayDelayMs
        : DEFAULTS.normalRelayDelayMs;

  return { relay: true, delayMs: Math.round(randRange(rng, lo, hi)), reason: 'ok' };
}
