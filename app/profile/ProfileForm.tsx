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
import type { Profile } from '@/lib/profile';

export function ProfileForm({ profile, locked }: { profile: Profile; locked: boolean }) {
  const router = useRouter();

  const [values, setValues] = useState<ProfileFormValues>({
    prefix: profile.prefix,
    firstName: profile.firstName,
    lastName: profile.lastName,
    nickname: profile.nickname,
    studentId: profile.studentId,
    year: String(profile.year),
    instagram: profile.instagram ?? '',
    messageToBudder: profile.messageToBudder,
    hint1: profile.hint1,
    hint2: profile.hint2,
  });
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

    const result = await submitJson('/api/profile', 'PATCH', {
      ...values,
      year: Number(values.year),
    });

    if (result.ok) {
      router.replace('/home');
      router.refresh();
      return;
    }

    setSaving(false);
    setFormError(result.error);
    if (result.fields) setErrors(result.fields);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[22px] px-5 pb-10 pt-5">
      <PersonalFields
        values={values}
        errors={errors}
        onChange={change}
        locked={locked}
        disabled={saving}
        settledFaculty={profile.faculty}
      />

      <MessageFields values={values} errors={errors} onChange={change} disabled={saving} />

      {formError ? (
        <p
          role="alert"
          className="m-0 rounded-input border-2 border-engineering bg-engineering-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-engineering-text"
        >
          {formError}
        </p>
      ) : null}

      <ActionButton type="submit" disabled={saving}>
        {saving ? 'กำลังบันทึก…' : 'บันทึก'}
      </ActionButton>
    </form>
  );
}
