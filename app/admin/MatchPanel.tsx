'use client';

import type { AdminRun } from '@/lib/admin';
import { formatThaiDateTime } from '@/lib/time';

export function MatchPanel({
  run,
  total,
  onConfirm,
  onRerun,
  disabled,
}: {
  run: AdminRun | null;
  total: number;
  onConfirm: () => void;
  onRerun: () => void;
  disabled: boolean;
}) {
  const stats = run?.stats ?? {};
  const violations = stats.violations ?? 0;

  return (
    <section
      aria-label="การจับคู่"
      className="flex flex-col gap-3.5 rounded-card-lg bg-card p-5 shadow-card"
    >
      <h2 className="m-0 font-heading text-[18px] font-semibold">ผลการสุ่ม</h2>

      {run ? (
        <>
          {violations > 0 ? (
            <p
              role="alert"
              className="m-0 rounded-input border-2 border-engineering bg-engineering-soft px-3 py-2 text-[13px] leading-relaxed text-engineering-text"
            >
              มี {violations} คู่ที่อยู่คณะเดียวกัน เพราะสัดส่วนคณะไม่เอื้อให้แยกได้ทั้งหมด
              กรุณาตรวจสอบก่อนยืนยัน
            </p>
          ) : null}

          <dl className="m-0 flex flex-col gap-2 text-[14px]">
            <Row label="สถานะ">
              <strong className={run.status === 'confirmed' ? 'text-pharmacy-text' : 'text-science-text'}>
                {run.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอยืนยัน'}
              </strong>
            </Row>
            <Row label="สุ่มเมื่อ">
              <span>{formatThaiDateTime(run.createdAt)}</span>
            </Row>
            <Row label="ต่างคณะ">
              <strong className={violations === 0 ? 'text-pharmacy-soft-text' : 'text-engineering-text'}>
                {stats.crossFaculty ?? 0}/{stats.n ?? 0}
              </strong>
            </Row>
            <Row label="คละเพศ">
              <strong>
                {stats.mixed ?? 0}/{stats.n ?? 0}
              </strong>
            </Row>
            <Row label="มีผู้ไม่ระบุ">
              <span>{stats.neutral ?? 0}</span>
            </Row>
            <Row label="เพศเดียวกัน">
              <span>{stats.same ?? 0}</span>
            </Row>
          </dl>
        </>
      ) : (
        <p className="m-0 text-[14px] leading-relaxed text-muted">
          ยังไม่มีผลการสุ่ม กด “สุ่มใหม่ทั้งหมด” เพื่อจับคู่ผู้ลงทะเบียน {total} คน
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          disabled={disabled || !run || run.status === 'confirmed'}
          onClick={onConfirm}
          className="min-h-[50px] rounded-[14px] bg-pharmacy font-heading text-[16px] font-medium text-card shadow-btn-green disabled:cursor-not-allowed disabled:opacity-50"
        >
          ยืนยันผลการจับคู่
        </button>
        <button
          type="button"
          disabled={disabled || total < 2}
          onClick={onRerun}
          className="min-h-[46px] rounded-[14px] border-2 border-primary bg-card font-heading text-[15px] text-link disabled:cursor-not-allowed disabled:opacity-50"
        >
          สุ่มใหม่ทั้งหมด
        </button>
      </div>

      <p className="m-0 text-[13px] leading-relaxed text-muted">
        ผู้ใช้จะเห็นบัดดี้เมื่อถึงเวลาประกาศ และต้องกดยืนยันก่อนเท่านั้น
      </p>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 text-right">{children}</dd>
    </div>
  );
}
