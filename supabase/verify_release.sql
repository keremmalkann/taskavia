-- Taskavia yayın sonrası, salt-okunur Supabase şema kontrolü.
-- Migration dosyaları uygulandıktan sonra SQL Editor'de çalıştırın.
-- Her satırın status değeri OK olmalıdır.

with release_checks(name, passed, detail) as (
  values
    ('profiles table', to_regclass('public.profiles') is not null, 'Temel kullanıcı profilleri'),
    ('jobs table', to_regclass('public.jobs') is not null, 'İlan kayıtları'),
    ('proposals table', to_regclass('public.proposals') is not null, 'Teklif kayıtları'),
    ('messages table', to_regclass('public.messages') is not null, 'Mesaj kayıtları'),
    ('reviews table', to_regclass('public.reviews') is not null, 'Değerlendirme kayıtları'),
    ('job revisions table', to_regclass('public.job_revisions') is not null, 'İlan düzenleme geçmişi'),
    ('proposal edit rpc', to_regprocedure('public.change_pending_proposal(uuid,timestamptz,text,numeric,integer,text)') is not null, 'Teklif düzenleme ve geri çekme'),
    ('checked accept rpc', to_regprocedure('public.accept_proposal_checked(uuid,timestamptz)') is not null, 'Eşzamanlılık korumalı teklif kabulü'),
    ('checked reject rpc', to_regprocedure('public.reject_pending_proposal(uuid,timestamptz)') is not null, 'Eşzamanlılık korumalı teklif reddi'),
    ('publish job rpc', to_regprocedure('public.publish_job(uuid,timestamptz)') is not null, 'Taslak ilan yayınlama'),
    ('close job rpc', to_regprocedure('public.close_job(uuid,timestamptz)') is not null, 'İlanı tekliflere kapatma'),
    ('reopen job rpc', to_regprocedure('public.reopen_job(uuid,timestamptz)') is not null, 'Kapalı ilanı yeniden yayınlama'),
    ('archive job rpc', to_regprocedure('public.archive_job(uuid,timestamptz)') is not null, 'Yayınlanmış ilanı veri kaybetmeden arşivleme'),
    ('restore archived job rpc', to_regprocedure('public.restore_archived_job(uuid,timestamptz)') is not null, 'Arşivlenmiş ilanı geri alma'),
    ('job search index', to_regclass('public.jobs_search_vector_idx') is not null, 'Başlık, açıklama ve beceri araması'),
    ('complete job rpc', to_regprocedure('public.complete_job(uuid)') is not null, 'İş tamamlama'),
    ('private portfolios bucket', exists(select 1 from storage.buckets where id = 'portfolios' and not public), 'Görünürlük kontrollü portföy dosyaları'),
    ('private resumes bucket', exists(select 1 from storage.buckets where id = 'resumes' and not public), 'Özel özgeçmiş dosyaları'),
    ('messages realtime', exists(
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ), 'Anlık mesajlaşma yayını'),
    ('profile privacy columns', exists(
      select 1
      from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'profile_visibility'
    ), 'Profil görünürlüğü veritabanı alanı'),
    ('core tables use rls', not exists(
      select 1
      from (values ('profiles'), ('portfolio_items'), ('jobs'), ('proposals'), ('messages'), ('payments'), ('reviews')) expected(tablename)
      where not exists (
        select 1
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = expected.tablename
          and c.relrowsecurity
      )
    ), 'Temel tablolarda Row Level Security')
)
select name,
       case when passed then 'OK' else 'MISSING' end as status,
       detail
from release_checks
order by passed, name;
