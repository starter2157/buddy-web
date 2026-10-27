import Link from 'next/link';

const VARIANTS = {
  primary: 'bg-primary text-card shadow-btn',
  confirm: 'bg-pharmacy text-card shadow-btn-green',
  outline: 'border-2 border-brown bg-card text-brown',
  danger: 'border-2 border-primary bg-card text-link',
  wood: 'bg-brown text-card',
} as const;

type Variant = keyof typeof VARIANTS;

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-btn font-heading text-[17px] font-medium transition-transform active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60';

export function ActionButton({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button {...props} className={`${BASE} min-h-action px-4 ${VARIANTS[variant]} ${className}`} />
  );
}

export function ActionLink({
  variant = 'primary',
  className = '',
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; href: string }) {
  return (
    <Link
      href={href}
      {...props}
      className={`${BASE} min-h-action px-4 no-underline hover:text-inherit ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
