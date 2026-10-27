import { FACULTY_LABEL, FACULTY_STYLE, type Faculty, yearLabel } from '@/lib/faculty';

type ChipTone = 'solid' | 'soft';

export function FacultyChip({
  faculty,
  tone = 'solid',
  label = 'long',
  className = '',
}: {
  faculty: Faculty;
  tone?: ChipTone;
  label?: 'short' | 'long';
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 font-heading text-[13px] ${FACULTY_STYLE[faculty][tone]} ${className}`}
    >
      {FACULTY_LABEL[faculty][label]}
    </span>
  );
}

export function YearChip({ year }: { year: number }) {
  return (
    <span className="inline-flex items-center rounded-full border-[1.5px] border-border bg-card px-3 py-1 font-heading text-[13px] text-ink">
      {yearLabel(year)}
    </span>
  );
}

/** The green "ลงทะเบียนสำเร็จแล้ว" style pill. */
export function StatusPill({
  children,
  tone = 'success',
}: {
  children: React.ReactNode;
  tone?: 'success' | 'pending' | 'neutral';
}) {
  const tones = {
    success: 'bg-pharmacy-soft text-pharmacy-text',
    pending: 'bg-science-soft text-science-text',
    neutral: 'bg-border-soft text-ink',
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 font-heading text-[13px] ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** The brown square tag used for "ลงทะเบียน" and "Admin" in the headers. */
export function HeaderTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-lg bg-brown px-3 py-1 font-heading text-[13px] text-card">
      {children}
    </span>
  );
}
