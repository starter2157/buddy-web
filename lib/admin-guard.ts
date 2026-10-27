import type { SupabaseClient } from '@supabase/supabase-js';
import { apiError } from './api';
import { currentAdmin } from './admin';
import { createClient } from './supabase/server';

export const NOT_ADMIN = 'หน้านี้สำหรับทีมงานเท่านั้น';

type Guarded =
  | { ok: true; supabase: SupabaseClient }
  | { ok: false; response: ReturnType<typeof apiError> };

/**
 * Every admin API starts here. The check is server-side and the database
 * checks again inside each admin_* function, so a missed guard in a route
 * still cannot reach the data.
 */
export async function requireAdmin(): Promise<Guarded> {
  const supabase = await createClient();
  const admin = await currentAdmin(supabase);

  if (!admin) return { ok: false, response: apiError(NOT_ADMIN, 403) };
  return { ok: true, supabase };
}

/**
 * Surfaces the message an admin_* function raised. Those functions phrase
 * their refusals in Thai for exactly this reason, so the admin reads a
 * sentence rather than a constraint name.
 */
export function rpcError(message: string) {
  return apiError(message.trim() || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 400);
}
