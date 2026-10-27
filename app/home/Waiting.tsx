import { FacultyChip } from '@/components/ui/Chip';
import { StatusPill } from '@/components/ui/Chip';
import { GrassFooter } from '@/components/ui/Scenery';
import { FACULTY_LABEL, yearLabel } from '@/lib/faculty';
import type { Profile } from '@/lib/profile';
import { formatThaiDateTime } from '@/lib/time';
import { Countdown } from './Countdown';

function PencilIcon() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function Waiting({
  profile,
  revealAt,
  serverNow,
}: {
  profile: Profile;
  revealAt: Date;
  serverNow: Date;
}) {
  const reached = serverNow.getTime() >= revealAt.getTime();

  return (
    <>
      <div className="relative z-10 flex flex-col gap-5 px-5 py-6">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <StatusPill>ลงทะเบียนสำเร็จแล้ว</StatusPill>
          <h1 className="m-0 font-heading text-[24px] font-semibold leading-snug">
            {reached ? 'ถึงเวลาแล้ว! บัดดี้ของคุณรออยู่' : 'รอสุ่มบัดดี้อีกนิดนะ'}
          </h1>
          <p className="m-0 text-[14px] text-muted">ประกาศบัดดี้ {formatThaiDateTime(revealAt)}</p>
        </div>

        <Countdown serverNowMs={serverNow.getTime()} revealAtMs={revealAt.getTime()} />

        <div className="flex flex-col gap-3 rounded-card bg-card px-[18px] py-4 shadow-card">
          <div className="flex flex-col gap-0.5">
            <span className="font-heading text-[17px] font-medium">{profile.nickname}</span>
            <span className="text-[13px] text-muted">
              {FACULTY_LABEL[profile.faculty].long} · {yearLabel(profile.year)}
            </span>
          </div>
          <a
            href="/profile"
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-input border-2 border-brown font-heading text-[15px] text-brown no-underline hover:text-brown"
          >
            <PencilIcon />
            แก้ไขข้อมูลและคำใบ้
          </a>
        </div>
      </div>

      <div className="relative min-h-[110px] flex-1">
        <GrassFooter height={110} />
      </div>
    </>
  );
}

/** Shown when the reveal has happened but this participant is not in the run. */
export function NoBuddyNotice({ profile }: { profile: Profile }) {
  return (
    <div className="flex flex-col gap-4 px-5 py-6">
      <div className="flex flex-col gap-2 rounded-card bg-card p-5 shadow-card">
        <h1 className="m-0 font-heading text-[20px] font-semibold">ยังไม่มีข้อมูลบัดดี้ของคุณ</h1>
        <p className="m-0 text-[14px] leading-relaxed text-muted">
          ระบบไม่พบคู่ของคุณในรอบนี้ กรุณาติดต่อทีมงานเพื่อตรวจสอบอีกครั้ง
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="font-heading text-[15px]">{profile.nickname}</span>
          <FacultyChip faculty={profile.faculty} tone="soft" />
        </div>
      </div>
    </div>
  );
}
