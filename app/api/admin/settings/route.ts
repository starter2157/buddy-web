import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { validationError } from '@/lib/api';
import { requireAdmin, rpcError } from '@/lib/admin-guard';

const scheduleSchema = z.object({
  registerOpenAt: z.string().datetime({ offset: true }),
  registerCloseAt: z.string().datetime({ offset: true }),
  revealAt: z.string().datetime({ offset: true }),
  hint2At: z.string().datetime({ offset: true }).nullable(),
});

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const parsed = scheduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  // The ordering rules live in the database function, which answers with a
  // Thai sentence rather than a constraint name.
  const { error } = await guard.supabase.rpc('admin_save_schedule', {
    p_open: parsed.data.registerOpenAt,
    p_close: parsed.data.registerCloseAt,
    p_reveal: parsed.data.revealAt,
    p_hint2: parsed.data.hint2At,
  });
  if (error) return rpcError(error.message);

  return NextResponse.json({ ok: true });
}
