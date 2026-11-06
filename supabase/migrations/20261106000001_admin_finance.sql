-- Admin → Finances (Jeinna, 6 Nov 2026): the orders of a period with what the customer paid and the tax in it, for the
-- gross / tax / Lemon Squeezy fee / net report. Lemon Squeezy's API gives no fee or net per order, so the admin page
-- estimates the fee from Lemon Squeezy's published rates (admin.js, FEES). Test orders are left out. Admins only.
create or replace function public.admin_finance(p_from timestamptz, p_to timestamptz)
returns table (created_at timestamptz, order_number text, email text, products text, status text,
               subtotal_cents integer, tax_cents integer, total_cents integer, currency text, discount_code text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  return query
    select o.created_at, o.order_number, c.email,
           (select string_agg(p.name || coalesce(' ' || p.name_emphasis, ''), ', ' order by p.name)
              from order_items oi join products p on p.id = oi.product_id where oi.order_id = o.id),
           o.status, o.subtotal_cents, o.tax_cents, o.total_cents, o.currency, o.discount_code
      from orders o join customers c on c.id = o.customer_id
     where not o.test_mode and o.created_at >= p_from and o.created_at < p_to
     order by o.created_at desc;
end $$;
revoke all on function public.admin_finance(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_finance(timestamptz, timestamptz) to authenticated;
