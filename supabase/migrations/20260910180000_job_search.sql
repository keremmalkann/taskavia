-- Indexed full-text search for public job discovery.

alter table public.jobs add column if not exists search_vector tsvector;

create or replace function public.sync_job_search_vector()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.skills, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.category, '')), 'B');
  return new;
end;
$$;

drop trigger if exists jobs_sync_search_vector on public.jobs;
create trigger jobs_sync_search_vector
before insert or update of title, description, skills, category on public.jobs
for each row execute function public.sync_job_search_vector();

update public.jobs
set search_vector =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(array_to_string(skills, ' '), '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(category, '')), 'B')
where search_vector is null;

create index if not exists jobs_search_vector_idx on public.jobs using gin(search_vector);
create index if not exists jobs_discovery_idx on public.jobs(status, category, created_at desc);
