import { describe, expect, test } from 'vitest';
import { evaluateCycle, matchCycle, swapInCycle, type Person } from '@/lib/matching';
import { genderPairing } from '@/lib/prefix';
import { assertSingleCycle, byId, roster, shuffled } from './helpers';

const SEED = 20261107;

describe('matchCycle — shape of the result', () => {
  test('throws when there are fewer than two people', () => {
    expect(() => matchCycle([], { seed: SEED })).toThrow();
    expect(() => matchCycle(roster({ engineering: 1 }), { seed: SEED })).toThrow();
  });

  test('rejects duplicate ids', () => {
    const duplicated: Person[] = [
      { id: 'a', faculty: 'engineering', prefix: 'นาย' },
      { id: 'a', faculty: 'science', prefix: 'นางสาว' },
    ];
    expect(() => matchCycle(duplicated, { seed: SEED })).toThrow();
  });

  test.each([
    ['n = 2', { engineering: 1, science: 1 }],
    ['n = 3', { engineering: 1, science: 1, pharmacy: 1 }],
    ['n = 7', { engineering: 3, science: 2, pharmacy: 2 }],
    ['n = 60', { engineering: 20, science: 20, pharmacy: 20 }],
    ['n = 60 unequal', { engineering: 29, science: 20, pharmacy: 11 }],
    ['n = 300', { engineering: 100, science: 100, pharmacy: 100 }],
    ['n = 300 unequal', { engineering: 150, science: 90, pharmacy: 60 }],
  ])('%s produces one single cycle over everyone', (_label, counts) => {
    const people = roster(counts);
    const result = matchCycle(people, { seed: SEED });

    assertSingleCycle(result, people);
    expect(result.stats.n).toBe(people.length);
    expect(result.stats.crossFaculty + result.stats.sameFaculty).toBe(people.length);
    expect(result.stats.mixed + result.stats.neutral + result.stats.same).toBe(people.length);
  });

  test('nobody is their own buddy', () => {
    const people = roster({ engineering: 3, science: 3, pharmacy: 3 });
    const result = matchCycle(people, { seed: SEED });
    for (const link of result.links) {
      expect(link.budderId).not.toBe(link.buddyId);
    }
  });

  test('no mutual pairs once there are more than two people', () => {
    const people = roster({ engineering: 3, science: 2, pharmacy: 2 });
    const result = matchCycle(people, { seed: SEED });
    const next = new Map(result.links.map((l) => [l.budderId, l.buddyId]));
    for (const [budder, buddy] of next) {
      expect(next.get(buddy)).not.toBe(budder);
    }
  });

  test('two people are each other\'s buddy and budder', () => {
    const people = roster({ engineering: 1, science: 1 });
    const result = matchCycle(people, { seed: SEED });
    const next = new Map(result.links.map((l) => [l.budderId, l.buddyId]));
    expect(next.get('engineering-0')).toBe('science-0');
    expect(next.get('science-0')).toBe('engineering-0');
  });
});

describe('matchCycle — hard constraint: different faculties', () => {
  test.each([
    ['equal thirds', { engineering: 20, science: 20, pharmacy: 20 }],
    ['unequal', { engineering: 29, science: 20, pharmacy: 11 }],
    ['two faculties only', { engineering: 15, science: 15 }],
    ['exactly at the feasibility bound', { engineering: 150, science: 90, pharmacy: 60 }],
    ['small and lopsided', { engineering: 3, science: 2, pharmacy: 2 }],
  ])('%s has no same-faculty link', (_label, counts) => {
    const people = roster(counts);
    const result = matchCycle(people, { seed: SEED });
    const index = byId(people);

    assertSingleCycle(result, people);
    for (const link of result.links) {
      expect(index.get(link.budderId)!.faculty).not.toBe(index.get(link.buddyId)!.faculty);
    }
    expect(result.violations).toHaveLength(0);
    expect(result.feasible).toBe(true);
    expect(result.stats.sameFaculty).toBe(0);
    expect(result.stats.crossFaculty).toBe(people.length);
  });

  test('holds across many different seeds', () => {
    const people = roster({ engineering: 9, science: 7, pharmacy: 5 });
    const index = byId(people);
    for (let seed = 0; seed < 50; seed += 1) {
      const result = matchCycle(people, { seed });
      assertSingleCycle(result, people);
      expect(result.violations).toHaveLength(0);
      for (const link of result.links) {
        expect(index.get(link.budderId)!.faculty).not.toBe(index.get(link.buddyId)!.faculty);
      }
    }
  });
});

describe('matchCycle — when the hard constraint cannot be met', () => {
  test('one faculty over half: returns the fewest possible same-faculty links, flagged', () => {
    // 6 of 10 in one faculty. A cycle must contain at least 2·6 − 10 = 2
    // same-faculty links, and no fewer.
    const people = roster({ engineering: 6, science: 2, pharmacy: 2 });
    const result = matchCycle(people, { seed: SEED });

    assertSingleCycle(result, people);
    expect(result.feasible).toBe(false);
    expect(result.violations).toHaveLength(2);
    expect(result.stats.sameFaculty).toBe(2);
    expect(result.stats.crossFaculty).toBe(8);

    const index = byId(people);
    for (const link of result.violations) {
      expect(index.get(link.budderId)!.faculty).toBe(index.get(link.buddyId)!.faculty);
    }
  });

  test('everyone in one faculty: every link is flagged', () => {
    const people = roster({ science: 5 });
    const result = matchCycle(people, { seed: SEED });

    assertSingleCycle(result, people);
    expect(result.feasible).toBe(false);
    expect(result.violations).toHaveLength(5);
    expect(result.stats.crossFaculty).toBe(0);
  });

  test('two people in the same faculty', () => {
    const people = roster({ pharmacy: 2 });
    const result = matchCycle(people, { seed: SEED });

    assertSingleCycle(result, people);
    expect(result.feasible).toBe(false);
    expect(result.violations).toHaveLength(2);
  });
});

describe('matchCycle — soft constraint: mixed gender', () => {
  test('finds a perfect alternating solution when one exists', () => {
    const people: Person[] = [
      { id: 'e-m', faculty: 'engineering', prefix: 'นาย' },
      { id: 'e-f', faculty: 'engineering', prefix: 'นางสาว' },
      { id: 's-m', faculty: 'science', prefix: 'นาย' },
      { id: 's-f', faculty: 'science', prefix: 'นางสาว' },
      { id: 'p-m', faculty: 'pharmacy', prefix: 'นาย' },
      { id: 'p-f', faculty: 'pharmacy', prefix: 'นางสาว' },
    ];
    const result = matchCycle(people, { seed: SEED });

    assertSingleCycle(result, people);
    expect(result.violations).toHaveLength(0);
    expect(result.stats.mixed).toBe(6);
    expect(result.stats.same).toBe(0);
  });

  test('everyone ไม่ระบุ: every link is neutral, none mixed or same', () => {
    const people = roster({ engineering: 8, science: 7, pharmacy: 5 }, ['ไม่ระบุ']);
    const result = matchCycle(people, { seed: SEED });

    assertSingleCycle(result, people);
    expect(result.violations).toHaveLength(0);
    expect(result.stats.neutral).toBe(20);
    expect(result.stats.mixed).toBe(0);
    expect(result.stats.same).toBe(0);
  });

  test('single-gender roster: no link can be mixed, and that is not a failure', () => {
    const people = roster({ engineering: 5, science: 5 }, ['นาย']);
    const result = matchCycle(people, { seed: SEED });

    assertSingleCycle(result, people);
    expect(result.violations).toHaveLength(0);
    expect(result.stats.same).toBe(10);
    expect(result.stats.mixed).toBe(0);
  });

  test('beats a naive arrangement on a realistic 60-person roster', () => {
    const people = roster({ engineering: 22, science: 20, pharmacy: 18 });
    const result = matchCycle(people, { seed: SEED });

    assertSingleCycle(result, people);
    expect(result.violations).toHaveLength(0);
    // Two thirds of the roster is นาย/นางสาว, so a large majority of links
    // should end up mixed rather than merely neutral.
    expect(result.stats.mixed).toBeGreaterThanOrEqual(30);
  });

  test('stats agree with the links they describe', () => {
    const people = roster({ engineering: 11, science: 9, pharmacy: 7 });
    const result = matchCycle(people, { seed: SEED });
    const index = byId(people);

    const counted = { mixed: 0, neutral: 0, same: 0 };
    for (const link of result.links) {
      const pairing = genderPairing(
        index.get(link.budderId)!.prefix,
        index.get(link.buddyId)!.prefix,
      );
      counted[pairing] += 1;
    }
    expect(counted.mixed).toBe(result.stats.mixed);
    expect(counted.neutral).toBe(result.stats.neutral);
    expect(counted.same).toBe(result.stats.same);
  });
});

describe('matchCycle — reproducibility', () => {
  test('the same seed gives the same cycle', () => {
    const people = roster({ engineering: 12, science: 10, pharmacy: 8 });
    const a = matchCycle(people, { seed: 4242 });
    const b = matchCycle(people, { seed: 4242 });
    expect(a.cycle).toEqual(b.cycle);
    expect(a.stats).toEqual(b.stats);
  });

  test('the input order does not change the result', () => {
    const people = roster({ engineering: 12, science: 10, pharmacy: 8 });
    const a = matchCycle(people, { seed: 4242 });
    const b = matchCycle(shuffled(people), { seed: 4242 });
    expect(b.cycle).toEqual(a.cycle);
  });

  test('different seeds explore different cycles', () => {
    const people = roster({ engineering: 12, science: 10, pharmacy: 8 });
    const seen = new Set<string>();
    for (let seed = 0; seed < 10; seed += 1) {
      seen.add(matchCycle(people, { seed }).cycle.join(','));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  test('the seed used is reported back', () => {
    const people = roster({ engineering: 4, science: 3, pharmacy: 3 });
    expect(matchCycle(people, { seed: 99 }).seed).toBe(99);
  });
});

describe('matchCycle — performance guardrail', () => {
  test('300 people match in well under a second', () => {
    const people = roster({ engineering: 110, science: 100, pharmacy: 90 });
    const started = performance.now();
    const result = matchCycle(people, { seed: SEED });
    const elapsed = performance.now() - started;

    assertSingleCycle(result, people);
    expect(result.violations).toHaveLength(0);
    expect(elapsed).toBeLessThan(1000);
  });
});

describe('matchCycle — restart selection', () => {
  test('more restarts never returns a worse cycle than the first restart alone', () => {
    const people = roster({ engineering: 14, science: 11, pharmacy: 9 });
    for (let seed = 0; seed < 12; seed += 1) {
      const one = matchCycle(people, { seed, restarts: 1 });
      const many = matchCycle(people, { seed, restarts: 12 });

      // restarts: 12 evaluates the restarts: 1 candidate first, so its result
      // must be at least as good on violations, then on the gender score.
      expect(many.violations.length).toBeLessThanOrEqual(one.violations.length);
      if (many.violations.length === one.violations.length) {
        const score = (r: typeof one) => r.stats.mixed * 2 + r.stats.neutral;
        expect(score(many)).toBeGreaterThanOrEqual(score(one));
      }
    }
  });
});

describe('evaluateCycle', () => {
  test('recomputes stats for a cycle it did not build', () => {
    const people = roster({ engineering: 4, science: 4, pharmacy: 4 });
    const built = matchCycle(people, { seed: SEED });
    const described = evaluateCycle(people, built.cycle);

    expect(described.stats).toEqual(built.stats);
    expect(described.links).toEqual(built.links);
    expect(described.feasible).toBe(built.feasible);
  });

  test('flags same-faculty links in a hand-made cycle', () => {
    const people: Person[] = [
      { id: 'a', faculty: 'engineering', prefix: 'นาย' },
      { id: 'b', faculty: 'engineering', prefix: 'นางสาว' },
      { id: 'c', faculty: 'science', prefix: 'นาย' },
      { id: 'd', faculty: 'pharmacy', prefix: 'ไม่ระบุ' },
    ];
    const described = evaluateCycle(people, ['a', 'b', 'c', 'd']);

    expect(described.feasible).toBe(false);
    expect(described.violations).toEqual([{ budderId: 'a', buddyId: 'b' }]);
    expect(described.stats.sameFaculty).toBe(1);
    expect(described.stats.crossFaculty).toBe(3);
    // a→b and b→c are both นาย↔นางสาว; c→d and d→a both involve ไม่ระบุ.
    expect(described.stats.mixed).toBe(2);
    expect(described.stats.neutral).toBe(2);
    expect(described.stats.same).toBe(0);
  });

  test('rejects a cycle that does not cover the roster exactly once', () => {
    const people = roster({ engineering: 2, science: 2 });
    expect(() => evaluateCycle(people, ['engineering-0', 'science-0'])).toThrow();
    expect(() =>
      evaluateCycle(people, ['engineering-0', 'engineering-0', 'science-0', 'science-1']),
    ).toThrow();
    expect(() =>
      evaluateCycle(people, ['engineering-0', 'engineering-1', 'science-0', 'ghost']),
    ).toThrow();
  });
});

describe('swapInCycle', () => {
  test('puts each person in the other one\'s place', () => {
    expect(swapInCycle(['a', 'b', 'c', 'd'], 'a', 'c')).toEqual(['c', 'b', 'a', 'd']);
  });

  test('leaves the original untouched', () => {
    const original = ['a', 'b', 'c'];
    swapInCycle(original, 'a', 'b');
    expect(original).toEqual(['a', 'b', 'c']);
  });

  test('a swapped cycle is still one single cycle', () => {
    const people = roster({ engineering: 5, science: 4, pharmacy: 4 });
    const built = matchCycle(people, { seed: SEED });
    const swapped = swapInCycle(built.cycle, built.cycle[0]!, built.cycle[5]!);
    const described = evaluateCycle(people, swapped);

    assertSingleCycle({ ...described, seed: SEED }, people);
  });

  test('rejects unknown people and self-swaps', () => {
    expect(() => swapInCycle(['a', 'b'], 'a', 'ghost')).toThrow();
    expect(() => swapInCycle(['a', 'b'], 'ghost', 'b')).toThrow();
    expect(() => swapInCycle(['a', 'b'], 'a', 'a')).toThrow();
  });
});
