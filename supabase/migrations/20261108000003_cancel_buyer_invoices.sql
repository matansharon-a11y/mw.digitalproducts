-- Cancel the per-buyer invoice-receipts issued on 8 Nov 2026 (60025–60027) with credit notes (Jeinna, 8 Nov 2026:
-- "delete previous invoices which is not right"). Issued tax documents can't be deleted, only cancelled with a credit
-- note (330) linked to the original. The scheduler's 5-minute Morning job issues waiting credit notes and payout
-- invoices (morning.ts); nothing is ever emailed to the buyers. The work orders (internal, not tax documents) stay.
insert into public.morning_documents (order_id, kind, doc_type, status, payload, linked_id, action)
select d.order_id, 'credit_note', 330, 'waiting', '{}'::jsonb, d.id, 'create'
  from public.morning_documents d
 where d.kind = 'invoice_receipt' and d.status = 'issued'
   and not exists (select 1 from public.morning_documents c where c.order_id = d.order_id and c.kind = 'credit_note');
