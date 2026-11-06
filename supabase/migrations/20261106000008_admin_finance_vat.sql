-- Admin → Finances shows the Israeli VAT inside the price (Jeinna, 6 Nov 2026): admin_finance also returns the order's
-- vat_rate (0.18 for Israeli buyers, migration 20261106000006), and the page works out the VAT in each total.
drop function if exists public.admin_finance(timestamptz, timestamptz);
create function public.admin_finance(p_from timestamptz, p_to timestamptz)
returns table (created_at timestamptz, order_number text, email text, products text, status text,
               subtotal_cents integer, tax_cents integer, total_cents integer, currency text, discount_code text,
               vat_rate numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  return query
    select o.created_at, o.order_number, c.email,
           (select string_agg(p.name || coalesce(' ' || p.name_emphasis, ''), ', ' order by p.name)
              from order_items oi join products p on p.id = oi.product_id where oi.order_id = o.id),
           o.status, o.subtotal_cents, o.tax_cents, o.total_cents, o.currency, o.discount_code, o.vat_rate
      from orders o join customers c on c.id = o.customer_id
     where not o.test_mode and o.created_at >= p_from and o.created_at < p_to
     order by o.created_at desc;
end $$;
revoke all on function public.admin_finance(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_finance(timestamptz, timestamptz) to authenticated;
