begin;

-- Lock job first in both mutation paths so acceptance and editing serialize.
create or replace function public.change_pending_proposal(
  target_proposal_id uuid, expected_updated_at timestamptz, operation text,
  new_price numeric default null, new_duration integer default null, new_message text default null
) returns void language plpgsql security definer set search_path = public as $$
declare p public.proposals; j public.jobs; target_job uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select job_id into target_job from public.proposals where id = target_proposal_id and freelancer_id = auth.uid();
  select * into j from public.jobs where id = target_job for update;
  select * into p from public.proposals where id = target_proposal_id and freelancer_id = auth.uid() for update;
  if p.id is null or j.id is null or p.status <> 'pending' or j.status <> 'open'
    or not exists (select 1 from public.profiles where id = auth.uid() and role = 'freelancer') then
    raise exception 'Proposal is no longer editable';
  end if;
  if expected_updated_at is null or p.updated_at <> expected_updated_at then raise exception 'Proposal changed; reload'; end if;
  if operation = 'withdraw' then
    update public.proposals set status = 'withdrawn' where id = p.id;
  elsif operation = 'edit' then
    if new_price is null or new_price::text in ('NaN', 'Infinity', '-Infinity') or new_price <= 0 or new_price < j.budget_min or new_price > 9999999999.99
      or new_duration is null or new_duration < 1 or new_duration > 3650
      or new_message is null or char_length(btrim(new_message)) not between 10 and 2000 then
      raise exception 'Invalid proposal values';
    end if;
    update public.proposals set price = new_price, duration_days = new_duration, message = btrim(new_message) where id = p.id;
  else raise exception 'Invalid operation'; end if;
end;
$$;
revoke all on function public.change_pending_proposal(uuid,timestamptz,text,numeric,integer,text) from public;
grant execute on function public.change_pending_proposal(uuid,timestamptz,text,numeric,integer,text) to authenticated;

create or replace function public.accept_proposal(target_proposal_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare target_job uuid; j public.jobs; p public.proposals;
begin
  select job_id into target_job from public.proposals where id = target_proposal_id;
  select * into j from public.jobs where id = target_job for update;
  select * into p from public.proposals where id = target_proposal_id for update;
  if auth.uid() is null or j.employer_id <> auth.uid() or j.id is null or j.status <> 'open' or p.id is null or p.status <> 'pending' then
    raise exception 'Proposal cannot be accepted';
  end if;
  update public.proposals set status = case when id = p.id then 'accepted' else 'rejected' end where job_id = j.id and status = 'pending';
  update public.jobs set status = 'assigned' where id = j.id;
end;
$$;

create or replace function public.accept_proposal_checked(target_proposal_id uuid, expected_updated_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare target_job uuid; p public.proposals;
begin
  select job_id into target_job from public.proposals where id = target_proposal_id;
  perform 1 from public.jobs where id = target_job for update;
  select * into p from public.proposals where id = target_proposal_id for update;
  if expected_updated_at is null or p.id is null or p.updated_at <> expected_updated_at then raise exception 'Proposal changed; reload'; end if;
  perform public.accept_proposal(target_proposal_id);
end;
$$;
revoke all on function public.accept_proposal(uuid) from public;
grant execute on function public.accept_proposal(uuid) to authenticated;
revoke all on function public.accept_proposal_checked(uuid,timestamptz) from public;
grant execute on function public.accept_proposal_checked(uuid,timestamptz) to authenticated;

-- Freelancers must use the checked function, not arbitrary table updates.
drop policy if exists "Freelancers withdraw proposals" on public.proposals;
notify pgrst, 'reload schema';
commit;
