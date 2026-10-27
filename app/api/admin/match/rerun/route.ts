import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { loadEveryone, toMatchablePeople } from '@/lib/admin';
import { requireAdmin, rpcError } from '@/lib/admin-guard';
import { matchCycle } from '@/lib/matching';

const TOO_FEW = 'ต้องมีผู้ลงทะเบียนอย่างน้อย 2 คนจึงจะสุ่มได้';

/** Draws a fresh cycle and replaces the draft run. */
export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const people = await loadEveryone(guard.supabase);
  if (people.length < 2) return apiError(TOO_FEW, 400);

  // Stored on the run, so this exact draw can be reproduced later.
  const seed = Math.floor(Math.random() * 2 ** 31);
  const result = matchCycle(toMatchablePeople(people), { seed });

  const { error } = await guard.supabase.rpc('admin_replace_draft_run', {
    p_seed: seed,
    p_stats: { ...result.stats, violations: result.violations.length, feasible: result.feasible },
    p_cycle: result.cycle,
  });

  if (error) return rpcError(error.message);

  return NextResponse.json({
    ok: true,
    stats: result.stats,
    violations: result.violations.length,
  });
}
