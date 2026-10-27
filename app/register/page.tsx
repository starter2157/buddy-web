import { redirect } from 'next/navigation';
import { HeaderTag } from '@/components/ui/Chip';
import { MobileShell, SkyHeader } from '@/components/ui/Shell';
import { studentIdFromEmail } from '@/lib/chula';
import { canRegister, resolvePhase, serverNow } from '@/lib/phase';
import { loadProfile, loadSchedule } from '@/lib/profile';
import { createClient } from '@/lib/supabase/server';
import { formatThaiDateTime } from '@/lib/time';
import { RegisterForm } from './RegisterForm';

export default async function RegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  // Registering twice is not possible, so an existing profile goes home.
  const [profile, schedule] = await Promise.all([
    loadProfile(supabase, user.id),
    loadSchedule(supabase),
  ]);
  if (profile) redirect('/home');

  const phase = resolvePhase(serverNow(), schedule);

  return (
    <MobileShell>
      <SkyHeader>
        <HeaderTag>ลงทะเบียน</HeaderTag>
      </SkyHeader>

      {canRegister(phase) ? (
        <RegisterForm
          email={user.email ?? ''}
          studentId={studentIdFromEmail(user.email) ?? ''}
        />
      ) : (
        <ClosedNotice
          title={phase === 'before_open' ? 'ยังไม่เปิดรับลงทะเบียน' : 'ปิดรับลงทะเบียนแล้ว'}
          detail={
            phase === 'before_open'
              ? `เปิดให้ลงทะเบียน ${formatThaiDateTime(schedule.registerOpenAt)}`
              : `ปิดรับเมื่อ ${formatThaiDateTime(schedule.registerCloseAt)} หากมีข้อสงสัยกรุณาติดต่อทีมงาน`
          }
        />
      )}
    </MobileShell>
  );
}

function ClosedNotice({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-col gap-2 px-5 py-8">
      <div className="flex flex-col gap-2 rounded-card bg-card p-5 shadow-card">
        <h1 className="m-0 font-heading text-[20px] font-semibold">{title}</h1>
        <p className="m-0 text-[14px] leading-relaxed text-muted">{detail}</p>
      </div>
    </div>
  );
}
