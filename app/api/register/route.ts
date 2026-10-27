import { NextResponse, type NextRequest } from 'next/server';
import { ALREADY_REGISTERED, SAVE_FAILED, UNIQUE_VIOLATION, apiError, validationError } from '@/lib/api';
import { resolvePhase, serverNow } from '@/lib/phase';
import { loadProfile, loadSchedule } from '@/lib/profile';
import { decideRegistration } from '@/lib/registration';
import { registerSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return apiError('กรุณาเข้าสู่ระบบก่อน', 401);

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const [schedule, existing] = await Promise.all([
    loadSchedule(supabase),
    loadProfile(supabase, user.id),
  ]);

  const decision = decideRegistration({
    // The phase comes from the server clock, never from the request.
    phase: resolvePhase(serverNow(), schedule),
    email: user.email,
    hasProfile: existing !== null,
    studentId: parsed.data.studentId,
  });

  if (!decision.ok) {
    return apiError(decision.message, decision.status, decision.fields);
  }

  const { error } = await supabase.from('profiles').insert({
    user_id: user.id,
    email: user.email,
    prefix: parsed.data.prefix,
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    nickname: parsed.data.nickname,
    student_id: parsed.data.studentId,
    // Sent because the column is NOT NULL; the database derives it again from
    // the student ID regardless of what arrives here.
    faculty: decision.faculty,
    year: parsed.data.year,
    instagram: parsed.data.instagram,
    message_to_budder: parsed.data.messageToBudder,
    hint_1: parsed.data.hint1,
    hint_2: parsed.data.hint2,
    consented_at: new Date().toISOString(),
  });

  if (error) {
    return error.code === UNIQUE_VIOLATION
      ? apiError(ALREADY_REGISTERED, 409)
      : apiError(SAVE_FAILED, 500);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
