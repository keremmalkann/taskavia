begin;

-- İşverenin aday değerlendirme notları freelancer tarafından görülemez.
create table if not exists public.proposal_notes (
  proposal_id uuid primary key references public.proposals(id) on delete cascade,
  employer_id uuid not null references public.profiles(id) on delete cascade,
  note text not null check (char_length(note) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposal_notes_employer_idx
  on public.proposal_notes(employer_id, updated_at desc);

drop trigger if exists proposal_notes_set_updated_at on public.proposal_notes;
create trigger proposal_notes_set_updated_at
before update on public.proposal_notes
for each row execute function public.set_updated_at();

alter table public.proposal_notes enable row level security;

drop policy if exists "Employers manage private proposal notes" on public.proposal_notes;
create policy "Employers manage private proposal notes" on public.proposal_notes
  for all to authenticated
  using (
    employer_id = auth.uid()
    and exists (
      select 1
      from public.proposals p
      join public.jobs j on j.id = p.job_id
      where p.id = proposal_id and j.employer_id = auth.uid()
    )
  )
  with check (
    employer_id = auth.uid()
    and exists (
      select 1
      from public.proposals p
      join public.jobs j on j.id = p.job_id
      where p.id = proposal_id and j.employer_id = auth.uid()
    )
  );

commit;
