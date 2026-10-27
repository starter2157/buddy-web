import type { SupabaseClient } from '@supabase/supabase-js';
import type { Faculty } from './faculty';
import type { Prefix } from './prefix';

/**
 * The reveal payload, as it reaches the page and its props.
 *
 * There is deliberately no budder field beyond the two hints. The database
 * function never returns one (see the reveal migration), and mapHomeView
 * below copies named fields rather than spreading the row, so a column added
 * to the function later cannot silently flow through to the client.
 */
export interface RevealedBuddy {
  nickname: string;
  prefix: Prefix;
  firstName: string;
  lastName: string;
  faculty: Faculty;
  year: number;
  instagram: string | null;
  message: string;
}

export interface HomeView {
  revealed: boolean;
  /** False when the participant was not part of the confirmed run. */
  hasBuddy: boolean;
  buddy: RevealedBuddy | null;
  /** Written by the participant's budder, who stays anonymous. */
  hint1: string | null;
  /** Null until hint2At has passed — the database withholds the text itself. */
  hint2: string | null;
  hint2At: Date | null;
}

export interface HomeViewRow {
  revealed: boolean;
  has_buddy: boolean;
  buddy_nickname: string | null;
  buddy_prefix: Prefix | null;
  buddy_first_name: string | null;
  buddy_last_name: string | null;
  buddy_faculty: Faculty | null;
  buddy_year: number | null;
  buddy_instagram: string | null;
  buddy_message: string | null;
  budder_hint_1: string | null;
  budder_hint_2: string | null;
  hint2_at: string | null;
}

const NOTHING_YET: HomeView = {
  revealed: false,
  hasBuddy: false,
  buddy: null,
  hint1: null,
  hint2: null,
  hint2At: null,
};

/** Pure: turns the database row into the shape the page renders. */
export function mapHomeView(row: HomeViewRow | null | undefined): HomeView {
  if (!row || !row.revealed) {
    return { ...NOTHING_YET, hint2At: row?.hint2_at ? new Date(row.hint2_at) : null };
  }

  const hasBuddy = row.has_buddy && row.buddy_nickname !== null;

  return {
    revealed: true,
    hasBuddy,
    buddy: hasBuddy
      ? {
          nickname: row.buddy_nickname!,
          prefix: row.buddy_prefix!,
          firstName: row.buddy_first_name!,
          lastName: row.buddy_last_name!,
          faculty: row.buddy_faculty!,
          year: row.buddy_year!,
          instagram: row.buddy_instagram,
          message: row.buddy_message ?? '',
        }
      : null,
    hint1: row.budder_hint_1,
    hint2: row.budder_hint_2,
    hint2At: row.hint2_at ? new Date(row.hint2_at) : null,
  };
}

/**
 * Calls the security-definer function that is the only route from a
 * participant's session to reveal data. The assignments table itself is
 * unreachable from the browser roles.
 */
export async function loadHomeView(supabase: SupabaseClient): Promise<HomeView> {
  const { data, error } = await supabase.rpc('get_home_view');
  if (error) throw new Error(`Could not load the reveal: ${error.message}`);

  const rows = (data ?? []) as HomeViewRow[];
  return mapHomeView(rows[0]);
}

export function instagramUrl(handle: string): string {
  return `https://instagram.com/${handle}`;
}
