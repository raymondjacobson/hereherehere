import { describe, expect, it } from 'vitest';
import { DEFAULTS } from '../defaults';
import { mulberry32 } from '../util/rng';
import {
  cachesConverged,
  copiesOf,
  deliveredTo,
  deliveryFraction,
  maxHopCount,
} from './metrics';
import { SimNetwork } from './network';

const NOW = 1_000_000;

function fullyFriended(n: number, seed: number, packetLoss = 0): SimNetwork {
  const net = new SimNetwork({ nodeCount: n, rng: mulberry32(seed), packetLoss });
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) net.befriend(i, j);
  return net;
}

describe('SimNetwork — house party (fully connected friends)', () => {
  it('delivers every status to every friend', () => {
    const net = fullyFriended(6, 1);
    for (let i = 0; i < 6; i++) net.post(i, NOW);
    for (let r = 0; r < 80; r++) net.randomRound(NOW, 8);

    for (let author = 0; author < 6; author++) {
      const recipients = [0, 1, 2, 3, 4, 5].filter((i) => i !== author);
      expect(deliveryFraction(net, author, recipients, 1)).toBe(1);
    }
  });

  it('never exceeds the TTL hop limit', () => {
    const net = fullyFriended(6, 2);
    for (let i = 0; i < 6; i++) net.post(i, NOW);
    for (let r = 0; r < 60; r++) net.randomRound(NOW, 8);
    expect(maxHopCount(net, DEFAULTS.normalTtl)).toBeLessThanOrEqual(DEFAULTS.normalTtl);
  });

  it('converges to identical caches', () => {
    const net = fullyFriended(5, 3);
    for (let i = 0; i < 5; i++) net.post(i, NOW);
    for (let r = 0; r < 80; r++) net.randomRound(NOW, 8);
    expect(cachesConverged(net, [0, 1, 2, 3, 4])).toBe(true);
  });

  it('does not let copy count grow without bound (anti-storm)', () => {
    const net = fullyFriended(6, 4);
    net.post(0, NOW);
    for (let r = 0; r < 40; r++) net.randomRound(NOW, 8);
    const copiesAfterConvergence = copiesOf(net, 0);
    for (let r = 0; r < 40; r++) net.randomRound(NOW, 8); // keep gossiping
    expect(copiesOf(net, 0)).toBe(copiesAfterConvergence); // stable, no storm
    // bounded by unique addressed envelopes * nodes
    expect(copiesAfterConvergence).toBeLessThanOrEqual(6 * 5);
  });
});

describe('SimNetwork — blind-relay line', () => {
  it('carries a status across blind relays to a distant friend', () => {
    // 6 nodes in a line; only the two ends are friends. Middle nodes 1..4
    // can never decrypt — they only carry the opaque envelope.
    const net = new SimNetwork({ nodeCount: 6, rng: mulberry32(7) });
    net.befriend(0, 5);
    net.post(0, NOW);

    for (let r = 0; r < 4; r++) net.chainRound(NOW);

    expect(deliveredTo(net, 0, 1)).toContain(5); // reached the far friend
    for (const middle of [1, 2, 3, 4]) {
      expect(net.nodes[middle].engine.heres.has(net.signPk(0))).toBe(false); // blind
      expect(
        net.nodes[middle].engine.localMetas().some((m) => m.envelope.senderSignPk === net.signPk(0)),
      ).toBe(true); // but carried it
    }
    expect(maxHopCount(net, DEFAULTS.normalTtl)).toBeLessThanOrEqual(DEFAULTS.normalTtl);
  });
});

describe('SimNetwork — lossy radio', () => {
  it('still delivers eventually with 30% contact loss', () => {
    const net = fullyFriended(6, 9, 0.3);
    net.post(0, NOW);
    for (let r = 0; r < 120; r++) net.randomRound(NOW, 8);
    expect(deliveryFraction(net, 0, [1, 2, 3, 4, 5], 1)).toBe(1);
    expect(net.contactsLost).toBeGreaterThan(0); // loss actually happened
  });
});
