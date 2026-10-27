import type { Faculty } from './faculty';
import { genderPairing, type GenderPairing, type Prefix } from './prefix';

export interface AdminPerson {
  userId: string;
  nickname: string;
  prefix: Prefix;
  firstName: string;
  lastName: string;
  faculty: Faculty;
  year: number;
  instagram: string | null;
  studentId: string;
}

export interface Pair {
  position: number;
  budder: AdminPerson;
  buddy: AdminPerson;
  crossFaculty: boolean;
  gender: GenderPairing;
}

export function describePair(position: number, budder: AdminPerson, buddy: AdminPerson): Pair {
  return {
    position,
    budder,
    buddy,
    crossFaculty: budder.faculty !== buddy.faculty,
    gender: genderPairing(budder.prefix, buddy.prefix),
  };
}

/**
 * Search matches a first name, last name, nickname or student ID on EITHER
 * side of the pair, so looking someone up finds them whether they are the
 * budder or the buddy.
 */
function haystack(person: AdminPerson): string {
  return [person.firstName, person.lastName, person.nickname, person.studentId]
    .join(' ')
    .toLowerCase();
}

export function pairMatches(pair: Pair, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return haystack(pair.budder).includes(needle) || haystack(pair.buddy).includes(needle);
}

export function filterPairs(pairs: readonly Pair[], query: string): Pair[] {
  const needle = query.trim();
  if (needle === '') return [...pairs];
  return pairs.filter((pair) => pairMatches(pair, needle));
}

export interface Totals {
  total: number;
  byPrefix: Record<Prefix, number>;
  byFaculty: Record<Faculty, number>;
}

export function countPeople(people: ReadonlyArray<Pick<AdminPerson, 'prefix' | 'faculty'>>): Totals {
  const totals: Totals = {
    total: people.length,
    byPrefix: { นาย: 0, นางสาว: 0, ไม่ระบุ: 0 },
    byFaculty: { engineering: 0, science: 0, pharmacy: 0 },
  };

  for (const person of people) {
    totals.byPrefix[person.prefix] += 1;
    totals.byFaculty[person.faculty] += 1;
  }
  return totals;
}
