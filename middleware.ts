import { NextResponse, type NextRequest } from 'next/server';
import { isStudentEmail } from '@/lib/chula';
import { readSession } from '@/lib/supabase/middleware';

/** Routes that need a signed-in participant. /admin additionally checks the allowlist server-side. */
const REQUIRES_SESSION = ['/home', '/profile', '/register', '/admin'];

function isProtected(pathname: string): boolean {
  return REQUIRES_SESSION.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/** Carries the refreshed session cookies onto a redirect, which would otherwise drop them. */
function redirectKeepingSession(request: NextRequest, to: string, source: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = to;
  url.search = '';

  const redirect = NextResponse.redirect(url);
  for (const cookie of source.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export async function middleware(request: NextRequest) {
  const { user, response } = await readSession(request);
  const { pathname } = request.nextUrl;

  // Second line of defence on the domain rule: the callback already refuses a
  // non-university account, so reaching here means a session was obtained some
  // other way. Drop it rather than letting it through.
  if (user && !isStudentEmail(user.email)) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '?error=domain';

    const redirect = NextResponse.redirect(url);
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith('sb-')) redirect.cookies.delete(cookie.name);
    }
    return redirect;
  }

  if (!user && isProtected(pathname)) {
    return redirectKeepingSession(request, '/', response);
  }

  if (user && pathname === '/') {
    return redirectKeepingSession(request, '/home', response);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and the cron endpoint, which
     * authenticates with a bearer secret rather than a session.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
