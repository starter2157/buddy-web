import { afterAll, beforeEach, describe, expect, test } from 'vitest';
import {
  asRole,
  connect,
  resetDatabase,
  TEST_DATABASE_URL,
  seedPerson,
  seedRun,
  setSchedule,
  type SeedPerson,
} from './db/harness';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const CARA = '33333333-3333-4333-8333-333333333333';

const PEOPLE: Record<string, SeedPerson> = {
  alice: {
    id: ALICE,
    studentId: '6730000121', // 21 → engineering
    nickname: 'เอ',
    firstName: 'อลิศ',
    lastName: 'หนึ่ง',
    prefix: 'นางสาว',
    year: 2,
    instagram: 'alice.eng',
    message: 'ALICE-MESSAGE',
    hint1: 'ALICE-HINT-1',
    hint2: 'ALICE-HINT-2',
  },
  bob: {
    id: BOB,
    studentId: '6730000223', // 23 → science
    nickname: 'บี',
    firstName: 'บดินทร์',
    lastName: 'สอง',
    prefix: 'นาย',
    year: 1,
    instagram: 'bob.sci',
    message: 'BOB-MESSAGE',
    hint1: 'BOB-HINT-1',
    hint2: 'BOB-HINT-2',
  },
  cara: {
    id: CARA,
    studentId: '6730000333', // 33 → pharmacy
    nickname: 'ซี',
    firstName: 'จารุวรรณ',
    lastName: 'สาม',
    prefix: 'ไม่ระบุ',
    year: 3,
    instagram: 'cara.rx',
    message: 'CARA-MESSAGE',
    hint1: 'CARA-HINT-1',
    hint2: 'CARA-HINT-2',
  },
};

const LONG_PAST = '2019-01-01T00:00:00+07:00';
const PAST = '2020-01-01T00:00:00+07:00';
const FUTURE = '2099-01-01T00:00:00+07:00';

/**
 * These tests need a Postgres to run the migrations against:
 *   npm run db:up
 * Without one they skip rather than fail, so `npm test` still works on a
 * machine with no Docker.
 */
const db = await connect();
if (db) await resetDatabase(db);

const describeDb = db ? describe : describe.skip;
if (!db) {
  console.warn(`[skipped] database tests: no Postgres at ${TEST_DATABASE_URL} — run "npm run db:up"`);
}

afterAll(async () => {
  await db?.end();
});

describeDb('database', () => {
  beforeEach(async () => {
    if (!db) return;
    await db.query('truncate public.assignments, public.match_runs, public.admins cascade');
    await db.query('delete from public.profiles');
    await db.query('delete from auth.users');
    await db.query(
      `update public.settings set register_open_at = $1, register_close_at = $2,
                                   reveal_at = $3, hint2_at = null where id = 1`,
      ['2026-10-30T00:00:00+07:00', '2026-11-06T23:59:00+07:00', '2026-11-07T18:00:00+07:00'],
    );
  });

  describe('schema invariants', () => {
    test('faculty is derived from the student id, whatever the client sends', async () => {
      await seedPerson(db!, PEOPLE.alice!); // seeded with faculty 'science'
      const { rows } = await db!.query('select faculty from public.profiles where user_id = $1', [
        ALICE,
      ]);
      expect(rows[0]!.faculty).toBe('engineering');
    });

    test('a student id outside the three faculties is rejected', async () => {
      await expect(
        seedPerson(db!, { ...PEOPLE.alice!, studentId: '6730000199' }),
      ).rejects.toThrow(/not from a participating faculty/);
    });

    test('the email local part must be the student id', async () => {
      await db!.query('insert into auth.users (id, email) values ($1, $2)', [
        ALICE,
        'someone.else@student.chula.ac.th',
      ]);
      await expect(
        db!.query(
          `insert into public.profiles
             (user_id, email, prefix, first_name, last_name, nickname, student_id,
              faculty, year, instagram, message_to_budder, hint_1, hint_2, consented_at)
           values ($1, 'someone.else@student.chula.ac.th', 'นาย', 'a', 'b', 'c', '6730000121',
                   'engineering', 1, null, 'm', 'h1', 'h2', now())`,
          [ALICE],
        ),
      ).rejects.toThrow(/profiles_email_matches_student_id/);
    });

    test('instagram is stored without a leading @', async () => {
      await seedPerson(db!, { ...PEOPLE.alice!, instagram: '@@alice.eng ' });
      const { rows } = await db!.query('select instagram from public.profiles where user_id = $1', [
        ALICE,
      ]);
      expect(rows[0]!.instagram).toBe('alice.eng');
    });

    test('a blank instagram is stored as null, not an empty string', async () => {
      await seedPerson(db!, { ...PEOPLE.alice!, instagram: '   ' });
      const { rows } = await db!.query('select instagram from public.profiles where user_id = $1', [
        ALICE,
      ]);
      expect(rows[0]!.instagram).toBeNull();
    });

    test('student ids are unique', async () => {
      await seedPerson(db!, PEOPLE.alice!);
      // Two accounts cannot share an email, so claim the same student ID from a
      // second account instead — that is the collision the index has to catch.
      await db!.query('insert into auth.users (id, email) values ($1, $2)', [
        BOB,
        '6730000223@student.chula.ac.th',
      ]);
      await expect(
        db!.query(
          `insert into public.profiles
             (user_id, email, prefix, first_name, last_name, nickname, student_id,
              faculty, year, message_to_budder, hint_1, hint_2, consented_at)
           values ($1, $2, 'นาย', 'a', 'b', 'c', $3,
                   'engineering', 1, 'm', 'h1', 'h2', now())`,
          [BOB, `${PEOPLE.alice!.studentId}@student.chula.ac.th`, PEOPLE.alice!.studentId],
        ),
      ).rejects.toThrow(/profiles_student_id_key/);
    });

    test('year must be 1 to 6', async () => {
      await expect(seedPerson(db!, { ...PEOPLE.alice!, year: 7 })).rejects.toThrow(
        /profiles_year_range/,
      );
    });

    test('a person cannot be assigned to themselves', async () => {
      await seedPerson(db!, PEOPLE.alice!);
      const { rows } = await db!.query(
        `insert into public.match_runs (status, seed) values ('draft', 1) returning id`,
      );
      await expect(
        db!.query(
          'insert into public.assignments (run_id, budder_id, buddy_id, position) values ($1, $2, $2, 0)',
          [rows[0]!.id, ALICE],
        ),
      ).rejects.toThrow(/assignments_not_self/);
    });

    test('only one draft and one confirmed run can exist', async () => {
      await db!.query(`insert into public.match_runs (status, seed) values ('draft', 1)`);
      await expect(
        db!.query(`insert into public.match_runs (status, seed) values ('draft', 2)`),
      ).rejects.toThrow(/match_runs_single_draft/);
    });
  });

  describe('row level security — profiles', () => {
    beforeEach(async () => {
      if (!db) return;
      await seedPerson(db, PEOPLE.alice!);
      await seedPerson(db, PEOPLE.bob!);
    });

    test('a participant reads only their own row', async () => {
      const rows = await asRole(db!, 'authenticated', { sub: ALICE }, async (c) => {
        const r = await c.query('select user_id, nickname from public.profiles');
        return r.rows;
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]!.user_id).toBe(ALICE);
    });

    test('a participant cannot read someone else by id', async () => {
      const rows = await asRole(db!, 'authenticated', { sub: ALICE }, async (c) => {
        const r = await c.query('select * from public.profiles where user_id = $1', [BOB]);
        return r.rows;
      });
      expect(rows).toHaveLength(0);
    });

    test('a participant cannot update someone else', async () => {
      const count = await asRole(db!, 'authenticated', { sub: ALICE }, async (c) => {
        const r = await c.query('update public.profiles set nickname = $1 where user_id = $2', [
          'hacked',
          BOB,
        ]);
        return r.rowCount;
      });
      expect(count).toBe(0);
    });

    test('a participant cannot insert a row for someone else', async () => {
      await expect(
        asRole(db!, 'authenticated', { sub: ALICE }, async (c) => {
          await c.query(
            `insert into public.profiles
               (user_id, email, prefix, first_name, last_name, nickname, student_id,
                faculty, year, message_to_budder, hint_1, hint_2, consented_at)
             values ($1, '6730000433@student.chula.ac.th', 'นาย', 'a', 'b', 'c', '6730000433',
                     'engineering', 1, 'm', 'h1', 'h2', now())`,
            [CARA],
          );
        }),
      ).rejects.toThrow(/row-level security/);
    });

    test('a participant cannot delete their row', async () => {
      await expect(
        asRole(db!, 'authenticated', { sub: ALICE }, async (c) => {
          await c.query('delete from public.profiles where user_id = $1', [ALICE]);
        }),
      ).rejects.toThrow(/permission denied|row-level security/);
    });

    test('anon cannot read profiles at all', async () => {
      await expect(
        asRole(db!, 'anon', null, async (c) => {
          await c.query('select * from public.profiles');
        }),
      ).rejects.toThrow(/permission denied/);
    });

    test('an admin on the allowlist can read every profile', async () => {
      await db!.query('insert into public.admins (email) values ($1)', [
        '6730000121@student.chula.ac.th',
      ]);
      const rows = await asRole(
        db!,
        'authenticated',
        { sub: ALICE, email: '6730000121@student.chula.ac.th' },
        async (c) => (await c.query('select user_id from public.profiles')).rows,
      );
      expect(rows).toHaveLength(2);
    });

    test('someone not on the allowlist is not an admin', async () => {
      const isAdmin = await asRole(
        db!,
        'authenticated',
        { sub: BOB, email: '6730000223@student.chula.ac.th' },
        async (c) => (await c.query('select public.is_admin() as ok')).rows[0]!.ok,
      );
      expect(isAdmin).toBe(false);
    });
  });

  describe('row level security — matching tables are unreachable from a session', () => {
    beforeEach(async () => {
      if (!db) return;
      await seedPerson(db, PEOPLE.alice!);
      await seedPerson(db, PEOPLE.bob!);
      await seedRun(db, 'confirmed', [ALICE, BOB]);
    });

    test.each(['public.match_runs', 'public.assignments', 'public.admins'])(
      'a participant cannot read %s',
      async (table) => {
        await expect(
          asRole(db!, 'authenticated', { sub: ALICE }, async (c) => {
            await c.query(`select * from ${table}`);
          }),
        ).rejects.toThrow(/permission denied/);
      },
    );

    test('even an admin cannot read assignments directly from the browser role', async () => {
      await db!.query('insert into public.admins (email) values ($1)', [
        '6730000121@student.chula.ac.th',
      ]);
      await expect(
        asRole(
          db!,
          'authenticated',
          { sub: ALICE, email: '6730000121@student.chula.ac.th' },
          async (c) => {
            await c.query('select * from public.assignments');
          },
        ),
      ).rejects.toThrow(/permission denied/);
    });
  });

  describe('row level security — settings', () => {
    test('anyone can read the schedule', async () => {
      const rows = await asRole(db!, 'anon', null, async (c) =>
        (await c.query('select reveal_at from public.settings')).rows,
      );
      expect(rows).toHaveLength(1);
    });

    test('a participant cannot change the schedule', async () => {
      await seedPerson(db!, PEOPLE.alice!);
      await expect(
        asRole(db!, 'authenticated', { sub: ALICE }, async (c) => {
          await c.query('update public.settings set reveal_at = now()');
        }),
      ).rejects.toThrow(/permission denied/);
    });
  });

  describe('locked fields after registration closes', () => {
    beforeEach(async () => {
      if (!db) return;
      await seedPerson(db, PEOPLE.alice!);
    });

    test('while registration is open everything is editable', async () => {
      await setSchedule(db!, { openAt: LONG_PAST, closeAt: FUTURE, revealAt: FUTURE });
      const count = await asRole(db!, 'authenticated', { sub: ALICE }, async (c) => {
        const r = await c.query('update public.profiles set year = 4 where user_id = $1', [ALICE]);
        return r.rowCount;
      });
      expect(count).toBe(1);
    });

    test.each([
      ['year', 'year = 5'],
      ['prefix', "prefix = 'นาย'"],
      ['student_id', "student_id = '6730000223'"],
    ])('after close, %s is locked', async (_field, assignment) => {
      await setSchedule(db!, { openAt: LONG_PAST, closeAt: PAST, revealAt: FUTURE });
      await expect(
        asRole(db!, 'authenticated', { sub: ALICE }, async (c) => {
          await c.query(`update public.profiles set ${assignment} where user_id = $1`, [ALICE]);
        }),
      ).rejects.toThrow(/registration has closed/);
    });

    test('after close, the editable fields are still editable', async () => {
      await setSchedule(db!, { openAt: LONG_PAST, closeAt: PAST, revealAt: FUTURE });
      const count = await asRole(db!, 'authenticated', { sub: ALICE }, async (c) => {
        const r = await c.query(
          `update public.profiles
             set nickname = 'ใหม่', instagram = 'new.handle',
                 message_to_budder = 'm2', hint_1 = 'h1b', hint_2 = 'h2b'
           where user_id = $1`,
          [ALICE],
        );
        return r.rowCount;
      });
      expect(count).toBe(1);
    });
  });
});
