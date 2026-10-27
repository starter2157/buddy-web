import { NextResponse, type NextRequest } from 'next/server';
import { DEMO_ACCOUNT_PASSWORD, isDemoLoginEnabled } from '@/lib/demo';
import { siteUrl } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

/**
 * Signs in as a seeded demo participant, so the app can be walked through
 * without a Google OAuth client.
 *
 * POST only, and 404 unless both demo gates are satisfied — see lib/demo.ts.
 * It can only ever reach accounts the seed created, because an account that
 * arrived through Google has no password to match.
 */
export async function POST(request: NextRequest) {
  if (!isDemoLoginEnabled()) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const form = await request.formData();
  const email = String(form.get('email') ?? '');
  const origin = siteUrl(new URL(request.url).origin);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: DEMO_ACCOUNT_PASSWORD,
  });

  if (error) {
    return NextResponse.redirect(`${origin}/demo?error=1`, { status: 303 });
  }
  return NextResponse.redirect(`${origin}/home`, { status: 303 });
}
