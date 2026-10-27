import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  areIdentityFieldsLocked,
  canRegister,
  isHint2Open,
  resolvePhase,
  serverNow,
  type Schedule,
} from '@/lib/phase';
import {
  formatThaiDate,
  formatThaiDateRange,
  formatThaiDateTime,
  formatThaiTime,
  fromBangkokInputValue,
  toBangkokInputValue,
} from '@/lib/time';

/** The defaults the migration ships with. */
const SCHEDULE: Schedule = {
  registerOpenAt: new Date('2026-10-30T00:00:00+07:00'),
  registerCloseAt: new Date('2026-11-06T23:59:00+07:00'),
  revealAt: new Date('2026-11-07T18:00:00+07:00'),
  hint2At: null,
};

describe('resolvePhase', () => {
  test.each([
    ['well before opening', '2026-10-01T12:00:00+07:00', 'before_open'],
    ['a minute before opening', '2026-10-29T23:59:00+07:00', 'before_open'],
    ['the instant it opens', '2026-10-30T00:00:00+07:00', 'open'],
    ['mid-registration', '2026-11-02T10:00:00+07:00', 'open'],
    ['a minute before closing', '2026-11-06T23:58:00+07:00', 'open'],
    ['the instant it closes', '2026-11-06T23:59:00+07:00', 'closed'],
    ['during the checking window', '2026-11-07T09:00:00+07:00', 'closed'],
    ['a minute before the reveal', '2026-11-07T17:59:00+07:00', 'closed'],
    ['the instant of the reveal', '2026-11-07T18:00:00+07:00', 'revealed'],
    ['long after', '2026-12-25T00:00:00+07:00', 'revealed'],
  ])('%s → %s', (_label, iso, expected) => {
    expect(resolvePhase(new Date(iso), SCHEDULE)).toBe(expected);
  });

  test('boundaries are inclusive at the start of each phase', () => {
    // Registration opens exactly at register_open_at, not a millisecond later.
    const justBefore = new Date(SCHEDULE.registerOpenAt.getTime() - 1);
    expect(resolvePhase(justBefore, SCHEDULE)).toBe('before_open');
    expect(resolvePhase(SCHEDULE.registerOpenAt, SCHEDULE)).toBe('open');
  });

  test('is unaffected by the host time zone', () => {
    // Same instant, written three ways.
    const instants = [
      '2026-11-07T18:00:00+07:00',
      '2026-11-07T11:00:00Z',
      '2026-11-07T06:00:00-05:00',
    ];
    for (const iso of instants) {
      expect(resolvePhase(new Date(iso), SCHEDULE)).toBe('revealed');
    }
  });
});

describe('canRegister', () => {
  test('only while registration is open', () => {
    expect(canRegister('before_open')).toBe(false);
    expect(canRegister('open')).toBe(true);
    expect(canRegister('closed')).toBe(false);
    expect(canRegister('revealed')).toBe(false);
  });
});

describe('areIdentityFieldsLocked', () => {
  test('locked from the moment registration closes', () => {
    expect(areIdentityFieldsLocked('before_open')).toBe(false);
    expect(areIdentityFieldsLocked('open')).toBe(false);
    expect(areIdentityFieldsLocked('closed')).toBe(true);
    expect(areIdentityFieldsLocked('revealed')).toBe(true);
  });
});

describe('isHint2Open', () => {
  const at = (iso: string) => new Date(iso);

  test('stays shut while the team has not set a date', () => {
    expect(isHint2Open(at('2026-12-01T00:00:00+07:00'), SCHEDULE)).toBe(false);
  });

  test('opens once the set time passes', () => {
    const schedule = { ...SCHEDULE, hint2At: at('2026-11-08T12:00:00+07:00') };
    expect(isHint2Open(at('2026-11-08T11:59:59+07:00'), schedule)).toBe(false);
    expect(isHint2Open(at('2026-11-08T12:00:00+07:00'), schedule)).toBe(true);
  });
});

describe('serverNow', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('is the real clock when DEMO_NOW is unset', () => {
    vi.stubEnv('DEMO_NOW', '');
    expect(Math.abs(serverNow().getTime() - Date.now())).toBeLessThan(2000);
  });

  test('travels in time outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEMO_NOW', '2026-11-07T18:00:00+07:00');
    expect(resolvePhase(serverNow(), SCHEDULE)).toBe('revealed');
  });

  test('is ignored in production unless time travel is turned on explicitly', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEMO_NOW', '2026-11-07T18:00:00+07:00');
    expect(Math.abs(serverNow().getTime() - Date.now())).toBeLessThan(2000);

    vi.stubEnv('ALLOW_TIME_TRAVEL', '1');
    expect(serverNow().toISOString()).toBe('2026-11-07T11:00:00.000Z');
  });

  test('refuses a DEMO_NOW that is not a date', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEMO_NOW', 'next tuesday');
    expect(() => serverNow()).toThrow(/not a valid date/);
  });
});

describe('Thai dates', () => {
  const reveal = new Date('2026-11-07T18:00:00+07:00');

  test('uses the Buddhist era and Thai month names', () => {
    expect(formatThaiDate(reveal)).toBe('7 พ.ย. 2569');
  });

  test('formats the time the way the design writes it', () => {
    expect(formatThaiTime(reveal)).toBe('18:00 น.');
    expect(formatThaiDateTime(reveal)).toBe('7 พ.ย. 2569 · 18:00 น.');
  });

  test('renders in Bangkok time whatever the host zone', () => {
    // 23:30 UTC on the 6th is already 06:30 on the 7th in Bangkok.
    expect(formatThaiDateTime(new Date('2026-11-06T23:30:00Z'))).toBe('7 พ.ย. 2569 · 06:30 น.');
  });

  test('writes the registration window as the design does', () => {
    expect(
      formatThaiDateRange(
        new Date('2026-10-30T00:00:00+07:00'),
        new Date('2026-11-06T23:59:00+07:00'),
      ),
    ).toBe('30 ต.ค. – 6 พ.ย. 2569');
  });

  test('keeps both years when a range crosses one', () => {
    expect(
      formatThaiDateRange(
        new Date('2026-12-30T00:00:00+07:00'),
        new Date('2027-01-05T00:00:00+07:00'),
      ),
    ).toBe('30 ธ.ค. 2569 – 5 ม.ค. 2570');
  });

  test('covers every month abbreviation', () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      formatThaiDate(new Date(Date.UTC(2026, i, 15, 5, 0, 0))).split(' ')[1],
    );
    expect(months).toEqual([
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ]);
  });
});

describe('datetime-local values in Bangkok time', () => {
  test('renders a stored timestamp as Bangkok wall time', () => {
    expect(toBangkokInputValue(new Date('2026-11-07T18:00:00+07:00'))).toBe('2026-11-07T18:00');
    // 23:30 UTC is already the next morning in Bangkok.
    expect(toBangkokInputValue(new Date('2026-11-06T23:30:00Z'))).toBe('2026-11-07T06:30');
  });

  test('an empty value round-trips as empty', () => {
    expect(toBangkokInputValue(null)).toBe('');
    expect(fromBangkokInputValue('')).toBeNull();
    expect(fromBangkokInputValue('   ')).toBeNull();
  });

  test('reads an input value back as Bangkok time', () => {
    expect(fromBangkokInputValue('2026-11-07T18:00')).toBe('2026-11-07T18:00:00+07:00');
  });

  test('round-trips through both directions', () => {
    const original = new Date('2026-10-30T00:00:00+07:00');
    const iso = fromBangkokInputValue(toBangkokInputValue(original));
    expect(new Date(iso!).toISOString()).toBe(original.toISOString());
  });

  test('refuses a value that is not a date', () => {
    expect(fromBangkokInputValue('not-a-date')).toBeNull();
  });
});
