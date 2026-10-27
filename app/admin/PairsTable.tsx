'use client';

import { FACULTY_LABEL, FACULTY_STYLE } from '@/lib/faculty';
import type { AdminPerson, Pair } from '@/lib/pairs';
import { GENDER_PAIRING_LABEL, type GenderPairing } from '@/lib/prefix';

const GENDER_TONE: Record<GenderPairing, string> = {
  mixed: 'bg-pharmacy-soft text-pharmacy-soft-text',
  neutral: 'bg-border-soft text-ink',
  same: 'bg-science-soft text-science-text',
};

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0 stroke-muted"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className="stroke-brown"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function PersonCell({ person }: { person: AdminPerson }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-heading text-[16px] font-medium">{person.nickname}</span>
      <span>
        {person.prefix === 'ไม่ระบุ' ? '' : person.prefix}
        {person.firstName} {person.lastName}
      </span>
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 font-heading text-[12px] ${FACULTY_STYLE[person.faculty].solid}`}
        >
          {FACULTY_LABEL[person.faculty].short} · ปี {person.year}
        </span>
        <span className="text-[13px] text-muted">
          {person.instagram ? `@${person.instagram}` : '—'}
        </span>
      </div>
      <span className="text-[12px] tracking-[0.5px] text-muted">{person.studentId}</span>
    </div>
  );
}

export function PairsTable({
  pairs,
  shown,
  total,
  query,
  onQuery,
  selected,
  onSwapClick,
  disabled,
}: {
  pairs: Pair[];
  shown: number;
  total: number;
  query: string;
  onQuery: (value: string) => void;
  selected: AdminPerson | null;
  onSwapClick: (person: AdminPerson) => void;
  disabled: boolean;
}) {
  return (
    <section
      aria-label="รายชื่อคู่บัดดี้"
      className="flex min-w-0 flex-[999_1_640px] flex-col gap-4 rounded-card-lg bg-card p-5 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 font-heading text-[22px] font-semibold">คู่บัดเดอร์ → บัดดี้</h1>
        <a
          href="/api/admin/export"
          className="flex min-h-touch items-center gap-2 rounded-input border-2 border-brown bg-card px-4 font-heading text-[15px] text-brown no-underline hover:text-brown"
        >
          <DownloadIcon />
          Export CSV
        </a>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pair-search" className="text-[14px] font-medium">
          ค้นหา
        </label>
        <div className="flex min-h-field items-center gap-2 rounded-input border-2 border-border px-3">
          <SearchIcon />
          <input
            id="pair-search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="ชื่อ นามสกุล ชื่อเล่น หรือรหัสนิสิต"
            className="min-h-touch flex-1 bg-transparent text-[16px] outline-none"
          />
        </div>
        <span className="text-[13px] text-muted">
          แสดง {shown} จาก {total} คู่ · ค้นหาได้ทั้งฝั่งบัดเดอร์และบัดดี้
        </span>
      </div>

      {selected ? (
        <p
          role="status"
          className="m-0 rounded-input border-2 border-science bg-science-soft px-3.5 py-2.5 text-[13px] text-science-text"
        >
          เลือก <strong>{selected.nickname}</strong> ไว้แล้ว — กด “สลับกับคนนี้”
          ในแถวที่ต้องการสลับตำแหน่ง
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-[14px] border-[1.5px] border-border-soft">
        <table className="w-full min-w-[760px] border-collapse text-[14px]">
          <thead>
            <tr className="bg-table-head text-left">
              <th scope="col" className="px-3.5 py-3 font-heading font-medium">
                บัดเดอร์ (ผู้ดูแล)
              </th>
              <th scope="col" className="w-7 px-1 py-3">
                <span className="sr-only">ดูแล</span>
              </th>
              <th scope="col" className="px-3.5 py-3 font-heading font-medium">
                บัดดี้
              </th>
              <th scope="col" className="px-3.5 py-3 font-heading font-medium">
                ตรวจสอบ
              </th>
              <th scope="col" className="px-3.5 py-3">
                <span className="sr-only">จัดการ</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair) => {
              const isSelected = selected?.userId === pair.budder.userId;
              return (
                <tr key={pair.position} className="border-t-[1.5px] border-border-soft align-top">
                  <td className="px-3.5 py-3">
                    <PersonCell person={pair.budder} />
                  </td>
                  <td className="px-1 py-3.5">
                    <svg
                      aria-hidden="true"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="stroke-primary"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  </td>
                  <td className="px-3.5 py-3">
                    <PersonCell person={pair.buddy} />
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="flex flex-col items-start gap-1.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[12px] ${
                          pair.crossFaculty
                            ? 'bg-pharmacy-soft text-pharmacy-soft-text'
                            : 'bg-engineering-soft text-engineering-text'
                        }`}
                      >
                        {pair.crossFaculty ? 'ต่างคณะ' : 'คณะเดียวกัน'}
                      </span>
                      <span className={`rounded-md px-2 py-0.5 text-[12px] ${GENDER_TONE[pair.gender]}`}>
                        {GENDER_PAIRING_LABEL[pair.gender]}
                      </span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onSwapClick(pair.budder)}
                      className={`min-h-[40px] rounded-[10px] border-[1.5px] px-3 text-[13px] disabled:opacity-60 ${
                        isSelected
                          ? 'border-primary bg-engineering-soft text-link'
                          : 'border-border bg-card text-ink'
                      }`}
                    >
                      {isSelected ? 'ยกเลิกการเลือก' : selected ? 'สลับกับคนนี้' : 'สลับคู่'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {pairs.length === 0 ? (
          <p className="m-0 p-7 text-center text-muted">
            {total === 0 ? 'ยังไม่มีผลการสุ่ม' : `ไม่พบผลลัพธ์สำหรับ “${query}”`}
          </p>
        ) : null}
      </div>
    </section>
  );
}
