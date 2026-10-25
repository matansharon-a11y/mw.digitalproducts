-- Order history in My downloads (25 Oct 2026): the account menu's "Order history" opens /account/#orders.
-- my_orders() returns only the signed-in person's own paid / refunded orders (matched like the library: their login,
-- or their confirmed email), with the names of what each order bought. Test-mode orders are left out. It reads
-- through security definer so a product that's switched off still shows its name; it never takes an id or email from
-- the caller, so nobody can read anyone else's orders.
create or replace function public.my_orders()
returns table (order_number text, created_at timestamptz, total_cents integer, currency text, status text, items text)
language sql stable security definer set search_path = public as $$
  select o.order_number, o.created_at, o.total_cents, o.currency, o.status,
         string_agg(trim(concat_ws(' ', p.name, p.name_emphasis)), ', ' order by p.sort_order) as items
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
