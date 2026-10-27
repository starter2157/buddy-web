import { describe, expect, test } from 'vitest';
import {
  STUDENT_EMAIL_DOMAIN,
  emailForStudentId,
  isStudentEmail,
  normaliseEmail,
  studentIdFromEmail,
} from '@/lib/chula';
import { detectInAppBrowser, externalBrowserUrl } from '@/lib/inapp';

describe('isStudentEmail', () => {
  test('accepts a student address', () => {
    expect(isStudentEmail('6730012321@student.chula.ac.th')).toBe(true);
  });

  test('is case and whitespace insensitive', () => {
    expect(isStudentEmail('  6730012321@STUDENT.Chula.AC.th ')).toBe(true);
  });

  test.each([
    ['staff address', 'someone@chula.ac.th'],
    ['other university', '6730012321@student.mahidol.ac.th'],
    ['public mail', '6730012321@gmail.com'],
    ['no domain', '6730012321'],
    ['empty', ''],
  ])('rejects %s', (_label, email) => {
    expect(isStudentEmail(email)).toBe(false);
  });

  test('rejects null and undefined', () => {
    expect(isStudentEmail(null)).toBe(false);
    expect(isStudentEmail(undefined)).toBe(false);
  });

  // A lookalike domain must not pass: the check compares the whole domain,
  // not a suffix, so "notstudent.chula.ac.th" and an appended domain both fail.
  test.each([
    'x@notstudent.chula.ac.th',
    'x@student.chula.ac.th.evil.com',
    'x@evil.com?@student.chula.ac.th',
  ])('rejects the lookalike %s', (email) => {
    expect(isStudentEmail(email)).toBe(false);
  });

  test('an address with more than one @ is refused outright', () => {
    expect(isStudentEmail('"we@ird"@student.chula.ac.th')).toBe(false);
    expect(isStudentEmail('a@b@student.chula.ac.th')).toBe(false);
  });
});

describe('studentIdFromEmail', () => {
  test('reads the ten-digit local part', () => {
    expect(studentIdFromEmail('6730012321@student.chula.ac.th')).toBe('6730012321');
  });

  test('returns null when the local part is not a student id', () => {
    expect(studentIdFromEmail('somebody@student.chula.ac.th')).toBeNull();
    expect(studentIdFromEmail('673001232@student.chula.ac.th')).toBeNull();
    expect(studentIdFromEmail('67300123210@student.chula.ac.th')).toBeNull();
  });

  test('returns null for a non-student domain even with a valid id', () => {
    expect(studentIdFromEmail('6730012321@gmail.com')).toBeNull();
  });

  test('round-trips with emailForStudentId', () => {
    expect(studentIdFromEmail(emailForStudentId('6730012321'))).toBe('6730012321');
    expect(emailForStudentId('6730012321')).toContain(STUDENT_EMAIL_DOMAIN);
  });
});

describe('normaliseEmail', () => {
  test('trims and lowercases', () => {
    expect(normaliseEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
  });
});

describe('detectInAppBrowser', () => {
  test.each([
    [
      'line',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/604.1 Line/13.20.0',
    ],
    [
      'line',
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116 Mobile Safari/537.36 Line/13.19.1/IAB',
    ],
    [
      'facebook',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/440.0.0.31.108;FBBV/5]',
    ],
    [
      'facebook',
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/116 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/440.0.0.31.108;]',
    ],
    [
      'instagram',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Instagram 302.0.0.23.113 (iPhone14,2)',
    ],
  ])('detects %s', (expected, userAgent) => {
    expect(detectInAppBrowser(userAgent)).toBe(expected);
  });

  test('Instagram wins over Facebook when the agent carries both', () => {
    const both =
      'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Instagram 302.0.0.23.113 [FBAN/FBIOS;FBAV/440.0]';
    expect(detectInAppBrowser(both)).toBe('instagram');
  });

  test.each([
    ['iOS Safari', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1'],
    ['Android Chrome', 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/116.0.0.0 Mobile Safari/537.36'],
    ['desktop Chrome', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/116.0.0.0 Safari/537.36'],
  ])('leaves %s alone', (_label, userAgent) => {
    expect(detectInAppBrowser(userAgent)).toBeNull();
  });

  test('does not mistake an ordinary browser for LINE', () => {
    // "Headline" and similar words contain "line" — the pattern requires the
    // LINE app's own "Line/<version>" token.
    expect(detectInAppBrowser('Mozilla/5.0 Headline/2.0 Safari/604.1')).toBeNull();
    expect(detectInAppBrowser('Mozilla/5.0 (Linux; Android 13) Safari/537.36')).toBeNull();
  });

  test('handles a missing user agent', () => {
    expect(detectInAppBrowser(null)).toBeNull();
    expect(detectInAppBrowser('')).toBeNull();
  });
});

describe('externalBrowserUrl', () => {
  test('LINE gets the openExternalBrowser flag', () => {
    expect(externalBrowserUrl('https://buddy.example.com', 'line')).toBe(
      'https://buddy.example.com?openExternalBrowser=1',
    );
  });

  test('keeps an existing query string', () => {
    expect(externalBrowserUrl('https://buddy.example.com/?error=domain', 'line')).toBe(
      'https://buddy.example.com/?error=domain&openExternalBrowser=1',
    );
  });

  test('does not add the flag twice', () => {
    const once = externalBrowserUrl('https://buddy.example.com', 'line');
    expect(externalBrowserUrl(once, 'line')).toBe(once);
  });

  test('Facebook and Instagram have no such parameter, so the url is unchanged', () => {
    expect(externalBrowserUrl('https://buddy.example.com', 'facebook')).toBe(
      'https://buddy.example.com',
    );
    expect(externalBrowserUrl('https://buddy.example.com', 'instagram')).toBe(
      'https://buddy.example.com',
    );
  });
});
