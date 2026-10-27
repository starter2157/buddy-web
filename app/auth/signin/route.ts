import { NextResponse, type NextRequest } from 'next/server';
import { STUDENT_EMAIL_DOMAIN } from '@/lib/chula';
import { siteUrl } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

/**
 * Starts Google sign-in. `hd` asks Google to show only university accounts —
 * it is a hint, not a guarantee, so the callback and the middleware check the
 * domain again on the server.
 */
export async function GET(request: NextRequest) {
  const origin = siteUrl(new URL(request.url).origin);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: { hd: STUDENT_EMAIL_DOMAIN, prompt: 'select_account' },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/?error=signin`);
  }
  return NextResponse.redirect(data.url);
}
