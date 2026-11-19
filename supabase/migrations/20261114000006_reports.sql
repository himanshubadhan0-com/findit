-- =====================================================================
-- Migration 006: reports (flag inappropriate posts)
--
-- Any signed-in user can report a post once. Reports are visible only to
-- the reporter and to admins. Every admin gets a notification.
-- =====================================================================

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.items (id) on delete cascade,
  reporter_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason       text not null check (char_length(trim(reason)) between 3 and 500),
  created_at   timestamptz not null default now(),
  unique (item_id, reporter_id)  -- one report per person per post
);
-- (item_id is indexed by the unique constraint)

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
grant insert (item_id, reason) on public.reports to authenticated;
grant delete on public.reports to authenticated;

create policy "reports_select_own_or_admin"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));

create policy "reports_insert_as_self"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

-- Admins dismiss reports by deleting them.
create policy "reports_delete_admin"
  on public.reports for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Trigger: alert every admin about a new report.
-- ---------------------------------------------------------------------
create or replace function public.on_report_created()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_title text;
  v_admin uuid;
begin
  select title into v_title from public.items where id = new.item_id;
  for v_admin in select id from public.profiles where is_admin loop
    perform public.notify_user(
      v_admin,
      'Post reported',
      format('"%s" was reported: %s', v_title, left(new.reason, 200)),
      new.item_id
    );
  end loop;
  return new;
end;
$$;

revoke execute on function public.on_report_created() from public, anon, authenticated;

create trigger reports_notify_admins
  after insert on public.reports
  for each row execute function public.on_report_created();
