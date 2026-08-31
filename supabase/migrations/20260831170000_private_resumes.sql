alter table public.profiles add column if not exists resume_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Resume owners and employers can view" on storage.objects;
drop policy if exists "Freelancers upload own resume" on storage.objects;
drop policy if exists "Freelancers delete own resume" on storage.objects;

create policy "Resume owners and employers can view" on storage.objects
for select to authenticated using (
  bucket_id = 'resumes'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.profiles viewer
      where viewer.id = auth.uid() and viewer.role = 'employer'
    )
  )
);

create policy "Freelancers upload own resume" on storage.objects
for insert to authenticated with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.profiles owner_profile
    where owner_profile.id = auth.uid() and owner_profile.role = 'freelancer'
  )
);

create policy "Freelancers delete own resume" on storage.objects
for delete to authenticated using (
  bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
);
