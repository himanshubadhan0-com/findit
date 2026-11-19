-- =====================================================================
-- Migration 002: items (the lost / found posts)
--
-- Security summary:
--   * Signed-in users can read every ACTIVE item (status open or claimed).
--     Returned items are visible only to their owner, to admins, and (see
--     migration 004) to people who claimed them.
--   * You can only edit/delete your own items. Admins can delete any item.
--   * verification_answer is NEVER readable through normal queries. The
--     column isn't granted to anyone; only the owner can fetch it through
--     get_verification_answer().
--   * user_id and status are not insertable. user_id defaults to the
--     logged-in user and status defaults to 'open', so nobody can post as
--     someone else or create an already-"returned" item.
-- =====================================================================

-- Trigram extension: makes "title ILIKE '%wallet%'" searches fast.
create extension if not exists pg_trgm with schema extensions;

create table public.items (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  type                  text not null check (type in ('lost', 'found')),
  title                 text not null check (char_length(trim(title)) between 3 and 100),
  description           text not null default '' check (char_length(description) <= 1000),
  category              text not null check (category in
                          ('Phone', 'Wallet', 'ID Card', 'Keys', 'Bag', 'Laptop/Accessories', 'Books', 'Other')),
  location              text not null check (location in
                          ('Library', 'Canteen', 'Hostel', 'Ground', 'Classroom Block', 'Parking', 'Other')),
  date                  date not null default current_date,   -- the day it was lost/found
  photo_urls            text[] not null default '{}' check (cardinality(photo_urls) <= 3),
  verification_question text check (char_length(verification_question) <= 200),
  verification_answer   text check (char_length(verification_answer) <= 200),
  status                text not null default 'open' check (status in ('open', 'claimed', 'returned')),
  created_at            timestamptz not null default now(),

  -- Only FOUND items have a verification question (the finder asks the owner).
  constraint verification_only_for_found
    check (type = 'found' or (verification_question is null and verification_answer is null)),
  -- A question needs an answer, and an answer needs a question.
  constraint verification_question_and_answer_together
    check ((verification_question is null) = (verification_answer is null))
);

comment on table public.items is 'Lost and found posts.';
comment on column public.items.verification_answer is 'Secret answer: only the owner can read it, via get_verification_answer().';

-- ---------------------------------------------------------------------
-- Indexes: each one speeds up a specific query the app runs.
-- ---------------------------------------------------------------------
create index items_feed_idx      on public.items (status, created_at desc);  -- home feed, newest first
create index items_matching_idx  on public.items (category, type, status);   -- smart matching candidates
create index items_user_idx      on public.items (user_id);                  -- "My posts"
create index items_title_trgm    on public.items using gin (title extensions.gin_trgm_ops);        -- search
create index items_desc_trgm     on public.items using gin (description extensions.gin_trgm_ops);  -- search

-- ---------------------------------------------------------------------
-- Permissions (columns)
-- ---------------------------------------------------------------------
alter table public.items enable row level security;
revoke all on public.items from anon, authenticated;

-- Every column EXCEPT verification_answer.
-- (So the app must list columns explicitly; select('*') is refused.)
grant select (id, user_id, type, title, description, category, location, date,
              photo_urls, verification_question, status, created_at)
  on public.items to authenticated;

grant insert (type, title, description, category, location, date,
              photo_urls, verification_question, verification_answer)
  on public.items to authenticated;

-- `type` is not editable, so a post can't flip from Lost to Found after matching.
grant update (title, description, category, location, date,
              photo_urls, verification_question, verification_answer, status)
  on public.items to authenticated;

grant delete on public.items to authenticated;

-- ---------------------------------------------------------------------
-- Permissions (rows): RLS policies
-- ---------------------------------------------------------------------
create policy "items_select_active_own_or_admin"
  on public.items for select to authenticated
  using (
    status in ('open', 'claimed')
    or user_id = (select auth.uid())
    or (select public.is_admin())
  );

create policy "items_insert_as_self"
  on public.items for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "items_update_own"
  on public.items for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "items_delete_own_or_admin"
  on public.items for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------
-- The owner (finder) reads the secret answer through this function.
-- Anyone else gets NULL.
-- ---------------------------------------------------------------------
create or replace function public.get_verification_answer(p_item_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select i.verification_answer
  from public.items i
  where i.id = p_item_id and i.user_id = auth.uid();
$$;

revoke execute on function public.get_verification_answer(uuid) from public, anon;
grant execute on function public.get_verification_answer(uuid) to authenticated;
