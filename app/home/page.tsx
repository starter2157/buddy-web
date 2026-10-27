import { redirect } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { MobileShell } from '@/components/ui/Shell';
import { loadHomeView } from '@/lib/home';
import { serverNow } from '@/lib/phase';
import { loadProfile, loadSchedule } from '@/lib/profile';
import { createClient } from '@/lib/supabase/server';
import { Reveal } from './Reveal';
import { NoBuddyNotice, Waiting } from './Waiting';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const [profile, schedule, view] = await Promise.all([
    loadProfile(supabase, user.id),
    loadSchedule(supabase),
    loadHomeView(supabase),
  ]);
  if (!profile) redirect('/register');

  // `view.revealed` comes from the database, which is the only thing that can
  // confirm both that the time has come and that a run has been confirmed.
  const revealed = view.revealed;

  return (
    <MobileShell>
      <header className="flex items-center justify-between gap-3 bg-sky px-5 pb-[18px] pt-5">
        <Logo />
        {revealed ? (
          <a href="/profile" className="flex min-h-touch items-center px-1 text-[14px]">
            โปรไฟล์ของฉัน
          </a>
        ) : (
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex min-h-touch items-center px-1 text-[14px] text-link hover:text-link-hover"
            >
              ออกจากระบบ
            </button>
          </form>
        )}
      </header>

      {revealed && view.buddy ? (
        <Reveal view={{ ...view, buddy: view.buddy }} />
      ) : revealed ? (
        <NoBuddyNotice profile={profile} />
      ) : (
        <Waiting profile={profile} revealAt={schedule.revealAt} serverNow={serverNow()} />
      )}
    </MobileShell>
  );
}
