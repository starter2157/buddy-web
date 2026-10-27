import { redirect } from 'next/navigation';
import { HeaderTag, StatusPill } from '@/components/ui/Chip';
import { Logo } from '@/components/ui/Logo';
import { loadAdminData, currentAdmin } from '@/lib/admin';
import { resolvePhase, serverNow } from '@/lib/phase';
import { createClient } from '@/lib/supabase/server';
import { formatThaiDateTime } from '@/lib/time';
import { AdminBoard } from './AdminBoard';

const PHASE_LABEL = {
  before_open: 'ยังไม่เปิดลงทะเบียน',
  open: 'เปิดรับลงทะเบียน',
  closed: 'ช่วงตรวจสอบ',
  revealed: 'ประกาศผลแล้ว',
} as const;

export default async function AdminPage() {
  const supabase = await createClient();
  const admin = await currentAdmin(supabase);

  // Not an admin means not here. Every admin API checks again, and so does
  // every admin_* function in the database.
  if (!admin) redirect('/');

  const data = await loadAdminData(supabase);
  const phase = resolvePhase(serverNow(), data.schedule);

  return (
    <div className="min-h-dvh bg-ground">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-sky px-6 py-3.5">
        <div className="flex items-center gap-3.5">
          <Logo />
          <HeaderTag>Admin</HeaderTag>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill tone="pending">
            {PHASE_LABEL[phase]} · ประกาศ {formatThaiDateTime(data.schedule.revealAt)}
          </StatusPill>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex min-h-touch items-center text-[14px] text-link hover:text-link-hover"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>
      </header>

      <AdminBoard data={data} />
    </div>
  );
}
