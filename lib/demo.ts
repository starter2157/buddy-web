/**
 * Local demo accounts.
 *
 * The seed script creates participants with this password so the app can be
 * clicked through without a Google OAuth client. Real accounts arrive through
 * Google and have no password at all, so this only ever opens a door to rows
 * the seed itself created — and only on a machine where both gates below are
 * satisfied.
 */
export const DEMO_ACCOUNT_PASSWORD = 'buddy-demo-local-only';

/**
 * Two independent gates, both required:
 *   * never in a production build, whatever the environment says;
 *   * and only when ALLOW_DEMO_LOGIN is turned on deliberately.
 * When this is false the demo routes answer 404, so they are indistinguishable
 * from routes that do not exist.
 */
export function isDemoLoginEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEMO_LOGIN === '1';
}
