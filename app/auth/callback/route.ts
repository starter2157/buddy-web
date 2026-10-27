import { NextResponse, type NextRequest } from 'next/server';
import { isStudentEmail } from '@/lib/chula';
import { siteUrl } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

/**
 * Exchanges the OAuth code for a session, then enforces the university domain
 * before the session is allowed to survive. An account from any other domain
 * is signed straight back out.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const site = siteUrl(url.origin);

  if (url.searchParams.get('error')) {
    return NextResponse.redirect(`${site}/?error=cancelled`);
  }

  const code = url.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(`${site}/?error=signin`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${site}/?error=signin`);
  }

  if (!isStudentEmail(data.user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${site}/?error=domain`);
  }

  return NextResponse.redirect(`${site}/home`);
}
