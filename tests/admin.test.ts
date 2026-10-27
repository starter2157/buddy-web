import { describe, expect, test } from 'vitest';
import { UTF8_BOM, csvFilename, toCsv } from '@/lib/csv';
import { countPeople, describePair, filterPairs, type AdminPerson } from '@/lib/pairs';

function person(over: Partial<AdminPerson> = {}): AdminPerson {
  return {
    userId: 'u1',
    nickname: 'ภูมิ',
    prefix: 'นาย',
    firstName: 'ภูมิพัฒน์',
    lastName: 'ตัวอย่าง',
    faculty: 'engineering',
    year: 2,
    instagram: 'phum.eng',
    studentId: '6630000121',
    ...over,
  };
}

describe('toCsv', () => {
  test('starts with a byte order mark so Excel reads Thai correctly', () => {
    expect(toCsv([['ชื่อ']]).startsWith(UTF8_BOM)).toBe(true);
  });

  test('uses CRLF line endings', () => {
    expect(toCsv([['a'], ['b']])).toBe(`${UTF8_BOM}a\r\nb\r\n`);
  });

  test('quotes cells containing a comma, a quote or a newline', () => {
    expect(toCsv([['a,b']])).toContain('"a,b"');
    expect(toCsv([['say "hi"']])).toContain('"say ""hi"""');
    expect(toCsv([['two\nlines']])).toContain('"two\nlines"');
  });

  test('leaves ordinary cells unquoted', () => {
    expect(toCsv([['ข้าวหอม', '6730000223']])).toBe(`${UTF8_BOM}ข้าวหอม,6730000223\r\n`);
  });

  test('writes null and undefined as empty cells', () => {
    expect(toCsv([[null, undefined, 'x']])).toBe(`${UTF8_BOM},,x\r\n`);
  });

  test('numbers are written as they read', () => {
    expect(toCsv([[1, 2]])).toBe(`${UTF8_BOM}1,2\r\n`);
  });

  test('a cell that looks like a formula is neutralised', () => {
    // An Instagram handle or a name beginning with = would otherwise be
    // evaluated when the file is opened.
    const csv = toCsv([['=SUM(A1:A9)']]);
    expect(csv).toContain('"\t=SUM(A1:A9)"');
    expect(csv).not.toMatch(/,=SUM/);
  });

  test.each(['+1', '-1', '@handle'])('also neutralises a cell starting with %s', (value) => {
    expect(toCsv([[value]])).toContain(`"\t${value}"`);
  });
});

describe('csvFilename', () => {
  test('carries a sortable timestamp', () => {
    expect(csvFilename('buddy-pairs', new Date('2026-11-07T18:30:00Z'))).toBe(
      'buddy-pairs-2026-11-07-18-30.csv',
    );
  });
});

describe('describePair', () => {
  test('flags a cross-faculty link', () => {
    const pair = describePair(0, person(), person({ faculty: 'science' }));
    expect(pair.crossFaculty).toBe(true);
  });

  test('flags a same-faculty link', () => {
    const pair = describePair(0, person(), person({ faculty: 'engineering' }));
    expect(pair.crossFaculty).toBe(false);
  });

  test.each([
    ['นาย', 'นางสาว', 'mixed'],
    ['นาย', 'นาย', 'same'],
    ['ไม่ระบุ', 'นาย', 'neutral'],
    ['ไม่ระบุ', 'ไม่ระบุ', 'neutral'],
  ] as const)('%s with %s is %s', (a, b, expected) => {
    expect(describePair(0, person({ prefix: a }), person({ prefix: b })).gender).toBe(expected);
  });
});

describe('filterPairs', () => {
  const pairs = [
    describePair(
      0,
      person({ nickname: 'ภูมิ', firstName: 'ภูมิพัฒน์', lastName: 'ตัวอย่าง', studentId: '6630000121' }),
      person({ nickname: 'ข้าวหอม', firstName: 'พิมพ์ชนก', lastName: 'ใจดี', studentId: '6730000223' }),
    ),
    describePair(
      1,
      person({ nickname: 'ต้นกล้า', firstName: 'กล้า', lastName: 'ตั้งใจ', studentId: '6530000333' }),
      person({ nickname: 'มายด์', firstName: 'มายา', lastName: 'สดใส', studentId: '6730000421' }),
    ),
  ];

  test('an empty query returns everything', () => {
    expect(filterPairs(pairs, '')).toHaveLength(2);
    expect(filterPairs(pairs, '   ')).toHaveLength(2);
  });

  test('finds someone on the budder side', () => {
    expect(filterPairs(pairs, 'ภูมิ')).toHaveLength(1);
  });

  test('finds someone on the buddy side', () => {
    const found = filterPairs(pairs, 'มายด์');
    expect(found).toHaveLength(1);
    expect(found[0]!.position).toBe(1);
  });

  test('matches a nickname, a first name, a last name or a student id', () => {
    expect(filterPairs(pairs, 'ข้าวหอม')).toHaveLength(1);
    expect(filterPairs(pairs, 'พิมพ์ชนก')).toHaveLength(1);
    expect(filterPairs(pairs, 'ใจดี')).toHaveLength(1);
    expect(filterPairs(pairs, '6730000223')).toHaveLength(1);
  });

  test('matches a partial student id', () => {
    expect(filterPairs(pairs, '67300002')).toHaveLength(1);
  });

  test('ignores case and surrounding spaces', () => {
    const latin = [describePair(0, person({ nickname: 'Beam' }), person({ nickname: 'Mind' }))];
    expect(filterPairs(latin, '  bEaM ')).toHaveLength(1);
  });

  test('returns nothing when there is no match', () => {
    expect(filterPairs(pairs, 'ไม่มีคนนี้')).toHaveLength(0);
  });

  test('does not search the Instagram handle', () => {
    // The brief lists first name, last name, nickname and student ID only.
    expect(filterPairs(pairs, 'phum.eng')).toHaveLength(0);
  });
});

describe('countPeople', () => {
  test('counts the roster by prefix and by faculty', () => {
    const totals = countPeople([
      { prefix: 'นาย', faculty: 'engineering' },
      { prefix: 'นางสาว', faculty: 'science' },
      { prefix: 'ไม่ระบุ', faculty: 'pharmacy' },
      { prefix: 'นาย', faculty: 'engineering' },
    ]);

    expect(totals.total).toBe(4);
    expect(totals.byPrefix).toEqual({ นาย: 2, นางสาว: 1, ไม่ระบุ: 1 });
    expect(totals.byFaculty).toEqual({ engineering: 2, science: 1, pharmacy: 1 });
  });

  test('an empty roster counts zero everywhere rather than leaving gaps', () => {
    const totals = countPeople([]);
    expect(totals.total).toBe(0);
    expect(Object.values(totals.byPrefix)).toEqual([0, 0, 0]);
    expect(Object.values(totals.byFaculty)).toEqual([0, 0, 0]);
  });
});
