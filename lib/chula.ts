/**
 * University email rules. Sign-in is restricted to student accounts, and the
 * local part of such an address is the student's 10-digit ID.
 */
import { isStudentId } from './faculty';

export const STUDENT_EMAIL_DOMAIN = 'student.chula.ac.th';

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Exactly one '@', an ordinary local part, and the domain matched in full.
 * Deliberately strict: Google only ever issues plain addresses, and anything
 * cleverer than that is a lookalike worth refusing rather than parsing.
 */
const STUDENT_EMAIL_PATTERN = new RegExp(
  `^[a-z0-9._%+-]+@${STUDENT_EMAIL_DOMAIN.replace(/\./g, '\\.')}$`,
);

export function isStudentEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return STUDENT_EMAIL_PATTERN.test(normaliseEmail(email));
}

/**
 * The student ID carried by a university address, or null when the address is
 * not a student one or its local part is not a 10-digit ID.
 */
export function studentIdFromEmail(email: string | null | undefined): string | null {
  if (!isStudentEmail(email)) return null;
  const local = normaliseEmail(email!).split('@')[0]!;
  return isStudentId(local) ? local : null;
}

export function emailForStudentId(studentId: string): string {
  return `${studentId}@${STUDENT_EMAIL_DOMAIN}`;
}
