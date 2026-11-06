-- The two paid orders' Morning previews were remade on 6 Nov 2026 by the scheduler that was still running before the
-- VAT code went live, so they came out without VAT. Removed again (never issued): the next Morning run (within 5
-- minutes) remakes them with the 18% VAT broken out (orders.vat_rate 0.18).
delete from public.morning_documents d
 using public.orders o
 where d.order_id = o.id and d.status <> 'issued'
   and o.order_number in ('5026372', '5026373') and o.status = 'paid' and not o.test_mode and o.vat_rate = 0.18;
