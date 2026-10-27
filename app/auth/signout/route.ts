import { NextResponse, type NextRequest } from 'next/server';
import { siteUrl } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

/** POST only, so a prefetch or a stray link can never sign someone out. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(`${siteUrl(new URL(request.url).origin)}/`, { status: 303 });
}
