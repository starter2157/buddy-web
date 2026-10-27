import { describe, expect, test } from 'vitest';
import {
  fieldErrors,
  instagramSchema,
  profileUpdateSchema,
  registerSchema,
  studentIdSchema,
  yearSchema,
} from '@/lib/schemas';

const VALID = {
  prefix: 'นางสาว',
  firstName: 'พิมพ์ชนก',
  lastName: 'ใจดี',
  nickname: 'ข้าวหอม',
  studentId: '6730000223',
  year: 1,
  instagram: 'khaohom.sci',
  messageToBudder: 'ชอบกินชาเขียว',
  hint1: 'ใส่แว่น',
  hint2: 'นั่งแถวหน้าเสมอ',
  consent: true as const,
};

describe('registerSchema', () => {
  test('accepts a complete registration', () => {
    const parsed = registerSchema.parse(VALID);
    expect(parsed.nickname).toBe('ข้าวหอม');
    expect(parsed.instagram).toBe('khaohom.sci');
  });

  test('trims surrounding whitespace', () => {
    const parsed = registerSchema.parse({ ...VALID, firstName: '  พิมพ์ชนก  ' });
    expect(parsed.firstName).toBe('พิมพ์ชนก');
  });

  test('a field of only spaces counts as missing', () => {
    const result = registerSchema.safeParse({ ...VALID, nickname: '    ' });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).nickname).toMatch(/กรุณากรอก/);
  });

  test.each(['firstName', 'lastName', 'nickname', 'messageToBudder', 'hint1', 'hint2'])(
    '%s is required',
    (field) => {
      const result = registerSchema.safeParse({ ...VALID, [field]: '' });
      expect(result.success).toBe(false);
      expect(fieldErrors(result.error!)[field]).toBeTruthy();
    },
  );

  test('consent must be ticked', () => {
    const result = registerSchema.safeParse({ ...VALID, consent: false });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).consent).toMatch(/นโยบายความเป็นส่วนตัว/);
  });

  test('rejects over-long text rather than silently truncating', () => {
    const result = registerSchema.safeParse({ ...VALID, hint1: 'ก'.repeat(301) });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).hint1).toMatch(/ยาวเกินไป/);
  });

  test('faculty cannot be supplied by the client', () => {
    const parsed = registerSchema.parse({ ...VALID, faculty: 'pharmacy' });
    expect(parsed).not.toHaveProperty('faculty');
  });
});

describe('studentIdSchema', () => {
  test('accepts ten digits', () => {
    expect(studentIdSchema.parse('6730000223')).toBe('6730000223');
  });

  test.each(['673000022', '67300002233', '67300002a3', '', '  '])('rejects %s', (value) => {
    expect(studentIdSchema.safeParse(value).success).toBe(false);
  });
});

describe('yearSchema', () => {
  test('accepts 1 to 6, as a number or a string from a select', () => {
    expect(yearSchema.parse(1)).toBe(1);
    expect(yearSchema.parse('6')).toBe(6);
  });

  test.each([0, 7, -1, 1.5])('rejects %s', (value) => {
    expect(yearSchema.safeParse(value).success).toBe(false);
  });
});

describe('instagramSchema', () => {
  test('strips the leading @', () => {
    expect(instagramSchema.parse('@khaohom.sci')).toBe('khaohom.sci');
    expect(instagramSchema.parse('@@khaohom.sci')).toBe('khaohom.sci');
  });

  test('trims and treats blank as not given', () => {
    expect(instagramSchema.parse('  ')).toBeNull();
    expect(instagramSchema.parse('')).toBeNull();
    expect(instagramSchema.parse(null)).toBeNull();
    expect(instagramSchema.parse(undefined)).toBeNull();
    expect(instagramSchema.parse('@')).toBeNull();
  });

  test('rejects handles with characters Instagram does not allow', () => {
    expect(instagramSchema.safeParse('khao hom').success).toBe(false);
    expect(instagramSchema.safeParse('khaohom/sci').success).toBe(false);
    expect(instagramSchema.safeParse('a'.repeat(31)).success).toBe(false);
  });
});

describe('profileUpdateSchema', () => {
  test('is the registration shape without the consent tick', () => {
    const { consent: _consent, ...withoutConsent } = VALID;
    expect(profileUpdateSchema.safeParse(withoutConsent).success).toBe(true);
  });
});

describe('fieldErrors', () => {
  test('keeps the first message per field', () => {
    const result = registerSchema.safeParse({ ...VALID, firstName: '', lastName: '' });
    const errors = fieldErrors(result.error!);
    expect(Object.keys(errors).sort()).toEqual(['firstName', 'lastName']);
  });
});
