-- ============================================================================
-- Getting ready for Dodo Payments (Jeinna, 24 Nov 2026). Lemon Squeezy shuts down for every seller on 31 March 2027
-- (new sign-ups closed 16 Nov 2026) and its replacement, Stripe Managed Payments, doesn't list Israel. Dodo does,
-- and its checkout speaks Hebrew, takes several products in one payment and stacks discount codes.
-- This only adds: Lemon Squeezy keeps selling exactly as before until the switch below is set to 'dodo'.
--   orders.provider           which payment provider an order came through
--   products.dodo_product_id  the product at Dodo (live); dodo_test_product_id (Dodo's separate test catalogue)
--   shop_settings             checkout_provider: 'lemonsqueezy' (now) or 'dodo' (after Dodo approves the store)
--   checkout_provider view    the same value for the cart (public: it's only the provider's name)
-- ============================================================================

alter table public.orders add column if not exists provider text not null default 'lemonsqueezy';
alter table public.orders drop constraint if exists orders_provider_check;
alter table public.orders add constraint orders_provider_check check (provider in ('lemonsqueezy', 'dodo'));

alter table public.products add column if not exists dodo_product_id text unique;
alter table public.products add column if not exists dodo_test_product_id text unique;

create table if not exists public.shop_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.shop_settings enable row level security;   -- read by the functions (service role) and the functions below
insert into public.shop_settings (key, value) values ('checkout_provider', 'lemonsqueezy') on conflict (key) do nothing;

-- The cart reads which provider takes payments (one checkout for the whole cart and stacked codes with Dodo)
create or replace view public.checkout_provider with (security_invoker = false) as
  select value as provider from public.shop_settings where key = 'checkout_provider';
grant select on public.checkout_provider to anon, authenticated;

-- The admin's switch: which provider new checkouts go to. Orders already paid are untouched either way.
create or replace function public.admin_set_checkout_provider(p_provider text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'admins only'; end if;
  if p_provider not in ('lemonsqueezy', 'dodo') then raise exception 'unknown provider'; end if;
  if p_provider = 'dodo' and exists (
       select 1 from public.products where is_active and price_cents > 0 and checkout_url is not null
          and dodo_product_id is null) then
    raise exception 'Some products are not at Dodo yet: run "Connect Dodo" first';
  end if;
  update public.shop_settings set value = p_provider, updated_at = now(), updated_by = auth.jwt() ->> 'email'
   where key = 'checkout_provider';
  return p_provider;
end $$;
revoke all on function public.admin_set_checkout_provider(text) from public, anon;
grant execute on function public.admin_set_checkout_provider(text) to authenticated;

-- The admin's affiliates list: "has_code" means the code exists at the provider that takes payments now
create or replace function public.admin_affiliates()
returns table (
  id uuid, name text, email text, lang text, instagram text, code text, rate numeric, status text,
  invited_at timestamptz, accepted_at timestamptz, starts_on date, ends_on date, ended_at timestamptz, end_reason text,
  has_code boolean, sales integer, on_hold_cents integer, ready_cents integer, paid_cents integer, last_sale timestamptz
)
language sql stable security definer set search_path = public as $$
  select a.id, a.name, a.email, a.lang, a.instagram, a.code, a.rate, a.status,
         a.invited_at, a.accepted_at, a.starts_on, a.ends_on, a.ended_at, a.end_reason,
         a.provider_codes ? coalesce((select value from public.shop_settings where key = 'checkout_provider'), 'lemonsqueezy'),
         count(c.id) filter (where c.status <> 'void')::int,
         coalesce(sum(c.amount_cents) filter (where c.status = 'pending' and c.available_at > now()), 0)::int,
         coalesce(sum(c.amount_cents) filter (where c.status = 'pending' and c.available_at <= now()), 0)::int,
         coalesce(sum(c.amount_cents) filter (where c.status = 'paid'), 0)::int,
         max(c.created_at) filter (where c.status <> 'void')
    from public.affiliates a
    left join public.affiliate_commissions c on c.affiliate_id = a.id
   where coalesce(public.is_admin(), false)
   group by a.id
   order by (a.status = 'ended'), a.invited_at desc;
$$;
revoke all on function public.admin_affiliates() from public, anon;
grant execute on function public.admin_affiliates() to authenticated;   -- checked inside: admins only
