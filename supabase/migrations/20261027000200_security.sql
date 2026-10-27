-- Row Level Security for every table, plus the server-side field lock.
--
-- The shape of the policy set is deliberate:
--   profiles      a participant reads and writes ONLY their own row;
--   settings      readable by anyone, writable only by the service role;
--   match_runs    RLS on and NO policy at all, so participants cannot read
--   assignments   who is matched with whom under any circumstances. The only
--                 path to reveal data is public.get_home_view(), which returns
--                 a fixed shape and never includes the budder's identity.
--   admins        same: RLS on, no policy.

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

comment on function public.is_admin() is
  'True when the caller''s JWT email is on the admins allowlist. Security definer so it can read a table that has no read policy.';

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;


-- ---------------------------------------------------------------------------
-- Locked fields once registration closes (§5 of the brief)
-- ---------------------------------------------------------------------------

-- prefix, student_id, faculty and year stop being editable at register_close_at.
-- The API enforces this too; keeping it in the database means a missed check
-- upstream still cannot change the data the matcher already ran on.
create function public.profiles_enforce_locked_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_close timestamptz;
begin
  -- Service-role calls have no auth.uid(); admins may still correct data
  -- during the checking window.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  select s.register_close_at into v_close from public.settings s where s.id = 1;
  if v_close is null or now() < v_close then
    return new;
  end if;

  if new.prefix is distinct from old.prefix
     or new.student_id is distinct from old.student_id
     or new.faculty is distinct from old.faculty
     or new.year is distinct from old.year
  then
    raise exception 'registration has closed: prefix, student id, faculty and year are locked'
      using errcode = 'check_violation';
  end if;

  return new;
end
$$;

create trigger profiles_locked_fields_before_update
  before update on public.profiles
  for each row execute function public.profiles_enforce_locked_fields();


-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

grant select, insert, update on public.profiles to authenticated;
revoke all on public.profiles from anon;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = user_id);

create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.is_admin());

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No delete policy: participants cannot remove their row from the app.


-- ---------------------------------------------------------------------------
-- settings — public schedule, service-role writes
-- ---------------------------------------------------------------------------

alter table public.settings enable row level security;

grant select on public.settings to anon, authenticated;
revoke insert, update, delete on public.settings from anon, authenticated;

create policy settings_readable_by_everyone on public.settings
  for select to anon, authenticated
  using (true);


-- ---------------------------------------------------------------------------
-- match_runs, assignments, admins — service role only
-- ---------------------------------------------------------------------------

alter table public.match_runs enable row level security;
alter table public.assignments enable row level security;
alter table public.admins enable row level security;

-- RLS with no policy already denies every row; revoking the privilege as well
-- means a future policy added by mistake still cannot open these up to the
-- browser-facing roles.
revoke all on public.match_runs from anon, authenticated;
revoke all on public.assignments from anon, authenticated;
revoke all on public.admins from anon, authenticated;
