create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'freelancer' check (role in ('freelancer', 'employer')),
  full_name text not null default '',
  company_name text,
  title text,
  bio text,
  skills text[] not null default '{}',
  hourly_rate numeric(12,2) check (hourly_rate is null or hourly_rate >= 0),
  experience_years integer check (experience_years is null or experience_years >= 0),
  avatar_url text,
  portfolio_url text,
  stripe_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 100),
  description text,
  file_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 140),
  description text not null check (char_length(description) between 20 and 5000),
  category text not null,
  skills text[] not null default '{}',
  budget_min numeric(12,2) not null check (budget_min >= 0),
  budget_max numeric(12,2) not null check (budget_max >= budget_min),
  deadline date,
  status text not null default 'open' check (status in ('open', 'assigned', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  price numeric(12,2) not null check (price > 0),
  duration_days integer not null check (duration_days > 0),
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, freelancer_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references public.proposals(id) on delete restrict,
  employer_id uuid not null references public.profiles(id) on delete restrict,
  freelancer_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  platform_fee numeric(12,2) not null default 0 check (platform_fee >= 0),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_transfer_id text unique,
  status text not null default 'pending' check (status in ('pending', 'funded', 'released', 'refunded', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1500),
  created_at timestamptz not null default now(),
  unique(job_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);

create index if not exists jobs_status_created_idx on public.jobs(status, created_at desc);
create index if not exists jobs_category_idx on public.jobs(category);
create index if not exists proposals_job_idx on public.proposals(job_id, status);
create index if not exists proposals_freelancer_idx on public.proposals(freelancer_id, status);
create index if not exists messages_proposal_created_idx on public.messages(proposal_id, created_at);
create index if not exists reviews_reviewee_idx on public.reviews(reviewee_id, created_at desc);

create or replace function public.accept_proposal(target_proposal_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_job_id uuid;
begin
  select p.job_id into target_job_id
  from public.proposals p
  join public.jobs j on j.id = p.job_id
  where p.id = target_proposal_id and j.employer_id = auth.uid() and j.status = 'open';

  if target_job_id is null then
    raise exception 'Proposal cannot be accepted';
  end if;

  update public.proposals set status = case when id = target_proposal_id then 'accepted' else 'rejected' end
  where job_id = target_job_id and status = 'pending';
  update public.jobs set status = 'assigned' where id = target_job_id;
end;
$$;

create or replace function public.complete_job(target_job_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.jobs
  set status = 'completed'
  where id = target_job_id and employer_id = auth.uid() and status = 'assigned';

  if not found then
    raise exception 'Job cannot be completed';
  end if;
end;
$$;

create or replace function public.is_job_employer(target_job_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.jobs where id = target_job_id and employer_id = auth.uid()) $$;

create or replace function public.is_accepted_job_freelancer(target_job_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.proposals where job_id = target_job_id and freelancer_id = auth.uid() and status = 'accepted') $$;

create or replace function public.is_proposal_participant(target_proposal_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.proposals p join public.jobs j on j.id = p.job_id
    where p.id = target_proposal_id and p.status = 'accepted' and (p.freelancer_id = auth.uid() or j.employer_id = auth.uid())
  )
$$;

create or replace function public.can_review(target_job_id uuid, target_reviewer_id uuid, target_reviewee_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.jobs j join public.proposals p on p.job_id = j.id and p.status = 'accepted'
    where j.id = target_job_id and j.status = 'completed' and target_reviewer_id = auth.uid()
      and ((j.employer_id = target_reviewer_id and p.freelancer_id = target_reviewee_id)
        or (p.freelancer_id = target_reviewer_id and j.employer_id = target_reviewee_id))
  )
$$;

revoke all on function public.is_job_employer(uuid) from public;
revoke all on function public.is_accepted_job_freelancer(uuid) from public;
revoke all on function public.is_proposal_participant(uuid) from public;
revoke all on function public.can_review(uuid, uuid, uuid) from public;
grant execute on function public.is_job_employer(uuid) to authenticated;
grant execute on function public.is_accepted_job_freelancer(uuid) to authenticated;
grant execute on function public.is_proposal_participant(uuid) to authenticated;
grant execute on function public.can_review(uuid, uuid, uuid) to authenticated;

grant execute on function public.accept_proposal(uuid) to authenticated;
grant execute on function public.complete_job(uuid) to authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.protect_profile_role()
returns trigger language plpgsql as $$
begin
  if old.role <> new.role then raise exception 'Profile role cannot be changed'; end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles for each row execute function public.protect_profile_role();
drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at before update on public.jobs for each row execute function public.set_updated_at();
drop trigger if exists proposals_set_updated_at on public.proposals;
create trigger proposals_set_updated_at before update on public.proposals for each row execute function public.set_updated_at();
drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when new.raw_user_meta_data->>'role' = 'employer' then 'employer' else 'freelancer' end,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.profiles (id, role, full_name)
select id,
  case when raw_user_meta_data->>'role' = 'employer' then 'employer' else 'freelancer' end,
  coalesce(raw_user_meta_data->>'full_name', split_part(coalesce(email, ''), '@', 1))
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.jobs enable row level security;
alter table public.proposals enable row level security;
alter table public.messages enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "Authenticated users can view profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Authenticated users can view portfolio" on public.portfolio_items;
drop policy if exists "Freelancers manage own portfolio" on public.portfolio_items;
drop policy if exists "Open jobs and participant jobs are visible" on public.jobs;
drop policy if exists "Employers create jobs" on public.jobs;
drop policy if exists "Employers update own jobs" on public.jobs;
drop policy if exists "Proposal participants can view" on public.proposals;
drop policy if exists "Freelancers create proposals" on public.proposals;
drop policy if exists "Freelancers withdraw proposals" on public.proposals;
drop policy if exists "Employers manage received proposals" on public.proposals;
drop policy if exists "Conversation participants can view messages" on public.messages;
drop policy if exists "Conversation participants can send messages" on public.messages;
drop policy if exists "Payment participants can view" on public.payments;
drop policy if exists "Authenticated users can view reviews" on public.reviews;
drop policy if exists "Completed job participants can review" on public.reviews;

create policy "Authenticated users can view profiles" on public.profiles for select to authenticated using (true);
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

create policy "Authenticated users can view portfolio" on public.portfolio_items for select to authenticated using (true);
create policy "Freelancers manage own portfolio" on public.portfolio_items for all to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "Open jobs and participant jobs are visible" on public.jobs for select to authenticated using (
  status = 'open' or employer_id = auth.uid() or public.is_accepted_job_freelancer(id)
);
create policy "Employers create jobs" on public.jobs for insert to authenticated with check (
  employer_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'employer')
);
create policy "Employers update own jobs" on public.jobs for update to authenticated using (employer_id = auth.uid()) with check (employer_id = auth.uid());

create policy "Proposal participants can view" on public.proposals for select to authenticated using (
  freelancer_id = auth.uid() or public.is_job_employer(job_id)
);
create policy "Freelancers create proposals" on public.proposals for insert to authenticated with check (
  freelancer_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'freelancer')
  and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open' and j.employer_id <> auth.uid())
);
create policy "Freelancers withdraw proposals" on public.proposals for update to authenticated using (freelancer_id = auth.uid()) with check (freelancer_id = auth.uid() and status = 'withdrawn');
create policy "Employers manage received proposals" on public.proposals for update to authenticated using (
  public.is_job_employer(job_id)
) with check (
  public.is_job_employer(job_id)
);

create policy "Conversation participants can view messages" on public.messages for select to authenticated using (
  public.is_proposal_participant(proposal_id)
);
create policy "Conversation participants can send messages" on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and public.is_proposal_participant(proposal_id)
);

create policy "Payment participants can view" on public.payments for select to authenticated using (employer_id = auth.uid() or freelancer_id = auth.uid());

create policy "Authenticated users can view reviews" on public.reviews for select to authenticated using (true);
create policy "Completed job participants can review" on public.reviews for insert to authenticated with check (
  public.can_review(job_id, reviewer_id, reviewee_id)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolios', 'portfolios', true, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Portfolio files are public" on storage.objects;
drop policy if exists "Users upload own portfolio files" on storage.objects;
drop policy if exists "Users update own portfolio files" on storage.objects;
drop policy if exists "Users delete own portfolio files" on storage.objects;

create policy "Portfolio files are public" on storage.objects for select using (bucket_id = 'portfolios');
create policy "Users upload own portfolio files" on storage.objects for insert to authenticated with check (
  bucket_id = 'portfolios' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "Users update own portfolio files" on storage.objects for update to authenticated using (
  bucket_id = 'portfolios' and (storage.foldername(name))[1] = auth.uid()::text
) with check (bucket_id = 'portfolios' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own portfolio files" on storage.objects for delete to authenticated using (
  bucket_id = 'portfolios' and (storage.foldername(name))[1] = auth.uid()::text
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
