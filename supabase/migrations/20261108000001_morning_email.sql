-- Email a Morning invoice-receipt to the buyer from the admin (Jeinna, 8 Nov 2026): Sales → Orders → Documents and
-- Sales → Morning invoices get "Email to buyer" on an issued invoice-receipt. The admin-docs function hands Make's
-- email scenario a one-time code (purpose mdoc:<document>), the scheduler builds the email with the document's own
-- Morning link (docs.ts), and the time and address are kept here. The work order is internal and never emailed.
alter table public.morning_documents
  add column if not exists emailed_at timestamptz,
  add column if not exists emailed_to text;
