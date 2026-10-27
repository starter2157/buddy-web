import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { loadEveryone, toMatchablePeople } from '@/lib/admin';
import { cronSecret } from '@/lib/env';
import { matchCycle } from '@/lib/matching';
import { createAdminClient } from '@/lib/supabase/admin';

/** Constant-time compare, so a wrong secret cannot be guessed a byte at a time. */
function secretMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Draws the match when registration closes. Called by pg_cron through pg_net
 * with a bearer secret; there is no session involved, so this route is outside
 * the middleware matcher.
 *
 * Idempotent: the database refuses to create a run if any run already exists,
 * so a duplicate fire, a retry, or an admin who already drew one by hand all
 * leave the existing match alone.
 */
export async function POST(request: NextRequest) {
  const header = request.headers.get('authorization') ?? '';
  const given = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';

  if (!given || !secretMatches(given, cronSecret())) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const admin = createAdminClient();
  const people = await loadEveryone(admin);

  if (people.length < 2) {
    return NextResponse.json({ ok: true, skipped: 'fewer than two registrations' });
  }

  const seed = Math.floor(Math.random() * 2 ** 31);
  const result = matchCycle(toMatchablePeople(people), { seed });

  const { data, error } = await admin.rpc('cron_create_draft_run', {
    p_seed: seed,
    p_stats: { ...result.stats, violations: result.violations.length, feasible: result.feasible },
    p_cycle: result.cycle,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    // A run already existed. Nothing to do, and that is a success.
    return NextResponse.json({ ok: true, skipped: 'a match run already exists' });
  }

  return NextResponse.json({
    ok: true,
    runId: data,
    stats: result.stats,
    violations: result.violations.length,
  });
}
