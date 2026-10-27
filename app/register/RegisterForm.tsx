'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  MessageFields,
  PersonalFields,
  type FormErrors,
  type ProfileFormValues,
} from '@/components/forms/ProfileFields';
import { submitJson } from '@/components/forms/submit';
import { ActionButton } from '@/components/ui/Button';
import { PREFIXES } from '@/lib/prefix';

function CheckMark() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0 stroke-pharmacy"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function RegisterForm({ email, studentId }: { email: string; studentId: string }) {
  const router = useRouter();

  const [values, setValues] = useState<ProfileFormValues>({
    prefix: PREFIXES[0],
    firstName: '',
    lastName: '',
    nickname: '',
    studentId,
    year: '1',
    instagram: '',
    messageToBudder: '',
    hint1: '',
    hint2: '',
  });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const change = <K extends keyof ProfileFormValues>(field: K, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors(({ [field]: _removed, ...rest }) => rest);
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFormError(undefined);
    setErrors({});

    const result = await submitJson('/api/register', 'POST', {
      ...values,
      year: Number(values.year),
      consent,
    });

    if (result.ok) {
      // The participant is already signed in, so registration goes straight
      // through to /home rather than back to a login step.
      router.replace('/home');
      router.refresh();
      return;
    }

    setSaving(false);
    setFormError(result.error);
    if (result.fields) setErrors(result.fields);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[22px] px-5 pb-10 pt-6">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 font-heading text-[24px] font-semibold">สร้างโปรไฟล์ของคุณ</h1>
        <p className="m-0 text-[14px] leading-relaxed text-muted">
          ข้อมูลนี้บัดเดอร์ของคุณจะเห็นในวันประกาศ ยกเว้นรหัสนิสิต
        </p>
      </div>

      <div className="flex items-center gap-2.5 rounded-[14px] bg-card px-3.5 py-3 shadow-card">
        <CheckMark />
        <div className="flex flex-col text-[13px] leading-snug">
          <span className="text-muted">เข้าสู่ระบบแล้วด้วย</span>
          <strong className="break-all">{email}</strong>
        </div>
      </div>

      <PersonalFields values={values} errors={errors} onChange={change} disabled={saving} />
      <MessageFields values={values} errors={errors} onChange={change} disabled={saving} />

      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-2.5 text-[13px] leading-relaxed">
          <input
            type="checkbox"
            required
            checked={consent}
            disabled={saving}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
          />
          <span>
            ยินยอมให้ทีมงานเก็บและใช้ข้อมูลข้างต้นเพื่อกิจกรรม Buddy–Budder เท่านั้น ตาม{' '}
            <a href="/privacy">นโยบายความเป็นส่วนตัว</a>{' '}
            <span aria-hidden="true" className="text-required">
              *
            </span>
          </span>
        </label>
        {errors.consent ? (
          <span className="text-[13px] text-engineering-text">{errors.consent}</span>
        ) : null}
      </div>

      {formError ? (
        <p
          role="alert"
          className="m-0 rounded-input border-2 border-engineering bg-engineering-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-engineering-text"
        >
          {formError}
        </p>
      ) : null}

      <ActionButton type="submit" disabled={saving}>
        {saving ? 'กำลังบันทึก…' : 'ลงทะเบียน'}
      </ActionButton>
    </form>
  );
}
