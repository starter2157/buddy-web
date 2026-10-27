import { describe, expect, test } from 'vitest';
import { FACULTIES, FACULTY_LABEL, facultyFromStudentId, isStudentId, yearLabel } from '@/lib/faculty';
import { PREFIXES, genderPairing } from '@/lib/prefix';

describe('facultyFromStudentId', () => {
  test.each([
    ['6730012321', 'engineering'],
    ['6730000223', 'science'],
    ['6530000333', 'pharmacy'],
  ])('%s belongs to %s', (studentId, faculty) => {
    expect(facultyFromStudentId(studentId)).toBe(faculty);
  });

  test('rejects faculty codes that are not part of the camp', () => {
    expect(facultyFromStudentId('6730000199')).toBeNull();
    expect(facultyFromStudentId('6730000122')).toBeNull();
  });

  test('rejects malformed ids', () => {
    for (const bad of ['', '673001232', '67300123210', '67300123a1', ' 6730012321']) {
      expect(facultyFromStudentId(bad)).toBeNull();
      expect(isStudentId(bad)).toBe(false);
    }
  });

  test('every faculty has both a short and a long Thai label', () => {
    for (const faculty of FACULTIES) {
      expect(FACULTY_LABEL[faculty].short.length).toBeGreaterThan(0);
      expect(FACULTY_LABEL[faculty].long.length).toBeGreaterThan(0);
    }
  });
});

describe('genderPairing', () => {
  test('นาย ↔ นางสาว is mixed', () => {
    expect(genderPairing('นาย', 'นางสาว')).toBe('mixed');
    expect(genderPairing('นางสาว', 'นาย')).toBe('mixed');
  });

  test('matching prefixes are same', () => {
    expect(genderPairing('นาย', 'นาย')).toBe('same');
    expect(genderPairing('นางสาว', 'นางสาว')).toBe('same');
  });

  test('anything involving ไม่ระบุ is neutral, never same', () => {
    for (const other of PREFIXES) {
      expect(genderPairing('ไม่ระบุ', other)).toBe('neutral');
      expect(genderPairing(other, 'ไม่ระบุ')).toBe('neutral');
    }
  });

  test('is symmetric for every combination', () => {
    for (const a of PREFIXES) {
      for (const b of PREFIXES) {
        expect(genderPairing(a, b)).toBe(genderPairing(b, a));
      }
    }
  });
});

describe('yearLabel', () => {
  test('reads as it does in the designs', () => {
    expect(yearLabel(1)).toBe('ปี 1');
    expect(yearLabel(6)).toBe('ปี 6');
  });
});
