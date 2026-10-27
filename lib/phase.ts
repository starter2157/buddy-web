/**
 * Which part of the activity we are in. Always resolved from the server clock
 * against the stored schedule — never from the visitor's device, which they
 * control.
 */

export interface Schedule {
  registerOpenAt: Date;
  registerCloseAt: Date;
  revealAt: Date;
  hint2At: Date | null;
}

export type Phase =
  /** Login only; registration has not opened. */
  | 'before_open'
  /** Registration is open and everything on /profile is editable. */
  | 'open'
  /** Registration has closed; the team is checking the draft match. */
  | 'closed'
  /** reveal_at has passed. Whether a buddy is actually shown also depends on
   *  a run being confirmed, which only the database can answer. */
  | 'revealed';

export function resolvePhase(now: Date, schedule: Schedule): Phase {
  const at = now.getTime();
  if (at < schedule.registerOpenAt.getTime()) return 'before_open';
  if (at < schedule.registerCloseAt.getTime()) return 'open';
  if (at < schedule.revealAt.getTime()) return 'closed';
  return 'revealed';
}

export function canRegister(phase: Phase): boolean {
  return phase === 'open';
}

/**
 * Once registration closes, prefix, student ID, faculty and year stop being
 * editable — the match has been drawn from them. Everything else stays open.
 */
export function areIdentityFieldsLocked(phase: Phase): boolean {
  return phase === 'closed' || phase === 'revealed';
}

export function isHint2Open(now: Date, schedule: Schedule): boolean {
  return schedule.hint2At !== null && now.getTime() >= schedule.hint2At.getTime();
}

/**
 * The server's idea of "now".
 *
 * DEMO_NOW lets a whole phase be tried out locally without editing the
 * schedule. It is server-only and ignored in production unless
 * ALLOW_TIME_TRAVEL is set explicitly, so it can never be turned on by a
 * visitor or left on by accident in a deployment.
 */
export function serverNow(): Date {
  const override = process.env.DEMO_NOW;
  if (!override) return new Date();

  const allowed = process.env.NODE_ENV !== 'production' || process.env.ALLOW_TIME_TRAVEL === '1';
  if (!allowed) return new Date();

  const parsed = new Date(override);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`DEMO_NOW is not a valid date: ${override}`);
  }
  return parsed;
}
