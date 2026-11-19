-- =====================================================================
-- Migration 005: matches (smart matching results)
--
-- The app scores candidates with src/utils/matching.ts (text similarity +
-- same location + date proximity), then sends the good ones to
-- save_matches(). The database double-checks every candidate (opposite
-- type, same category, still open, different owner), stores the match,
-- and notifies BOTH students (which also sends a push, see migration 003).
-- =====================================================================

create table public.matches (
  id             uuid primary key default gen_random_uuid(),
  lost_item_id   uuid not null references public.items (id) on delete cascade,
  found_item_id  uuid not null references public.items (id) on delete cascade,
  score          numeric(4, 3) not null check (score between 0 and 1),  -- 0.000 – 1.000
  created_at     timestamptz not null default now(),
  unique (lost_item_id, found_item_id),
  check (lost_item_id <> found_item_id)
);

create index matches_found_idx on public.matches (found_item_id);
-- (lost_item_id is covered by the unique constraint's index)

alter table public.matches enable row level security;
revoke all on public.matches from anon, authenticated;
grant select on public.matches to authenticated;

-- Shown in "Possible Matches" on any item's details screen. The items
-- themselves are still protected by the items policies.
create policy "matches_select_signed_in"
  on public.matches for select to authenticated
  using (true);

-- ---------------------------------------------------------------------
-- save_matches(item, [{ "item_id": "...", "score": 0.72 }, ...])
-- Returns how many NEW matches were stored.
-- ---------------------------------------------------------------------
create or replace function public.save_matches(p_item_id uuid, p_matches jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item     public.items;
  v_other    public.items;
  v_entry    jsonb;
  v_score    numeric;
  v_lost     uuid;
  v_found    uuid;
  v_match_id uuid;
  v_percent  text;
  v_count    integer := 0;
begin
  select * into v_item from public.items where id = p_item_id;
  if not found or v_item.user_id is distinct from auth.uid() then
    raise exception 'You can only run matching for your own items';
  end if;
  if jsonb_typeof(p_matches) <> 'array' or jsonb_array_length(p_matches) > 20 then
    raise exception 'p_matches must be an array of at most 20 entries';
  end if;

  for v_entry in select * from jsonb_array_elements(p_matches) loop
    select * into v_other from public.items where id = (v_entry ->> 'item_id')::uuid;

    -- Ignore anything that isn't a valid opposite-type candidate.
    continue when not found
      or v_other.type = v_item.type
      or v_other.category <> v_item.category
      or v_other.status <> 'open'
      or v_other.user_id = v_item.user_id;

    v_score := least(greatest(coalesce((v_entry ->> 'score')::numeric, 0), 0), 1);

    if v_item.type = 'lost' then
      v_lost := v_item.id;  v_found := v_other.id;
    else
      v_lost := v_other.id; v_found := v_item.id;
    end if;

    v_match_id := null;
    insert into public.matches (lost_item_id, found_item_id, score)
    values (v_lost, v_found, round(v_score, 3))
    on conflict (lost_item_id, found_item_id) do nothing
    returning id into v_match_id;

    -- Only notify for brand-new matches (no duplicates on re-runs).
    if v_match_id is not null then
      v_count := v_count + 1;
      v_percent := round(v_score * 100)::text || '%';

      perform public.notify_user(
        v_item.user_id,
        'Possible match found',
        format('"%s" looks like a %s match for your post "%s".', v_other.title, v_percent, v_item.title),
        v_item.id
      );
      perform public.notify_user(
        v_other.user_id,
        'Possible match found',
        format('A new post "%s" looks like a %s match for your post "%s".', v_item.title, v_percent, v_other.title),
        v_other.id
      );
    end if;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.save_matches(uuid, jsonb) from public, anon;
grant execute on function public.save_matches(uuid, jsonb) to authenticated;
