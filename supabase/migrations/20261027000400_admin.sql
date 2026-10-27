-- Admin operations.
--
-- match_runs and assignments have RLS on with no policy and their privileges
-- revoked from the browser roles, which is what keeps participants out. Admins
-- therefore reach them the same way participants reach the reveal: through
-- security-definer functions that check the allowlist themselves. Nothing here
-- needs the service-role key.

create function public.admin_only()
returns void
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'this action is for admins only' using errcode = '42501';
  end if;
end
$$;

-- The run admins are working on: the draft if there is one, otherwise the
-- confirmed one.
create function public.admin_latest_run()
returns table (
  id           uuid,
  status       public.match_run_status,
  seed         bigint,
  stats        jsonb,
  created_at   timestamptz,
  confirmed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_only();

  return query
  select r.id, r.status, r.seed, r.stats, r.created_at, r.confirmed_at
  from public.match_runs r
  order by case r.status when 'draft' then 0 else 1 end, r.created_at desc
  limit 1;
end
$$;

-- Both sides of every link in a run. Student IDs are included: this is the
-- admin checking screen, and the brief asks for them here.
create function public.admin_pairs(p_run uuid)
returns table (
  cycle_position     integer,
  budder_id          uuid,
  budder_nickname    text,
  budder_prefix      public.name_prefix,
  budder_first_name  text,
  budder_last_name   text,
  budder_faculty     public.faculty,
  budder_year        smallint,
  budder_instagram   text,
  budder_student_id  text,
  buddy_id           uuid,
  buddy_nickname     text,
  buddy_prefix       public.name_prefix,
  buddy_first_name   text,
  buddy_last_name    text,
  buddy_faculty      public.faculty,
  buddy_year         smallint,
  buddy_instagram    text,
  buddy_student_id   text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_only();

  return query
  select a.position,
         bd.user_id, bd.nickname, bd.prefix, bd.first_name, bd.last_name,
         bd.faculty, bd.year, bd.instagram, bd.student_id,
         bu.user_id, bu.nickname, bu.prefix, bu.first_name, bu.last_name,
         bu.faculty, bu.year, bu.instagram, bu.student_id
  from public.assignments a
  join public.profiles bd on bd.user_id = a.budder_id
  join public.profiles bu on bu.user_id = a.buddy_id
  where a.run_id = p_run
  order by a.position;
end
$$;

-- Writes the cycle p_cycle into p_run: position i looks after position i + 1,
-- and the last looks after the first.
create function public.write_cycle(p_run uuid, p_cycle uuid[])
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_n integer := coalesce(array_length(p_cycle, 1), 0);
begin
  if v_n < 2 then
    raise exception 'a cycle needs at least two people, got %', v_n;
  end if;

  delete from public.assignments where run_id = p_run;

  insert into public.assignments (run_id, budder_id, buddy_id, position)
  select p_run, p_cycle[i], p_cycle[(i % v_n) + 1], i - 1
  from generate_series(1, v_n) as i;
end
$$;

-- Re-running replaces the draft. Everything happens in one statement's
-- transaction, so a failure cannot leave a run without its assignments.
create function public.admin_replace_draft_run(p_seed bigint, p_stats jsonb, p_cycle uuid[])
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run uuid;
begin
  perform public.admin_only();

  delete from public.match_runs where status = 'draft';

  insert into public.match_runs (status, seed, stats, created_by)
  values ('draft', p_seed, p_stats, auth.uid())
  returning id into v_run;

  perform public.write_cycle(v_run, p_cycle);
  return v_run;
end
$$;

-- Used by the swap action: rewrite a draft's cycle and its recomputed stats.
create function public.admin_set_draft_cycle(p_run uuid, p_cycle uuid[], p_stats jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_only();

  if not exists (select 1 from public.match_runs r where r.id = p_run and r.status = 'draft') then
    raise exception 'only a draft run can be changed';
  end if;

  perform public.write_cycle(p_run, p_cycle);
  update public.match_runs set stats = p_stats where id = p_run;
end
$$;

-- Confirming promotes the draft. Any previously confirmed run is removed, so
-- there is never more than one answer to "what do participants see".
create function public.admin_confirm_draft_run()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run uuid;
begin
  perform public.admin_only();

  delete from public.match_runs where status = 'confirmed';

  update public.match_runs
  set status = 'confirmed', confirmed_at = now()
  where status = 'draft'
  returning id into v_run;

  if v_run is null then
    raise exception 'there is no draft to confirm';
  end if;

  return v_run;
end
$$;

create function public.admin_save_schedule(
  p_open timestamptz,
  p_close timestamptz,
  p_reveal timestamptz,
  p_hint2 timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_only();

  -- Checked here as well as by the table constraint, so the admin sees a
  -- sentence rather than a constraint name.
  if p_open >= p_close then
    raise exception 'เวลาเปิดลงทะเบียนต้องมาก่อนเวลาปิด';
  end if;
  if p_close > p_reveal then
    raise exception 'เวลาปิดลงทะเบียนต้องไม่เกินเวลาประกาศผล';
  end if;
  if p_hint2 is not null and p_hint2 < p_reveal then
    raise exception 'เวลาเปิดคำใบ้ 2 ต้องไม่มาก่อนเวลาประกาศผล';
  end if;

  update public.settings
  set register_open_at = p_open,
      register_close_at = p_close,
      reveal_at = p_reveal,
      hint2_at = p_hint2
  where id = 1;
end
$$;

revoke all on function public.admin_only() from public;
revoke all on function public.write_cycle(uuid, uuid[]) from public;

revoke all on function public.admin_latest_run() from public;
revoke all on function public.admin_pairs(uuid) from public;
revoke all on function public.admin_replace_draft_run(bigint, jsonb, uuid[]) from public;
revoke all on function public.admin_set_draft_cycle(uuid, uuid[], jsonb) from public;
revoke all on function public.admin_confirm_draft_run() from public;
revoke all on function public.admin_save_schedule(timestamptz, timestamptz, timestamptz, timestamptz) from public;

grant execute on function public.admin_latest_run() to authenticated;
grant execute on function public.admin_pairs(uuid) to authenticated;
grant execute on function public.admin_replace_draft_run(bigint, jsonb, uuid[]) to authenticated;
grant execute on function public.admin_set_draft_cycle(uuid, uuid[], jsonb) to authenticated;
grant execute on function public.admin_confirm_draft_run() to authenticated;
grant execute on function public.admin_save_schedule(timestamptz, timestamptz, timestamptz, timestamptz) to authenticated;
