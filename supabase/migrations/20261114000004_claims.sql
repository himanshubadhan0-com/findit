-- =====================================================================
-- Migration 004: claims (the "This is mine" / "I found this" flow)
--
-- Flow:
--   1. Claimer creates a claim (with an answer if the item has a
--      verification question).               → owner gets a notification
--   2. Owner reviews it via review_claim():
--        approve → claim 'approved', item 'claimed', other pending claims
--                  rejected                  → claimer(s) notified
--        reject  → claim 'rejected'          → claimer notified
--   3. After approval, BOTH sides can read each other's contact details
--      with get_claim_contacts(). Before that, emails/phones stay hidden.
--   4. Owner marks the item 'returned'.       → claimer notified
-- =====================================================================

create table public.claims (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.items (id) on delete cascade,
  claimer_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  answer_given  text check (char_length(answer_given) <= 300),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at    timestamptz not null default now(),
  unique (item_id, claimer_id)  -- one claim per person per item
);

create index claims_claimer_idx on public.claims (claimer_id);
-- (item_id is already indexed by the unique constraint above)

-- ---------------------------------------------------------------------
-- Helper functions for policies.
-- items' policy needs to look at claims and claims' policy needs to look
-- at items. Doing that directly makes Postgres loop forever ("infinite
-- recursion in policy"). SECURITY DEFINER helpers skip RLS, which breaks
-- the loop.
-- ---------------------------------------------------------------------
create or replace function public.owns_item(p_item_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.items where id = p_item_id and user_id = auth.uid());
$$;

create or replace function public.has_claim_on(p_item_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.claims where item_id = p_item_id and claimer_id = auth.uid());
$$;

-- Can the current user claim this item with this answer?
create or replace function public.can_claim(p_item_id uuid, p_answer text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.items i
    where i.id = p_item_id
      and i.status = 'open'                    -- can't claim claimed/returned items
      and i.user_id <> auth.uid()              -- can't claim your own post
      and (i.verification_question is null     -- if there's a question, an answer is required
           or char_length(trim(coalesce(p_answer, ''))) > 0)
  );
$$;

revoke execute on function public.owns_item(uuid), public.has_claim_on(uuid), public.can_claim(uuid, text) from public, anon;
grant execute on function public.owns_item(uuid), public.has_claim_on(uuid), public.can_claim(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------
alter table public.claims enable row level security;
revoke all on public.claims from anon, authenticated;
grant select on public.claims to authenticated;
grant insert (item_id, answer_given) on public.claims to authenticated;  -- claimer_id/status use defaults
grant delete on public.claims to authenticated;
-- No UPDATE grant: status changes only through review_claim().

create policy "claims_select_claimer_owner_admin"
  on public.claims for select to authenticated
  using (
    claimer_id = (select auth.uid())
    or public.owns_item(item_id)
    or (select public.is_admin())
  );

create policy "claims_insert_valid"
  on public.claims for insert to authenticated
  with check (claimer_id = (select auth.uid()) and public.can_claim(item_id, answer_given));

-- Claimers may withdraw a claim while it's still pending.
create policy "claims_delete_own_pending"
  on public.claims for delete to authenticated
  using (claimer_id = (select auth.uid()) and status = 'pending');

-- People who claimed an item can still see it after it's returned.
create policy "items_select_if_claimed_by_me"
  on public.items for select to authenticated
  using (public.has_claim_on(id));

-- ---------------------------------------------------------------------
-- Trigger: tell the item owner about a new claim.
-- ---------------------------------------------------------------------
create or replace function public.on_claim_created()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_item public.items;
  v_claimer_name text;
begin
  select * into v_item from public.items where id = new.item_id;
  select name into v_claimer_name from public.profiles where id = new.claimer_id;

  perform public.notify_user(
    v_item.user_id,
    case when v_item.type = 'found' then 'Someone says this is theirs'
         else 'Someone may have found your item' end,
    format('%s responded to "%s". Open it to review.', coalesce(v_claimer_name, 'A student'), v_item.title),
    v_item.id
  );
  return new;
end;
$$;

revoke execute on function public.on_claim_created() from public, anon, authenticated;

create trigger claims_notify_owner
  after insert on public.claims
  for each row execute function public.on_claim_created();

-- ---------------------------------------------------------------------
-- review_claim(): owner approves or rejects a pending claim.
-- ---------------------------------------------------------------------
create or replace function public.review_claim(p_claim_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_claim public.claims;
  v_item  public.items;
  v_other record;
begin
  select * into v_claim from public.claims where id = p_claim_id;
  if not found then raise exception 'Claim not found'; end if;

  select * into v_item from public.items where id = v_claim.item_id;
  -- "is distinct from" (not "<>") so a NULL auth.uid() also fails the check.
  if v_item.user_id is distinct from auth.uid() then
    raise exception 'Only the person who posted this item can review claims';
  end if;
  if v_claim.status <> 'pending' then raise exception 'This claim was already reviewed'; end if;

  if p_approve then
    if v_item.status <> 'open' then raise exception 'This item already has an approved claim'; end if;

    update public.claims set status = 'approved' where id = p_claim_id;
    update public.items  set status = 'claimed'  where id = v_item.id;

    perform public.notify_user(
      v_claim.claimer_id,
      'Claim approved',
      format('Your claim for "%s" was approved. Open it to see contact details.', v_item.title),
      v_item.id
    );

    -- Only one claim can win: reject the others and let them know.
    for v_other in
      update public.claims set status = 'rejected'
      where item_id = v_item.id and status = 'pending'
      returning claimer_id
    loop
      perform public.notify_user(
        v_other.claimer_id,
        'Claim not approved',
        format('"%s" was matched with someone else.', v_item.title),
        v_item.id
      );
    end loop;
  else
    update public.claims set status = 'rejected' where id = p_claim_id;
    perform public.notify_user(
      v_claim.claimer_id,
      'Claim not approved',
      format('Your claim for "%s" was not approved.', v_item.title),
      v_item.id
    );
  end if;
end;
$$;

revoke execute on function public.review_claim(uuid, boolean) from public, anon;
grant execute on function public.review_claim(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- get_claim_contacts(): after approval, each side sees the OTHER
-- person's name, email and phone. Returns nothing useful otherwise.
-- ---------------------------------------------------------------------
create or replace function public.get_claim_contacts(p_claim_id uuid)
returns table (contact_id uuid, contact_name text, contact_email text, contact_phone text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_claimer uuid;
  v_owner   uuid;
  v_status  text;
  v_other   uuid;
begin
  select c.claimer_id, i.user_id, c.status into v_claimer, v_owner, v_status
  from public.claims c join public.items i on i.id = c.item_id
  where c.id = p_claim_id;

  if not found then raise exception 'Claim not found'; end if;
  if auth.uid() is null or auth.uid() not in (v_claimer, v_owner) then raise exception 'Not allowed'; end if;
  if v_status <> 'approved' then raise exception 'Contact details are shared only after the claim is approved'; end if;

  v_other := case when auth.uid() = v_owner then v_claimer else v_owner end;

  return query
    select p.id, p.name, p.email, p.phone from public.profiles p where p.id = v_other;
end;
$$;

revoke execute on function public.get_claim_contacts(uuid) from public, anon;
grant execute on function public.get_claim_contacts(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Trigger: when the owner marks an item 'returned', tell the claimer.
-- ---------------------------------------------------------------------
create or replace function public.on_item_returned()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_claimer uuid;
begin
  for v_claimer in
    select claimer_id from public.claims where item_id = new.id and status = 'approved'
  loop
    perform public.notify_user(
      v_claimer,
      'Item returned',
      format('"%s" has been marked as returned. Glad it worked out!', new.title),
      new.id
    );
  end loop;
  return new;
end;
$$;

revoke execute on function public.on_item_returned() from public, anon, authenticated;

create trigger items_notify_returned
  after update of status on public.items
  for each row
  when (new.status = 'returned' and old.status is distinct from 'returned')
  execute function public.on_item_returned();
