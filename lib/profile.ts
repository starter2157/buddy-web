import type { SupabaseClient } from '@supabase/supabase-js';
import type { Faculty } from './faculty';
import type { Schedule } from './phase';
import type { Prefix } from './prefix';

export interface Profile {
  userId: string;
  email: string;
  prefix: Prefix;
  firstName: string;
  lastName: string;
  nickname: string;
  studentId: string;
  faculty: Faculty;
  year: number;
  instagram: string | null;
  messageToBudder: string;
  hint1: string;
  hint2: string;
}

const PROFILE_COLUMNS =
  'user_id, email, prefix, first_name, last_name, nickname, student_id, faculty, year, instagram, message_to_budder, hint_1, hint_2';

interface ProfileRow {
  user_id: string;
  email: string;
  prefix: Prefix;
  first_name: string;
  last_name: string;
  nickname: string;
  student_id: string;
  faculty: Faculty;
  year: number;
  instagram: string | null;
  message_to_budder: string;
  hint_1: string;
  hint_2: string;
}

function toProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    email: row.email,
    prefix: row.prefix,
    firstName: row.first_name,
    lastName: row.last_name,
    nickname: row.nickname,
    studentId: row.student_id,
    faculty: row.faculty,
    year: row.year,
    instagram: row.instagram,
    messageToBudder: row.message_to_budder,
    hint1: row.hint_1,
    hint2: row.hint_2,
  };
}

/** The signed-in participant's own row, or null if they have not registered. */
export async function loadProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle<ProfileRow>();

  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return data ? toProfile(data) : null;
}

interface SettingsRow {
  register_open_at: string;
  register_close_at: string;
  reveal_at: string;
  hint2_at: string | null;
}

/** The single settings row, as dates. */
export async function loadSchedule(supabase: SupabaseClient): Promise<Schedule> {
  const { data, error } = await supabase
    .from('settings')
    .select('register_open_at, register_close_at, reveal_at, hint2_at')
    .eq('id', 1)
    .single<SettingsRow>();

  if (error || !data) {
    throw new Error(`Could not load the schedule: ${error?.message ?? 'no settings row'}`);
  }

  return {
    registerOpenAt: new Date(data.register_open_at),
    registerCloseAt: new Date(data.register_close_at),
    revealAt: new Date(data.reveal_at),
    hint2At: data.hint2_at ? new Date(data.hint2_at) : null,
  };
}
