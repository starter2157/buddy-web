import { z } from 'zod';
import { isStudentId } from './faculty';
import { PREFIXES } from './prefix';

/**
 * Every write is validated with these on the server. The forms use them too,
 * so the browser and the API agree on what a valid profile is.
 */

export const MAX_NAME = 80;
export const MAX_NICKNAME = 40;
export const MAX_MESSAGE = 500;
export const MAX_HINT = 300;

const requiredText = (max: number, label: string) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1, `กรุณากรอก${label}`)
        .max(max, `${label}ยาวเกินไป (ไม่เกิน ${max} ตัวอักษร)`),
    );

export const prefixSchema = z.enum(PREFIXES, {
  errorMap: () => ({ message: 'กรุณาเลือกคำนำหน้าชื่อ' }),
});

export const yearSchema = z.coerce
  .number()
  .int()
  .min(1, 'กรุณาเลือกชั้นปี')
  .max(6, 'กรุณาเลือกชั้นปี');

export const studentIdSchema = z
  .string()
  .transform((value) => value.trim())
  .refine(isStudentId, 'รหัสนิสิตต้องเป็นตัวเลข 10 หลัก');

/**
 * Instagram is optional and stored as a bare handle: no leading '@', and an
 * empty box means null rather than an empty string.
 */
export const instagramSchema = z
  .string()
  .nullish()
  .transform((value) => (value ?? '').trim().replace(/^@+/, '').trim())
  .transform((value) => (value === '' ? null : value))
  .refine(
    (value) => value === null || /^[A-Za-z0-9._]{1,30}$/.test(value),
    'ชื่อผู้ใช้ Instagram ใช้ได้เฉพาะ a-z 0-9 จุด และขีดล่าง',
  );

/** The fields a participant can always edit, whatever the phase. */
export const editableFieldsSchema = z.object({
  firstName: requiredText(MAX_NAME, 'ชื่อ'),
  lastName: requiredText(MAX_NAME, 'นามสกุล'),
  nickname: requiredText(MAX_NICKNAME, 'ชื่อเล่น'),
  instagram: instagramSchema,
  messageToBudder: requiredText(MAX_MESSAGE, 'สิ่งที่อยากบอกบัดเดอร์'),
  hint1: requiredText(MAX_HINT, 'คำใบ้ 1'),
  hint2: requiredText(MAX_HINT, 'คำใบ้ 2'),
});

/** The fields that stop being editable once registration closes. */
export const identityFieldsSchema = z.object({
  prefix: prefixSchema,
  studentId: studentIdSchema,
  year: yearSchema,
});

export const registerSchema = editableFieldsSchema.merge(identityFieldsSchema).extend({
  consent: z.literal(true, {
    errorMap: () => ({ message: 'กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนลงทะเบียน' }),
  }),
});

/**
 * /profile always submits a complete profile, locked fields included. The API
 * compares them against the stored row rather than trusting a disabled input.
 */
export const profileUpdateSchema = editableFieldsSchema.merge(identityFieldsSchema);

export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** Turns a ZodError into { field: message } for the forms to render. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in errors)) {
      errors[field] = issue.message;
    }
  }
  return errors;
}
