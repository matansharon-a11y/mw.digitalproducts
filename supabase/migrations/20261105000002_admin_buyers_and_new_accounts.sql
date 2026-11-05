-- Admin overview (Jeinna, 5 Nov 2026): "New customers" read like buyers, but it counts every new customer record
-- (accounts, free-guide sign-ups, ambassadors, testers). The tile becomes "New accounts" (admin.js) and a "Buyers"
-- tile shows the people who paid in the period (admin_stats.buyers). admin_new_accounts() lists the new accounts
-- that haven't bought yet, with how they came, so they can be followed up.

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
    -- people who paid in the period (not test orders), each counted once
    'buyers',          (select count(distinct customer_id) from orders where status = 'paid' and not test_mode and created_at >= since),
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

create or replace function public.admin_new_accounts(p_days integer default 30)
returns table (email text, name text, created_at timestamptz, came_from text, marketing_opt_in boolean, phone text)
language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := date_trunc('day', now()) - make_interval(days => greatest(p_days, 1) - 1);
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  return query
    select c.email, coalesce(c.name, ''), c.created_at,
           case when exists (select 1 from beta_members b where b.customer_id = c.id) then 'Ambassador'
                when exists (select 1 from testers t where t.customer_id = c.id) then 'Tester'
                when exists (select 1 from subscribers s where lower(s.email) = c.email and s.source = 'free-guide') then 'Free guide'
                when c.auth_user_id is not null then 'Account'
                else 'Other' end,
           (c.marketing_opt_in or exists (select 1 from subscribers s2 where lower(s2.email) = c.email and s2.consent)), c.phone
      from customers c
     where c.created_at >= since
       and not exists (select 1 from orders o where o.customer_id = c.id and o.status = 'paid' and not o.test_mode)
       and not exists (select 1 from admin_allowlist a where lower(a.email) = c.email)
     order by c.created_at desc;
end $$;
revoke all on function public.admin_new_accounts(integer) from public, anon;
grant execute on function public.admin_new_accounts(integer) to authenticated;
