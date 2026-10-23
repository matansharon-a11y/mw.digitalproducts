-- The Lightroom Classic plugin becomes a product of its own (Jeinna, 23 Oct 2026): MWP Presets and the plugin are
-- two separate purchases. The bundles with MWP Presets include the plugin too; MWP Presets alone no longer does.
--
--  * products: mwp-lightroom-plugin, hidden and at $0 until its price is set and it goes live in the admin
--    (prices are Matan's). Category 'plugin' like MWP Panel: downloaded as is, no personal copy.
--  * its file: the plugin zip that was MWP Presets' extra download becomes the new product's own file (same file
--    in storage, nothing re-uploaded), and its tutorials move with it.
--  * everyone who has MWP Presets today (testers, ambassadors, test orders) keeps the plugin: they get it as its own
--    product. Bundles with presets unlock it at checkout (checkout-webhook BUNDLES).
--  * testers and ambassadors get it with the other tools from now on (add_tester, add_tester_by_code,
--    _shared/ambassador.ts) and lose it with them (remove_tester; end_ambassador already takes back all free access).

insert into public.products (slug, name, name_emphasis, category, tagline, includes, compatibility, price_cents, version, is_active, sort_order)
values ('mwp-lightroom-plugin', 'MWP', 'Lightroom Classic Plugin', 'plugin', 'From the card to the post, in one window.',
        array['A plugin for Lightroom Classic 13 or newer', 'Seven tabs: Cull, Organize, Expedition, Looks, Edit, Color, Export', 'Built-in help and video tutorials'],
        array['Lightroom Classic 13 or newer', 'Mac and Windows'], 0, '1.4.3', false, 15)
on conflict (slug) do nothing;

-- the file: MWP Presets' extra download becomes the plugin's own file
insert into public.product_files (product_id, path, size_bytes, version, uploaded_at)
select (select id from public.products where slug = 'mwp-lightroom-plugin'), x.path, x.size_bytes, x.version, x.uploaded_at
  from public.product_extra_files x
 where x.file_key = 'lightroom-classic'
   and x.product_id = (select id from public.products where slug = 'mwp-presets')
on conflict (product_id) do nothing;

update public.products set version = x.version
  from public.product_extra_files x
 where products.slug = 'mwp-lightroom-plugin' and x.file_key = 'lightroom-classic'
   and x.product_id = (select id from public.products where slug = 'mwp-presets');

-- its tutorials move with it
update public.product_tutorials set product_id = (select id from public.products where slug = 'mwp-lightroom-plugin')
 where app = 'lightroom-classic' and product_id = (select id from public.products where slug = 'mwp-presets');

-- whoever has MWP Presets now keeps the plugin, as its own product, on the same terms (same order or free access)
insert into public.entitlements (customer_id, product_id, order_id, granted_at, revoked_at, view_only)
select e.customer_id, (select id from public.products where slug = 'mwp-lightroom-plugin'), e.order_id, e.granted_at, e.revoked_at, false
  from public.entitlements e
 where e.product_id = (select id from public.products where slug = 'mwp-presets')
on conflict (customer_id, product_id) do nothing;

delete from public.product_extra_files
 where file_key = 'lightroom-classic'
   and product_id = (select id from public.products where slug = 'mwp-presets')
   and exists (select 1 from public.product_files f where f.product_id = (select id from public.products where slug = 'mwp-lightroom-plugin'));

-- testers: the plugin with the other tools
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
   where p.slug in ('mwp-presets', 'mwp-lightroom-plugin', 'mwp-panel', 'mwp-field-guides')
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
   where p.slug in ('mwp-presets', 'mwp-lightroom-plugin', 'mwp-panel', 'mwp-field-guides')
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

create or replace function public.remove_tester(p_tester uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid;
  v_ambassador boolean;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'admins only'; end if;
  update public.testers set removed_at = now() where id = p_tester and removed_at is null
  returning customer_id into v_customer;
  if v_customer is null then return; end if;   -- unknown or already removed

  -- Take back the free access. Anything bought stays. An active ambassador keeps the program's access
  -- (with the guides read-only again).
  select exists (select 1 from public.beta_members where customer_id = v_customer and status = 'active') into v_ambassador;
  if v_ambassador then
    update public.entitlements e set view_only = true
      from public.products p
     where p.id = e.product_id and p.slug = 'mwp-field-guides' and e.customer_id = v_customer and e.order_id is null;
  else
    update public.entitlements e set revoked_at = now()
      from public.products p
     where p.id = e.product_id and p.slug in ('mwp-presets', 'mwp-lightroom-plugin', 'mwp-panel', 'mwp-field-guides')
       and e.customer_id = v_customer and e.order_id is null and e.revoked_at is null;
  end if;

  begin
    perform public.call_scheduler('tester', jsonb_build_object('tester_id', p_tester, 'action', 'removed'));
  exception when others then
    raise warning 'remove_tester: monday update not sent: %', sqlerrm;
  end;
end $$;
revoke all on function public.remove_tester(uuid) from public, anon;
grant execute on function public.remove_tester(uuid) to authenticated;   -- checked inside: admins only
