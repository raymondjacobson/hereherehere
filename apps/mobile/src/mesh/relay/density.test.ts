import { describe, expect, it } from 'vitest';
import { DensityTracker, relayProbability } from './density';

describe('DensityTracker', () => {
  it('counts unique peers within the window', () => {
    const d = new DensityTracker(120_000);
    d.observe('p1', 0);
    d.observe('p2', 0);
    d.observe('p1', 1000); // same peer again
    expect(d.uniquePeers(1000)).toBe(2);
  });

  it('drops peers that fall out of the window', () => {
    const d = new DensityTracker(120_000);
    d.observe('p1', 0);
    d.observe('p2', 119_000);
    expect(d.uniquePeers(120_001)).toBe(1); // p1 aged out
  });
});

describe('relayProbability', () => {
  it('decreases monotonically as the crowd gets denser', () => {
    const sparse = relayProbability('normal', 1);
    const dense = relayProbability('normal', 30);
    expect(sparse).toBeGreaterThan(dense);
  });

  it('clamps normal traffic between 0.15 and 0.70', () => {
    expect(relayProbability('normal', 1)).toBeCloseTo(0.7);
    expect(relayProbability('normal', 1000)).toBeCloseTo(0.15);
  });

  it('relays urgent traffic more aggressively', () => {
    expect(relayProbability('urgent', 30)).toBeGreaterThan(relayProbability('normal', 30));
    expect(relayProbability('urgent', 1)).toBeCloseTo(0.95);
    expect(relayProbability('urgent', 1000)).toBeCloseTo(0.6);
  });
});
