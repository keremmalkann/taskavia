-- Trust layer: phone status, admin-reviewed expertise/company badges and company details.

alter table public.profiles
  add column if not exists company_website text,
  add column if not exists company_industry text,
  add column if not exists company_size text,
  add column if not exists company_city text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_company_website_check') then
    alter table public.profiles add constraint profiles_company_website_check
      check (company_website is null or (char_length(company_website) <= 300 and company_website ~* '^https?://'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_company_size_check') then
    alter table public.profiles add constraint profiles_company_size_check
      check (company_size is null or company_size in ('1', '2-10', '11-50', '51-200', '201+'));
  end if;
end $$;

create table if not exists public.profile_phone_verifications (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  verified_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_verification_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('expertise', 'company')),
  label text not null check (char_length(label) between 2 and 120),
  evidence_url text check (evidence_url is null or (char_length(evidence_url) <= 500 and evidence_url ~* '^https?://')),
  evidence_note text not null check (char_length(evidence_note) between 20 and 1500),
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'approved', 'rejected', 'cancelled')),
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 1000),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profile_verification_one_open_idx
  on public.profile_verification_requests(profile_id, kind)
  where status in ('pending', 'reviewing');
create index if not exists profile_verification_queue_idx
  on public.profile_verification_requests(status, created_at);

create table if not exists public.profile_badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('expertise', 'company', 'phone')),
  label text not null check (char_length(label) between 2 and 120),
  verification_request_id uuid unique references public.profile_verification_requests(id) on delete set null,
  awarded_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz not null default now(),
  unique(profile_id, kind, label)
);

alter table public.profile_phone_verifications enable row level security;
alter table public.profile_verification_requests enable row level security;
alter table public.profile_badges enable row level security;

drop policy if exists "Users view own phone verification" on public.profile_phone_verifications;
create policy "Users view own phone verification" on public.profile_phone_verifications
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "Users view own verification requests" on public.profile_verification_requests;
create policy "Users view own verification requests" on public.profile_verification_requests
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "Public badges follow profile visibility" on public.profile_badges;
drop policy if exists "Members view profile badges" on public.profile_badges;
create policy "Public badges follow profile visibility" on public.profile_badges
  for select to anon using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.profile_visibility = 'public')
  );
create policy "Members view profile badges" on public.profile_badges
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = profile_id and (p.profile_visibility in ('public', 'members') or p.id = auth.uid()))
  );

create or replace function public.sync_phone_verification()
returns timestamptz
language plpgsql
security definer
set search_path = public, auth
as $$
declare confirmed_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select phone_confirmed_at into confirmed_at from auth.users where id = auth.uid();
  if confirmed_at is null then raise exception 'Phone is not verified'; end if;

  insert into public.profile_phone_verifications(profile_id, verified_at, updated_at)
  values (auth.uid(), confirmed_at, now())
  on conflict (profile_id) do update set verified_at = excluded.verified_at, updated_at = now();
  insert into public.profile_badges(profile_id, kind, label, verified_at)
  values (auth.uid(), 'phone', 'Telefon doğrulandı', confirmed_at)
  on conflict (profile_id, kind, label) do update set verified_at = excluded.verified_at;
  return confirmed_at;
end;
$$;

revoke all on function public.sync_phone_verification() from public;
grant execute on function public.sync_phone_verification() to authenticated;

create or replace function public.submit_profile_verification(
  request_kind text,
  request_label text,
  request_evidence_url text,
  request_evidence_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id uuid;
  current_profile public.profiles%rowtype;
  limit_result record;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into current_profile from public.profiles where id = auth.uid();
  if current_profile.id is null then raise exception 'Profile not found'; end if;
  if request_kind not in ('expertise', 'company') then raise exception 'Invalid verification kind'; end if;
  if char_length(trim(request_label)) not between 2 and 120 then raise exception 'Invalid label'; end if;
  if char_length(trim(request_evidence_note)) not between 20 and 1500 then raise exception 'Invalid evidence note'; end if;
  if nullif(trim(request_evidence_url), '') is not null and (char_length(trim(request_evidence_url)) > 500 or trim(request_evidence_url) !~* '^https?://') then
    raise exception 'Invalid evidence URL';
  end if;
  if request_kind = 'expertise' and (
    current_profile.role <> 'freelancer' or not exists (
      select 1 from unnest(current_profile.skills) skill where lower(trim(skill)) = lower(trim(request_label))
    )
  ) then raise exception 'Expertise must match profile skills'; end if;
  if request_kind = 'company' and (current_profile.role <> 'employer' or coalesce(char_length(trim(current_profile.company_name)), 0) < 2) then
    raise exception 'Company profile is incomplete';
  end if;

  select * into limit_result from public.consume_rate_limit('verification:' || auth.uid()::text, 5, 86400);
  if not limit_result.allowed then raise exception 'rate_limit_exceeded'; end if;

  insert into public.profile_verification_requests(profile_id, kind, label, evidence_url, evidence_note)
  values (auth.uid(), request_kind, trim(request_label), nullif(trim(request_evidence_url), ''), trim(request_evidence_note))
  returning id into request_id;
  return request_id;
end;
$$;

revoke all on function public.submit_profile_verification(text, text, text, text) from public;
grant execute on function public.submit_profile_verification(text, text, text, text) to authenticated;

create or replace function public.cancel_profile_verification(target_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profile_verification_requests
  set status = 'cancelled', updated_at = now()
  where id = target_request_id and profile_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Verification request cannot be cancelled'; end if;
end;
$$;

revoke all on function public.cancel_profile_verification(uuid) from public;
grant execute on function public.cancel_profile_verification(uuid) to authenticated;

create or replace function public.review_profile_verification(
  target_request_id uuid,
  decision text,
  reviewer_id uuid,
  review_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare request_record public.profile_verification_requests%rowtype;
begin
  if decision not in ('reviewing', 'approved', 'rejected') then raise exception 'Invalid decision'; end if;
  if not exists (select 1 from public.profiles where id = reviewer_id) then raise exception 'Reviewer not found'; end if;

  select * into request_record from public.profile_verification_requests
  where id = target_request_id and status in ('pending', 'reviewing') for update;
  if request_record.id is null then raise exception 'Verification request not available'; end if;

  update public.profile_verification_requests set
    status = decision,
    resolution_note = nullif(trim(review_note), ''),
    reviewed_by = reviewer_id,
    reviewed_at = case when decision in ('approved', 'rejected') then now() else null end,
    updated_at = now()
  where id = target_request_id;

  if decision = 'approved' then
    insert into public.profile_badges(profile_id, kind, label, verification_request_id, awarded_by)
    values (request_record.profile_id, request_record.kind, request_record.label, request_record.id, reviewer_id)
    on conflict (profile_id, kind, label) do update set
      verification_request_id = excluded.verification_request_id,
      awarded_by = excluded.awarded_by,
      verified_at = now();
  end if;
end;
$$;

revoke all on function public.review_profile_verification(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.review_profile_verification(uuid, text, uuid, text) to service_role;

create or replace function public.invalidate_changed_profile_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.company_name is distinct from new.company_name then
    delete from public.profile_badges where profile_id = new.id and kind = 'company';
  end if;
  if old.skills is distinct from new.skills then
    delete from public.profile_badges b
    where b.profile_id = new.id and b.kind = 'expertise'
      and not exists (select 1 from unnest(new.skills) skill where lower(trim(skill)) = lower(trim(b.label)));
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_invalidate_changed_badges on public.profiles;
create trigger profiles_invalidate_changed_badges
after update of company_name, skills on public.profiles
for each row execute function public.invalidate_changed_profile_badges();

revoke all on public.profile_phone_verifications from anon, authenticated;
revoke all on public.profile_verification_requests from anon, authenticated;
revoke all on public.profile_badges from anon, authenticated;
grant select on public.profile_phone_verifications to authenticated;
grant select on public.profile_verification_requests to authenticated;
grant select on public.profile_badges to anon, authenticated;
