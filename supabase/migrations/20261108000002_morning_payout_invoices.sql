-- Morning, the usual way for Israeli Lemon Squeezy sellers (Jeinna, 8 Nov 2026: "let's do what normal Israelis do").
-- Lemon Squeezy is the merchant of record: it sells to the buyer and gives the buyer its receipt. The Israeli business
-- has one customer, Lemon Squeezy, and invoices it once per payout: the money paid out for each sale ("Net Total (USD)"
-- in the payout's CSV: after Lemon Squeezy's fee and refunds), with 18% VAT included for sales to buyers in Israel and
-- 0% for buyers abroad (the method of the community tool arbel03/lemonsqueezy-israeli-vat-report).
--   * per-buyer documents stop (mode off); the three issued on 8 Nov 2026 are cancelled with credit notes (330) from
--     the admin, previewed first
--   * kind 'payout': one tax invoice-receipt (320) to Lemon Squeezy per payout, made from the uploaded payout CSV
--   * kind 'credit_note': cancels a buyer's invoice-receipt (linked to it)
-- All of them go through the same scheduler + Make pipeline (morning.ts): a preview first, real only on "Issue".

alter table public.morning_documents alter column order_id drop not null;
alter table public.morning_documents drop constraint if exists morning_documents_kind_check;
alter table public.morning_documents add constraint morning_documents_kind_check
  check (kind in ('invoice_receipt', 'work_order', 'payout', 'credit_note'));
alter table public.morning_documents drop constraint if exists morning_documents_doc_type_check;
alter table public.morning_documents add constraint morning_documents_doc_type_check check (doc_type in (320, 100, 330));
alter table public.morning_documents
  add column if not exists payout_date date,
  add column if not exists payout_rows jsonb,     -- the CSV's lines: [{date, sale, order_id, net_cents}]
  add column if not exists summary jsonb,         -- what the document holds: Israeli / abroad totals, VAT, unmatched lines
  add column if not exists linked_id uuid references public.morning_documents(id);   -- a credit note's original
create unique index if not exists morning_documents_payout_uq on public.morning_documents (payout_date) where kind = 'payout';
-- the payout and credit-note rows are never picked up by the per-buyer job, whatever its mode

-- no more per-buyer documents
update public.morning_settings set mode = 'off', updated_at = now(), updated_by = 'migration 20261108000002' where id = 1;

-- Upload a payout: its date and lines (from the CSV, parsed in the admin page); makes / replaces the not-yet-issued
-- document for that payout and asks Morning for a preview.
create or replace function public.morning_payout_upload(p_date date, p_rows jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_status text;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not authorised' using errcode = '42501'; end if;
  if p_date is null or p_date > (now() at time zone 'Asia/Jerusalem')::date then raise exception 'The payout date can''t be in the future.'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 or jsonb_array_length(p_rows) > 5000 then
    raise exception 'The file has no payout lines.';
  end if;
  select id, status into v_id, v_status from morning_documents where kind = 'payout' and payout_date = p_date;
  if v_status = 'issued' then raise exception 'This payout''s invoice is already issued.'; end if;
  if v_status = 'sending' then raise exception 'Morning is working on this payout. Give it a minute.'; end if;
  if v_id is null then
    insert into morning_documents (kind, doc_type, status, payload, payout_date, payout_rows, action)
    values ('payout', 320, 'waiting', '{}'::jsonb, p_date, p_rows, 'preview') returning id into v_id;
  else
    update morning_documents set payout_rows = p_rows, payload = '{}'::jsonb, summary = null, status = 'waiting',
           action = 'preview', error = null, preview_pdf = null, attempts = 0 where id = v_id;
  end if;
  perform public.call_scheduler('morning_send', jsonb_build_object('id', v_id));
  return v_id;
end $$;

-- Cancel a buyer's issued invoice-receipt with a credit note (a preview first).
create or replace function public.morning_credit_note(p_order uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_orig record; v_id uuid; v_status text;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not authorised' using errcode = '42501'; end if;
  select * into v_orig from morning_documents where order_id = p_order and kind = 'invoice_receipt' and status = 'issued';
  if not found then raise exception 'This order has no issued invoice-receipt to cancel.'; end if;
  select id, status into v_id, v_status from morning_documents where order_id = p_order and kind = 'credit_note';
  if v_status = 'issued' then raise exception 'This invoice-receipt is already cancelled.'; end if;
  if v_status = 'sending' then raise exception 'Morning is working on this. Give it a minute.'; end if;
  if v_id is null then
    insert into morning_documents (order_id, kind, doc_type, status, payload, linked_id, action)
    values (p_order, 'credit_note', 330, 'waiting', '{}'::jsonb, v_orig.id, 'preview') returning id into v_id;
  else
    update morning_documents set status = 'waiting', action = 'preview', error = null, attempts = 0 where id = v_id;
  end if;
  perform public.call_scheduler('morning_send', jsonb_build_object('id', v_id));
  return v_id;
end $$;

-- Preview again, or issue for real, a payout invoice or a credit note that has a preview.
create or replace function public.morning_send(p_id uuid, p_action text)
returns text language plpgsql security definer set search_path = public as $$
declare v record;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not authorised' using errcode = '42501'; end if;
  if p_action not in ('preview', 'create') then raise exception 'unknown action'; end if;
  select * into v from morning_documents where id = p_id and kind in ('payout', 'credit_note');
  if not found then raise exception 'unknown document'; end if;
  if v.status = 'issued' then return 'Already issued.'; end if;
  if v.status = 'sending' then return 'Morning is working on it. Give it a minute.'; end if;
  update morning_documents set action = p_action, status = 'waiting', error = null where id = p_id;
  perform public.call_scheduler('morning_send', jsonb_build_object('id', p_id));
  return case when p_action = 'create' then 'Issuing in Morning. It appears here in a minute.' else 'Asking Morning for a preview.' end;
end $$;

revoke all on function public.morning_payout_upload(date, jsonb) from public, anon;
revoke all on function public.morning_credit_note(uuid) from public, anon;
revoke all on function public.morning_send(uuid, text) from public, anon;
grant execute on function public.morning_payout_upload(date, jsonb) to authenticated;
grant execute on function public.morning_credit_note(uuid) to authenticated;
grant execute on function public.morning_send(uuid, text) to authenticated;
