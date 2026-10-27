import { redirect } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { FacultyChip, YearChip } from '@/components/ui/Chip';
import { MobileShell } from '@/components/ui/Shell';
import { loadProfile } from '@/lib/profile';
import { createClient } from '@/lib/supabase/server';

/**
 * Placeholder. The waiting countdown and the reveal land with their own
 * milestone; what matters here for now is the routing: somebody signed in but
 * not registered belongs on /register.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const profile = await loadProfile(supabase, user.id);
  if (!profile) redirect('/register');

  return (
    <MobileShell>
      <header className="flex items-center justify-between gap-3 bg-sky px-5 pb-[18px] pt-5">
        <Logo />
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex min-h-touch items-center px-1 text-[14px] text-link hover:text-link-hover"
          >
            ออกจากระบบ
          </button>
        </form>
      </header>

      <div className="flex flex-col gap-3 px-5 py-6">
        <span className="font-heading text-[17px] font-medium">{profile.nickname}</span>
        <div className="flex flex-wrap gap-2">
          <FacultyChip faculty={profile.faculty} />
          <YearChip year={profile.year} />
        </div>
        <a href="/profile" className="text-[14px]">
          แก้ไขข้อมูลและคำใบ้
        </a>
      </div>
    </MobileShell>
  );
}
