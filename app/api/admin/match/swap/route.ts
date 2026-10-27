import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, validationError } from '@/lib/api';
import { cycleFromPairs, loadEveryone, loadLatestRun, loadPairs, toMatchablePeople } from '@/lib/admin';
import { requireAdmin, rpcError } from '@/lib/admin-guard';
import { evaluateCycle, swapInCycle } from '@/lib/matching';

const swapSchema = z.object({
  a: z.string().uuid(),
  b: z.string().uuid(),
});

const NO_DRAFT = 'ยังไม่มีผลการสุ่มที่แก้ไขได้';
const CONFIRMED = 'ผลการจับคู่ยืนยันแล้ว หากต้องการแก้ไขให้สุ่มใหม่ก่อน';

/**
 * Exchanges two people's places in the cycle. The result is re-validated and
 * its stats recomputed, so what is stored always describes what is stored.
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const parsed = swapSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const run = await loadLatestRun(guard.supabase);
  if (!run) return apiError(NO_DRAFT, 404);
  if (run.status !== 'draft') return apiError(CONFIRMED, 409);

  const [pairs, people] = await Promise.all([
    loadPairs(guard.supabase, run.id),
    loadEveryone(guard.supabase),
  ]);

  let cycle: string[];
  try {
    cycle = swapInCycle(cycleFromPairs(pairs), parsed.data.a, parsed.data.b);
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'สลับคู่ไม่สำเร็จ', 400);
  }

  const evaluated = evaluateCycle(toMatchablePeople(people), cycle);

  const { error } = await guard.supabase.rpc('admin_set_draft_cycle', {
    p_run: run.id,
    p_cycle: evaluated.cycle,
    p_stats: {
      ...evaluated.stats,
      violations: evaluated.violations.length,
      feasible: evaluated.feasible,
    },
  });
  if (error) return rpcError(error.message);

  return NextResponse.json({
    ok: true,
    stats: evaluated.stats,
    violations: evaluated.violations.length,
  });
}
