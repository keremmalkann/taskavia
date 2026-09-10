begin;

-- ============================================================================
-- İlan yönetimi (2026-09-09): taslak, kapatma, yeniden yayınlama, silme ve
-- düzenleme geçmişi.
--
-- Durum modeli:
--   draft    → yalnızca işveren görür; teklif alamaz; publish_job ile açılır.
--   open     → tekliflere açık (mevcut).
--   closed   → herkese görünür ama teklif alamaz; close_job ile girilir,
--              reopen_job ile tekrar açık olur. close_job bekleyen teklifleri
--              reddeder.
--   assigned / completed → değişmedi; yalnızca mevcut RPC'lerle girilir.
--   cancelled → değişmedi.
--
-- Silme: draft/open/closed ilanlar işveren tarafından silinebilir (cascade:
-- teklifler, mesajlar, değerlendirmeler). Aktif iş (assigned/completed) silinemez.
-- Durum geçişleri guard_job_status_change (20260909000000) nedeniyle yalnızca
-- security definer RPC'lerle yapılır.
-- ============================================================================

-- 1) Durum kısıtını genişlet (draft, closed).
do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.jobs'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%'
  order by conname
  limit 1;

  if constraint_name is null then
    raise exception 'jobs status constraint not found';
  end if;

  execute format('alter table public.jobs drop constraint %I', constraint_name);
end;
$$;

alter table public.jobs add constraint jobs_status_check
  check (status in ('draft', 'open', 'assigned', 'completed', 'cancelled', 'closed'));

-- 2) Mükerrer teklif kuralı: aynı ilan+freelancer için yalnızca bir aktif
--    (pending/accepted) teklif. Reddedilen/geri çekilen teklif sahibi, ilan
--    yeniden yayınlandığında tekrar deneyebilir.
alter table public.proposals drop constraint if exists proposals_job_id_freelancer_id_key;
drop index if exists proposals_job_freelancer_active_idx;
create unique index proposals_job_freelancer_active_idx
  on public.proposals(job_id, freelancer_id)
  where status in ('pending', 'accepted');

-- 3) Düzenleme geçmişi.
create table if not exists public.job_revisions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  skills text[] not null default '{}',
  budget_min numeric(12,2) not null,
  budget_max numeric(12,2) not null,
  deadline date,
  status text not null,
  changed_fields text[] not null default '{}',
  edited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists job_revisions_job_idx on public.job_revisions(job_id, created_at desc);

alter table public.job_revisions enable row level security;

drop policy if exists "Job owner can view revisions" on public.job_revisions;
create policy "Job owner can view revisions" on public.job_revisions
  for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.employer_id = auth.uid()));

-- Her içerik düzenlemesinde eski hali otomatik arşivle.
create or replace function public.archive_job_revision()
returns trigger
language plpgsql
as $$
declare
  changed text[] := '{}';
begin
  if old.title is distinct from new.title then changed := changed || 'title'; end if;
  if old.description is distinct from new.description then changed := changed || 'description'; end if;
  if old.category is distinct from new.category then changed := changed || 'category'; end if;
  if old.skills is distinct from new.skills then changed := changed || 'skills'; end if;
  if old.budget_min is distinct from new.budget_min then changed := changed || 'budget'; end if;
  if old.budget_max is distinct from new.budget_max then changed := changed || 'budget'; end if;
  if old.deadline is distinct from new.deadline then changed := changed || 'deadline'; end if;

  if array_length(changed, 1) is not null then
    insert into public.job_revisions (job_id, title, description, category, skills, budget_min, budget_max, deadline, status, changed_fields, edited_by)
    values (old.id, old.title, old.description, old.category, old.skills, old.budget_min, old.budget_max, old.deadline, old.status, changed, auth.uid());
  end if;

  return new;
end;
$$;

drop trigger if exists jobs_archive_revision on public.jobs;
create trigger jobs_archive_revision
before update on public.jobs
for each row execute function public.archive_job_revision();

-- 4) Durum RPC'leri (OCC korumalı; guard trigger security definer'da serbest).

-- Taslağı yayınla: draft → open.
create or replace function public.publish_job(
  target_job_id uuid,
  expected_updated_at timestamptz
) returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.jobs
  set status = 'open'
  where id = target_job_id
    and employer_id = auth.uid()
    and status = 'draft'
    and updated_at = expected_updated_at;

  if not found then
    raise exception 'Job cannot be published';
  end if;
end;
$$;

-- İlanı tekliflere kapat: open → closed; bekleyen teklifler reddedilir.
create or replace function public.close_job(
  target_job_id uuid,
  expected_updated_at timestamptz
) returns void
language plpgsql
security definer set search_path = public
as $$
declare
  locked_job public.jobs;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into locked_job
  from public.jobs
  where id = target_job_id
  for update;

  if locked_job.id is null
    or locked_job.employer_id <> auth.uid()
    or locked_job.status <> 'open'
    or locked_job.updated_at <> expected_updated_at
  then
    raise exception 'Job cannot be closed';
  end if;

  update public.proposals set status = 'rejected'
  where job_id = locked_job.id and status = 'pending';

  update public.jobs set status = 'closed' where id = locked_job.id;
end;
$$;

-- Kapatılan ilanı yeniden yayınla: closed → open.
create or replace function public.reopen_job(
  target_job_id uuid,
  expected_updated_at timestamptz
) returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.jobs
  set status = 'open'
  where id = target_job_id
    and employer_id = auth.uid()
    and status = 'closed'
    and updated_at = expected_updated_at;

  if not found then
    raise exception 'Job cannot be reopened';
  end if;
end;
$$;

revoke all on function public.publish_job(uuid, timestamptz) from public;
revoke all on function public.close_job(uuid, timestamptz) from public;
revoke all on function public.reopen_job(uuid, timestamptz) from public;
grant execute on function public.publish_job(uuid, timestamptz) to authenticated;
grant execute on function public.close_job(uuid, timestamptz) to authenticated;
grant execute on function public.reopen_job(uuid, timestamptz) to authenticated;

-- 5) Görünürlük: kapatılan ilanlar herkese görünür (teklif verilemez);
--    taslaklar yalnızca işverene.
drop policy if exists "Open jobs and participant jobs are visible" on public.jobs;
create policy "Public and participant jobs are visible" on public.jobs
  for select to authenticated
  using (
    status in ('open', 'closed') or employer_id = auth.uid() or public.is_accepted_job_freelancer(id)
  );

-- 6) Silme: yalnızca sahibi ve aktif olmayan durumlar.
drop policy if exists "Employers delete inactive own jobs" on public.jobs;
create policy "Employers delete inactive own jobs" on public.jobs
  for delete to authenticated
  using (employer_id = auth.uid() and status in ('draft', 'open', 'closed'));

notify pgrst, 'reload schema';
commit;
