import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { supabaseServiceRoleKey, supabaseUrl } from '@/lib/env';

/**
 * Service-role client: bypasses RLS. Only for admin APIs and the cron job,
 * and only ever on the server — the `server-only` import above turns an
 * accidental client import into a build error rather than a leaked key.
 *
 * It holds no session and persists nothing, so it can never be mistaken for
 * the caller's own client.
 */
export function createAdminClient() {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
