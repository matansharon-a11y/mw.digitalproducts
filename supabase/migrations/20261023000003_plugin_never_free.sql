-- The Lightroom Classic plugin is never free (Jeinna, 23 Oct 2026): everyone buys it, on its own or in a bundle with
-- MWP Presets. Testers and ambassadors no longer get it with their tools, and the free copies given yesterday by
-- 20261023000002 (entitlements without an order) are taken back. Anything bought stays.

update public.entitlements set revoked_at = now()
 where product_id = (select id from public.products where slug = 'mwp-lightroom-plugin')
   and order_id is null and revoked_at is null;

-- testers: MWP Presets, MWP Panel and the Field Guides again, without the plugin
create or replace function public.add_tester_by_code(p_email text, p_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
  v_customer uuid;
  v_tester uuid;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'invalid email'; end if;
  insert into public.customers (email, name) values (v_email, nullif(trim(p_name), ''))
  on conflict (email) do update set name = coalesce(public.customers.name, excluded.name)
  returning id into v_customer;

  insert into public.testers (customer_id) values (v_customer)
  on conflict (customer_id) do update set removed_at = null, added_at = now()
  returning id into v_tester;

  -- like ambassadors: the guides read online only (a bought copy stays downloadable)
  insert into public.entitlements (customer_id, product_id, view_only)
  select v_customer, p.id, p.slug = 'mwp-field-guides' from public.products p
   where p.slug in ('mwp-presets', 'mwp-panel', 'mwp-field-guides')
  on conflict (customer_id, product_id) do update
    set revoked_at = null,
        view_only = case when public.entitlements.order_id is null then excluded.view_only else false end;

  begin
    perform public.call_scheduler('tester', jsonb_build_object('tester_id', v_tester, 'action', 'added'));
  exception when others then
    raise warning 'add_tester_by_code: monday / personal copies not requested: %', sqlerrm;
  end;
  return v_tester;
end $$;
revoke all on function public.add_tester_by_code(text, text) from public, anon, authenticated;
grant execute on function public.add_tester_by_code(text, text) to service_role;

create or replace function public.add_tester(p_email text, p_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
  v_customer uuid;
  v_tester uuid;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'admins only'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'invalid email'; end if;

  insert into public.customers (email, name) values (v_email, nullif(trim(p_name), ''))
  on conflict (email) do update set name = coalesce(public.customers.name, excluded.name)
  returning id into v_customer;

  insert into public.testers (customer_id) values (v_customer)
  on conflict (customer_id) do update set removed_at = null, added_at = now()
  returning id into v_tester;

  insert into public.entitlements (customer_id, product_id, view_only)
  select v_customer, p.id, false from public.products p
   where p.slug in ('mwp-presets', 'mwp-panel', 'mwp-field-guides')
  on conflict (customer_id, product_id) do update set revoked_at = null, view_only = false;

  begin
    perform public.call_scheduler('tester', jsonb_build_object('tester_id', v_tester, 'action', 'added'));
  exception when others then
    raise warning 'add_tester: monday / personal copies not requested: %', sqlerrm;
  end;
  return v_tester;
end $$;
revoke all on function public.add_tester(text, text) from public, anon;
grant execute on function public.add_tester(text, text) to authenticated;   -- checked inside: admins only

