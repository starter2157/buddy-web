-- Automatic matching at register_close_at, part one: what the job asks for.
--
-- Split from the scheduling half deliberately. Nothing here needs pg_cron, so
-- this migration runs anywhere and the idempotency rule below is covered by
-- the test suite.

-- Where to call and with what secret. One row, filled in after deploying;
-- until then the job simply is not scheduled.
create table public.cron_config (
  id          smallint primary key default 1 check (id = 1),
  match_url   text,
  cron_secret text,
  updated_at  timestamptz not null default now()
);

comment on table public.cron_config is
  'Target for the auto-match cron job. Set it with the SQL editor or the service role; never readable from the browser.';

alter table public.cron_config enable row level security;
revoke all on public.cron_config from anon, authenticated;

insert into public.cron_config (id) values (1) on conflict (id) do nothing;


-- Creates the draft run the cron job asks for. Idempotent by design: if any
-- run already exists the call does nothing and reports it, so a retry, a
-- duplicate fire or a manual draw beforehand cannot produce a second match.
create function public.cron_create_draft_run(p_seed bigint, p_stats jsonb, p_cycle uuid[])
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run uuid;
begin
  if exists (select 1 from public.match_runs) then
    return null;
  end if;

  insert into public.match_runs (status, seed, stats)
  values ('draft', p_seed, p_stats)
  returning id into v_run;

  perform public.write_cycle(v_run, p_cycle);
  return v_run;
end
$$;

revoke all on function public.cron_create_draft_run(bigint, jsonb, uuid[]) from public;
grant execute on function public.cron_create_draft_run(bigint, jsonb, uuid[]) to service_role;
