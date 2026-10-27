-- public.get_home_view() — the ONLY path from a participant's session to
-- reveal data.
--
-- Privacy contract, enforced here rather than in the application:
--   * Nothing is returned before reveal_at, and not until a run is confirmed.
--   * The buddy (the person the caller looks after) is returned without their
--     student ID.
--   * The budder (the person who looks after the caller) is read through a
--     query that selects their hint columns and NOTHING ELSE — no id, no name,
--     no faculty. Their identity never enters a variable, let alone a result.
--   * hint_2 stays in the database until hint2_at has passed.
--
-- match_runs and assignments have RLS on with no policy, so this function is
-- the only way those tables can be reached from a browser session at all.

create function public.get_home_view()
returns table (
  revealed         boolean,
  has_buddy        boolean,
  buddy_nickname   text,
  buddy_prefix     public.name_prefix,
  buddy_first_name text,
  buddy_last_name  text,
  buddy_faculty    public.faculty,
  buddy_year       smallint,
  buddy_instagram  text,
  buddy_message    text,
  budder_hint_1    text,
  budder_hint_2    text,
  hint2_at         timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user       uuid := auth.uid();
  v_reveal_at  timestamptz;
  v_hint2_at   timestamptz;
  v_run        uuid;

  v_buddy_nickname   text;
  v_buddy_prefix     public.name_prefix;
  v_buddy_first_name text;
  v_buddy_last_name  text;
  v_buddy_faculty    public.faculty;
  v_buddy_year       smallint;
  v_buddy_instagram  text;
  v_buddy_message    text;

  v_budder_hint_1 text;
  v_budder_hint_2 text;
begin
  if v_user is null then
    return;
  end if;

  select s.reveal_at, s.hint2_at
    into v_reveal_at, v_hint2_at
  from public.settings s
  where s.id = 1;

  select r.id into v_run
  from public.match_runs r
  where r.status = 'confirmed'
  limit 1;

  -- Before the reveal, or before a run is confirmed, there is nothing to say.
  if v_reveal_at is null or now() < v_reveal_at or v_run is null then
    return query
      select false, false,
             null::text, null::public.name_prefix, null::text, null::text,
             null::public.faculty, null::smallint, null::text, null::text,
             null::text, null::text, v_hint2_at;
    return;
  end if;

  -- The buddy: public fields only. student_id is not selected.
  select p.nickname, p.prefix, p.first_name, p.last_name,
         p.faculty, p.year, p.instagram, p.message_to_budder
    into v_buddy_nickname, v_buddy_prefix, v_buddy_first_name, v_buddy_last_name,
         v_buddy_faculty, v_buddy_year, v_buddy_instagram, v_buddy_message
  from public.assignments a
  join public.profiles p on p.user_id = a.buddy_id
  where a.run_id = v_run
    and a.budder_id = v_user;

  -- The budder: hints only. Adding any identifying column to this SELECT would
  -- be the bug the privacy tests exist to catch.
  select p.hint_1, p.hint_2
    into v_budder_hint_1, v_budder_hint_2
  from public.assignments a
  join public.profiles p on p.user_id = a.budder_id
  where a.run_id = v_run
    and a.buddy_id = v_user;

  return query
    select true,
           v_buddy_nickname is not null,
           v_buddy_nickname,
           v_buddy_prefix,
           v_buddy_first_name,
           v_buddy_last_name,
           v_buddy_faculty,
           v_buddy_year,
           v_buddy_instagram,
           v_buddy_message,
           v_budder_hint_1,
           case when v_hint2_at is not null and now() >= v_hint2_at
                then v_budder_hint_2
           end,
           v_hint2_at;
end
$$;

comment on function public.get_home_view() is
  'Fixed-shape reveal payload for the signed-in participant. Never returns the budder''s identity, and never returns hint 2 before hint2_at.';

revoke all on function public.get_home_view() from public;
grant execute on function public.get_home_view() to authenticated;
