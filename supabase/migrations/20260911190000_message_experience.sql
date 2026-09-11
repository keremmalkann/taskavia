-- Mesaj teslim/okunma durumu ve katılımcılara özel dosya paylaşımı.

alter table public.messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint;

alter table public.messages alter column body set default '';
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages add constraint messages_body_check check (
  char_length(body) between 0 and 3000
  and (char_length(btrim(body)) > 0 or attachment_path is not null)
  and ((attachment_path is null and attachment_name is null and attachment_type is null and attachment_size is null) or (
    split_part(attachment_path, '/', 1) = proposal_id::text
    and split_part(attachment_path, '/', 2) = sender_id::text
    and char_length(attachment_name) between 1 and 180
    and attachment_type in (
      'image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain',
      'application/zip',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    and attachment_size between 1 and 10485760
  ))
);

alter table public.messages replica identity full;

create or replace function public.mark_conversation_read(target_proposal_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  read_time timestamptz := now();
begin
  if not public.is_proposal_participant(target_proposal_id) then
    raise exception 'Not authorized';
  end if;

  update public.messages
  set read_at = read_time
  where proposal_id = target_proposal_id
    and sender_id <> auth.uid()
    and read_at is null;

  return read_time;
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  false,
  10485760,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Conversation participants can read attachments" on storage.objects;
drop policy if exists "Conversation participants can upload attachments" on storage.objects;
drop policy if exists "Message senders can delete attachments" on storage.objects;

create policy "Conversation participants can read attachments" on storage.objects
for select to authenticated using (
  bucket_id = 'message-attachments'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.is_proposal_participant(((storage.foldername(name))[1])::uuid)
);

create policy "Conversation participants can upload attachments" on storage.objects
for insert to authenticated with check (
  bucket_id = 'message-attachments'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_proposal_participant(((storage.foldername(name))[1])::uuid)
);

create policy "Message senders can delete attachments" on storage.objects
for delete to authenticated using (
  bucket_id = 'message-attachments'
  and (storage.foldername(name))[2] = auth.uid()::text
);
