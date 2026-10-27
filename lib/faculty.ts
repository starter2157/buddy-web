/**
 * The three faculties taking part in the camp, and how a faculty is derived
 * from a student ID. The last two digits of a Chulalongkorn student ID encode
 * the faculty, so participants never pick their faculty by hand.
 */
export const FACULTIES = ['engineering', 'science', 'pharmacy'] as const;

export type Faculty = (typeof FACULTIES)[number];

/** Last two digits of the student ID → faculty. */
const FACULTY_BY_CODE: Record<string, Faculty> = {
  '21': 'engineering',
  '23': 'science',
  '33': 'pharmacy',
};

const STUDENT_ID_PATTERN = /^\d{10}$/;

export function isStudentId(value: string): boolean {
  return STUDENT_ID_PATTERN.test(value);
}

/**
 * Returns the faculty encoded in a 10-digit student ID, or null when the ID is
 * malformed or belongs to a faculty that is not part of the camp.
 */
export function facultyFromStudentId(studentId: string): Faculty | null {
  if (!isStudentId(studentId)) return null;
  return FACULTY_BY_CODE[studentId.slice(8)] ?? null;
}

interface FacultyLabel {
  /** Short form used on chips and in the admin table: วิศวฯ */
  short: string;
  /** Full name used on profile, reveal and the admin stat tiles. */
  long: string;
}

export const FACULTY_LABEL: Record<Faculty, FacultyLabel> = {
  engineering: { short: 'วิศวฯ', long: 'วิศวกรรมศาสตร์' },
  science: { short: 'วิทยฯ', long: 'วิทยาศาสตร์' },
  pharmacy: { short: 'เภสัชฯ', long: 'เภสัชศาสตร์' },
};

/**
 * Tailwind classes per faculty. Written out in full because Tailwind only sees
 * class names that appear literally in the source.
 */
export const FACULTY_STYLE: Record<Faculty, { solid: string; soft: string; accent: string }> = {
  engineering: {
    solid: 'bg-engineering text-white',
    soft: 'bg-engineering-soft text-engineering-text',
    accent: 'border-engineering text-engineering-text',
  },
  science: {
    solid: 'bg-science text-ink',
    soft: 'bg-science-soft text-science-text',
    accent: 'border-science text-science-text',
  },
  pharmacy: {
    solid: 'bg-pharmacy text-white',
    soft: 'bg-pharmacy-soft text-pharmacy-text',
    accent: 'border-pharmacy text-pharmacy-text',
  },
};

export const YEARS = [1, 2, 3, 4, 5, 6] as const;

export type Year = (typeof YEARS)[number];

export function yearLabel(year: Year | number): string {
  return `ปี ${year}`;
}
