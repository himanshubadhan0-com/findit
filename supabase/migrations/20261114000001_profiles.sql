-- =====================================================================
-- Migration 001: profiles
--
-- One row per user, created AUTOMATICALLY by a trigger when someone signs
-- up. The app never inserts profiles itself.
--
-- Privacy design (worth explaining in the viva):
--   Row Level Security (RLS) decides WHICH ROWS a user can see.
--   Column privileges (GRANT ... (columns)) decide WHICH COLUMNS.
--   Everyone signed in can read a poster's name, but email, phone and
--   push_token are hidden. You read your own private columns through the
--   get_my_profile() function. Later migrations share contact details only
--   after a claim is approved.
-- =====================================================================

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  -- Copied from auth.users. The app can't read auth.users directly, and we
  -- need the email to share contact details after a claim is approved.
  email       text not null,
  phone       text,
  is_admin    boolean not null default false,
  push_token  text,                 -- Expo push token, set by the app in a later step
  created_at  timestamptz not null default now()
);

comment on table public.profiles is 'Public profile for each FindIt user (1:1 with auth.users).';

-- ---------------------------------------------------------------------
-- Trigger: create the profile row whenever a new auth user signs up.
-- The app sends name/phone as "user metadata" in supabase.auth.signUp().
-- SECURITY DEFINER = runs with the function owner's rights, so it can
-- insert even though normal users have no INSERT permission.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- OPTIONAL college-domain check (off by default: any email may sign up).
  -- If you restrict domains in src/constants/allowedEmailDomain.ts, also
  -- enforce it here, because someone could call the Supabase API directly.
  -- Uncomment and set your domain(s):
  --
  -- if split_part(lower(new.email), '@', 2) not in ('college.edu')
  --    and split_part(lower(new.email), '@', 2) not like '%.college.edu' then
  --   raise exception 'Please sign up with your college email address';
  -- end if;

  insert into public.profiles (id, name, email, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Helper: is the current user an admin? Used by RLS policies in later
-- migrations ("admins can delete any post"). It is SECURITY DEFINER so a
-- policy can call it without running into RLS on profiles itself.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------
-- Helper: return MY full profile, including the private columns.
-- ---------------------------------------------------------------------
create or replace function public.get_my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Start from zero, then grant only what's needed.
revoke all on public.profiles from anon, authenticated;

-- Readable by signed-in users: public columns only.
grant select (id, name, is_admin, created_at) on public.profiles to authenticated;

-- Updatable: name, phone, push_token. is_admin is NOT in this list, so a
-- user can't make themselves an admin; only the dashboard/SQL can.
grant update (name, phone, push_token) on public.profiles to authenticated;

create policy "profiles_select_signed_in"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Functions are executable by everyone by default; restrict them.
revoke execute on function public.get_my_profile() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.is_admin() to authenticated;
