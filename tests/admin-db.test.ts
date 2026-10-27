import { afterAll, beforeEach, describe, expect, test } from 'vitest';
import {
  asRole,
  connect,
  resetDatabase,
  seedPerson,
  seedRun,
  TEST_DATABASE_URL,
  type SeedPerson,
} from './db/harness';

/**
 * The admin functions are the only way match_runs and assignments can be
 * reached from a session, so each one is checked from both sides: an admin
 * gets through, and a signed-in participant does not.
 */

const db = await connect();
if (db) await resetDatabase(db);

const describeDb = db ? describe : describe.skip;
if (!db) {
  console.warn(`[skipped] admin database tests: no Postgres at ${TEST_DATABASE_URL}`);
}

const ADMIN = 'aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PARTICIPANT = 'bbbb2222-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const THIRD = 'cccc3333-cccc-4ccc-8ccc-cccccccccccc';

const ADMIN_EMAIL = '6730000121@student.chula.ac.th';
const PARTICIPANT_EMAIL = '6730000223@student.chula.ac.th';

function person(id: string, studentId: string, nickname: string): SeedPerson {
  return {
    id,
    studentId,
    nickname,
    firstName: `ชื่อ${nickname}`,
    lastName: `สกุล${nickname}`,
    prefix: 'นาย',
    year: 1,
    instagram: null,
    message: 'm',
    hint1: 'h1',
    hint2: 'h2',
  };
}

type Db = NonNullable<typeof db>;

async function asAdmin<T>(fn: (c: Db) => Promise<T>): Promise<T> {
  return asRole(db!, 'authenticated', { sub: ADMIN, email: ADMIN_EMAIL }, fn);
}

async function asParticipant<T>(fn: (c: Db) => Promise<T>): Promise<T> {
  return asRole(db!, 'authenticated', { sub: PARTICIPANT, email: PARTICIPANT_EMAIL }, fn);
}

/**
 * asRole rolls its transaction back, so a write and the check that it landed
 * have to happen inside the same one. `reset role` drops back to the owner
 * mid-transaction so the check can read tables the browser roles cannot.
 */
async function asAdminThenVerify<T>(
  write: (c: Db) => Promise<unknown>,
  verify: (c: Db) => Promise<T>,
): Promise<T> {
  return asRole(db!, 'authenticated', { sub: ADMIN, email: ADMIN_EMAIL }, async (c) => {
    await write(c);
    await c.query('reset role');
    return verify(c);
  });
}

describeDb('admin functions', () => {
  beforeEach(async () => {
    if (!db) return;
    await db.query('truncate public.assignments, public.match_runs, public.admins cascade');
    await db.query('delete from public.profiles');
    await db.query('delete from auth.users');

    await seedPerson(db, person(ADMIN, '6730000121', 'เอ'));
    await seedPerson(db, person(PARTICIPANT, '6730000223', 'บี'));
    await seedPerson(db, person(THIRD, '6730000333', 'ซี'));
    await db.query('insert into public.admins (email) values ($1)', [ADMIN_EMAIL]);
  });

  describe('admin_latest_run', () => {
    test('prefers the draft over the confirmed run', async () => {
      await seedRun(db!, 'confirmed', [ADMIN, PARTICIPANT, THIRD]);
      await seedRun(db!, 'draft', [ADMIN, THIRD, PARTICIPANT]);

      const rows = await asAdmin(async (c) =>
        (await c.query('select status from public.admin_latest_run()')).rows,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.status).toBe('draft');
    });

    test('falls back to the confirmed run', async () => {
      await seedRun(db!, 'confirmed', [ADMIN, PARTICIPANT, THIRD]);
      const rows = await asAdmin(async (c) =>
        (await c.query('select status from public.admin_latest_run()')).rows,
      );
      expect(rows[0]!.status).toBe('confirmed');
    });

    test('a participant cannot call it', async () => {
      await expect(
        asParticipant(async (c) => c.query('select * from public.admin_latest_run()')),
      ).rejects.toThrow(/admins only/);
    });
  });

  describe('admin_pairs', () => {
    test('returns both sides of every link, in cycle order', async () => {
      const runId = await seedRun(db!, 'draft', [ADMIN, PARTICIPANT, THIRD]);

      const rows = await asAdmin(async (c) =>
        (
          await c.query(
            'select cycle_position, budder_nickname, buddy_nickname, budder_student_id from public.admin_pairs($1)',
            [runId],
          )
        ).rows,
      );

      expect(rows.map((r) => [r.budder_nickname, r.buddy_nickname])).toEqual([
        ['เอ', 'บี'],
        ['บี', 'ซี'],
        ['ซี', 'เอ'],
      ]);
      // Student IDs belong on the admin checking screen.
      expect(rows[0]!.budder_student_id).toBe('6730000121');
    });

    test('a participant cannot call it', async () => {
      const runId = await seedRun(db!, 'draft', [ADMIN, PARTICIPANT, THIRD]);
      await expect(
        asParticipant(async (c) => c.query('select * from public.admin_pairs($1)', [runId])),
      ).rejects.toThrow(/admins only/);
    });
  });

  describe('admin_replace_draft_run', () => {
    test('creates a draft wired into one cycle', async () => {
      const links = await asAdminThenVerify(
        (c) =>
          c.query('select public.admin_replace_draft_run($1, $2, $3)', [
            7,
            JSON.stringify({ n: 3 }),
            [ADMIN, PARTICIPANT, THIRD],
          ]),
        async (c) =>
          (
            await c.query(
              `select budder_id, buddy_id, position from public.assignments
               where run_id = (select id from public.match_runs where status = 'draft')
               order by position`,
            )
          ).rows,
      );

      expect(links).toHaveLength(3);
      expect(links[0]!.budder_id).toBe(ADMIN);
      expect(links[2]!.buddy_id).toBe(ADMIN); // the cycle closes
    });

    test('replaces an existing draft rather than adding a second', async () => {
      const runs = await asAdminThenVerify(
        async (c) => {
          await c.query('select public.admin_replace_draft_run($1, $2, $3)', [
            1,
            '{}',
            [ADMIN, PARTICIPANT, THIRD],
          ]);
          await c.query('select public.admin_replace_draft_run($1, $2, $3)', [
            2,
            '{}',
            [ADMIN, THIRD, PARTICIPANT],
          ]);
        },
        async (c) =>
          (await c.query("select seed from public.match_runs where status = 'draft'")).rows,
      );

      expect(runs).toHaveLength(1);
      expect(Number(runs[0]!.seed)).toBe(2);
    });

    test('leaves a confirmed run alone', async () => {
      const confirmedId = await seedRun(db!, 'confirmed', [ADMIN, PARTICIPANT, THIRD]);

      const rows = await asAdminThenVerify(
        (c) =>
          c.query('select public.admin_replace_draft_run($1, $2, $3)', [
            9,
            '{}',
            [ADMIN, THIRD, PARTICIPANT],
          ]),
        async (c) =>
          (await c.query("select id from public.match_runs where status = 'confirmed'")).rows,
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]!.id).toBe(confirmedId);
    });

    test('refuses a cycle of fewer than two people', async () => {
      await expect(
        asAdmin(async (c) =>
          c.query('select public.admin_replace_draft_run($1, $2, $3)', [1, '{}', [ADMIN]]),
        ),
      ).rejects.toThrow(/at least two people/);
    });

    test('a participant cannot call it', async () => {
      await expect(
        asParticipant(async (c) =>
          c.query('select public.admin_replace_draft_run($1, $2, $3)', [
            1,
            '{}',
            [ADMIN, PARTICIPANT, THIRD],
          ]),
        ),
      ).rejects.toThrow(/admins only/);
    });
  });

  describe('admin_set_draft_cycle', () => {
    test('rewrites the cycle and the stats', async () => {
      const runId = await seedRun(db!, 'draft', [ADMIN, PARTICIPANT, THIRD]);

      const after = await asAdminThenVerify(
        (c) =>
          c.query('select public.admin_set_draft_cycle($1, $2, $3)', [
            runId,
            [ADMIN, THIRD, PARTICIPANT],
            JSON.stringify({ n: 3, mixed: 2 }),
          ]),
        async (c) => ({
          links: (
            await c.query(
              'select buddy_id from public.assignments where run_id = $1 order by position',
              [runId],
            )
          ).rows,
          stats: (await c.query('select stats from public.match_runs where id = $1', [runId]))
            .rows[0]!.stats,
        }),
      );

      expect(after.links[0]!.buddy_id).toBe(THIRD);
      expect(after.stats).toEqual({ n: 3, mixed: 2 });
    });

    test('refuses to touch a confirmed run', async () => {
      const runId = await seedRun(db!, 'confirmed', [ADMIN, PARTICIPANT, THIRD]);
      await expect(
        asAdmin(async (c) =>
          c.query('select public.admin_set_draft_cycle($1, $2, $3)', [
            runId,
            [ADMIN, THIRD, PARTICIPANT],
            '{}',
          ]),
        ),
      ).rejects.toThrow(/only a draft/);
    });
  });

  describe('admin_confirm_draft_run', () => {
    test('promotes the draft and timestamps it', async () => {
      const runId = await seedRun(db!, 'draft', [ADMIN, PARTICIPANT, THIRD]);

      const row = await asAdminThenVerify(
        (c) => c.query('select public.admin_confirm_draft_run()'),
        async (c) =>
          (
            await c.query('select status, confirmed_at from public.match_runs where id = $1', [
              runId,
            ])
          ).rows[0]!,
      );

      expect(row.status).toBe('confirmed');
      expect(row.confirmed_at).not.toBeNull();
    });

    test('replaces a previously confirmed run, so only one answer exists', async () => {
      await seedRun(db!, 'confirmed', [ADMIN, PARTICIPANT, THIRD]);
      const draftId = await seedRun(db!, 'draft', [ADMIN, THIRD, PARTICIPANT]);

      const runs = await asAdminThenVerify(
        (c) => c.query('select public.admin_confirm_draft_run()'),
        async (c) =>
          (await c.query("select id from public.match_runs where status = 'confirmed'")).rows,
      );

      expect(runs).toHaveLength(1);
      expect(runs[0]!.id).toBe(draftId);
    });

    test('says so when there is no draft', async () => {
      await expect(
        asAdmin(async (c) => c.query('select public.admin_confirm_draft_run()')),
      ).rejects.toThrow(/no draft to confirm/);
    });

    test('a participant cannot call it', async () => {
      await seedRun(db!, 'draft', [ADMIN, PARTICIPANT, THIRD]);
      await expect(
        asParticipant(async (c) => c.query('select public.admin_confirm_draft_run()')),
      ).rejects.toThrow(/admins only/);
    });
  });

  describe('admin_save_schedule', () => {
    const save = (open: string, close: string, reveal: string, hint2: string | null) =>
      asAdmin(async (c) =>
        c.query('select public.admin_save_schedule($1, $2, $3, $4)', [open, close, reveal, hint2]),
      );

    const saveThenRead = (hint2: string | null) =>
      asAdminThenVerify(
        (c) =>
          c.query('select public.admin_save_schedule($1, $2, $3, $4)', [
            '2026-10-30T00:00:00+07:00',
            '2026-11-06T23:59:00+07:00',
            '2026-11-07T18:00:00+07:00',
            hint2,
          ]),
        async (c) =>
          (await c.query('select reveal_at, hint2_at from public.settings where id = 1')).rows[0]!,
      );

    test('stores a valid schedule', async () => {
      const row = await saveThenRead('2026-11-09T12:00:00+07:00');
      expect(row.hint2_at).not.toBeNull();
      expect(new Date(row.reveal_at).toISOString()).toBe('2026-11-07T11:00:00.000Z');
    });

    test('clears hint 2 when it is not set', async () => {
      // Set it first, so clearing it is a real change rather than a no-op.
      await db!.query("update public.settings set hint2_at = now() + interval '30 days' where id = 1");
      const row = await saveThenRead(null);
      expect(row.hint2_at).toBeNull();
    });

    test.each([
      [
        'opening after closing',
        ['2026-11-07T00:00:00+07:00', '2026-11-06T23:59:00+07:00', '2026-11-08T18:00:00+07:00', null],
        /ต้องมาก่อนเวลาปิด/,
      ],
      [
        'closing after the reveal',
        ['2026-10-30T00:00:00+07:00', '2026-11-08T23:59:00+07:00', '2026-11-07T18:00:00+07:00', null],
        /ต้องไม่เกินเวลาประกาศผล/,
      ],
      [
        'hint 2 before the reveal',
        [
          '2026-10-30T00:00:00+07:00',
          '2026-11-06T23:59:00+07:00',
          '2026-11-07T18:00:00+07:00',
          '2026-11-07T12:00:00+07:00',
        ],
        /คำใบ้ 2 ต้องไม่มาก่อน/,
      ],
    ])('refuses %s with a readable message', async (_label, args, expected) => {
      await expect(
        save(args[0] as string, args[1] as string, args[2] as string, args[3] as string | null),
      ).rejects.toThrow(expected);
    });

    test('a participant cannot call it', async () => {
      await expect(
        asParticipant(async (c) =>
          c.query('select public.admin_save_schedule($1, $2, $3, $4)', [
            '2026-10-30T00:00:00+07:00',
            '2026-11-06T23:59:00+07:00',
            '2026-11-07T18:00:00+07:00',
            null,
          ]),
        ),
      ).rejects.toThrow(/admins only/);
    });
  });
});

afterAll(async () => {
  await db?.end();
});

describeDb('cron_create_draft_run', () => {
  beforeEach(async () => {
    if (!db) return;
    await db.query('truncate public.assignments, public.match_runs, public.admins cascade');
    await db.query('delete from public.profiles');
    await db.query('delete from auth.users');

    await seedPerson(db, person(ADMIN, '6730000121', 'เอ'));
    await seedPerson(db, person(PARTICIPANT, '6730000223', 'บี'));
    await seedPerson(db, person(THIRD, '6730000333', 'ซี'));
  });

  test('creates a draft run when there is none', async () => {
    const runId = (
      await db!.query('select public.cron_create_draft_run($1, $2, $3) as id', [
        5,
        JSON.stringify({ n: 3 }),
        [ADMIN, PARTICIPANT, THIRD],
      ])
    ).rows[0]!.id;

    expect(runId).not.toBeNull();
    const links = (
      await db!.query('select count(*)::int as n from public.assignments where run_id = $1', [runId])
    ).rows[0]!.n;
    expect(links).toBe(3);
  });

  test.each(['draft', 'confirmed'] as const)(
    'does nothing when a %s run already exists',
    async (status) => {
      const existing = await seedRun(db!, status, [ADMIN, PARTICIPANT, THIRD]);

      const runId = (
        await db!.query('select public.cron_create_draft_run($1, $2, $3) as id', [
          6,
          '{}',
          [ADMIN, THIRD, PARTICIPANT],
        ])
      ).rows[0]!.id;

      // Reports "nothing to do" rather than drawing a second match.
      expect(runId).toBeNull();

      const runs = (await db!.query('select id from public.match_runs')).rows;
      expect(runs).toHaveLength(1);
      expect(runs[0]!.id).toBe(existing);
    },
  );

  test('firing twice leaves exactly one run', async () => {
    const args: [number, string, string[]] = [7, '{}', [ADMIN, PARTICIPANT, THIRD]];
    await db!.query('select public.cron_create_draft_run($1, $2, $3)', args);
    await db!.query('select public.cron_create_draft_run($1, $2, $3)', args);

    const count = (await db!.query('select count(*)::int as n from public.match_runs')).rows[0]!.n;
    expect(count).toBe(1);
  });

  test('is not callable by a signed-in participant', async () => {
    await expect(
      asParticipant(async (c) =>
        c.query('select public.cron_create_draft_run($1, $2, $3)', [
          8,
          '{}',
          [ADMIN, PARTICIPANT, THIRD],
        ]),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});
