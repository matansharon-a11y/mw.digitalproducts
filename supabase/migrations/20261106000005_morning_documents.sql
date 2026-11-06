-- Morning (Green Invoice) documents for every shop sale (Matan, 6 Nov 2026: "Lemon is invoice app. But I need to issue
-- via morning"; Jeinna chose: a tax invoice-receipt (320) and a work order (100), automatically for every sale).
--
-- How it runs: every 5 minutes the scheduler (job "morning", morning.ts) looks for paid shop orders that need their
-- documents, writes each document here with the exact JSON it will send, and hands Make's scenario
-- "MWP Shop · Morning documents" a one-time code. Make asks the scheduler for the documents (morning_list), signs in to
-- Morning with the keys in its data store (the same ones as Matan's "Morning documents from chat"), and sends each
-- one: as a PREVIEW (Morning makes the PDF marked "Demo only", nothing is issued) or as a real document; then it hands
-- the answer back (morning_result).
--
-- The mode decides what happens (admin → Settings → Morning):
--   off      nothing at all
--   preview  every new sale gets PREVIEWS only. The admin can issue one order with "Issue in Morning" (the default:
--            nothing is issued until Matan confirms the VAT and document settings with the accountant)
--   issue    every new sale is issued in Morning automatically
-- Issued documents can't be deleted in Morning (only cancelled with a credit note), so a document is never issued twice:
-- one row per order and kind, and a row that reached "issued" never goes back.
create table public.morning_settings (
  id              int primary key default 1 check (id = 1),
  mode            text not null default 'preview' check (mode in ('off', 'preview', 'issue')),
  email_customer  boolean not null default false,   -- give Morning the buyer's email on the invoice-receipt (Morning emails it)
  payment_type    int not null default 3,            -- Morning payment method: 3 = credit card (Lemon Squeezy takes cards and PayPal)
  vat_israel      int not null default 1,            -- income line VAT for buyers in Israel: 1 = the price includes VAT
  vat_abroad      int not null default 2,            -- for buyers abroad: 2 = exempt (VAT 0%)
  start_from      timestamptz not null default '2026-11-01 00:00+02',  -- automatic runs only take orders paid from here on
  updated_at      timestamptz not null default now(),
  updated_by      text
);
insert into public.morning_settings (id) values (1);
alter table public.morning_settings enable row level security;
create policy morning_settings_admin on public.morning_settings for select using (public.is_admin());

create table public.morning_documents (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete restrict,
  kind        text not null check (kind in ('invoice_receipt', 'work_order')),
  doc_type    int not null check (doc_type in (320, 100)),
  status      text not null default 'waiting'
              check (status in ('waiting', 'preview', 'queued', 'sending', 'issued', 'failed')),
  -- waiting: prepared, not sent yet · preview: Morning made the demo PDF · queued: the admin asked to issue it ·
  -- sending: handed to Make · issued: a real Morning document · failed: Morning or Make refused (error says why)
  action      text check (action in ('preview', 'create')),  -- what the last send asked Morning to do
  payload     jsonb not null,                       -- exactly what goes to Morning
  preview_pdf text,                                 -- the demo PDF (base64), until it's issued
  morning_id  text,
  number      text,
  url         text check (url is null or url ~ '^https://([a-z0-9-]+\.)*(greeninvoice\.co\.il|morning\.co)/'),
  error       text,
  attempts    int not null default 0,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  issued_at   timestamptz,
  unique (order_id, kind)
);
create index morning_documents_status_idx on public.morning_documents (status, created_at);
alter table public.morning_documents enable row level security;
create policy morning_documents_admin on public.morning_documents for select using (public.is_admin());

-- An issued document stays issued: nothing may change its Morning id, number or status afterwards.
create or replace function public.morning_documents_guard()
returns trigger language plpgsql as $$
begin
  if old.status = 'issued' and (new.status <> 'issued' or new.morning_id is distinct from old.morning_id
     or new.number is distinct from old.number or new.payload is distinct from old.payload) then
    raise exception 'an issued Morning document can''t be changed';
  end if;
  return new;
end $$;
create trigger morning_documents_guard before update on public.morning_documents
  for each row execute function public.morning_documents_guard();

-- Orders the admin asked about from Sales → Orders: "Preview in Morning" (a demo PDF) or "Issue in Morning" (the real
-- documents). The scheduler takes these whatever the mode, except "off".
create table public.morning_issue_requests (
  order_id      uuid primary key references public.orders(id) on delete cascade,
  action        text not null default 'create' check (action in ('preview', 'create')),
  requested_at  timestamptz not null default now()
);
alter table public.morning_issue_requests enable row level security;   -- service role only

-- Admin: the mode and the email choice. Turning on "issue" is Matan's decision (money and documents), so the admin
-- page asks for that confirmation first.
create or replace function public.morning_set_settings(p_mode text, p_email_customer boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not authorised' using errcode = '42501'; end if;
  if p_mode not in ('off', 'preview', 'issue') then raise exception 'unknown mode'; end if;
  update morning_settings set mode = p_mode, email_customer = coalesce(p_email_customer, false),
         -- switching on from "off" doesn't reach back to the sales made while it was off
         start_from = case when mode = 'off' and p_mode <> 'off' then now() else start_from end,
         updated_at = now(), updated_by = auth.jwt() ->> 'email'
   where id = 1;
end $$;

-- Admin: preview or issue one order's documents in Morning now (also an order from before, or one that failed).
create or replace function public.morning_request(p_order uuid, p_action text)
returns text language plpgsql security definer set search_path = public as $$
declare o record;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not authorised' using errcode = '42501'; end if;
  select id, status, test_mode into o from orders where id = p_order;
  if not found then raise exception 'unknown order'; end if;
  if p_action not in ('preview', 'create') then raise exception 'unknown action'; end if;
  if (select mode from morning_settings where id = 1) = 'off' then return 'Morning documents are switched off (Settings → Morning).'; end if;
  if o.status <> 'paid' then return 'Only a paid order gets Morning documents.'; end if;
  if o.test_mode then return 'A test order never gets Morning documents.'; end if;
  if exists (select 1 from morning_documents where order_id = p_order and status = 'issued' and kind = 'work_order')
     and exists (select 1 from morning_documents where order_id = p_order and status = 'issued' and kind = 'invoice_receipt') then
    return 'This order''s documents are already issued.';
  end if;
  if exists (select 1 from morning_documents where order_id = p_order and status = 'sending' and sent_at > now() - interval '20 minutes') then
    return 'Morning is working on this order. Give it a minute.';
  end if;
  insert into morning_issue_requests (order_id, action) values (p_order, p_action)
    on conflict (order_id) do update set action = excluded.action, requested_at = now();
  perform public.call_scheduler('morning', jsonb_build_object('order_id', p_order));
  return case when p_action = 'create' then 'Issuing in Morning. The documents appear here in a minute.'
              else 'Asking Morning for a preview. It appears here in a minute.' end;
end $$;

revoke all on function public.morning_set_settings(text, boolean) from public, anon;
revoke all on function public.morning_request(uuid, text) from public, anon;
grant execute on function public.morning_set_settings(text, boolean) to authenticated;
grant execute on function public.morning_request(uuid, text) to authenticated;

-- Every 5 minutes. The scheduler only calls Make when there's something to send.
select cron.schedule('mwp-morning-documents', '*/5 * * * *', $$ select public.call_scheduler('morning') $$);
