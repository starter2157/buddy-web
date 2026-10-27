import {
  ALREADY_REGISTERED,
  FACULTY_NOT_PARTICIPATING,
  LOCKED_FIELDS,
  STUDENT_ID_MISMATCH,
  UNAUTHENTICATED,
} from './api';
import { isStudentEmail, studentIdFromEmail } from './chula';
import { facultyFromStudentId, type Faculty } from './faculty';
import { areIdentityFieldsLocked, canRegister, type Phase } from './phase';
import type { Prefix } from './prefix';

/**
 * The server-side rules for writing a profile, kept apart from the route
 * handlers so they can be tested without a database or a session.
 *
 * Nothing here trusts the client: the phase comes from the server clock, the
 * student ID is checked against the signed-in address, and the faculty is
 * derived rather than accepted.
 */

export interface Refusal {
  ok: false;
  status: number;
  message: string;
  fields?: Record<string, string>;
}

export interface RegistrationAllowed {
  ok: true;
  faculty: Faculty;
}

const PHASE_REFUSAL: Record<Exclude<Phase, 'open'>, string> = {
  before_open: 'ยังไม่เปิดรับลงทะเบียน',
  closed: 'ปิดรับลงทะเบียนแล้ว',
  revealed: 'ปิดรับลงทะเบียนแล้ว',
};

function refuse(status: number, message: string, fields?: Record<string, string>): Refusal {
  return { ok: false, status, message, ...(fields ? { fields } : {}) };
}

/** Checks the student ID against the signed-in address and derives the faculty. */
function resolveFaculty(
  email: string | null | undefined,
  studentId: string,
): RegistrationAllowed | Refusal {
  const expected = studentIdFromEmail(email);
  if (!expected || studentId !== expected) {
    return refuse(400, STUDENT_ID_MISMATCH, { studentId: STUDENT_ID_MISMATCH });
  }

  const faculty = facultyFromStudentId(studentId);
  if (!faculty) {
    return refuse(400, FACULTY_NOT_PARTICIPATING, { studentId: FACULTY_NOT_PARTICIPATING });
  }

  return { ok: true, faculty };
}

export function decideRegistration(request: {
  phase: Phase;
  email: string | null | undefined;
  hasProfile: boolean;
  studentId: string;
}): RegistrationAllowed | Refusal {
  if (!isStudentEmail(request.email)) {
    return refuse(401, UNAUTHENTICATED);
  }
  if (!canRegister(request.phase)) {
    return refuse(403, PHASE_REFUSAL[request.phase as Exclude<Phase, 'open'>]);
  }
  if (request.hasProfile) {
    return refuse(409, ALREADY_REGISTERED);
  }
  return resolveFaculty(request.email, request.studentId);
}

export interface IdentityFields {
  prefix: Prefix;
  studentId: string;
  year: number;
}

export type UpdateAllowed =
  /** Registration has closed: write the editable fields only. */
  | { ok: true; locked: true }
  /** Registration is open: the identity fields may be rewritten too. */
  | { ok: true; locked: false; faculty: Faculty };

export function decideProfileUpdate(request: {
  phase: Phase;
  email: string | null | undefined;
  existing: IdentityFields;
  next: IdentityFields;
}): UpdateAllowed | Refusal {
  if (!isStudentEmail(request.email)) {
    return refuse(401, UNAUTHENTICATED);
  }

  if (areIdentityFieldsLocked(request.phase)) {
    // A disabled input is a suggestion, not a guarantee, so the submitted
    // values are compared against what is stored.
    const changed =
      request.next.prefix !== request.existing.prefix ||
      request.next.studentId !== request.existing.studentId ||
      request.next.year !== request.existing.year;

    return changed ? refuse(400, LOCKED_FIELDS) : { ok: true, locked: true };
  }

  const faculty = resolveFaculty(request.email, request.next.studentId);
  return faculty.ok ? { ok: true, locked: false, faculty: faculty.faculty } : faculty;
}
