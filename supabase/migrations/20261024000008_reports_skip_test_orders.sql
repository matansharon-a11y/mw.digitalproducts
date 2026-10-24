-- ============================================================================
-- Launch audit (24 Oct 2026): the admin dashboard leaves Lemon Squeezy test-mode orders out.
-- 20261024000001 said the reports skip them, but admin_stats and admin_customers still counted them as paid
-- sales. Test orders stay in the database (they're the record of the checks before launch); every total
-- now ignores them, and the Orders tab marks them "Test order" (admin_orders gains test_mode, at the end).
-- ============================================================================

create or replace function public.admin_stats(p_days integer default 30)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := date_trunc('day', now()) - make_interval(days => greatest(p_days, 1) - 1);
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'period_days', p_days,
    'revenue', coalesce((
      select jsonb_agg(jsonb_build_object('currency', currency, 'cents', cents) order by cents desc)
      from (select currency, sum(total_cents) as cents
            from orders where status = 'paid' and not test_mode and created_at >= since
            group by currency) r), '[]'::jsonb),
    'orders_paid',     (select count(*) from orders where status = 'paid' and not test_mode and created_at >= since),
    'orders_refunded', (select count(*) from orders where status <> 'paid' and not test_mode and created_at >= since),
    'new_customers',   (select count(*) from customers where created_at >= since),
    'new_subscribers', (select count(*) from subscribers where created_at >= since),
    'downloads',       (select count(*) from downloads where created_at >= since),
    'open_tickets',    (select count(*) from support_tickets where status <> 'resolved'),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d::date, 'orders', coalesce(o.n, 0)) order by d)
      from generate_series(since, date_trunc('day', now()), interval '1 day') d
      left join (select date_trunc('day', created_at) as day, count(*) as n
                 from orders where status = 'paid' and not test_mode and created_at >= since group by 1) o on o.day = d), '[]'::jsonb),
    'top_products', coalesce((
      select jsonb_agg(t order by t.units desc)
      from (select p.name, o.currency, count(*) as units, sum(oi.price_cents) as cents
            from order_items oi
            join orders o on o.id = oi.order_id and o.status = 'paid' and not o.test_mode and o.created_at >= since
            join products p on p.id = oi.product_id
            group by p.name, o.currency order by units desc limit 5) t), '[]'::jsonb)
  ) into result;

  return result;
end $$;

revoke all on function public.admin_stats(integer) from public, anon;
grant execute on function public.admin_stats(integer) to authenticated;

create or replace view public.admin_orders
with (security_invoker = true) as
select o.id, o.order_number, o.checkout_order_id, o.created_at, o.status,
       o.total_cents, o.currency, o.discount_code, o.source,
       c.email, c.name, c.country,
       (select string_agg(p.name, ', ' order by p.name)
          from order_items oi join products p on p.id = oi.product_id
         where oi.order_id = o.id) as products,
       o.test_mode
from public.orders o
join public.customers c on c.id = o.customer_id;

create or replace view public.admin_customers
with (security_invoker = true) as
select c.id, c.email, c.name, c.country, c.marketing_opt_in, c.created_at,
       count(o.id) filter (where o.status = 'paid' and not o.test_mode)                     as paid_orders,
       coalesce(sum(o.total_cents) filter (where o.status = 'paid' and not o.test_mode), 0) as lifetime_cents,
       max(o.created_at) filter (where not o.test_mode)                                     as last_order_at
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id;
