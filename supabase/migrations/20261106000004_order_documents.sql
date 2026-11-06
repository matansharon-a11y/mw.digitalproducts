-- Receipts and invoices from the admin (Jeinna, 6 Nov 2026). Lemon Squeezy is the merchant of record: the receipt and
-- the invoice are its documents, made from the order (its API: the order's receipt link, and
-- POST /v1/orders/:id/generate-invoice, which needs the buyer's billing address). The admin function "admin-docs"
-- makes / fetches them and can email the customer; every one is kept here against its order.
create table public.order_documents (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  kind        text not null check (kind in ('receipt', 'invoice')),
  url         text not null check (url ~ '^https://([a-z0-9-]+\.)*lemonsqueezy\.com/'),
  billing     jsonb,                 -- the address on an invoice (name, address, city, state, zip_code, country, notes)
  created_at  timestamptz not null default now(),
  emailed_at  timestamptz,
  emailed_to  text
);
create index order_documents_order_idx on public.order_documents (order_id, created_at desc);
alter table public.order_documents enable row level security;
create policy order_documents_admin on public.order_documents for select using (public.is_admin());

