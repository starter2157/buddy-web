import { FacultyChip, YearChip } from '@/components/ui/Chip';
import { DashedNote } from '@/components/ui/Shell';
import { FACULTY_STYLE } from '@/lib/faculty';
import type { HomeView, RevealedBuddy } from '@/lib/home';
import { instagramUrl } from '@/lib/home';
import { formatThaiDate } from '@/lib/time';

/** The buddy card is bordered and tinted in their own faculty's colour. */
const CARD_BORDER = {
  engineering: 'border-engineering',
  science: 'border-science',
  pharmacy: 'border-pharmacy',
} as const;

const CARD_HEADER = {
  engineering: 'bg-engineering-soft',
  science: 'bg-science-soft',
  pharmacy: 'bg-pharmacy-soft',
} as const;

function InstagramIcon({ crossed = false }: { crossed?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width={crossed ? 22 : 20}
      height={crossed ? 22 : 20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      {crossed ? <path d="M4 20 20 4" /> : <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />}
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function HintCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-card bg-card px-4 py-3.5 shadow-card">
      <span className="shrink-0 rounded-lg bg-brown px-2.5 py-1 font-logo text-[13px] font-semibold text-card">
        {label}
      </span>
      <p className="m-0 text-[15px] leading-relaxed">{text}</p>
    </div>
  );
}

function BuddyCard({ buddy }: { buddy: RevealedBuddy }) {
  return (
    <section
      aria-label="ข้อมูลบัดดี้"
      className={`overflow-hidden rounded-card-xl border-[3px] bg-card shadow-card-deep ${CARD_BORDER[buddy.faculty]}`}
    >
      <div
        className={`flex flex-col items-center gap-2.5 px-5 pb-[18px] pt-[22px] ${CARD_HEADER[buddy.faculty]}`}
      >
        <span className="font-heading text-[32px] font-semibold leading-none">{buddy.nickname}</span>
        <span className="text-[15px]">
          {buddy.prefix === 'ไม่ระบุ' ? '' : buddy.prefix}
          {buddy.firstName} {buddy.lastName}
        </span>
        <div className="flex flex-wrap justify-center gap-2">
          <FacultyChip faculty={buddy.faculty} />
          <YearChip year={buddy.year} />
        </div>
      </div>

      <div className="flex flex-col gap-3 px-5 pb-5 pt-4">
        {buddy.instagram ? (
          <a
            href={instagramUrl(buddy.instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[50px] items-center justify-center gap-2.5 rounded-[14px] bg-primary font-heading text-[16px] font-medium text-card no-underline shadow-btn transition-transform hover:text-card active:translate-y-px"
          >
            <InstagramIcon />@{buddy.instagram}
          </a>
        ) : (
          <DashedNote
            icon={<InstagramIcon crossed />}
            title="บัดดี้ไม่ได้ใส่ Instagram"
            detail="ใช้ชื่อ คณะ และชั้นปีด้านบนตามหาตัวได้เลย"
          />
        )}

        <div className="flex flex-col gap-1 rounded-[14px] bg-ground px-3.5 py-3">
          <span className="font-heading text-[14px] text-brown">สิ่งที่บัดดี้อยากบอกคุณ</span>
          <p className="m-0 text-[15px] leading-relaxed">{buddy.message}</p>
        </div>
      </div>
    </section>
  );
}

export function Reveal({ view }: { view: HomeView & { buddy: RevealedBuddy } }) {
  const { buddy, hint1, hint2, hint2At } = view;

  return (
    <div className="flex flex-col gap-[22px] px-5 pb-10 pt-6">
      <div className="flex flex-col gap-1 text-center">
        <span className="text-[14px] text-muted">คุณเป็นบัดเดอร์ของ…</span>
        <h1 className="m-0 font-heading text-[26px] font-semibold">บัดดี้ของคุณมาแล้ว!</h1>
      </div>

      <BuddyCard buddy={buddy} />

      <section aria-label="คำใบ้จากบัดเดอร์" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="m-0 font-heading text-[20px] font-semibold">ใครเป็นบัดเดอร์ของคุณ?</h2>
          <p className="m-0 text-[14px] leading-relaxed text-muted">
            มีคนกำลังดูแลคุณอยู่ ลองเดาจากคำใบ้ แล้วไปเฉลยกันในวันงาน
          </p>
        </div>

        {hint1 ? <HintCard label="คำใบ้ 1" text={hint1} /> : null}

        {hint2 ? (
          <HintCard label="คำใบ้ 2" text={hint2} />
        ) : (
          <div className="flex items-center gap-3 rounded-card border-2 border-dashed border-sketch px-4 py-3.5 text-muted">
            <LockIcon />
            <div className="flex flex-col gap-0.5">
              <span className="font-heading text-[15px] text-ink">คำใบ้ 2 ยังไม่เปิด</span>
              <span className="text-[13px]">
                {hint2At ? `เปิด ${formatThaiDate(hint2At)}` : 'ทีมงานจะประกาศอีกครั้ง'}
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
