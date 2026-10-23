-- MWP Presets and the Lightroom Classic plugin are sold only together, as one purchase (Jeinna, 23 Oct 2026; replaces
-- the separate sale from 20261023000002). The plugin stays a product of its own in the database (its file, version and
-- tutorials, its own row in My downloads), but nothing sells it alone: buying MWP Presets unlocks it (checkout-webhook
-- BUNDLES), like every bundle with MWP Presets. The price of MWP Presets is set in the admin (Matan's).
--
-- The plugin is still never free: testers and ambassadors get MWP Presets without it (20261023000003 stays).

-- whoever bought MWP Presets gets the plugin with the same order (a refund of that order takes both back)
insert into public.entitlements (customer_id, product_id, order_id, granted_at, revoked_at, view_only)
select e.customer_id, (select id from public.products where slug = 'mwp-lightroom-plugin'), e.order_id, e.granted_at, null, false
  from public.entitlements e
 where e.product_id = (select id from public.products where slug = 'mwp-presets')
   and e.order_id is not null and e.revoked_at is null
on conflict (customer_id, product_id) do update
  set order_id = excluded.order_id, revoked_at = null, view_only = false
  where public.entitlements.revoked_at is not null or public.entitlements.order_id is null;
