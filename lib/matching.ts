import { FACULTIES, type Faculty } from './faculty';
import { PREFIXES, genderPairing, type Prefix } from './prefix';
import { createRng, deriveSeed, randomInt, shuffleInPlace, type Rng } from './rng';

/**
 * Buddy–Budder matching.
 *
 * Everyone is arranged into ONE cycle A → B → C → … → A, where X → Y means
 * "X is Y's budder" (X looks after Y). That gives every participant exactly
 * one buddy and exactly one budder, for any n ≥ 2.
 *
 *   Hard constraint: a budder and their buddy must be in different faculties.
 *   Soft constraint: prefer นาย ↔ นางสาว links (mixed), then links involving
 *                    ไม่ระบุ (neutral), and avoid same-gender links.
 *
 * The module is pure: no I/O, no clock, no Math.random. Given the same people
 * and the same seed it always returns the same cycle.
 */

export interface Person {
  id: string;
  faculty: Faculty;
  prefix: Prefix;
}

/** One budder → buddy edge of the cycle. */
export interface Link {
  budderId: string;
  buddyId: string;
}

export interface MatchStats {
  n: number;
  /** Links where the two faculties differ — the hard constraint holding. */
  crossFaculty: number;
  /** Links where it does not. Zero unless the roster makes that impossible. */
  sameFaculty: number;
  mixed: number;
  neutral: number;
  same: number;
}

export interface MatchResult {
  /** Person ids in cycle order; cycle[i] is the budder of cycle[i + 1]. */
  cycle: string[];
  links: Link[];
  stats: MatchStats;
  /** The same-faculty links, so admins can be warned about them by name. */
  violations: Link[];
  /** True when every link respects the hard constraint. */
  feasible: boolean;
  seed: number;
}

export interface MatchOptions {
  seed?: number;
  /** Randomised restarts to try. Defaults scale down with roster size. */
  restarts?: number;
}

const GENDER_UNSPECIFIED = PREFIXES.indexOf('ไม่ระบุ');

/**
 * Weight of one link on the soft constraint. Larger is better.
 * Kept in step with genderPairing() in lib/prefix.ts.
 */
const MIXED = 2;
const NEUTRAL = 1;
const SAME = 0;

/**
 * A local cost combines both constraints so one comparison decides a move.
 * A move is only ever evaluated over at most four links, so the most the soft
 * term can reach is 4 × MIXED = 8; weighting a violation above that makes the
 * hard constraint strictly dominant, which is what we want.
 */
const VIOLATION_WEIGHT = 16;

interface Context {
  n: number;
  faculty: Int8Array;
  gender: Int8Array;
}

/** Lower is better: violations first, then fewer mixed-gender links. */
function linkCost(ctx: Context, cycle: Int32Array, k: number): number {
  const a = cycle[k]!;
  const b = cycle[(k + 1) % ctx.n]!;
  const fa = ctx.faculty[a]!;
  const fb = ctx.faculty[b]!;
  const ga = ctx.gender[a]!;
  const gb = ctx.gender[b]!;

  const violation = fa === fb ? VIOLATION_WEIGHT : 0;
  let gender: number;
  if (ga === GENDER_UNSPECIFIED || gb === GENDER_UNSPECIFIED) gender = NEUTRAL;
  else gender = ga === gb ? SAME : MIXED;

  return violation - gender;
}

function cost(ctx: Context, cycle: Int32Array, links: Int32Array, count: number): number {
  let total = 0;
  for (let k = 0; k < count; k += 1) total += linkCost(ctx, cycle, links[k]!);
  return total;
}

function pushUnique(buffer: Int32Array, count: number, value: number): number {
  for (let k = 0; k < count; k += 1) {
    if (buffer[k] === value) return count;
  }
  buffer[count] = value;
  return count + 1;
}

/** Link indices touched by exchanging the people at positions i and j. */
function linksAroundSwap(buffer: Int32Array, n: number, i: number, j: number): number {
  let count = 0;
  count = pushUnique(buffer, count, (i - 1 + n) % n);
  count = pushUnique(buffer, count, i);
  count = pushUnique(buffer, count, (j - 1 + n) % n);
  count = pushUnique(buffer, count, j);
  return count;
}

/**
 * Builds a cycle with no same-faculty link whenever one exists.
 *
 * People are grouped by faculty, the groups are ordered largest first, and the
 * flattened sequence is laid into the even positions and then the odd ones.
 * Two entries that land next to each other in the cycle are at least
 * ⌊n/2⌋ apart in the sequence, so they can only share a faculty if some
 * faculty holds more than ⌊n/2⌋ people — which is exactly the case where no
 * valid cycle exists at all.
 */
function construct(ctx: Context, rng: Rng): Int32Array {
  const { n } = ctx;

  const groups: number[][] = FACULTIES.map(() => []);
  for (let i = 0; i < n; i += 1) groups[ctx.faculty[i]!]!.push(i);
  for (const group of groups) shuffleInPlace(group, rng);

  // Largest first; ties broken randomly so restarts explore different layouts.
  const ordered = groups
    .filter((g) => g.length > 0)
    .map((g) => ({ group: g, tieBreak: rng() }))
    .sort((a, b) => b.group.length - a.group.length || a.tieBreak - b.tieBreak)
    .flatMap((entry) => entry.group);

  const cycle = new Int32Array(n);
  let at = 0;
  for (let position = 0; position < n; position += 2) cycle[position] = ordered[at++]!;
  for (let position = 1; position < n; position += 2) cycle[position] = ordered[at++]!;
  return cycle;
}

/** True when both links touching this position are already as good as a link gets. */
function positionIsSettled(ctx: Context, cycle: Int32Array, position: number): boolean {
  const best = -MIXED;
  const previous = (position - 1 + ctx.n) % ctx.n;
  return linkCost(ctx, cycle, previous) === best && linkCost(ctx, cycle, position) === best;
}

function trySwap(
  ctx: Context,
  cycle: Int32Array,
  buffer: Int32Array,
  i: number,
  j: number,
): boolean {
  const count = linksAroundSwap(buffer, ctx.n, i, j);
  const before = cost(ctx, cycle, buffer, count);

  const held = cycle[i]!;
  cycle[i] = cycle[j]!;
  cycle[j] = held;

  if (cost(ctx, cycle, buffer, count) < before) return true;

  cycle[j] = cycle[i]!;
  cycle[i] = held;
  return false;
}

/**
 * Reverses cycle[i..j]. Both scoring rules are symmetric, so every link inside
 * the segment keeps its cost and only the two boundary links change — which
 * means the gain can be read off without touching the array.
 */
function tryTwoOpt(ctx: Context, cycle: Int32Array, i: number, j: number): boolean {
  const { n } = ctx;
  if (i >= j) return false;
  if (i === 0 && j === n - 1) return false; // reversing everything changes nothing

  const before = linkCost(ctx, cycle, (i - 1 + n) % n) + linkCost(ctx, cycle, j);

  for (let left = i, right = j; left < right; left += 1, right -= 1) {
    const held = cycle[left]!;
    cycle[left] = cycle[right]!;
    cycle[right] = held;
  }

  if (linkCost(ctx, cycle, (i - 1 + n) % n) + linkCost(ctx, cycle, j) < before) return true;

  for (let left = i, right = j; left < right; left += 1, right -= 1) {
    const held = cycle[left]!;
    cycle[left] = cycle[right]!;
    cycle[right] = held;
  }
  return false;
}

/**
 * Hill-climbs with swap and 2-opt moves, visiting only positions that still
 * have something to gain. Every accepted move strictly lowers the cost, and
 * the cost weights violations above everything else, so a cycle that starts
 * free of same-faculty links stays that way.
 */
function improve(ctx: Context, cycle: Int32Array, rng: Rng, sampleSize: number, maxRounds: number) {
  const { n } = ctx;
  if (n < 3) return;

  const positions = Array.from({ length: n }, (_, i) => i);
  const buffer = new Int32Array(4);

  for (let round = 0; round < maxRounds; round += 1) {
    shuffleInPlace(positions, rng);
    let improved = false;

    for (const i of positions) {
      if (positionIsSettled(ctx, cycle, i)) continue;

      for (let attempt = 0; attempt < sampleSize; attempt += 1) {
        const j = randomInt(rng, n);
        if (j === i) continue;

        const moved =
          rng() < 0.5
            ? trySwap(ctx, cycle, buffer, i, j)
            : tryTwoOpt(ctx, cycle, Math.min(i, j), Math.max(i, j));

        if (moved) {
          improved = true;
          break;
        }
      }
    }

    if (!improved) break;
  }
}

function totals(ctx: Context, cycle: Int32Array): { violations: number; gender: number } {
  let violations = 0;
  let gender = 0;
  for (let k = 0; k < ctx.n; k += 1) {
    const a = cycle[k]!;
    const b = cycle[(k + 1) % ctx.n]!;

    if (ctx.faculty[a] === ctx.faculty[b]) violations += 1;

    const ga = ctx.gender[a]!;
    const gb = ctx.gender[b]!;
    if (ga === GENDER_UNSPECIFIED || gb === GENDER_UNSPECIFIED) gender += NEUTRAL;
    else gender += ga === gb ? SAME : MIXED;
  }
  return { violations, gender };
}

/** Compares two candidates: fewer violations wins, then a higher gender score. */
function isBetter(
  candidate: { violations: number; gender: number },
  best: { violations: number; gender: number },
): boolean {
  if (candidate.violations !== best.violations) return candidate.violations < best.violations;
  return candidate.gender > best.gender;
}

function defaultRestarts(n: number): number {
  if (n <= 40) return 24;
  if (n <= 120) return 14;
  return 6;
}

function buildContext(people: Person[]): Context {
  const n = people.length;
  const faculty = new Int8Array(n);
  const gender = new Int8Array(n);
  for (let i = 0; i < n; i += 1) {
    faculty[i] = FACULTIES.indexOf(people[i]!.faculty);
    gender[i] = PREFIXES.indexOf(people[i]!.prefix);
  }
  return { n, faculty, gender };
}

/** Sorted by id so the result never depends on the order rows came out of the database. */
function canonicalOrder(people: Person[]): Person[] {
  return [...people].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Rotates the cycle to start at the lowest id, so equal cycles compare equal. */
function rotateToSmallest(ids: string[]): string[] {
  let start = 0;
  for (let i = 1; i < ids.length; i += 1) {
    if (ids[i]! < ids[start]!) start = i;
  }
  return [...ids.slice(start), ...ids.slice(0, start)];
}

export function matchCycle(people: Person[], options: MatchOptions = {}): MatchResult {
  if (people.length < 2) {
    throw new Error(`matchCycle needs at least 2 people, got ${people.length}`);
  }

  const ordered = canonicalOrder(people);
  const ids = new Set(ordered.map((p) => p.id));
  if (ids.size !== ordered.length) {
    throw new Error('matchCycle received duplicate person ids');
  }

  const seed = options.seed ?? 1;
  const restarts = Math.max(1, options.restarts ?? defaultRestarts(ordered.length));
  const ctx = buildContext(ordered);
  const sampleSize = Math.min(ctx.n, 96);

  let best: Int32Array | null = null;
  let bestScore = { violations: Number.POSITIVE_INFINITY, gender: Number.NEGATIVE_INFINITY };

  for (let restart = 0; restart < restarts; restart += 1) {
    const rng = createRng(deriveSeed(seed, restart));
    const candidate = construct(ctx, rng);
    improve(ctx, candidate, rng, sampleSize, 12);

    const score = totals(ctx, candidate);
    if (best === null || isBetter(score, bestScore)) {
      best = candidate;
      bestScore = score;
    }
    if (bestScore.violations === 0 && bestScore.gender === ctx.n * MIXED) break;
  }

  const cycle = rotateToSmallest(Array.from(best!, (index) => ordered[index]!.id));
  return { ...describeCycle(ordered, cycle), seed };
}

/**
 * Re-validates an existing cycle and recomputes its stats. Used after an admin
 * swaps two people, so the stored stats always describe the stored cycle.
 */
export function evaluateCycle(people: Person[], cycle: string[]): Omit<MatchResult, 'seed'> {
  const ordered = canonicalOrder(people);
  if (cycle.length !== ordered.length) {
    throw new Error(`cycle covers ${cycle.length} people, roster has ${ordered.length}`);
  }
  const known = new Set(ordered.map((p) => p.id));
  const seen = new Set<string>();
  for (const id of cycle) {
    if (!known.has(id)) throw new Error(`cycle references unknown person ${id}`);
    if (seen.has(id)) throw new Error(`cycle lists ${id} more than once`);
    seen.add(id);
  }
  return describeCycle(ordered, cycle);
}

/** Moves two people to each other's place in the cycle. */
export function swapInCycle(cycle: string[], a: string, b: string): string[] {
  const i = cycle.indexOf(a);
  const j = cycle.indexOf(b);
  if (i === -1) throw new Error(`${a} is not in the cycle`);
  if (j === -1) throw new Error(`${b} is not in the cycle`);
  if (i === j) throw new Error('cannot swap a person with themselves');

  const next = [...cycle];
  next[i] = b;
  next[j] = a;
  return next;
}

function describeCycle(people: Person[], cycle: string[]): Omit<MatchResult, 'seed'> {
  const index = new Map(people.map((p) => [p.id, p]));
  const n = cycle.length;

  const links: Link[] = [];
  const violations: Link[] = [];
  const stats: MatchStats = { n, crossFaculty: 0, sameFaculty: 0, mixed: 0, neutral: 0, same: 0 };

  for (let i = 0; i < n; i += 1) {
    const budder = index.get(cycle[i]!)!;
    const buddy = index.get(cycle[(i + 1) % n]!)!;
    const link: Link = { budderId: budder.id, buddyId: buddy.id };
    links.push(link);

    if (budder.faculty === buddy.faculty) {
      stats.sameFaculty += 1;
      violations.push(link);
    } else {
      stats.crossFaculty += 1;
    }

    stats[genderPairing(budder.prefix, buddy.prefix)] += 1;
  }

  return { cycle, links, stats, violations, feasible: violations.length === 0 };
}
