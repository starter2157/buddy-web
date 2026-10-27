import { NextResponse } from 'next/server';
import { requireAdmin, rpcError } from '@/lib/admin-guard';

/** Promotes the draft, replacing any run participants were already seeing. */
export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.supabase.rpc('admin_confirm_draft_run');
  if (error) return rpcError(error.message);

  return NextResponse.json({ ok: true, runId: data });
}
