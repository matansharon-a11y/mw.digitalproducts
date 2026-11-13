-- Field Guides read online only (Matan, 14 Nov 2026: buyers passed the PDF on to others, "like a pirated copy").
-- From now on a purchase of the guides (the set, a single guide, or a bundle with them) gives online reading on
-- shop.mw.photography/read/, not a PDF: entitlements.online_only. The reader works on up to 2 devices per person
-- (license_devices, anchored on the guides' entitlement, the same table as MWP Photoshop Plugin Panel), and draws the
-- buyer's name, email and licence number across every page. People who bought before keep their PDF download.
alter table public.entitlements add column if not exists online_only boolean not null default false;
comment on column public.entitlements.online_only is
  'Field Guides bought from 14 Nov 2026: read online only (guide-view), no PDF download (get-download refuses).';
