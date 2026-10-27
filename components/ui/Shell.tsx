import { Logo } from './Logo';

/**
 * Every participant screen is a 390px-wide mobile column. On desktop it is
 * centred and capped rather than stretched, so the design still holds.
 */
export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-mobile flex-col bg-ground">{children}</div>
  );
}

/** The sky-blue bar at the top of /register, /home and /reveal. */
export function SkyHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 bg-sky px-5 pb-[18px] pt-5">
      <Logo />
      {children}
    </header>
  );
}

export function Card({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-card bg-card p-4 shadow-card ${className}`}>{children}</div>
  );
}

/** The dashed outline used for "no Instagram" and the locked second hint. */
export function DashedNote({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border-2 border-dashed border-sketch px-3.5 py-2.5">
      <span className="shrink-0 text-muted">{icon}</span>
      <div className="flex flex-col gap-0.5">
        <span className="font-heading text-[15px]">{title}</span>
        {detail ? <span className="text-[13px] leading-relaxed text-muted">{detail}</span> : null}
      </div>
    </div>
  );
}
