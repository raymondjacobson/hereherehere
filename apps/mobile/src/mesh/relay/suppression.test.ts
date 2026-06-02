import { describe, expect, it } from 'vitest';
import { SuppressionTracker } from './suppression';

const WINDOW = 120_000;

describe('SuppressionTracker', () => {
  it('suppresses at exactly the threshold (3) within the window', () => {
    const s = new SuppressionTracker(WINDOW, 3);
    s.record('m', 0);
    s.record('m', 1);
    expect(s.shouldSuppress('m', 2)).toBe(false); // only 2 heard
    s.record('m', 2);
    expect(s.shouldSuppress('m', 2)).toBe(true); // now 3
    expect(s.heardCount('m', 2)).toBe(3);
  });

  it('ages hearings out of the window', () => {
    const s = new SuppressionTracker(WINDOW, 3);
    s.record('m', 0);
    s.record('m', 60_500);
    s.record('m', 121_000);
    // at t=121_000 the t=0 hearing is 121s old (> window) -> only 2 live
    expect(s.heardCount('m', 121_000)).toBe(2);
    expect(s.shouldSuppress('m', 121_000)).toBe(false);
  });

  it('treats a hearing exactly windowMs old as aged out (boundary)', () => {
    // Fresh trackers: heardCount lazily prunes, which is correct for monotonic
    // time but would destroy state if we queried a later `now` first.
    const atWindow = new SuppressionTracker(WINDOW, 1);
    atWindow.record('m', 0);
    expect(atWindow.heardCount('m', WINDOW)).toBe(0); // age == window -> excluded

    const justInside = new SuppressionTracker(WINDOW, 1);
    justInside.record('m', 0);
    expect(justInside.heardCount('m', WINDOW - 1)).toBe(1);
  });

  it('gc drops fully-aged ids', () => {
    const s = new SuppressionTracker(WINDOW, 3);
    s.record('m', 0);
    s.gc(WINDOW + 1);
    expect(s.heardCount('m', WINDOW + 1)).toBe(0);
  });
});
