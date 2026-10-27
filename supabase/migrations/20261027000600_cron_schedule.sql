-- Automatic matching at register_close_at, part two: the schedule itself.
--
-- pg_cron fires a job that asks the app, over pg_net, to draw the match. The
-- drawing stays in lib/matching.ts rather than being reimplemented in SQL, so
-- there is one algorithm and one set of tests for it.
--
-- This migration needs the pg_cron and pg_net extensions. Supabase provides
-- both; a plain Postgres does not, which is why the test harness stops before
-- this file. Its behaviour is verified against a real Supabase instead.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- (Re)schedules the job for whatever register_close_at currently says.
create function public.schedule_auto_match()
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_close  timestamptz;
  v_url    text;
  v_secret text;
  v_when   text;
begin
  select s.register_close_at into v_close from public.settings s where s.id = 1;
  select c.match_url, c.cron_secret into v_url, v_secret from public.cron_config c where c.id = 1;

  -- Always clear the old job first, so changing the close time moves it
  -- rather than adding a second one.
  if exists (select 1 from cron.job where jobname = 'buddy-auto-match') then
    perform cron.unschedule('buddy-auto-match');
  end if;

  if v_close is null or v_url is null or v_secret is null then
    return 'not scheduled: cron_config is empty';
  end if;

  -- pg_cron reads its schedules in UTC.
  v_when := to_char(v_close at time zone 'UTC', 'MI HH24 DD MM') || ' *';

  -- The secret is read at fire time rather than written into the job body,
  -- so it lives in exactly one place.
  perform cron.schedule('buddy-auto-match', v_when, $job$
    select net.http_post(
      url := (select match_url from public.cron_config where id = 1),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select cron_secret from public.cron_config where id = 1)
      ),
      body := '{}'::jsonb
    );
  $job$);

  return format('scheduled at %s UTC', v_when);
end
$$;

revoke all on function public.schedule_auto_match() from public;


-- Changing the close time, or the target, moves the job with it.
create function public.reschedule_auto_match()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.schedule_auto_match();
  return null;
end
$$;

create trigger settings_reschedule_auto_match
  after update of register_close_at on public.settings
  for each row
  when (new.register_close_at is distinct from old.register_close_at)
  execute function public.reschedule_auto_match();

create trigger cron_config_reschedule_auto_match
  after insert or update on public.cron_config
  for each row execute function public.reschedule_auto_match();
