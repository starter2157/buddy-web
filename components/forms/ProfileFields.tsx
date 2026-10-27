'use client';

import {
  Field,
  HandleInput,
  ReadOnlyValue,
  SelectInput,
  TextArea,
  TextInput,
} from '@/components/ui/Field';
import { FACULTY_LABEL, facultyFromStudentId, type Faculty } from '@/lib/faculty';
import { PREFIXES } from '@/lib/prefix';
import { MAX_HINT, MAX_MESSAGE, MAX_NAME, MAX_NICKNAME } from '@/lib/schemas';
import { FacultyChips, facultyChipMessage } from './FacultyChips';

export interface ProfileFormValues {
  prefix: string;
  firstName: string;
  lastName: string;
  nickname: string;
  studentId: string;
  year: string;
  instagram: string;
  messageToBudder: string;
  hint1: string;
  hint2: string;
}

export type FormErrors = Partial<Record<keyof ProfileFormValues | 'consent', string>>;

interface FieldsProps {
  values: ProfileFormValues;
  errors: FormErrors;
  onChange: <K extends keyof ProfileFormValues>(field: K, value: string) => void;
  /** After registration closes these four are greyed out, with no explanation shown. */
  locked?: boolean;
  disabled?: boolean;
  /**
   * /register detects the faculty live from the student ID and shows the three
   * chips; /profile shows the settled faculty as a read-only value instead.
   */
  settledFaculty?: Faculty;
}

const MESSAGE_TONE = {
  muted: 'text-muted',
  error: 'text-engineering-text',
  ok: 'text-pharmacy-text',
} as const;

export function PersonalFields({
  values,
  errors,
  onChange,
  locked = false,
  disabled = false,
  settledFaculty,
}: FieldsProps) {
  const detected = facultyFromStudentId(values.studentId);
  const message = facultyChipMessage(values.studentId, detected);

  return (
    <fieldset className="m-0 flex flex-col gap-3.5 border-0 p-0">
      <legend className="mb-3.5 p-0 font-heading text-[17px] font-medium text-brown">
        ข้อมูลส่วนตัว
      </legend>

      <Field label="คำนำหน้าชื่อ" htmlFor="prefix" required error={errors.prefix}>
        <SelectInput
          id="prefix"
          name="prefix"
          required
          value={values.prefix}
          disabled={locked || disabled}
          onChange={(event) => onChange('prefix', event.target.value)}
        >
          {PREFIXES.map((prefix) => (
            <option key={prefix} value={prefix}>
              {prefix}
            </option>
          ))}
        </SelectInput>
      </Field>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="ชื่อ" htmlFor="firstName" required error={errors.firstName}>
          <TextInput
            id="firstName"
            name="firstName"
            required
            maxLength={MAX_NAME}
            placeholder="ชื่อจริง"
            value={values.firstName}
            disabled={disabled}
            onChange={(event) => onChange('firstName', event.target.value)}
          />
        </Field>
        <Field label="นามสกุล" htmlFor="lastName" required error={errors.lastName}>
          <TextInput
            id="lastName"
            name="lastName"
            required
            maxLength={MAX_NAME}
            placeholder="นามสกุล"
            value={values.lastName}
            disabled={disabled}
            onChange={(event) => onChange('lastName', event.target.value)}
          />
        </Field>
      </div>

      <Field label="ชื่อเล่น" htmlFor="nickname" required error={errors.nickname}>
        <TextInput
          id="nickname"
          name="nickname"
          required
          maxLength={MAX_NICKNAME}
          placeholder="ชื่อเล่น"
          value={values.nickname}
          disabled={disabled}
          onChange={(event) => onChange('nickname', event.target.value)}
        />
      </Field>

      <Field label="รหัสนิสิต" htmlFor="studentId" required error={errors.studentId}>
        <TextInput
          id="studentId"
          name="studentId"
          required
          inputMode="numeric"
          maxLength={10}
          placeholder="10 หลัก"
          className="tracking-[1px]"
          value={values.studentId}
          disabled={locked || disabled}
          onChange={(event) => onChange('studentId', event.target.value.replace(/\D/g, '').slice(0, 10))}
        />
      </Field>

      {settledFaculty ? (
        <Field label="คณะ" required>
          <ReadOnlyValue value={FACULTY_LABEL[settledFaculty].long} />
        </Field>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium">
            คณะ{' '}
            <span aria-hidden="true" className="text-required">
              *
            </span>
          </span>
          <FacultyChips detected={detected} />
          <span aria-live="polite" className={`text-[13px] ${MESSAGE_TONE[message.tone]}`}>
            {message.text}
          </span>
        </div>
      )}

      <Field label="ชั้นปี" htmlFor="year" required error={errors.year}>
        <SelectInput
          id="year"
          name="year"
          required
          value={values.year}
          disabled={locked || disabled}
          onChange={(event) => onChange('year', event.target.value)}
        >
          {[1, 2, 3, 4, 5, 6].map((year) => (
            <option key={year} value={String(year)}>
              ปี {year}
            </option>
          ))}
        </SelectInput>
      </Field>

      <Field label="Instagram" htmlFor="instagram" error={errors.instagram}>
        <HandleInput
          id="instagram"
          name="instagram"
          placeholder="username"
          maxLength={31}
          value={values.instagram}
          disabled={disabled}
          onChange={(event) => onChange('instagram', event.target.value)}
        />
      </Field>
    </fieldset>
  );
}

export function MessageFields({ values, errors, onChange, disabled = false }: FieldsProps) {
  return (
    <fieldset className="m-0 flex flex-col gap-3.5 rounded-card border-0 bg-card px-4 py-[18px] shadow-card">
      <legend className="float-left mb-1 p-0 font-heading text-[17px] font-medium text-brown">
        ข้อความ &amp; คำใบ้
      </legend>

      <div className="clear-both" />

      <Field
        label="สิ่งที่อยากบอกบัดเดอร์"
        htmlFor="messageToBudder"
        required
        error={errors.messageToBudder}
      >
        <TextArea
          id="messageToBudder"
          name="messageToBudder"
          required
          rows={3}
          maxLength={MAX_MESSAGE}
          placeholder="เช่น ชอบกินอะไร"
          value={values.messageToBudder}
          disabled={disabled}
          onChange={(event) => onChange('messageToBudder', event.target.value)}
        />
      </Field>

      <Field label="คำใบ้ 1 ถึงบัดดี้" htmlFor="hint1" required error={errors.hint1}>
        <TextArea
          id="hint1"
          name="hint1"
          required
          rows={2}
          maxLength={MAX_HINT}
          placeholder="คำใบ้เกี่ยวกับตัวคุณ"
          value={values.hint1}
          disabled={disabled}
          onChange={(event) => onChange('hint1', event.target.value)}
        />
      </Field>

      <Field label="คำใบ้ 2 ถึงบัดดี้" htmlFor="hint2" required error={errors.hint2}>
        <TextArea
          id="hint2"
          name="hint2"
          required
          rows={2}
          maxLength={MAX_HINT}
          placeholder="คำใบ้ที่ชัดขึ้นอีกนิด"
          value={values.hint2}
          disabled={disabled}
          onChange={(event) => onChange('hint2', event.target.value)}
        />
      </Field>
    </fieldset>
  );
}
