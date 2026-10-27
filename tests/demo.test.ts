import { afterEach, describe, expect, test, vi } from 'vitest';
import { DEMO_ACCOUNT_PASSWORD, isDemoLoginEnabled } from '@/lib/demo';

/**
 * The demo sign-in exists so the app can be shown without a Google OAuth
 * client. These tests pin the gates, because the cost of them being wrong is
 * a password-shaped hole in a real deployment.
 */
describe('isDemoLoginEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('is off when nothing is set', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_DEMO_LOGIN', '');
    expect(isDemoLoginEnabled()).toBe(false);
  });

  test('is on only when asked for, outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_DEMO_LOGIN', '1');
    expect(isDemoLoginEnabled()).toBe(true);
  });

  test('stays off in production even when asked for', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_DEMO_LOGIN', '1');
    expect(isDemoLoginEnabled()).toBe(false);
  });

  test('is off in a test build unless asked for', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('ALLOW_DEMO_LOGIN', '');
    expect(isDemoLoginEnabled()).toBe(false);
  });

  test.each(['true', 'yes', '0', 'on', ' 1'])('does not accept %s as turning it on', (value) => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_DEMO_LOGIN', value);
    expect(isDemoLoginEnabled()).toBe(false);
  });
});

describe('DEMO_ACCOUNT_PASSWORD', () => {
  test('is a fixed local-only value, not something that reads as a real secret', () => {
    expect(DEMO_ACCOUNT_PASSWORD).toContain('local-only');
  });
});
