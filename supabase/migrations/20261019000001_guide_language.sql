-- Field Guides buyers choose one language (English or Hebrew) in My downloads, and their personal copy
-- holds only the guides in that language. 'both' = bought before the choice existed: they keep the full set.
alter table public.entitlements add column if not exists guide_lang text
  check (guide_lang in ('en', 'he', 'both'));

update public.entitlements e set guide_lang = 'both'
  from public.products p
 where p.id = e.product_id and p.category = 'guide' and e.guide_lang is null;
