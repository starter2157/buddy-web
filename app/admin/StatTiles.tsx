import { FACULTY_LABEL, type Faculty } from '@/lib/faculty';
import type { Totals } from '@/lib/pairs';

const FACULTY_TILE: Record<Faculty, { border: string; value: string }> = {
  pharmacy: { border: 'border-t-pharmacy', value: 'text-pharmacy-text' },
  science: { border: 'border-t-science', value: 'text-science-text' },
  engineering: { border: 'border-t-engineering', value: 'text-engineering-text' },
};

const ORDER: Faculty[] = ['pharmacy', 'science', 'engineering'];

export function StatTiles({ totals }: { totals: Totals }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
      <div className="flex flex-col gap-1 rounded-card bg-card px-[18px] py-4 shadow-card">
        <span className="text-[14px] text-muted">ลงทะเบียนทั้งหมด</span>
        <span className="font-logo text-[36px] font-semibold leading-tight">{totals.total}</span>
        <span className="text-[13px] text-muted">
          นาย {totals.byPrefix['นาย']} · นางสาว {totals.byPrefix['นางสาว']} · ไม่ระบุ{' '}
          {totals.byPrefix['ไม่ระบุ']}
        </span>
      </div>

      {ORDER.map((faculty) => (
        <div
          key={faculty}
          className={`flex flex-col gap-1 rounded-card border-t-[6px] bg-card px-[18px] py-4 shadow-card ${FACULTY_TILE[faculty].border}`}
        >
          <span className="text-[14px] text-muted">{FACULTY_LABEL[faculty].long}</span>
          <span
            className={`font-logo text-[36px] font-semibold leading-tight ${FACULTY_TILE[faculty].value}`}
          >
            {totals.byFaculty[faculty]}
          </span>
        </div>
      ))}
    </div>
  );
}
