/**
 * Fills a local database with a believable roster so the whole app can be
 * clicked through without a Google OAuth client.
 *
 *   npm run seed                      60 people, registration open
 *   npm run seed -- --phase=closed    registration shut, draft match drawn
 *   npm run seed -- --phase=revealed  match confirmed, reveal already passed
 *   npm run seed -- --count=120 --reset
 *
 * Refuses to touch anything that is not a local Supabase.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { FACULTIES, type Faculty } from '../../lib/faculty';
import { matchCycle } from '../../lib/matching';
import { PREFIXES, type Prefix } from '../../lib/prefix';
import { createRng, randomInt, type Rng } from '../../lib/rng';
import { DEMO_ACCOUNT_PASSWORD } from '../../lib/demo';
import {
  FIRST_NAMES,
  HANDLE_STEMS,
  HINTS_1,
  HINTS_2,
  LAST_NAMES,
  MESSAGES,
  NICKNAMES,
} from './people';

type Phase = 'before' | 'open' | 'closed' | 'revealed';

const FACULTY_CODE: Record<Faculty, string> = {
  engineering: '21',
  science: '23',
  pharmacy: '33',
};

interface Options {
  phase: Phase;
  count: number;
  reset: boolean;
  seed: number;
}

function parseOptions(argv: string[]): Options {
  const options: Options = { phase: 'open', count: 60, reset: false, seed: 20261107 };

  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key === 'phase' && value) options.phase = value as Phase;
    if (key === 'count' && value) options.count = Number(value);
    if (key === 'seed' && value) options.seed = Number(value);
    if (key === 'reset') options.reset = true;
  }

  if (!['before', 'open', 'closed', 'revealed'].includes(options.phase)) {
    throw new Error(`--phase must be before, open, closed or revealed (got ${options.phase})`);
  }
  if (!Number.isInteger(options.count) || options.count < 2 || options.count > 500) {
    throw new Error(`--count must be between 2 and 500 (got ${options.count})`);
  }
  return options;
}

function requireLocalSupabase(): { url: string; serviceKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
        '  Copy .env.example to .env.local and fill in the values that\n' +
        '  "npx supabase start" printed.',
    );
  }

  // The seed creates accounts with a shared password and can wipe every
  // profile, so it only ever runs against a database on this machine.
  const host = new URL(url).hostname;
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error(
      `The seed only runs against a local Supabase, not ${host}. Start one with "npx supabase start".`,
    );
  }
  return { url, serviceKey };
}

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[randomInt(rng, items.length)]!;
}

interface SeedPerson {
  email: string;
  studentId: string;
  prefix: Prefix;
  firstName: string;
  lastName: string;
  nickname: string;
  faculty: Faculty;
  year: number;
  instagram: string | null;
  message: string;
  hint1: string;
  hint2: string;
}

/** Spreads the roster unevenly across the three faculties, as a real one is. */
function facultySpread(count: number): Faculty[] {
  const weights: Record<Faculty, number> = { engineering: 0.38, science: 0.34, pharmacy: 0.28 };
  const spread: Faculty[] = [];

  for (const faculty of FACULTIES) {
    const share = Math.round(count * weights[faculty]);
    for (let i = 0; i < share; i += 1) spread.push(faculty);
  }
  while (spread.length < count) spread.push('engineering');
  return spread.slice(0, count);
}

function buildRoster(options: Options): SeedPerson[] {
  const rng = createRng(options.seed);
  const faculties = facultySpread(options.count);

  return faculties.map((faculty, index) => {
    // 6730 + a running number + the faculty code = ten digits, and the email
    // local part has to be exactly this.
    const studentId = `6730${String(index + 1).padStart(4, '0')}${FACULTY_CODE[faculty]}`;
    const prefix = PREFIXES[index % PREFIXES.length]!;
    const nickname = `${pick(NICKNAMES, rng)}${index < NICKNAMES.length ? '' : index}`;

    return {
      email: `${studentId}@student.chula.ac.th`,
      studentId,
      prefix,
      firstName: pick(FIRST_NAMES, rng),
      lastName: pick(LAST_NAMES, rng),
      nickname,
      faculty,
      year: 1 + randomInt(rng, 4),
      // Roughly three in four give a handle, so both reveal branches appear.
      // Built from a Latin stem, since a Thai nickname is not a valid handle.
      instagram: rng() < 0.75 ? `${pick(HANDLE_STEMS, rng)}.${faculty.slice(0, 3)}${index}` : null,
      message: pick(MESSAGES, rng),
      hint1: pick(HINTS_1, rng),
      hint2: pick(HINTS_2, rng),
    };
  });
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function scheduleFor(phase: Phase, now: Date) {
  const at = (offsetMs: number) => new Date(now.getTime() + offsetMs).toISOString();

  switch (phase) {
    case 'before':
      return { open: at(2 * DAY), close: at(9 * DAY), reveal: at(10 * DAY), hint2: null };
    case 'open':
      return { open: at(-2 * DAY), close: at(5 * DAY), reveal: at(6 * DAY), hint2: null };
    case 'closed':
      return { open: at(-7 * DAY), close: at(-1 * HOUR), reveal: at(1 * DAY), hint2: null };
    case 'revealed':
      return { open: at(-9 * DAY), close: at(-2 * DAY), reveal: at(-1 * HOUR), hint2: at(1 * DAY) };
  }
}

async function wipe(admin: SupabaseClient): Promise<void> {
  process.stdout.write('  clearing existing data… ');

  await admin.from('assignments').delete().gte('position', 0);
  await admin.from('match_runs').delete().neq('seed', -1);
  await admin.from('profiles').delete().neq('student_id', '');
  await admin.from('admins').delete().neq('email', '');

  // Auth users have to go through the admin API.
  let removed = 0;
  for (let page = 1; page <= 20; page += 1) {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const users = data?.users ?? [];
    if (users.length === 0) break;

    for (const user of users) {
      await admin.auth.admin.deleteUser(user.id);
      removed += 1;
    }
  }
  process.stdout.write(`removed ${removed} accounts\n`);
}

async function createAccounts(admin: SupabaseClient, roster: SeedPerson[]): Promise<Map<string, string>> {
  const ids = new Map<string, string>();

  for (const [index, person] of roster.entries()) {
    const { data, error } = await admin.auth.admin.createUser({
      email: person.email,
      password: DEMO_ACCOUNT_PASSWORD,
      email_confirm: true,
    });

    if (error || !data.user) throw new Error(`Could not create ${person.email}: ${error?.message}`);
    ids.set(person.email, data.user.id);

    if ((index + 1) % 10 === 0 || index === roster.length - 1) {
      process.stdout.write(`\r  creating accounts… ${index + 1}/${roster.length}`);
    }
  }
  process.stdout.write('\n');
  return ids;
}

async function insertProfiles(
  admin: SupabaseClient,
  roster: SeedPerson[],
  ids: Map<string, string>,
): Promise<void> {
  const rows = roster.map((person) => ({
    user_id: ids.get(person.email)!,
    email: person.email,
    prefix: person.prefix,
    first_name: person.firstName,
    last_name: person.lastName,
    nickname: person.nickname,
    student_id: person.studentId,
    faculty: person.faculty,
    year: person.year,
    instagram: person.instagram,
    message_to_budder: person.message,
    hint_1: person.hint1,
    hint_2: person.hint2,
    consented_at: new Date().toISOString(),
  }));

  const { error } = await admin.from('profiles').insert(rows);
  if (error) throw new Error(`Could not insert profiles: ${error.message}`);
  process.stdout.write(`  inserted ${rows.length} profiles\n`);
}

async function drawMatch(
  admin: SupabaseClient,
  roster: SeedPerson[],
  ids: Map<string, string>,
  confirm: boolean,
  seed: number,
): Promise<void> {
  const people = roster.map((person) => ({
    id: ids.get(person.email)!,
    faculty: person.faculty,
    prefix: person.prefix,
  }));

  const result = matchCycle(people, { seed });

  const { data: run, error: runError } = await admin
    .from('match_runs')
    .insert({
      status: confirm ? 'confirmed' : 'draft',
      seed,
      stats: { ...result.stats, violations: result.violations.length, feasible: result.feasible },
      confirmed_at: confirm ? new Date().toISOString() : null,
    })
    .select('id')
    .single();

  if (runError || !run) throw new Error(`Could not create the run: ${runError?.message}`);

  const links = result.cycle.map((budderId, index) => ({
    run_id: run.id,
    budder_id: budderId,
    buddy_id: result.cycle[(index + 1) % result.cycle.length]!,
    position: index,
  }));

  const { error } = await admin.from('assignments').insert(links);
  if (error) throw new Error(`Could not write the assignments: ${error.message}`);

  process.stdout.write(
    `  drew a ${confirm ? 'confirmed' : 'draft'} match: ` +
      `${result.stats.crossFaculty}/${result.stats.n} cross-faculty, ` +
      `${result.stats.mixed} mixed, ${result.stats.neutral} neutral, ${result.stats.same} same\n`,
  );
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const { url, serviceKey } = requireLocalSupabase();

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  process.stdout.write(`\nSeeding ${url} — phase "${options.phase}", ${options.count} people\n\n`);

  if (options.reset) await wipe(admin);

  const roster = buildRoster(options);
  const ids = await createAccounts(admin, roster);
  await insertProfiles(admin, roster, ids);

  const schedule = scheduleFor(options.phase, new Date());
  const { error: scheduleError } = await admin
    .from('settings')
    .update({
      register_open_at: schedule.open,
      register_close_at: schedule.close,
      reveal_at: schedule.reveal,
      hint2_at: schedule.hint2,
    })
    .eq('id', 1);
  if (scheduleError) throw new Error(`Could not set the schedule: ${scheduleError.message}`);
  process.stdout.write(`  schedule set for the "${options.phase}" phase\n`);

  if (options.phase === 'closed') await drawMatch(admin, roster, ids, false, options.seed);
  if (options.phase === 'revealed') await drawMatch(admin, roster, ids, true, options.seed);

  // The first person is the admin, so /admin can be opened straight away.
  const adminEmail = roster[0]!.email;
  const { error: adminError } = await admin
    .from('admins')
    .upsert({ email: adminEmail, note: 'seeded for local testing' }, { onConflict: 'email' });
  if (adminError) throw new Error(`Could not add the admin: ${adminError.message}`);

  process.stdout.write(
    `\nDone.\n\n  admin:    ${adminEmail}\n` +
      `  sign in:  http://localhost:3000/demo  (no Google needed)\n\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`\nSeed failed: ${error instanceof Error ? error.message : error}\n\n`);
  process.exit(1);
});
