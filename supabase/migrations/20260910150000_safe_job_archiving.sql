begin;

-- Yayınlanmış ilanlar artık kalıcı silinmez; ilişkili teklif ve mesajları
-- koruyan arşiv durumuna taşınır. Yalnızca hiç yayınlanmamış taslak silinebilir.
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in ('draft', 'open', 'assigned', 'completed', 'cancelled', 'closed', 'archived'));

create or replace function public.archive_job(
  target_job_id uuid,
  expected_updated_at timestamptz
) returns void
language plpgsql
security definer set search_path = public
as $$
declare
  locked_job public.jobs;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select * into locked_job from public.jobs where id = target_job_id for update;
  if locked_job.id is null
    or locked_job.employer_id <> auth.uid()
    or locked_job.status not in ('open', 'closed')
    or locked_job.updated_at <> expected_updated_at
  then
    raise exception 'Job cannot be archived';
  end if;

  update public.proposals set status = 'rejected'
  where job_id = locked_job.id and status = 'pending';
  update public.jobs set status = 'archived' where id = locked_job.id;
end;
$$;

create or replace function public.restore_archived_job(
  target_job_id uuid,
  expected_updated_at timestamptz
) returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  update public.jobs set status = 'closed'
  where id = target_job_id
    and employer_id = auth.uid()
    and status = 'archived'
    and updated_at = expected_updated_at;

  if not found then raise exception 'Job cannot be restored'; end if;
end;
$$;

revoke all on function public.archive_job(uuid, timestamptz) from public;
revoke all on function public.restore_archived_job(uuid, timestamptz) from public;
grant execute on function public.archive_job(uuid, timestamptz) to authenticated;
grant execute on function public.restore_archived_job(uuid, timestamptz) to authenticated;

drop policy if exists "Employers delete inactive own jobs" on public.jobs;
create policy "Employers delete own drafts" on public.jobs
  for delete to authenticated
  using (employer_id = auth.uid() and status = 'draft');

notify pgrst, 'reload schema';
commit;
