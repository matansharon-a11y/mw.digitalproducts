-- ============================================================================
-- Getting ready for Creem (Jeinna, 24 Nov 2026). Lemon Squeezy shuts down for every seller on 31 March 2027
-- (new sign-ups closed 16 Nov 2026) and its replacement, Stripe Managed Payments, doesn't list Israel. Creem does.
-- This only adds: Lemon Squeezy keeps selling exactly as before until the switch below is set to 'creem'.
--   orders.provider            which payment provider an order came through
--   products.creem_product_id  the product at Creem (live), creem_test_product_id (Creem's separate test catalogue)
--   shop_settings              checkout_provider: 'lemonsqueezy' (now) or 'creem' (after Creem approves the store)
-- ============================================================================

alter table public.orders add column if not exists provider text not null default 'lemonsqueezy';
alter table public.orders drop constraint if exists orders_provider_check;
alter table public.orders add constraint orders_provider_check check (provider in ('lemonsqueezy', 'creem'));

alter table public.products add column if not exists creem_product_id text unique;
alter table public.products add column if not exists creem_test_product_id text unique;

create table if not exists public.shop_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.shop_settings enable row level security;   -- read by the functions (service role) and the admin functions below
insert into public.shop_settings (key, value) values ('checkout_provider', 'lemonsqueezy') on conflict (key) do nothing;

-- The admin's switch: which provider new checkouts go to. Orders already paid are untouched either way.
create or replace function public.admin_checkout_provider()
returns text language sql stable security definer set search_path = public as $$
  select value from public.shop_settings where key = 'checkout_provider' and coalesce(public.is_admin(), false);
$$;
revoke all on function public.admin_checkout_provider() from public, anon;
grant execute on function public.admin_checkout_provider() to authenticated;

create or replace function public.admin_set_checkout_provider(p_provider text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'admins only'; end if;
  if p_provider not in ('lemonsqueezy', 'creem') then raise exception 'unknown provider'; end if;
  if p_provider = 'creem' and exists (
       select 1 from public.products where is_active and price_cents > 0 and checkout_url is not null
          and creem_product_id is null) then
    raise exception 'Some products are not at Creem yet: run "Connect Creem" first';
  end if;
  update public.shop_settings set value = p_provider, updated_at = now(), updated_by = auth.jwt() ->> 'email'
   where key = 'checkout_provider';
  return p_provider;
end $$;
revoke all on function public.admin_set_checkout_provider(text) from public, anon;
grant execute on function public.admin_set_checkout_provider(text) to authenticated;
