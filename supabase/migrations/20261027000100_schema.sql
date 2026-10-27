-- Buddy–Budder: tables, enums and the invariants the database enforces itself.
--
-- Two rules are worth calling out because they are enforced here rather than
-- only in the API:
--   * a profile's faculty must equal the faculty encoded in its student ID;
--   * a profile's email must be that student ID at the university domain.
-- Both are CHECK constraints, so no API bug can write a row that breaks them.

create type public.faculty as enum ('engineering', 'science', 'pharmacy');
create type public.name_prefix as enum ('นาย', 'นางสาว', 'ไม่ระบุ');
create type public.match_run_status as enum ('draft', 'confirmed');

-- The last two digits of a Chulalongkorn student ID encode the faculty.
-- Returns null for a faculty that is not part of the camp.
create function public.faculty_from_student_id(student_id text)
returns public.faculty
language sql
immutable
as $$
  select case right(student_id, 2)
    when '21' then 'engineering'::public.faculty
    when '23' then 'science'::public.faculty
    when '33' then 'pharmacy'::public.faculty
  end
$$;

comment on function public.faculty_from_student_id(text) is
  'Faculty encoded in the last two digits of a student ID: 21 engineering, 23 science, 33 pharmacy.';


-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  email             text not null,
  prefix            public.name_prefix not null,
  first_name        text not null,
  last_name         text not null,
  nickname          text not null,
  student_id        text not null unique,
  faculty           public.faculty not null,
  year              smallint not null,
  instagram         text,
  message_to_budder text not null,
  hint_1            text not null,
  hint_2            text not null,
  consented_at      timestamptz not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint profiles_student_id_format check (student_id ~ '^[0-9]{10}$'),
  constraint profiles_year_range check (year between 1 and 6),

  -- The email local part is the student ID, so the two can never disagree.
  constraint profiles_email_matches_student_id
    check (email = student_id || '@student.chula.ac.th'),

  -- Faculty is derived, never chosen. A row whose faculty does not match its
  -- student ID cannot exist, and an unparticipating faculty code yields null
  -- here, which fails the comparison.
  constraint profiles_faculty_is_derived
    check (faculty = public.faculty_from_student_id(student_id)),

  -- Stored without the leading '@'.
  constraint profiles_instagram_format
    check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),

  constraint profiles_required_text_not_blank check (
    btrim(first_name) <> ''
    and btrim(last_name) <> ''
    and btrim(nickname) <> ''
    and btrim(message_to_budder) <> ''
    and btrim(hint_1) <> ''
    and btrim(hint_2) <> ''
  )
);

comment on table public.profiles is
  'One row per participant. Student IDs are never exposed to other participants.';

create index profiles_faculty_idx on public.profiles (faculty);


-- Normalises the row and derives the faculty, so neither the client nor the
-- API can set `faculty` directly.
create function public.profiles_normalise()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.email := lower(btrim(new.email));
  new.first_name := btrim(new.first_name);
  new.last_name := btrim(new.last_name);
  new.nickname := btrim(new.nickname);
  new.student_id := btrim(new.student_id);

  new.instagram := nullif(btrim(ltrim(btrim(coalesce(new.instagram, '')), '@')), '');

  new.faculty := public.faculty_from_student_id(new.student_id);
  if new.faculty is null then
    raise exception 'student id % is not from a participating faculty', new.student_id
      using errcode = 'check_violation';
  end if;

  new.updated_at := now();
  return new;
end
$$;

create trigger profiles_normalise_before_write
  before insert or update on public.profiles
  for each row execute function public.profiles_normalise();


-- ---------------------------------------------------------------------------
-- settings — a single row holding the schedule
-- ---------------------------------------------------------------------------

create table public.settings (
  id                smallint primary key default 1 check (id = 1),
  register_open_at  timestamptz not null,
  register_close_at timestamptz not null,
  reveal_at         timestamptz not null,
  -- Null until the team decides when the second hint opens.
  hint2_at          timestamptz,
  updated_at        timestamptz not null default now(),

  constraint settings_schedule_in_order
    check (register_open_at < register_close_at and register_close_at <= reveal_at),
  constraint settings_hint2_after_reveal
    check (hint2_at is null or hint2_at >= reveal_at)
);

comment on table public.settings is
  'Single row (id = 1). All phase decisions read these times against the server clock.';

create function public.settings_touch()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger settings_touch_before_update
  before update on public.settings
  for each row execute function public.settings_touch();

-- Defaults in Asia/Bangkok, stored as timestamptz. Admins can edit them.
insert into public.settings (id, register_open_at, register_close_at, reveal_at, hint2_at)
values (
  1,
  timestamptz '2026-10-30 00:00:00+07',
  timestamptz '2026-11-06 23:59:00+07',
  timestamptz '2026-11-07 18:00:00+07',
  null
)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- match_runs / assignments
-- ---------------------------------------------------------------------------

create table public.match_runs (
  id           uuid primary key default gen_random_uuid(),
  status       public.match_run_status not null default 'draft',
  seed         bigint not null,
  stats        jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null,
  confirmed_at timestamptz,

  constraint match_runs_confirmed_has_timestamp
    check (status <> 'confirmed' or confirmed_at is not null)
);

-- At most one draft and at most one confirmed run exist at a time. Re-running
-- replaces the draft; confirming a corrected run has to demote the old one
-- explicitly, which keeps "what participants see" unambiguous.
create unique index match_runs_single_draft
  on public.match_runs (status) where status = 'draft';
create unique index match_runs_single_confirmed
  on public.match_runs (status) where status = 'confirmed';

create table public.assignments (
  run_id    uuid not null references public.match_runs (id) on delete cascade,
  budder_id uuid not null references public.profiles (user_id) on delete cascade,
  buddy_id  uuid not null references public.profiles (user_id) on delete cascade,
  -- Position in the cycle, so admins can reconstruct and reorder it.
  position  integer not null,

  primary key (run_id, budder_id),
  constraint assignments_not_self check (budder_id <> buddy_id)
);

comment on table public.assignments is
  'One row per cycle link: budder_id looks after buddy_id.';

-- Everyone is exactly one budder and exactly one buddy within a run.
create unique index assignments_single_buddy on public.assignments (run_id, buddy_id);
create unique index assignments_single_position on public.assignments (run_id, position);


-- ---------------------------------------------------------------------------
-- admins — an email allowlist checked server-side
-- ---------------------------------------------------------------------------

create table public.admins (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now(),

  constraint admins_email_is_lowercase check (email = lower(email))
);

comment on table public.admins is
  'Allowlist for /admin and every admin API. Managed out of band, never from the app.';
