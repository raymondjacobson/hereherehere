/**
 * Deterministic RNG. The whole mesh injects an `Rng` instead of calling
 * Math.random(), so every randomized decision (relay jitter, probability,
 * simulator movement/loss) is reproducible under a fixed seed in tests.
 */
export type Rng = () => number; // returns a float in [0, 1)

/** mulberry32 — small, fast, well-distributed seedable PRNG. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform float in [lo, hi). */
export function randRange(rng: Rng, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

/** Uniform integer in [lo, hi] inclusive. */
export function randInt(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}
