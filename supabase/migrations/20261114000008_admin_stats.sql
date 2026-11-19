-- =====================================================================
-- Migration 008: admin dashboard statistics
--
-- One call returns everything the Admin Stats screen needs.
-- Non-admins get an error.
-- =====================================================================

create or replace function public.get_admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_stats jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  select jsonb_build_object(
    'total_items',    count(*),
    'lost_items',     count(*) filter (where type = 'lost'),
    'found_items',    count(*) filter (where type = 'found'),
    'open_items',     count(*) filter (where status = 'open'),
    'claimed_items',  count(*) filter (where status = 'claimed'),
    'returned_items', count(*) filter (where status = 'returned'),
    -- Return rate = returned items / all items, as a percentage (0 if no items yet).
    'return_rate',    coalesce(round(100.0 * count(*) filter (where status = 'returned') / nullif(count(*), 0), 1), 0),
    'top_lost_category', (select category from public.items where type = 'lost'
                          group by category order by count(*) desc, category limit 1),
    'top_lost_location', (select location from public.items where type = 'lost'
                          group by location order by count(*) desc, location limit 1),
    'total_users',    (select count(*) from public.profiles),
    'open_reports',   (select count(*) from public.reports)
  )
  into v_stats
  from public.items;

  return v_stats;
end;
$$;

revoke execute on function public.get_admin_stats() from public, anon;
grant execute on function public.get_admin_stats() to authenticated;
