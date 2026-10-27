import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MobileShell } from '@/components/ui/Shell';
import { areIdentityFieldsLocked, resolvePhase, serverNow } from '@/lib/phase';
import { loadProfile, loadSchedule } from '@/lib/profile';
import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from './ProfileForm';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const [profile, schedule] = await Promise.all([
    loadProfile(supabase, user.id),
    loadSchedule(supabase),
  ]);
  if (!profile) redirect('/register');

  const locked = areIdentityFieldsLocked(resolvePhase(serverNow(), schedule));

  return (
    <MobileShell>
      <header className="flex items-center gap-1 bg-sky py-3 pl-2 pr-3">
        <Link
          href="/home"
          aria-label="ย้อนกลับ"
          className="flex h-11 w-11 items-center justify-center"
        >
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            className="stroke-ink"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="m-0 font-heading text-[20px] font-semibold">แก้ไขข้อมูล</h1>
      </header>

      <ProfileForm profile={profile} locked={locked} />
    </MobileShell>
  );
}
