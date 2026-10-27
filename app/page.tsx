import { Logo } from '@/components/ui/Logo';
import { MobileShell } from '@/components/ui/Shell';
import { Clouds, GrassFooter, SkyWave } from '@/components/ui/Scenery';

/**
 * Placeholder for the login screen. The Google sign-in flow and the in-app
 * browser banner land with the auth milestone; this renders the design tokens
 * and the scenery so the shell can be checked end to end.
 */
export default function LoginPage() {
  return (
    <MobileShell>
      <div className="relative flex flex-col items-center gap-6 bg-sky pt-11 pb-16">
        <Clouds />
        <Logo size="hero" />
        <p className="relative px-6 text-center font-heading text-[17px] text-brown">
          กิจกรรมบัดดี้–บัดเดอร์
        </p>
        <SkyWave />
      </div>
      <div className="relative flex-1 px-6 pt-6">
        <p className="text-center text-[14px] text-muted">
          ใช้อีเมลมหาวิทยาลัย <strong className="text-ink">@student.chula.ac.th</strong> เท่านั้น
        </p>
        <GrassFooter />
      </div>
    </MobileShell>
  );
}
