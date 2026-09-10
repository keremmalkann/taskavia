begin;

-- ============================================================================
-- Uçtan uca akış bütünlüğü (2026-09-09)
-- Amaç: jobs/proposals durum geçişleri yalnızca doğrulanmış security definer
-- RPC'ler (accept_proposal_checked, reject_pending_proposal,
-- change_pending_proposal, complete_job) veya service role (yönetim) üzerinden
-- yapılabilir. İstemci tarafından doğrudan UPDATE ile durum atlatılamaz.
-- ============================================================================

-- 1) Teklifler: işverenin sınırsız UPDATE politikasını kaldır.
--    Öncesinde (migration 3) freelancer tarafı da kaldırılmıştı; artık teklif
--    üzerindeki tek mutasyon yolu RPC'ler ve service role'dür.
drop policy if exists "Employers manage received proposals" on public.proposals;

-- 2) jobs: durum değişikliği yalnızca güvenilir bağlamlara açık.
--    - Doğrudan istemci UPDATE'i: current_user = 'authenticated' -> engellenir.
--    - Security definer RPC'ler (sahip postgres olarak çalışır): serbest.
--    - Yönetim/servis rolü (service_role) ve migration/backfill: serbest.
--    Aynı durumda kalan alan düzenlemeleri (örn. editJob) etkilenmez.
create or replace function public.guard_job_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if current_user = 'authenticated' then
    raise exception 'Job status cannot be changed directly';
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_guard_status_change on public.jobs;
create trigger jobs_guard_status_change
before update on public.jobs
for each row execute function public.guard_job_status_change();

-- 3) Teklif reddi: accept_proposal_checked ile aynı kilit sırası (önce iş,
--    sonra teklif) ve iyimser eşzamanlılık (OCC) koruması. Karar anında
--    freelancer teklifi düzenlemiş/geri çekmişse red işlemi başarısız olur.
create or replace function public.reject_pending_proposal(
  target_proposal_id uuid,
  expected_updated_at timestamptz
) returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_job uuid;
  p public.proposals;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select job_id into target_job
  from public.proposals
  where id = target_proposal_id;

  perform 1 from public.jobs where id = target_job for update;

  select * into p
  from public.proposals
  where id = target_proposal_id
  for update;

  if p.id is null
    or p.status <> 'pending'
    or expected_updated_at is null
    or p.updated_at <> expected_updated_at
    or not exists (
      select 1 from public.jobs j
      where j.id = p.job_id and j.employer_id = auth.uid() and j.status = 'open'
    )
  then
    raise exception 'Proposal cannot be rejected';
  end if;

  update public.proposals set status = 'rejected' where id = p.id;
end;
$$;

revoke all on function public.reject_pending_proposal(uuid, timestamptz) from public;
grant execute on function public.reject_pending_proposal(uuid, timestamptz) to authenticated;

notify pgrst, 'reload schema';
commit;
