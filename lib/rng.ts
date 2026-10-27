/**
 * A small seeded RNG so a matching run can be reproduced exactly from the seed
 * stored on the run. Math.random() would make a run impossible to re-derive.
 */
export type Rng = () => number;

/** mulberry32 — fast, and good enough for shuffling and tie-breaking. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

/** Fisher–Yates, in place. */
export function shuffleInPlace<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, i + 1);
    const a = items[i]!;
    items[i] = items[j]!;
    items[j] = a;
  }
  return items;
}

/** Derives a distinct, reproducible seed for restart `n` of a run. */
export function deriveSeed(seed: number, n: number): number {
  return (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(n + 1, 0xc2b2ae35)) >>> 0;
}
