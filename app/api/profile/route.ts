import { NextResponse, type NextRequest } from 'next/server';
import { NOT_REGISTERED, SAVE_FAILED, apiError, validationError } from '@/lib/api';
import { resolvePhase, serverNow } from '@/lib/phase';
import { loadProfile, loadSchedule } from '@/lib/profile';
import { decideProfileUpdate } from '@/lib/registration';
import { profileUpdateSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return apiError('กรุณาเข้าสู่ระบบก่อน', 401);

  const body = await request.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  const [schedule, existing] = await Promise.all([
    loadSchedule(supabase),
    loadProfile(supabase, user.id),
  ]);
  if (!existing) return apiError(NOT_REGISTERED, 404);

  const decision = decideProfileUpdate({
    phase: resolvePhase(serverNow(), schedule),
    email: user.email,
    existing,
    next: { prefix: input.prefix, studentId: input.studentId, year: input.year },
  });

  if (!decision.ok) {
    return apiError(decision.message, decision.status, decision.fields);
  }

  const editable = {
    first_name: input.firstName,
    last_name: input.lastName,
    nickname: input.nickname,
    instagram: input.instagram,
    message_to_budder: input.messageToBudder,
    hint_1: input.hint1,
    hint_2: input.hint2,
  };

  // While locked, the identity columns are left out of the statement entirely
  // rather than written back with the same values.
  const changes = decision.locked
    ? editable
    : {
        ...editable,
        prefix: input.prefix,
        student_id: input.studentId,
        faculty: decision.faculty,
        year: input.year,
      };

  const { error } = await supabase.from('profiles').update(changes).eq('user_id', user.id);
  return error ? apiError(SAVE_FAILED, 500) : NextResponse.json({ ok: true });
}
