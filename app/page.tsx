import { headers } from 'next/headers';
import { InAppBrowserBanner } from '@/components/InAppBrowserBanner';
import { BuddyBudderSign } from '@/components/ui/BuddyBudderSign';
import { Logo } from '@/components/ui/Logo';
import { Clouds, GrassFooter, SkyWave } from '@/components/ui/Scenery';
import { MobileShell } from '@/components/ui/Shell';
import { STUDENT_EMAIL_DOMAIN } from '@/lib/chula';
import { siteUrl } from '@/lib/env';
import { detectInAppBrowser } from '@/lib/inapp';

const SIGN_IN_ERRORS: Record<string, string> = {
  domain: `เข้าสู่ระบบได้เฉพาะอีเมล @${STUDENT_EMAIL_DOMAIN} เท่านั้น กรุณาลองใหม่ด้วยบัญชีมหาวิทยาลัย`,
  signin: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  cancelled: 'ยกเลิกการเข้าสู่ระบบแล้ว',
};

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M20.5 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h4.8a4.2 4.2 0 0 1-1.8 2.7" />
      <path d="M15 16.6A6.8 6.8 0 0 1 5.4 13" />
      <path d="M5.4 11a6.8 6.8 0 0 1 10.4-3.7" />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const headerList = await headers();

  const inAppBrowser = detectInAppBrowser(headerList.get('user-agent'));
  const message = error ? SIGN_IN_ERRORS[error] : undefined;

  return (
    <MobileShell>
      <div className="relative flex h-[476px] shrink-0 flex-col items-center gap-[22px] bg-sky pt-11">
        <Clouds />
        <Logo size="hero" />
        <BuddyBudderSign />
        <SkyWave />
      </div>

      <div className="relative z-10 flex flex-col gap-2.5 px-6 pt-1">
        {inAppBrowser ? <InAppBrowserBanner app={inAppBrowser} url={siteUrl()} /> : null}

        {message ? (
          <p
            role="alert"
            className="m-0 rounded-input border-2 border-engineering bg-engineering-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-engineering-text"
          >
            {message}
          </p>
        ) : null}

        <a
          href="/auth/signin"
          className="flex min-h-[56px] items-center justify-center gap-2.5 rounded-btn bg-primary font-heading text-[17px] font-medium text-card no-underline shadow-btn transition-transform hover:text-card active:translate-y-px"
        >
          <GoogleMark />
          เข้าสู่ระบบด้วย Google
        </a>

        <p className="m-0 text-center text-[14px] text-muted">
          ใช้อีเมลมหาวิทยาลัย{' '}
          <strong className="text-ink">@{STUDENT_EMAIL_DOMAIN}</strong> เท่านั้น
        </p>
      </div>

      <div className="relative min-h-[120px] flex-1">
        <GrassFooter />
      </div>
    </MobileShell>
  );
}
