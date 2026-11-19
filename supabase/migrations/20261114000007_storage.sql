-- =====================================================================
-- Migration 007: photo storage bucket
--
-- Bucket "item-photos" is PUBLIC-READ, so the feed can show photos by URL
-- without extra requests. Uploads go into a folder named after the
-- uploader's user id:   item-photos/<user-id>/<random-name>.jpg
-- so the policies below can check "is this your folder?".
-- The app compresses photos before upload; 5 MB is a safety cap.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- storage.foldername('abc/photo.jpg') returns {abc}; [1] is the first folder.

create policy "item_photos_insert_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- SELECT is needed for the storage API to find a file before deleting it.
create policy "item_photos_select_own_or_admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'item-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

create policy "item_photos_delete_own_or_admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'item-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );
