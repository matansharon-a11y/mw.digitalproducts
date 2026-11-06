-- The two paid orders from before Israeli VAT was recorded (Jeinna, with Matan's decision, 6 Nov 2026): their
-- price includes 18% Israeli VAT, like every Israeli order from now on. Their Morning previews (never issued) are
-- removed, so the next Morning run (within 5 minutes) makes new previews with the VAT broken out.
update public.orders set vat_rate = 0.18
 where order_number in ('5026372', '5026373') and status = 'paid' and not test_mode and created_at >= '2026-11-01';

delete from public.morning_documents d
 using public.orders o
 where d.order_id = o.id and d.status <> 'issued'
   and o.order_number in ('5026372', '5026373') and o.status = 'paid' and not o.test_mode and o.created_at >= '2026-11-01';
