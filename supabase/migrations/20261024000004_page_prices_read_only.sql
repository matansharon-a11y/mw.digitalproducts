-- page_prices is read-only for the public (launch audit, 24 Oct 2026).
-- The view reads one table, so Postgres lets writes pass through it, and it runs as its owner
-- (no RLS). Supabase's default privileges had given anon and authenticated ALL on it; revoking
-- from public didn't remove that. With only the public key, anyone could change a product's
-- price or checkout link, or delete products. Now the browser can only read it.
revoke all on public.page_prices from public, anon, authenticated;
grant select on public.page_prices to anon, authenticated;
