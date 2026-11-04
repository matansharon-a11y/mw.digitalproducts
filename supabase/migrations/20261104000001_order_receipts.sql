-- Receipts in Order history (4 Nov 2026): Lemon Squeezy's receipt link for each order, kept on the order
-- (checkout-webhook saves it) and returned by my_orders(), so My downloads → Order history shows a "Receipt"
-- link per order. Only https links on lemonsqueezy.com are kept, so the page never links anywhere else.
alter table public.orders add column if not exists receipt_url text;
alter table public.orders drop constraint if exists orders_receipt_url_check;
alter table public.orders add constraint orders_receipt_url_check
  check (receipt_url is null or receipt_url ~ '^https://([a-z0-9-]+\.)*lemonsqueezy\.com/');

-- the return type changes, so the function is dropped and made again (same rules as 20261025000003)
drop function if exists public.my_orders();
create function public.my_orders()
returns table (order_number text, created_at timestamptz, total_cents integer, currency text, status text, items text, receipt_url text)
language sql stable security definer set search_path = public as $$
  select o.order_number, o.created_at, o.total_cents, o.currency, o.status,
         string_agg(trim(concat_ws(' ', p.name, p.name_emphasis)), ', ' order by p.sort_order) as items,
         o.receipt_url
    from public.orders o
    join public.customers c on c.id = o.customer_id
    left join public.order_items i on i.order_id = o.id
    left join public.products p on p.id = i.product_id
   where (c.auth_user_id = auth.uid()
          or (auth.uid() is not null and lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', ''))))
     and not o.test_mode
   group by o.id
   order by o.created_at desc
   limit 100;
$$;
revoke all on function public.my_orders() from public, anon, authenticated;
grant execute on function public.my_orders() to authenticated;
