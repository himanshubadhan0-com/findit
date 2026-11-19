-- =====================================================================
-- Migration 003: notifications (+ push notifications)
--
-- * Users read, mark-as-read and delete only their OWN notifications.
-- * Users can't insert notifications at all. They're created only by
--   trusted database functions (new claim, claim approved, match found…),
--   so nobody can spam other students.
-- * Every new notification row is also sent as a phone PUSH notification.
--   A trigger calls Expo's free push API through pg_net (an HTTP client
--   built into Supabase). No extra server needed.
-- =====================================================================

create extension if not exists pg_net with schema extensions;

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) <= 120),
  body        text not null check (char_length(body) <= 500),
  item_id     uuid references public.items (id) on delete set null,  -- tap to open this item
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;  -- only the "read" flag can change

create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notifications_delete_own"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- Live updates: the Notifications tab can subscribe and refresh instantly.
-- (Realtime still applies the RLS policies above.)
alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------
-- notify_user(): the ONE way notifications get created. Internal only:
-- app users can't call it; other SECURITY DEFINER functions do.
-- ---------------------------------------------------------------------
create or replace function public.notify_user(p_user_id uuid, p_title text, p_body text, p_item_id uuid default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, title, body, item_id)
  values (p_user_id, left(p_title, 120), left(p_body, 500), p_item_id);
$$;

revoke execute on function public.notify_user(uuid, text, text, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Push: after a notification is inserted, send it to the user's phone.
-- net.http_post is asynchronous, so the insert never waits on Expo.
-- Errors are swallowed: a failed push must never block the in-app notification.
-- ---------------------------------------------------------------------
create or replace function public.send_push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  select p.push_token into v_token from public.profiles p where p.id = new.user_id;

  if v_token is not null and v_token <> '' then
    perform net.http_post(
      url     := 'https://exp.host/--/api/v2/push/send',
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
      body    := jsonb_build_object(
                   'to', v_token,
                   'title', new.title,
                   'body', new.body,
                   'sound', 'default',
                   'data', jsonb_build_object('itemId', new.item_id, 'notificationId', new.id)
                 )
    );
  end if;
  return new;
exception when others then
  raise warning 'push notification failed: %', sqlerrm;
  return new;
end;
$$;

revoke execute on function public.send_push_notification() from public, anon, authenticated;

create trigger notifications_send_push
  after insert on public.notifications
  for each row execute function public.send_push_notification();
