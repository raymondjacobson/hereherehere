import { describe, expect, it } from 'vitest';
import { DEFAULTS } from '../defaults';
import { fakeEnvelope } from '../testutil/factories';
import { mulberry32, Rng } from '../util/rng';
import { decideRelay, DENSE_PEER_THRESHOLD } from './policy';

/** rng yielding a fixed sequence (then repeating). */
function seqRng(values: number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length];
}

const base = {
  priority: 'normal' as const,
  uniquePeers: 1,
  suppressed: false,
  now: 5_000,
  rng: seqRng([0]),
};

describe('decideRelay', () => {
  it('never relays an object with ttl 0', () => {
    const d = decideRelay({ ...base, envelope: fakeEnvelope({ ttl: 0 }) });
    expect(d.relay).toBe(false);
    expect(d.reason).toBe('expired');
  });

  it('never relays past relayUntil', () => {
    const d = decideRelay({ ...base, envelope: fakeEnvelope({ relayUntil: 1_000 }), now: 2_000 });
    expect(d.relay).toBe(false);
    expect(d.reason).toBe('expired');
  });

  it('does not relay when suppressed', () => {
    const d = decideRelay({ ...base, envelope: fakeEnvelope(), suppressed: true });
    expect(d.relay).toBe(false);
    expect(d.reason).toBe('suppressed');
  });

  it('drops on the probability roll when rng exceeds p', () => {
    // dense crowd -> p = 0.15; a roll of 0.99 fails the gate
    const d = decideRelay({
      ...base,
      envelope: fakeEnvelope(),
      uniquePeers: 30,
      rng: seqRng([0.99]),
    });
    expect(d.relay).toBe(false);
    expect(d.reason).toBe('probability');
  });

  it('relays with normal jitter bounds in a sparse crowd', () => {
    const d = decideRelay({
      ...base,
      envelope: fakeEnvelope(),
      uniquePeers: 2,
      rng: seqRng([0, 0.5]), // pass gate, midpoint jitter
    });
    expect(d.relay).toBe(true);
    const [lo, hi] = DEFAULTS.normalRelayDelayMs;
    expect(d.delayMs).toBeGreaterThanOrEqual(lo);
    expect(d.delayMs).toBeLessThanOrEqual(hi);
  });

  it('uses dense jitter bounds in a dense crowd', () => {
    const d = decideRelay({
      ...base,
      envelope: fakeEnvelope(),
      uniquePeers: DENSE_PEER_THRESHOLD,
      rng: seqRng([0, 1 - 1e-9]),
    });
    expect(d.relay).toBe(true);
    const [lo, hi] = DEFAULTS.denseRelayDelayMs;
    expect(d.delayMs).toBeGreaterThanOrEqual(lo);
    expect(d.delayMs).toBeLessThanOrEqual(hi);
  });

  it('uses urgent jitter bounds for urgent objects', () => {
    const d = decideRelay({
      ...base,
      envelope: fakeEnvelope(),
      priority: 'urgent',
      uniquePeers: 20,
      rng: seqRng([0, 0.5]),
    });
    expect(d.relay).toBe(true);
    const [lo, hi] = DEFAULTS.urgentRelayDelayMs;
    expect(d.delayMs).toBeGreaterThanOrEqual(lo);
    expect(d.delayMs).toBeLessThanOrEqual(hi);
  });

  it('is deterministic under a fixed seed', () => {
    const env = fakeEnvelope();
    const a = decideRelay({ ...base, envelope: env, uniquePeers: 5, rng: mulberry32(123) });
    const b = decideRelay({ ...base, envelope: env, uniquePeers: 5, rng: mulberry32(123) });
    expect(a).toEqual(b);
  });
});
