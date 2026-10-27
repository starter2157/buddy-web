import { afterAll, beforeEach, describe, expect, test } from 'vitest';
import {
  asRole,
  connect,
  resetDatabase,
  seedPerson,
  seedRun,
  setSchedule,
  TEST_DATABASE_URL,
} from './db/harness';

/**
 * The non-negotiable privacy rules from §8 of the brief, checked against a real
 * database rather than against the application layer:
 *
 *   * the budder's identity never reaches the client;
 *   * student IDs never reach a participant;
 *   * hint 2 does not leave the database before hint2_at.
 */

const ALICE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BOB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CARA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const ALICE_SID = '6730000121'; // engineering
const BOB_SID = '6730000223'; // science
const CARA_SID = '6730000333'; // pharmacy

const PAST = '2020-01-01T00:00:00+07:00';
const LONG_PAST = '2019-01-01T00:00:00+07:00';
const FUTURE = '2099-01-01T00:00:00+07:00';

/** Everything that would identify Cara, who is Alice's budder. */
const CARA_IDENTITY = [
  CARA,
  CARA_SID,
  'ซีซ่า',
  'จารุวรรณ',
  'สามสี่',
  'cara.rx',
  `${CARA_SID}@student.chula.ac.th`,
  'CARA-MESSAGE-FOR-HER-OWN-BUDDER',
];

const EXPECTED_COLUMNS = [
  'revealed',
  'has_buddy',
  'buddy_nickname',
  'buddy_prefix',
  'buddy_first_name',
  'buddy_last_name',
  'buddy_faculty',
  'buddy_year',
  'buddy_instagram',
  'buddy_message',
  'budder_hint_1',
  'budder_hint_2',
  'hint2_at',
];

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

/** Calls get_home_view() the way the signed-in participant's session would. */
async function homeView(userId: string) {
  return asRole(db!, 'authenticated', { sub: userId }, async (c) => {
    const result = await c.query('select * from public.get_home_view()');
    return { row: result.rows[0], columns: result.fields.map((f) => f.name) };
  });
}

describeDb('get_home_view', () => {
  beforeEach(async () => {
    if (!db) return;
    await db.query('truncate public.assignments, public.match_runs, public.admins cascade');
    await db.query('delete from public.profiles');
    await db.query('delete from auth.users');

    await seedPerson(db, {
      id: ALICE,
      studentId: ALICE_SID,
      nickname: 'เอมี่',
      firstName: 'อลิศา',
      lastName: 'หนึ่งสอง',
      prefix: 'นางสาว',
      year: 2,
      instagram: 'alice.eng',
      message: 'ALICE-MESSAGE',
      hint1: 'ALICE-HINT-1',
      hint2: 'ALICE-HINT-2',
    });
    await seedPerson(db, {
      id: BOB,
      studentId: BOB_SID,
      nickname: 'บีม',
      firstName: 'บดินทร์',
      lastName: 'สองสาม',
      prefix: 'นาย',
      year: 1,
      instagram: 'bob.sci',
      message: 'BOB-MESSAGE-FOR-ALICE',
      hint1: 'BOB-HINT-1',
      hint2: 'BOB-HINT-2',
    });
    await seedPerson(db, {
      id: CARA,
      studentId: CARA_SID,
      nickname: 'ซีซ่า',
      firstName: 'จารุวรรณ',
      lastName: 'สามสี่',
      prefix: 'ไม่ระบุ',
      year: 3,
      instagram: 'cara.rx',
      message: 'CARA-MESSAGE-FOR-HER-OWN-BUDDER',
      hint1: 'CARA-HINT-1',
      hint2: 'CARA-HINT-2',
    });

    // Alice → Bob → Cara → Alice. So Alice looks after Bob, and Cara looks
    // after Alice: Cara is the budder whose identity Alice must never learn.
    await seedRun(db, 'confirmed', [ALICE, BOB, CARA]);
    await setSchedule(db, { openAt: LONG_PAST, closeAt: PAST, revealAt: PAST, hint2At: null });
  });

  describe('before the reveal', () => {
    test('nothing is returned while reveal_at is in the future', async () => {
      await setSchedule(db!, { openAt: LONG_PAST, closeAt: PAST, revealAt: FUTURE });
      const { row } = await homeView(ALICE);

      expect(row.revealed).toBe(false);
      expect(row.buddy_nickname).toBeNull();
      expect(row.buddy_message).toBeNull();
      expect(row.budder_hint_1).toBeNull();
      expect(row.budder_hint_2).toBeNull();
    });

    test('nothing is returned while the run is still a draft', async () => {
      await db!.query('truncate public.assignments, public.match_runs cascade');
      await seedRun(db!, 'draft', [ALICE, BOB, CARA]);

      const { row } = await homeView(ALICE);
      expect(row.revealed).toBe(false);
      expect(row.buddy_nickname).toBeNull();
      expect(row.budder_hint_1).toBeNull();
    });

    test('a draft run leaks nothing even after reveal_at has passed', async () => {
      await db!.query('truncate public.assignments, public.match_runs cascade');
      await seedRun(db!, 'draft', [ALICE, BOB, CARA]);
      await setSchedule(db!, { openAt: LONG_PAST, closeAt: PAST, revealAt: PAST });

      const { row } = await homeView(ALICE);
      expect(JSON.stringify(row)).not.toContain('BOB');
      expect(JSON.stringify(row)).not.toContain('CARA');
    });
  });

  describe('after the reveal', () => {
    test('returns the buddy the participant looks after', async () => {
      const { row } = await homeView(ALICE);

      expect(row.revealed).toBe(true);
      expect(row.has_buddy).toBe(true);
      expect(row.buddy_nickname).toBe('บีม');
      expect(row.buddy_first_name).toBe('บดินทร์');
      expect(row.buddy_faculty).toBe('science');
      expect(row.buddy_year).toBe(1);
      expect(row.buddy_instagram).toBe('bob.sci');
      expect(row.buddy_message).toBe('BOB-MESSAGE-FOR-ALICE');
    });

    test('returns the hints written by the budder', async () => {
      const { row } = await homeView(ALICE);
      expect(row.budder_hint_1).toBe('CARA-HINT-1');
    });

    test('budder and buddy are not swapped — checked from the other side too', async () => {
      // Bob looks after Cara, and Alice looks after Bob.
      const { row } = await homeView(BOB);
      expect(row.buddy_nickname).toBe('ซีซ่า');
      expect(row.budder_hint_1).toBe('ALICE-HINT-1');
    });

    test('a buddy without Instagram comes back null, for the dashed-box branch', async () => {
      await db!.query('update public.profiles set instagram = null where user_id = $1', [BOB]);
      const { row } = await homeView(ALICE);
      expect(row.buddy_instagram).toBeNull();
    });
  });

  describe('the budder stays anonymous', () => {
    test('no column of the result can carry an identity', async () => {
      const { columns } = await homeView(ALICE);
      expect(columns.sort()).toEqual([...EXPECTED_COLUMNS].sort());
    });

    test('no value in the payload identifies the budder', async () => {
      const { row } = await homeView(ALICE);
      const payload = JSON.stringify(row);

      for (const identifier of CARA_IDENTITY) {
        expect(payload).not.toContain(identifier);
      }
    });

    test('the budder\'s own message to their budder is not returned', async () => {
      const { row } = await homeView(ALICE);
      expect(JSON.stringify(row)).not.toContain('CARA-MESSAGE-FOR-HER-OWN-BUDDER');
    });

    test('no student id reaches a participant', async () => {
      for (const user of [ALICE, BOB, CARA]) {
        const { row } = await homeView(user);
        const payload = JSON.stringify(row);
        for (const sid of [ALICE_SID, BOB_SID, CARA_SID]) {
          expect(payload).not.toContain(sid);
        }
      }
    });
  });

  describe('hint 2 is withheld until its time', () => {
    test('null hint2_at keeps hint 2 in the database', async () => {
      const { row } = await homeView(ALICE);
      expect(row.budder_hint_2).toBeNull();
      expect(row.hint2_at).toBeNull();
    });

    test('a future hint2_at keeps hint 2 in the database', async () => {
      await setSchedule(db!, { openAt: LONG_PAST, closeAt: PAST, revealAt: PAST, hint2At: FUTURE });
      const { row } = await homeView(ALICE);

      expect(row.budder_hint_2).toBeNull();
      expect(JSON.stringify(row)).not.toContain('CARA-HINT-2');
      // The date itself is public, so the locked card can show it.
      expect(row.hint2_at).not.toBeNull();
    });

    test('once hint2_at has passed, hint 2 is returned', async () => {
      await setSchedule(db!, { openAt: LONG_PAST, closeAt: PAST, revealAt: PAST, hint2At: PAST });
      const { row } = await homeView(ALICE);
      expect(row.budder_hint_2).toBe('CARA-HINT-2');
    });
  });

  describe('callers without a match', () => {
    test('a participant left out of the run gets no buddy and no hints', async () => {
      await db!.query('delete from public.assignments where budder_id = $1 or buddy_id = $1', [
        ALICE,
      ]);
      const { row } = await homeView(ALICE);

      expect(row.revealed).toBe(true);
      expect(row.has_buddy).toBe(false);
      expect(row.buddy_nickname).toBeNull();
      expect(row.budder_hint_1).toBeNull();
    });

    test('anon cannot call it at all', async () => {
      await expect(
        asRole(db!, 'anon', null, async (c) => {
          await c.query('select * from public.get_home_view()');
        }),
      ).rejects.toThrow(/permission denied/);
    });

    test('an authenticated caller with no session subject gets no rows', async () => {
      const rows = await asRole(db!, 'authenticated', {}, async (c) =>
        (await c.query('select * from public.get_home_view()')).rows,
      );
      expect(rows).toHaveLength(0);
    });
  });
});
