'use client';

import { useState } from 'react';
import { submitJson } from '@/components/forms/submit';
import type { Schedule } from '@/lib/phase';
import { fromBangkokInputValue, toBangkokInputValue } from '@/lib/time';

const FIELDS = [
  { key: 'registerOpenAt', label: 'เปิดลงทะเบียน' },
  { key: 'registerCloseAt', label: 'ปิดลงทะเบียน + สุ่มอัตโนมัติ' },
  { key: 'revealAt', label: 'ประกาศบัดดี้ + คำใบ้ 1' },
  { key: 'hint2At', label: 'เปิดคำใบ้ 2' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

export function SettingsCard({ schedule, onSaved }: { schedule: Schedule; onSaved: () => void }) {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    registerOpenAt: toBangkokInputValue(schedule.registerOpenAt),
    registerCloseAt: toBangkokInputValue(schedule.registerCloseAt),
    revealAt: toBangkokInputValue(schedule.revealAt),
    hint2At: toBangkokInputValue(schedule.hint2At),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError(undefined);
    setSaved(false);

    const payload = {
      registerOpenAt: fromBangkokInputValue(values.registerOpenAt),
      registerCloseAt: fromBangkokInputValue(values.registerCloseAt),
      revealAt: fromBangkokInputValue(values.revealAt),
      hint2At: fromBangkokInputValue(values.hint2At),
    };

    if (!payload.registerOpenAt || !payload.registerCloseAt || !payload.revealAt) {
      setSaving(false);
      setError('กรุณากรอกเวลาเปิด ปิด และประกาศให้ครบ');
      return;
    }

    const result = await submitJson('/api/admin/settings', 'PATCH', payload);
    setSaving(false);

    if (result.ok) {
      setSaved(true);
      onSaved();
      return;
    }
    setError(result.error);
  }

  return (
    <section
      aria-label="ตั้งค่าเวลา"
      className="flex flex-col gap-3 rounded-card-lg bg-card p-5 shadow-card"
    >
      <h2 className="m-0 font-heading text-[18px] font-semibold">ตั้งค่าเวลา</h2>

      {FIELDS.map((field) => (
        <div key={field.key} className="flex flex-col gap-1.5">
          <label htmlFor={field.key} className="text-[13px] font-medium">
            {field.label}
          </label>
          <input
            id={field.key}
            type="datetime-local"
            value={values[field.key]}
            disabled={saving}
            onChange={(event) =>
              setValues((current) => ({ ...current, [field.key]: event.target.value }))
            }
            className="min-h-touch rounded-[10px] border-2 border-border bg-card px-2.5 text-[15px]"
          />
        </div>
      ))}

      <p className="m-0 text-[13px] text-muted">เวลาทั้งหมดเป็นเวลาประเทศไทย (UTC+7)</p>

      {error ? (
        <p
          role="alert"
          className="m-0 rounded-input border-2 border-engineering bg-engineering-soft px-3 py-2 text-[13px] leading-relaxed text-engineering-text"
        >
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="m-0 text-[13px] text-pharmacy-text">
          บันทึกเวลาแล้ว
        </p>
      ) : null}

      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="min-h-[46px] rounded-input bg-brown font-heading text-[15px] text-card disabled:opacity-60"
      >
        {saving ? 'กำลังบันทึก…' : 'บันทึกเวลา'}
      </button>
    </section>
  );
}
