/**
 * Environment access. Every read is a function call rather than a module-level
 * constant, so a missing variable fails the request that needs it instead of
 * the whole build — and `next build` still works without a configured project.
 *
 * NEXT_PUBLIC_* names are written out literally because Next inlines them at
 * build time by matching the source text.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

export function supabaseUrl(): string {
  return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabaseAnonKey(): string {
  return required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Server only. Never expose this to the browser. */
export function supabaseServiceRoleKey(): string {
  return required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function cronSecret(): string {
  return required('CRON_SECRET', process.env.CRON_SECRET);
}

/**
 * The canonical origin, used to build OAuth redirect URLs. Set
 * NEXT_PUBLIC_SITE_URL in production so a forwarded host cannot redirect
 * sign-in somewhere else.
 */
export function siteUrl(fallbackOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (fallbackOrigin) return fallbackOrigin.replace(/\/$/, '');
  return 'http://localhost:3000';
}
