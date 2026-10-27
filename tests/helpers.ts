import type { Faculty } from '@/lib/faculty';
import type { Prefix } from '@/lib/prefix';
import type { MatchResult, Person } from '@/lib/matching';

/**
 * Builds a roster with the given number of people per faculty. Prefixes are
 * handed out round-robin from `prefixes` so tests can control the gender mix.
 */
export function roster(
  counts: Partial<Record<Faculty, number>>,
  prefixes: readonly Prefix[] = ['นาย', 'นางสาว', 'ไม่ระบุ'],
): Person[] {
  const people: Person[] = [];
  let i = 0;
  for (const [faculty, count] of Object.entries(counts) as Array<[Faculty, number]>) {
    for (let k = 0; k < count; k += 1) {
      people.push({
        id: `${faculty}-${k}`,
        faculty,
        prefix: prefixes[i % prefixes.length]!,
      });
      i += 1;
    }
  }
  return people;
}

/**
 * Asserts the result really is one single cycle through every person exactly
 * once — not two shorter cycles, and not a path. Throws with a readable
 * message so a failure points at the actual defect.
 */
export function assertSingleCycle(result: MatchResult, people: Person[]): void {
  const n = people.length;
  if (result.cycle.length !== n) {
    throw new Error(`cycle has ${result.cycle.length} entries, expected ${n}`);
  }

  const expected = new Set(people.map((p) => p.id));
  const seen = new Set(result.cycle);
  if (seen.size !== n) throw new Error('cycle contains a duplicate id');
  for (const id of expected) {
    if (!seen.has(id)) throw new Error(`cycle is missing ${id}`);
  }

  // Walk the successor map n times; it must return to the start on step n and
  // never before, which is exactly what "one single cycle" means.
  const next = new Map(result.links.map((l) => [l.budderId, l.buddyId]));
  if (next.size !== n) throw new Error('links do not cover every person once');

  const start = result.cycle[0]!;
  let node = start;
  for (let step = 1; step <= n; step += 1) {
    const successor = next.get(node);
    if (successor === undefined) throw new Error(`no successor for ${node}`);
    node = successor;
    if (node === start && step !== n) {
      throw new Error(`cycle closed early after ${step} of ${n} steps`);
    }
  }
  if (node !== start) throw new Error('cycle does not close');
}

export function byId(people: Person[]): Map<string, Person> {
  return new Map(people.map((p) => [p.id, p]));
}

export function shuffled<T>(items: T[], seed = 7): T[] {
  // Deterministic shuffle so a reordering test is reproducible.
  const out = [...items];
  let state = seed;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
