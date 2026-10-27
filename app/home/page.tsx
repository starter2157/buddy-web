import { redirect } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { MobileShell } from '@/components/ui/Shell';
import { createClient } from '@/lib/supabase/server';

/**
 * Placeholder. The waiting and reveal screens land with their own milestones;
 * for now this proves the session round-trip and gives somewhere to sign out.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

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
        <p className="m-0 text-[14px] text-muted">เข้าสู่ระบบแล้วด้วย</p>
        <strong className="text-[15px]">{user.email}</strong>
      </div>
    </MobileShell>
  );
}
