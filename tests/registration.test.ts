import { describe, expect, test } from 'vitest';
import { decideProfileUpdate, decideRegistration, type IdentityFields } from '@/lib/registration';
import type { Phase } from '@/lib/phase';

const EMAIL = '6730012321@student.chula.ac.th'; // 21 → engineering
const STUDENT_ID = '6730012321';

const base = {
  phase: 'open' as Phase,
  email: EMAIL,
  hasProfile: false,
  studentId: STUDENT_ID,
};

describe('decideRegistration', () => {
  test('allows a first registration while the window is open', () => {
    const decision = decideRegistration(base);
    expect(decision).toEqual({ ok: true, faculty: 'engineering' });
  });

  test.each([
    ['before_open', 403, 'ยังไม่เปิดรับลงทะเบียน'],
    ['closed', 403, 'ปิดรับลงทะเบียนแล้ว'],
    ['revealed', 403, 'ปิดรับลงทะเบียนแล้ว'],
  ])('refuses while the phase is %s', (phase, status, message) => {
    const decision = decideRegistration({ ...base, phase: phase as Phase });
    expect(decision.ok).toBe(false);
    expect(decision).toMatchObject({ status, message });
  });

  test('refuses a second registration', () => {
    const decision = decideRegistration({ ...base, hasProfile: true });
    expect(decision).toMatchObject({ ok: false, status: 409 });
  });

  test('refuses an address outside the university', () => {
    const decision = decideRegistration({ ...base, email: '6730012321@gmail.com' });
    expect(decision).toMatchObject({ ok: false, status: 401 });
  });

  test('refuses a student id that is not the one in the address', () => {
    const decision = decideRegistration({ ...base, studentId: '6730000223' });
    expect(decision).toMatchObject({ ok: false, status: 400 });
    expect((decision as { fields: Record<string, string> }).fields.studentId).toMatch(/ตรงกับอีเมล/);
  });

  test('refuses a faculty that is not taking part', () => {
    const decision = decideRegistration({
      ...base,
      email: '6730012399@student.chula.ac.th',
      studentId: '6730012399',
    });
    expect(decision).toMatchObject({ ok: false, status: 400 });
    expect((decision as { fields: Record<string, string> }).fields.studentId).toMatch(
      /ไม่ใช่ของคณะที่เข้าร่วม/,
    );
  });

  test.each([
    ['6730012321', 'engineering'],
    ['6730012323', 'science'],
    ['6730012333', 'pharmacy'],
  ])('derives the faculty from %s rather than taking it from the client', (studentId, faculty) => {
    const decision = decideRegistration({
      ...base,
      email: `${studentId}@student.chula.ac.th`,
      studentId,
    });
    expect(decision).toEqual({ ok: true, faculty });
  });
});

describe('decideProfileUpdate', () => {
  const existing: IdentityFields = { prefix: 'นาย', studentId: STUDENT_ID, year: 3 };
  const unchanged: IdentityFields = { ...existing };

  test('while open, the identity fields may be rewritten', () => {
    const decision = decideProfileUpdate({
      phase: 'open',
      email: EMAIL,
      existing,
      next: { prefix: 'นางสาว', studentId: STUDENT_ID, year: 4 },
    });
    expect(decision).toEqual({ ok: true, locked: false, faculty: 'engineering' });
  });

  test.each(['closed', 'revealed'] as Phase[])(
    'while %s, an unchanged submission is accepted and writes only the editable fields',
    (phase) => {
      const decision = decideProfileUpdate({ phase, email: EMAIL, existing, next: unchanged });
      expect(decision).toEqual({ ok: true, locked: true });
    },
  );

  test.each([
    ['prefix', { prefix: 'นางสาว' }],
    ['student id', { studentId: '6730000223' }],
    ['year', { year: 4 }],
  ])('while closed, changing the %s is refused', (_label, change) => {
    const decision = decideProfileUpdate({
      phase: 'closed',
      email: EMAIL,
      existing,
      next: { ...unchanged, ...change } as IdentityFields,
    });
    expect(decision).toMatchObject({ ok: false, status: 400 });
    expect((decision as { message: string }).message).toMatch(/ปิดรับลงทะเบียนแล้ว/);
  });

  test('the lock is not fooled by a year sent as a string-shaped number', () => {
    // The schema coerces year to a number before this runs; if that ever
    // changed, a loose comparison would let a locked field through.
    const decision = decideProfileUpdate({
      phase: 'closed',
      email: EMAIL,
      existing,
      next: { ...unchanged, year: '3' as unknown as number },
    });
    expect(decision).toMatchObject({ ok: false, status: 400 });
  });

  test('while open, a student id that does not match the address is refused', () => {
    const decision = decideProfileUpdate({
      phase: 'open',
      email: EMAIL,
      existing,
      next: { ...unchanged, studentId: '6730000223' },
    });
    expect(decision).toMatchObject({ ok: false, status: 400 });
  });

  test('an address outside the university is refused in every phase', () => {
    for (const phase of ['open', 'closed', 'revealed'] as Phase[]) {
      const decision = decideProfileUpdate({
        phase,
        email: 'someone@gmail.com',
        existing,
        next: unchanged,
      });
      expect(decision).toMatchObject({ ok: false, status: 401 });
    }
  });
});
