import { describe, expect, test } from 'vitest';
import { instagramUrl, mapHomeView, type HomeViewRow } from '@/lib/home';

const REVEALED: HomeViewRow = {
  revealed: true,
  has_buddy: true,
  buddy_nickname: 'ข้าวหอม',
  buddy_prefix: 'นางสาว',
  buddy_first_name: 'พิมพ์ชนก',
  buddy_last_name: 'ใจดี',
  buddy_faculty: 'science',
  buddy_year: 1,
  buddy_instagram: 'khaohom.sci',
  buddy_message: 'ชอบกินชาเขียว',
  budder_hint_1: 'ใส่แว่น',
  budder_hint_2: null,
  hint2_at: null,
};

describe('mapHomeView', () => {
  test('maps a revealed row', () => {
    const view = mapHomeView(REVEALED);

    expect(view.revealed).toBe(true);
    expect(view.hasBuddy).toBe(true);
    expect(view.buddy).toEqual({
      nickname: 'ข้าวหอม',
      prefix: 'นางสาว',
      firstName: 'พิมพ์ชนก',
      lastName: 'ใจดี',
      faculty: 'science',
      year: 1,
      instagram: 'khaohom.sci',
      message: 'ชอบกินชาเขียว',
    });
    expect(view.hint1).toBe('ใส่แว่น');
  });

  test('a row that is not revealed carries nothing but the hint 2 date', () => {
    const view = mapHomeView({ ...REVEALED, revealed: false, hint2_at: '2026-11-09T12:00:00+07:00' });

    expect(view.revealed).toBe(false);
    expect(view.buddy).toBeNull();
    expect(view.hint1).toBeNull();
    expect(view.hint2).toBeNull();
    // The date is public, so the locked card can name it.
    expect(view.hint2At?.toISOString()).toBe('2026-11-09T05:00:00.000Z');
  });

  test('no rows at all is treated as nothing revealed', () => {
    expect(mapHomeView(null).revealed).toBe(false);
    expect(mapHomeView(undefined).buddy).toBeNull();
  });

  test('a participant left out of the run has no buddy', () => {
    const view = mapHomeView({
      ...REVEALED,
      has_buddy: false,
      buddy_nickname: null,
      buddy_prefix: null,
      buddy_first_name: null,
      buddy_last_name: null,
      buddy_faculty: null,
      buddy_year: null,
      buddy_instagram: null,
      buddy_message: null,
      budder_hint_1: null,
    });

    expect(view.revealed).toBe(true);
    expect(view.hasBuddy).toBe(false);
    expect(view.buddy).toBeNull();
  });

  test('a buddy without Instagram keeps the field null for the dashed-box branch', () => {
    expect(mapHomeView({ ...REVEALED, buddy_instagram: null }).buddy?.instagram).toBeNull();
  });

  test('hint 2 appears only when the database sends it', () => {
    expect(mapHomeView(REVEALED).hint2).toBeNull();
    expect(mapHomeView({ ...REVEALED, budder_hint_2: 'ชอบสีเขียว' }).hint2).toBe('ชอบสีเขียว');
  });
});

describe('mapHomeView — the budder stays anonymous in the props', () => {
  /**
   * The database function does not return the budder's identity. This guards
   * the other half: if a column were ever added to it, the mapping must not
   * carry it through to the page props by accident.
   */
  test('an unexpected identifying column is dropped rather than passed on', () => {
    const leaky = {
      ...REVEALED,
      budder_nickname: 'ซีซ่า',
      budder_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      budder_student_id: '6730000333',
    } as unknown as HomeViewRow;

    const payload = JSON.stringify(mapHomeView(leaky));

    expect(payload).not.toContain('ซีซ่า');
    expect(payload).not.toContain('cccccccc');
    expect(payload).not.toContain('6730000333');
  });

  test('the mapped view has exactly the expected keys', () => {
    expect(Object.keys(mapHomeView(REVEALED)).sort()).toEqual(
      ['buddy', 'hasBuddy', 'hint1', 'hint2', 'hint2At', 'revealed'].sort(),
    );
  });

  test('no student id is carried anywhere in the view', () => {
    const view = mapHomeView({ ...REVEALED, buddy_nickname: 'ข้าวหอม' });
    expect(JSON.stringify(view)).not.toMatch(/\d{10}/);
  });
});

describe('instagramUrl', () => {
  test('builds the profile link from a bare handle', () => {
    expect(instagramUrl('khaohom.sci')).toBe('https://instagram.com/khaohom.sci');
  });
});
