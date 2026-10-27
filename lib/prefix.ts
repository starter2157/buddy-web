/**
 * The name prefix a participant chooses at registration. It doubles as the
 * gender signal the matcher uses for its soft constraint — see lib/matching.ts.
 */
export const PREFIXES = ['นาย', 'นางสาว', 'ไม่ระบุ'] as const;

export type Prefix = (typeof PREFIXES)[number];

export const UNSPECIFIED_PREFIX: Prefix = 'ไม่ระบุ';

export function isUnspecified(prefix: Prefix): boolean {
  return prefix === UNSPECIFIED_PREFIX;
}

/** How a budder → buddy link scores on the gender soft constraint. */
export type GenderPairing = 'mixed' | 'neutral' | 'same';

export const GENDER_PAIRING_LABEL: Record<GenderPairing, string> = {
  mixed: 'คละเพศ',
  neutral: 'มีผู้ไม่ระบุเพศ',
  same: 'เพศเดียวกัน',
};

export function genderPairing(a: Prefix, b: Prefix): GenderPairing {
  if (isUnspecified(a) || isUnspecified(b)) return 'neutral';
  return a === b ? 'same' : 'mixed';
}
