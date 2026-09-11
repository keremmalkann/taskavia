-- Central abuse controls: atomic rate limits, two-way blocking and moderation reports.

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  updated_at timestamptz not null default now()
);

alter table public.rate_limit_buckets enable row level security;
revoke all on public.rate_limit_buckets from anon, authenticated;

create or replace function public.consume_rate_limit(
  target_key text,
  max_attempts integer,
  window_seconds integer
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_bucket public.rate_limit_buckets%rowtype;
  elapsed_seconds integer;
begin
  if char_length(target_key) < 8 or max_attempts < 1 or window_seconds < 1 then
    raise exception 'Invalid rate limit configuration';
  end if;

  insert into public.rate_limit_buckets(bucket_key, attempts)
  values (target_key, 0)
  on conflict (bucket_key) do nothing;

  select * into current_bucket
  from public.rate_limit_buckets
  where bucket_key = target_key
  for update;

  elapsed_seconds := greatest(0, extract(epoch from (now() - current_bucket.window_started_at))::integer);
  if elapsed_seconds >= window_seconds then
    update public.rate_limit_buckets
    set attempts = 1, window_started_at = now(), updated_at = now()
    where bucket_key = target_key;
    return query select true, 0;
  elsif current_bucket.attempts >= max_attempts then
    return query select false, greatest(1, window_seconds - elapsed_seconds);
  else
    update public.rate_limit_buckets
    set attempts = attempts + 1, updated_at = now()
    where bucket_key = target_key;
    return query select true, 0;
  end if;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id, blocker_id);
alter table public.user_blocks enable row level security;

drop policy if exists "Users view own blocks" on public.user_blocks;
drop policy if exists "Users create own blocks" on public.user_blocks;
drop policy if exists "Users remove own blocks" on public.user_blocks;
create policy "Users view own blocks" on public.user_blocks for select to authenticated using (blocker_id = auth.uid());
create policy "Users create own blocks" on public.user_blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "Users remove own blocks" on public.user_blocks for delete to authenticated using (blocker_id = auth.uid());

create or replace function public.is_blocked_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = target_user_id)
       or (b.blocker_id = target_user_id and b.blocked_id = auth.uid())
  )
$$;

create or replace function public.is_conversation_blocked(target_proposal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select public.is_blocked_with(
      case when p.freelancer_id = auth.uid() then j.employer_id else p.freelancer_id end
    )
    from public.proposals p
    join public.jobs j on j.id = p.job_id
    where p.id = target_proposal_id
      and (p.freelancer_id = auth.uid() or j.employer_id = auth.uid())
  ), false)
$$;

revoke all on function public.is_blocked_with(uuid) from public;
revoke all on function public.is_conversation_blocked(uuid) from public;
grant execute on function public.is_blocked_with(uuid) to authenticated;
grant execute on function public.is_conversation_blocked(uuid) to authenticated;

create table if not exists public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete set null,
  subject_type text not null check (subject_type in ('user', 'job', 'message')),
  subject_id uuid not null,
  reason text not null check (reason in ('spam', 'fraud', 'harassment', 'inappropriate', 'other')),
  details text check (details is null or char_length(details) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 1000),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists safety_reports_status_created_idx on public.safety_reports(status, created_at desc);
create index if not exists safety_reports_reporter_idx on public.safety_reports(reporter_id, created_at desc);
alter table public.safety_reports enable row level security;

drop policy if exists "Users view own reports" on public.safety_reports;
create policy "Users view own reports" on public.safety_reports for select to authenticated using (reporter_id = auth.uid());

create or replace function public.submit_safety_report(
  target_subject_type text,
  target_subject_id uuid,
  report_reason text,
  report_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  report_id uuid;
  report_target_user uuid;
  limit_result record;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_subject_type not in ('user', 'job', 'message') then raise exception 'Invalid report subject'; end if;
  if report_reason not in ('spam', 'fraud', 'harassment', 'inappropriate', 'other') then raise exception 'Invalid report reason'; end if;
  if report_details is not null and char_length(trim(report_details)) not between 10 and 1000 then raise exception 'Invalid report details'; end if;

  select * into limit_result from public.consume_rate_limit('report:' || auth.uid()::text, 10, 86400);
  if not limit_result.allowed then raise exception 'rate_limit_exceeded'; end if;

  if target_subject_type = 'user' then
    select id into report_target_user from public.profiles where id = target_subject_id and id <> auth.uid();
  elsif target_subject_type = 'job' then
    select employer_id into report_target_user from public.jobs
    where id = target_subject_id and (status = 'open' or employer_id = auth.uid() or public.is_accepted_job_freelancer(id));
  else
    select case when m.sender_id = auth.uid() then null else m.sender_id end into report_target_user
    from public.messages m where m.id = target_subject_id and public.is_proposal_participant(m.proposal_id);
  end if;

  if report_target_user is null then raise exception 'Report subject is not available'; end if;

  insert into public.safety_reports(reporter_id, target_user_id, subject_type, subject_id, reason, details)
  values (auth.uid(), report_target_user, target_subject_type, target_subject_id, report_reason, nullif(trim(report_details), ''))
  returning id into report_id;
  return report_id;
end;
$$;

revoke all on function public.submit_safety_report(text, uuid, text, text) from public;
grant execute on function public.submit_safety_report(text, uuid, text, text) to authenticated;

create or replace function public.enforce_abuse_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare limit_result record;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if tg_table_name = 'messages' then
    select * into limit_result from public.consume_rate_limit('message:' || auth.uid()::text, 30, 60);
  elsif tg_table_name = 'proposals' then
    select * into limit_result from public.consume_rate_limit('proposal:' || auth.uid()::text, 10, 3600);
  else
    return new;
  end if;
  if not limit_result.allowed then raise exception 'rate_limit_exceeded'; end if;
  return new;
end;
$$;

revoke all on function public.enforce_abuse_rate_limit() from public;
drop trigger if exists messages_abuse_rate_limit on public.messages;
create trigger messages_abuse_rate_limit before insert on public.messages for each row execute function public.enforce_abuse_rate_limit();
drop trigger if exists proposals_abuse_rate_limit on public.proposals;
create trigger proposals_abuse_rate_limit before insert on public.proposals for each row execute function public.enforce_abuse_rate_limit();

drop policy if exists "Freelancers create proposals" on public.proposals;
create policy "Freelancers create proposals" on public.proposals for insert to authenticated with check (
  freelancer_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'freelancer')
  and exists (
    select 1 from public.jobs j
    where j.id = job_id and j.status = 'open' and j.employer_id <> auth.uid()
      and not public.is_blocked_with(j.employer_id)
  )
);

drop policy if exists "Conversation participants can send messages" on public.messages;
create policy "Conversation participants can send messages" on public.messages for insert to authenticated with check (
  sender_id = auth.uid()
  and public.is_proposal_participant(proposal_id)
  and not public.is_conversation_blocked(proposal_id)
);
