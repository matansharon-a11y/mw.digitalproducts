-- Countries for everyone, and pop-up sign-ups apart from customers (Jeinna, 7 Nov 2026).
--   * orders.country: the billing country the buyer gave at Lemon Squeezy's checkout (checkout-webhook for new orders,
--     the hourly reconcile job fills in older ones, _shared/lscountry.ts).
--   * subscribers.country: the pop-up sign-up's country (the network's country header, else the device's time zone).
--   * customers.signup_country: an account's country from the device's time zone at sign-up (user metadata "country").
--   * The admin shows one country per person: My details' country (or the billing country, which fills an empty one),
--     else the order's, else the sign-up's.
--   * admin_signups: the free-guide pop-up sign-ups (People → Sign-ups); admin_customers says which customers are
--     only that (signed up through the pop-up, never bought), so the Customers tab can leave them out.
--   * admin_orders: the full product name ("MWP Presets", not "MWP"), and the order's country.
alter table public.orders      add column if not exists country text check (country ~ '^[A-Z]{2}$');
alter table public.subscribers add column if not exists country text check (country ~ '^[A-Z]{2}$');
alter table public.customers   add column if not exists signup_country text check (signup_country ~ '^[A-Z]{2}$');

-- an account's country from its sign-up (runs after the triggers that create / link the customer record)
create or replace function public.customer_signup_country()
returns trigger language plpgsql security definer set search_path = public as $$
declare v text := upper(coalesce(new.raw_user_meta_data ->> 'country', ''));
begin
  if v ~ '^[A-Z]{2}$' then
    update customers set signup_country = v
     where signup_country is null and (auth_user_id = new.id or email = lower(new.email));
  end if;
  return new;
end $$;
drop trigger if exists zz_on_auth_user_signup_country on auth.users;
create trigger zz_on_auth_user_signup_country
  after insert or update of email_confirmed_at, last_sign_in_at on auth.users
  for each row execute function public.customer_signup_country();

create or replace view public.admin_orders
with (security_invoker = true) as
select o.id, o.order_number, o.checkout_order_id, o.created_at, o.status,
       o.total_cents, o.currency, o.discount_code, o.source,
       c.email, c.name, coalesce(o.country, c.country, c.signup_country) as country,
       (select string_agg(p.name || coalesce(' ' || p.name_emphasis, ''), ', ' order by p.sort_order, p.name)
          from order_items oi join products p on p.id = oi.product_id
         where oi.order_id = o.id) as products,
       o.test_mode
from public.orders o
join public.customers c on c.id = o.customer_id;

create or replace view public.admin_customers
with (security_invoker = true) as
select c.id, c.email, c.name,
       coalesce(c.country,
                (select o.country from orders o where o.customer_id = c.id and o.country is not null order by o.created_at desc limit 1),
                c.signup_country,
                (select s.country from subscribers s where s.email = c.email)) as country,
       c.marketing_opt_in, c.created_at,
       count(o.id) filter (where o.status = 'paid' and not o.test_mode)                     as paid_orders,
       coalesce(sum(o.total_cents) filter (where o.status = 'paid' and not o.test_mode), 0) as lifetime_cents,
       max(o.created_at) filter (where not o.test_mode)                                     as last_order_at,
       -- came through the free-guide pop-up and never bought: listed under Sign-ups, not Customers
       (exists (select 1 from subscribers s where s.email = c.email and s.source = 'free-guide')
        and count(o.id) filter (where o.status = 'paid' and not o.test_mode) = 0)           as signup_only
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id;

create or replace view public.admin_signups
with (security_invoker = true) as
select s.id, s.email, s.name, s.phone, s.lang, s.consent, s.created_at, s.confirmed_at,
       coalesce(s.country, c.country, c.signup_country) as country,
       (select count(*) from orders o where o.customer_id = c.id and o.status = 'paid' and not o.test_mode) as paid_orders
from public.subscribers s
left join public.customers c on c.email = s.email
where s.source = 'free-guide';
revoke all on public.admin_signups from anon;
grant select on public.admin_signups to authenticated;   -- rows only for the admin (the tables' own admin policies)

-- Finances: the order's country, so each order's Lemon Squeezy fee uses its own buyer's location
drop function if exists public.admin_finance(timestamptz, timestamptz);
create function public.admin_finance(p_from timestamptz, p_to timestamptz)
returns table (created_at timestamptz, order_number text, email text, products text, status text,
               subtotal_cents integer, tax_cents integer, total_cents integer, currency text, discount_code text,
               vat_rate numeric, country text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  return query
    select o.created_at, o.order_number, c.email,
           (select string_agg(p.name || coalesce(' ' || p.name_emphasis, ''), ', ' order by p.sort_order, p.name)
              from order_items oi join products p on p.id = oi.product_id where oi.order_id = o.id),
           o.status, o.subtotal_cents, o.tax_cents, o.total_cents, o.currency, o.discount_code, o.vat_rate,
           coalesce(o.country, c.country, c.signup_country)
      from orders o join customers c on c.id = o.customer_id
     where not o.test_mode and o.created_at >= p_from and o.created_at < p_to
     order by o.created_at desc;
end $$;
revoke all on function public.admin_finance(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_finance(timestamptz, timestamptz) to authenticated;
