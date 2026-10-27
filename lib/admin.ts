import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Faculty } from './faculty';
import type { MatchStats, Person } from './matching';
import { describePair, type AdminPerson, type Pair, type Totals, countPeople } from './pairs';
import type { Schedule } from './phase';
import type { Prefix } from './prefix';
import { loadSchedule } from './profile';

export interface AdminRun {
  id: string;
  status: 'draft' | 'confirmed';
  seed: number;
  stats: Partial<MatchStats> & { violations?: number };
  createdAt: Date;
  confirmedAt: Date | null;
}

export interface AdminData {
  totals: Totals;
  run: AdminRun | null;
  pairs: Pair[];
  /** Everyone registered, used for stats and for re-running the match. */
  people: AdminPerson[];
  schedule: Schedule;
}

/** Returns the signed-in user when they are on the admins allowlist. */
export async function currentAdmin(supabase: SupabaseClient): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc('is_admin');
  if (error || data !== true) return null;
  return user;
}

interface ProfileRow {
  user_id: string;
  nickname: string;
  prefix: Prefix;
  first_name: string;
  last_name: string;
  faculty: Faculty;
  year: number;
  instagram: string | null;
  student_id: string;
}

function toPerson(row: ProfileRow): AdminPerson {
  return {
    userId: row.user_id,
    nickname: row.nickname,
    prefix: row.prefix,
    firstName: row.first_name,
    lastName: row.last_name,
    faculty: row.faculty,
    year: row.year,
    instagram: row.instagram,
    studentId: row.student_id,
  };
}

/** Admins can read every profile through their own RLS policy. */
export async function loadEveryone(supabase: SupabaseClient): Promise<AdminPerson[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, nickname, prefix, first_name, last_name, faculty, year, instagram, student_id')
    .order('created_at', { ascending: true })
    .returns<ProfileRow[]>();

  if (error) throw new Error(`Could not load participants: ${error.message}`);
  return (data ?? []).map(toPerson);
}

interface RunRow {
  id: string;
  status: 'draft' | 'confirmed';
  seed: string | number;
  stats: AdminRun['stats'];
  created_at: string;
  confirmed_at: string | null;
}

export async function loadLatestRun(supabase: SupabaseClient): Promise<AdminRun | null> {
  const { data, error } = await supabase.rpc('admin_latest_run');
  if (error) throw new Error(`Could not load the match run: ${error.message}`);

  const row = ((data ?? []) as RunRow[])[0];
  if (!row) return null;

  return {
    id: row.id,
    status: row.status,
    seed: Number(row.seed),
    stats: row.stats ?? {},
    createdAt: new Date(row.created_at),
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : null,
  };
}

interface PairRow {
  cycle_position: number;
  budder_id: string;
  budder_nickname: string;
  budder_prefix: Prefix;
  budder_first_name: string;
  budder_last_name: string;
  budder_faculty: Faculty;
  budder_year: number;
  budder_instagram: string | null;
  budder_student_id: string;
  buddy_id: string;
  buddy_nickname: string;
  buddy_prefix: Prefix;
  buddy_first_name: string;
  buddy_last_name: string;
  buddy_faculty: Faculty;
  buddy_year: number;
  buddy_instagram: string | null;
  buddy_student_id: string;
}

export async function loadPairs(supabase: SupabaseClient, runId: string): Promise<Pair[]> {
  const { data, error } = await supabase.rpc('admin_pairs', { p_run: runId });
  if (error) throw new Error(`Could not load the pairs: ${error.message}`);

  return ((data ?? []) as PairRow[]).map((row) =>
    describePair(
      row.cycle_position,
      {
        userId: row.budder_id,
        nickname: row.budder_nickname,
        prefix: row.budder_prefix,
        firstName: row.budder_first_name,
        lastName: row.budder_last_name,
        faculty: row.budder_faculty,
        year: row.budder_year,
        instagram: row.budder_instagram,
        studentId: row.budder_student_id,
      },
      {
        userId: row.buddy_id,
        nickname: row.buddy_nickname,
        prefix: row.buddy_prefix,
        firstName: row.buddy_first_name,
        lastName: row.buddy_last_name,
        faculty: row.buddy_faculty,
        year: row.buddy_year,
        instagram: row.buddy_instagram,
        studentId: row.buddy_student_id,
      },
    ),
  );
}

export async function loadAdminData(supabase: SupabaseClient): Promise<AdminData> {
  const [people, run, schedule] = await Promise.all([
    loadEveryone(supabase),
    loadLatestRun(supabase),
    loadSchedule(supabase),
  ]);

  const pairs = run ? await loadPairs(supabase, run.id) : [];
  return { totals: countPeople(people), run, pairs, people, schedule };
}

/** The roster in the shape the matcher wants. */
export function toMatchablePeople(people: readonly AdminPerson[]): Person[] {
  return people.map((person) => ({
    id: person.userId,
    faculty: person.faculty,
    prefix: person.prefix,
  }));
}

/** The cycle of a run, read back from its ordered pairs. */
export function cycleFromPairs(pairs: readonly Pair[]): string[] {
  return [...pairs].sort((a, b) => a.position - b.position).map((pair) => pair.budder.userId);
}
