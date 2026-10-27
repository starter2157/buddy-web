import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const MIGRATIONS = path.join(ROOT, 'supabase/migrations');
const BOOTSTRAP = path.join(HERE, 'bootstrap.sql');

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:55432/buddy';

export async function connect(): Promise<Client | null> {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  try {
    await client.connect();
    return client;
  } catch {
    await client.end().catch(() => {});
    return null;
  }
}

/**
 * Rebuilds the database from the migrations, so every run starts clean.
 *
 * This drops the whole public schema, so it refuses to run against anything
 * that is not plainly a local throwaway database.
 */
export async function resetDatabase(client: Client): Promise<void> {
  const host = new URL(TEST_DATABASE_URL).hostname;
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error(
      `resetDatabase drops the public schema and will only run against a local database, not ${host}`,
    );
  }

  await client.query(`
    drop schema if exists public cascade;
    drop schema if exists auth cascade;
    create schema public;
  `);
  await client.query(readFileSync(BOOTSTRAP, 'utf8'));

  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    await client.query(readFileSync(path.join(MIGRATIONS, file), 'utf8'));
  }
}

export interface Claims {
  sub?: string;
  email?: string;
}

/**
 * Runs `fn` the way a browser session would: as the `authenticated` (or `anon`)
 * role, with the JWT claims Supabase would have verified. Everything happens in
 * a transaction that is rolled back, so tests cannot leak into each other.
 */
export async function asRole<T>(
  client: Client,
  role: 'anon' | 'authenticated',
  claims: Claims | null,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  await client.query('begin');
  try {
    await client.query('select set_config($1, $2, true)', [
      'request.jwt.claims',
      claims ? JSON.stringify(claims) : '',
    ]);
    await client.query(`set local role ${role}`);
    return await fn(client);
  } finally {
    await client.query('rollback');
  }
}

export interface SeedPerson {
  id: string;
  studentId: string;
  nickname: string;
  firstName: string;
  lastName: string;
  prefix: 'นาย' | 'นางสาว' | 'ไม่ระบุ';
  year: number;
  instagram: string | null;
  message: string;
  hint1: string;
  hint2: string;
}

export async function seedPerson(client: Client, person: SeedPerson): Promise<void> {
  const email = `${person.studentId}@student.chula.ac.th`;
  await client.query('insert into auth.users (id, email) values ($1, $2)', [person.id, email]);
  await client.query(
    `insert into public.profiles
       (user_id, email, prefix, first_name, last_name, nickname, student_id,
        faculty, year, instagram, message_to_budder, hint_1, hint_2, consented_at)
     values ($1, $2, $3, $4, $5, $6, $7, 'science', $8, $9, $10, $11, $12, now())`,
    [
      person.id,
      email,
      person.prefix,
      person.firstName,
      person.lastName,
      person.nickname,
      person.studentId,
      person.year,
      person.instagram,
      person.message,
      person.hint1,
      person.hint2,
    ],
  );
}

/** Creates a run and wires the given people into one cycle, in order. */
export async function seedRun(
  client: Client,
  status: 'draft' | 'confirmed',
  ids: string[],
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `insert into public.match_runs (status, seed, stats, confirmed_at)
     values ($1::public.match_run_status, 1, '{}'::jsonb,
             case when $1::text = 'confirmed' then now() end)
     returning id`,
    [status],
  );
  const runId = rows[0]!.id;

  for (let i = 0; i < ids.length; i += 1) {
    await client.query(
      'insert into public.assignments (run_id, budder_id, buddy_id, position) values ($1, $2, $3, $4)',
      [runId, ids[i], ids[(i + 1) % ids.length], i],
    );
  }
  return runId;
}

export async function setSchedule(
  client: Client,
  schedule: { openAt?: string; closeAt?: string; revealAt?: string; hint2At?: string | null },
): Promise<void> {
  await client.query(
    `update public.settings set
       register_open_at  = coalesce($1::timestamptz, register_open_at),
       register_close_at = coalesce($2::timestamptz, register_close_at),
       reveal_at         = coalesce($3::timestamptz, reveal_at),
       hint2_at          = $4::timestamptz
     where id = 1`,
    [schedule.openAt ?? null, schedule.closeAt ?? null, schedule.revealAt ?? null, schedule.hint2At ?? null],
  );
}
