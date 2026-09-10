begin;

-- Profil görünürlüğünü Auth metadata yerine RLS'in kullanabileceği alanda tut.
alter table public.profiles
  add column if not exists profile_visibility text not null default 'public',
  add column if not exists show_activity boolean not null default true,
  add column if not exists show_completed_jobs boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_visibility_check'
  ) then
    alter table public.profiles add constraint profiles_visibility_check
      check (profile_visibility in ('public', 'members'));
  end if;
end;
$$;

-- Daha önce kullanıcı metadata'sına kaydedilen tercihleri bir kez aktar.
update public.profiles p
set profile_visibility = case
      when u.raw_user_meta_data #>> '{settings,privacy,profile_visibility}' = 'members' then 'members'
      else p.profile_visibility
    end,
    show_activity = case
      when u.raw_user_meta_data #>> '{settings,privacy,show_activity}' in ('true', 'false')
        then (u.raw_user_meta_data #>> '{settings,privacy,show_activity}')::boolean
      else p.show_activity
    end,
    show_completed_jobs = case
      when u.raw_user_meta_data #>> '{settings,privacy,show_completed_jobs}' in ('true', 'false')
        then (u.raw_user_meta_data #>> '{settings,privacy,show_completed_jobs}')::boolean
      else p.show_completed_jobs
    end
from auth.users u
where u.id = p.id;

-- Profil ve portföy görünürlüğü artık seçilen tercihle aynı davranır.
drop policy if exists "Authenticated users can view profiles" on public.profiles;
drop policy if exists "Public profiles are visible" on public.profiles;
drop policy if exists "Member profiles are visible to members" on public.profiles;

create policy "Public profiles are visible" on public.profiles
  for select to anon, authenticated
  using (profile_visibility = 'public');

create policy "Member profiles are visible to members" on public.profiles
  for select to authenticated
  using (profile_visibility = 'members' or id = auth.uid());

drop policy if exists "Authenticated users can view portfolio" on public.portfolio_items;
drop policy if exists "Public portfolio is visible" on public.portfolio_items;
drop policy if exists "Member portfolio is visible to members" on public.portfolio_items;

create policy "Public portfolio is visible" on public.portfolio_items
  for select to anon, authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = profile_id and p.profile_visibility = 'public'
  ));

create policy "Member portfolio is visible to members" on public.portfolio_items
  for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = profile_id and (p.profile_visibility = 'members' or p.id = auth.uid())
  ));

-- Public profillerin değerlendirmeleri oturum açmadan da gösterilebilir.
drop policy if exists "Public profile reviews are visible" on public.reviews;
create policy "Public profile reviews are visible" on public.reviews
  for select to anon
  using (exists (
    select 1 from public.profiles p
    where p.id = reviewee_id and p.profile_visibility = 'public'
  ));

-- Public bucket doğrudan URL ile RLS'i atlar. Bucket'ı private yapıp erişimi
-- profil görünürlüğüne bağlı Storage politikalarına taşı.
update storage.buckets set public = false where id = 'portfolios';

drop policy if exists "Portfolio files are public" on storage.objects;
drop policy if exists "Public portfolio files are visible" on storage.objects;
drop policy if exists "Member portfolio files are visible to members" on storage.objects;

create policy "Public portfolio files are visible" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'portfolios'
    and exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
        and p.profile_visibility = 'public'
    )
  );

create policy "Member portfolio files are visible to members" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'portfolios'
    and exists (
      select 1 from public.profiles p
      where p.id::text = (storage.foldername(name))[1]
        and (p.profile_visibility = 'members' or p.id = auth.uid())
    )
  );

notify pgrst, 'reload schema';
commit;
