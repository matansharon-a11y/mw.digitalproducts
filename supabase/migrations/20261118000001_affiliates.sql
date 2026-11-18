-- ============================================================================
-- MWP Affiliate Program (Matan, approved 18 Nov 2026; launches January 2027).
-- Invite-only photographers. Each gets a personal code (MWP + name + 10): buyers get 10% off, the affiliate earns
-- 10% of what the buyer paid. A sale counts once its 14-day refund period has passed; refunded sales don't count.
-- Earnings are paid monthly once they reach $100; when an agreement ends, any balance is paid. Affiliates get every
-- MWP tool free (like ambassadors and testers), for a one-year renewable agreement.
--
-- Everything lives in the shop's own tables, not in the payment provider, so the program carries over unchanged
-- when the shop moves from Lemon Squeezy to another provider (only the codes are created again there).
--   affiliates             one row per invited photographer (invite → active → ended)
--   affiliate_payouts      a payment made to an affiliate (by hand: PayPal / bank), after Matan's OK
--   affiliate_commissions  one row per order the affiliate brought (by their code, or their link); a refund voids it
-- A commission is "on hold" until available_at (order date + 14 days), then "ready", then "paid" with its payout.
-- Only the admin reads these (functions below); the affiliate reads their own through my_affiliate().
-- ============================================================================

create table public.affiliates (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  email             text not null check (email = lower(email)),
  lang              text not null default 'en' check (lang in ('en', 'he')),
  instagram         text,
  code              text not null unique check (code ~ '^[A-Z0-9]{4,32}$'),
  rate              numeric not null default 0.10 check (rate > 0 and rate < 1),
  status            text not null default 'invited' check (status in ('invited', 'active', 'ended')),
  customer_id       uuid references public.customers(id) on delete set null,
  invite_token_hash text unique,
  invited_at        timestamptz not null default now(),
  accepted_at       timestamptz,
  terms_version     text,
  ip_hash           text,
  starts_on         date,           -- the code works from this day (1 Jan 2027 at the earliest)
  ends_on           date,           -- one year later (renewable)
  ended_at          timestamptz,
  end_reason        text,
  provider_codes    jsonb not null default '{}'::jsonb,   -- the code at each payment provider: {"lemonsqueezy": {"id": "…"}}
  note              text,
  created_at        timestamptz not null default now()
);
create unique index affiliates_email_open on public.affiliates (email) where status <> 'ended';
create index affiliates_customer_idx on public.affiliates (customer_id);

create table public.affiliate_payouts (
  id           uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  currency     text not null default 'USD',
  method       text,
  note         text,
  paid_at      timestamptz not null default now(),
  recorded_by  text
);
create index affiliate_payouts_aff_idx on public.affiliate_payouts (affiliate_id);

create table public.affiliate_commissions (
  id           uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete restrict,
  order_id     uuid not null unique references public.orders(id) on delete cascade,
  via          text not null check (via in ('code', 'link')),
  base_cents   integer not null check (base_cents >= 0),   -- what the buyer paid (after the discount)
  rate         numeric not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency     text not null default 'USD',
  available_at timestamptz not null,                      -- the order's date + 14 days
  status       text not null default 'pending' check (status in ('pending', 'void', 'paid')),
  void_reason  text,
  payout_id    uuid references public.affiliate_payouts(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index affiliate_commissions_aff_idx on public.affiliate_commissions (affiliate_id);

alter table public.affiliates enable row level security;
alter table public.affiliate_payouts enable row level security;
alter table public.affiliate_commissions enable row level security;
-- no policies: only the service role (functions) and the security-definer functions below read or write them

-- ---------------------------------------------------------------- free access next to the other programs
-- Someone can be an ambassador, a tester and an affiliate at once. Ending one program never takes away the free
-- tools while another is still active.
create or replace function public.has_free_access_role(p_customer uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.beta_members where customer_id = p_customer and status = 'active')
      or exists (select 1 from public.testers where customer_id = p_customer and removed_at is null)
      or exists (select 1 from public.affiliates where customer_id = p_customer and status = 'active');
$$;
revoke all on function public.has_free_access_role(uuid) from public, anon, authenticated;

-- remove_tester: keep the free tools while the person is still an ambassador or an affiliate
create or replace function public.remove_tester(p_tester uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'admins only'; end if;
  update public.testers set removed_at = now() where id = p_tester and removed_at is null
  returning customer_id into v_customer;
  if v_customer is null then return; end if;   -- unknown or already removed

  -- Take back the free access. Anything bought stays. Someone still in another program keeps the tools
  -- (with the guides read-only again).
  if public.has_free_access_role(v_customer) then
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

-- end_ambassador (breach): keep the free tools while the person is still a tester or an affiliate
create or replace function public.end_ambassador(p_member uuid, p_breach boolean)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid;
  v_status text;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'admins only'; end if;
  select customer_id, status into v_customer, v_status from public.beta_members where id = p_member for update;
  if v_customer is null then raise exception 'unknown member'; end if;
  if v_status <> 'active' then return v_status; end if;   -- already ended: nothing to do

  update public.beta_members
     set status = case when p_breach then 'ended_breach' else 'ended' end, ended_at = now()
   where id = p_member;

  if p_breach and not public.has_free_access_role(v_customer) then
    -- Only the free access from the program (no order behind it). Purchases are untouched.
    update public.entitlements set revoked_at = now()
     where customer_id = v_customer and order_id is null and revoked_at is null;
  end if;

  begin
    perform public.call_scheduler('ambassador_status', jsonb_build_object('member_id', p_member));
  exception when others then
    raise warning 'end_ambassador: monday update not sent: %', sqlerrm;
  end;
  return case when p_breach then 'ended_breach' else 'ended' end;
end $$;
revoke all on function public.end_ambassador(uuid, boolean) from public, anon;
grant execute on function public.end_ambassador(uuid, boolean) to authenticated;   -- checked inside: admins only

-- ---------------------------------------------------------------- the admin's view
-- Every affiliate with their numbers. Money in cents. "ready" = past the 14 days and not paid yet.
create or replace function public.admin_affiliates()
returns table (
  id uuid, name text, email text, lang text, instagram text, code text, rate numeric, status text,
  invited_at timestamptz, accepted_at timestamptz, starts_on date, ends_on date, ended_at timestamptz, end_reason text,
  has_code boolean, sales integer, on_hold_cents integer, ready_cents integer, paid_cents integer, last_sale timestamptz
)
language sql stable security definer set search_path = public as $$
  select a.id, a.name, a.email, a.lang, a.instagram, a.code, a.rate, a.status,
         a.invited_at, a.accepted_at, a.starts_on, a.ends_on, a.ended_at, a.end_reason,
         a.provider_codes ? 'lemonsqueezy',
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

-- One affiliate's sales, newest first
create or replace function public.admin_affiliate_sales(p_affiliate uuid)
returns table (
  id uuid, order_number text, ordered_at timestamptz, product text, buyer text, via text,
  base_cents integer, amount_cents integer, currency text, available_at timestamptz, state text, void_reason text, paid_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select c.id, o.order_number, o.created_at,
         (select string_agg(trim(concat_ws(' ', p.name, p.name_emphasis)), ', ')
            from public.order_items i join public.products p on p.id = i.product_id where i.order_id = o.id),
         cu.email, c.via, c.base_cents, c.amount_cents, c.currency, c.available_at,
         case when c.status = 'void' then 'void' when c.status = 'paid' then 'paid'
              when c.available_at > now() then 'on_hold' else 'ready' end,
         c.void_reason, pay.paid_at
    from public.affiliate_commissions c
    join public.orders o on o.id = c.order_id
    join public.customers cu on cu.id = o.customer_id
    left join public.affiliate_payouts pay on pay.id = c.payout_id
   where coalesce(public.is_admin(), false) and c.affiliate_id = p_affiliate
   order by o.created_at desc
   limit 500;
$$;
revoke all on function public.admin_affiliate_sales(uuid) from public, anon;
grant execute on function public.admin_affiliate_sales(uuid) to authenticated;

-- This month's payout list: who is owed what. Due = ready earnings of $100 or more, or any ready balance once
-- the agreement has ended.
create or replace function public.admin_affiliate_payouts_due()
returns table (affiliate_id uuid, name text, email text, code text, status text, ready_cents integer, sales integer, due boolean)
language sql stable security definer set search_path = public as $$
  select a.id, a.name, a.email, a.code, a.status,
         coalesce(sum(c.amount_cents), 0)::int, count(c.id)::int,
         coalesce(sum(c.amount_cents), 0) >= 10000 or (a.status = 'ended' and coalesce(sum(c.amount_cents), 0) > 0)
    from public.affiliates a
    join public.affiliate_commissions c on c.affiliate_id = a.id and c.status = 'pending' and c.available_at <= now()
   where coalesce(public.is_admin(), false)
   group by a.id
   order by 6 desc;
$$;
revoke all on function public.admin_affiliate_payouts_due() from public, anon;
grant execute on function public.admin_affiliate_payouts_due() to authenticated;

-- Record a payment made to an affiliate (after Matan's OK): every ready earning goes into it. Returns the amount.
create or replace function public.admin_affiliate_record_payout(p_affiliate uuid, p_method text, p_note text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_total integer;
  v_payout uuid;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'admins only'; end if;
  perform 1 from public.affiliates where id = p_affiliate for update;   -- one payout at a time per affiliate
  select coalesce(sum(amount_cents), 0) into v_total from public.affiliate_commissions
   where affiliate_id = p_affiliate and status = 'pending' and available_at <= now();
  if v_total <= 0 then raise exception 'nothing to pay'; end if;
  insert into public.affiliate_payouts (affiliate_id, amount_cents, method, note, recorded_by)
  values (p_affiliate, v_total, nullif(left(trim(coalesce(p_method, '')), 60), ''), nullif(left(trim(coalesce(p_note, '')), 300), ''),
          auth.jwt() ->> 'email')
  returning id into v_payout;
  update public.affiliate_commissions set status = 'paid', payout_id = v_payout
   where affiliate_id = p_affiliate and status = 'pending' and available_at <= now();
  return v_total;
end $$;
revoke all on function public.admin_affiliate_record_payout(uuid, text, text) from public, anon;
grant execute on function public.admin_affiliate_record_payout(uuid, text, text) to authenticated;

-- Payments made, newest first
create or replace function public.admin_affiliate_payments()
returns table (id uuid, affiliate_id uuid, name text, code text, amount_cents integer, currency text, method text, note text, paid_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.affiliate_id, a.name, a.code, p.amount_cents, p.currency, p.method, p.note, p.paid_at
    from public.affiliate_payouts p join public.affiliates a on a.id = p.affiliate_id
   where coalesce(public.is_admin(), false)
   order by p.paid_at desc limit 500;
$$;
revoke all on function public.admin_affiliate_payments() from public, anon;
grant execute on function public.admin_affiliate_payments() to authenticated;

-- ---------------------------------------------------------------- the affiliate's own view (My downloads)
-- Their program, code and numbers, and their latest sales (no buyer details: only the date, the product and the
-- earning). Only for the signed-in person's own email.
create or replace function public.my_affiliate()
returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (
    select a.* from public.affiliates a
      join public.customers c on c.id = a.customer_id
     where a.status in ('active', 'ended')
       and (c.auth_user_id = auth.uid()
            or (auth.uid() is not null and lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', ''))))
     order by (a.status = 'active') desc, a.accepted_at desc
     limit 1
  )
  select jsonb_build_object(
    'code', me.code, 'status', me.status, 'rate', me.rate, 'starts_on', me.starts_on, 'ends_on', me.ends_on,
    'lang', me.lang, 'name', me.name,
    'on_hold_cents', coalesce((select sum(amount_cents) from public.affiliate_commissions where affiliate_id = me.id and status = 'pending' and available_at > now()), 0),
    'ready_cents', coalesce((select sum(amount_cents) from public.affiliate_commissions where affiliate_id = me.id and status = 'pending' and available_at <= now()), 0),
    'paid_cents', coalesce((select sum(amount_cents) from public.affiliate_commissions where affiliate_id = me.id and status = 'paid'), 0),
    'sales', (select count(*) from public.affiliate_commissions where affiliate_id = me.id and status <> 'void'),
    'recent', coalesce((
      select jsonb_agg(r order by r->>'date' desc) from (
        select jsonb_build_object(
          'date', o.created_at,
          'product', (select string_agg(trim(concat_ws(' ', p.name, p.name_emphasis)), ', ')
                        from public.order_items i join public.products p on p.id = i.product_id where i.order_id = o.id),
          'amount_cents', c.amount_cents, 'currency', c.currency, 'available_at', c.available_at,
          'state', case when c.status = 'void' then 'void' when c.status = 'paid' then 'paid'
                        when c.available_at > now() then 'on_hold' else 'ready' end) as r
          from public.affiliate_commissions c join public.orders o on o.id = c.order_id
         where c.affiliate_id = me.id
         order by o.created_at desc limit 50) x), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('paid_at', paid_at, 'amount_cents', amount_cents, 'currency', currency) order by paid_at desc)
                            from public.affiliate_payouts where affiliate_id = me.id), '[]'::jsonb)
  ) from me;
$$;
revoke all on function public.my_affiliate() from public, anon;
grant execute on function public.my_affiliate() to authenticated;
