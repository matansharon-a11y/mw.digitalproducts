-- Single Field Guides (Matan, 25 Oct 2026): each of the four guides is also sold on its own ($29.99); the set of four
-- (mwp-field-guides, $79.99) stays the better deal. Nobody who owns the set is offered a single guide (cart.js and the
-- Field Guides page check the buyer's library).
--
--  * products.guide_key: which guide a single-guide product is (planning, composition, light, colour). The four
--    products are category 'guide', so My downloads asks for the language and get-download serves a personal copy,
--    exactly like the set.
--  * One file, no new uploads: a single guide's file is the set's own pack. The personal-copies worker cuts each
--    buyer's copy down to that one guide, in the language they chose (tools/personalize/worker.py). A trigger keeps
--    the four singles on the set's current file, so uploading a new version of the set makes everyone's copy again.
--  * They start hidden and unpriced in shekels (is_active false, price_ils_cents null): the shekel price is
--    Matan's call, and each goes live once its Lemon Squeezy product is connected and Matan approves.

alter table public.products
  add column if not exists guide_key text check (guide_key is null or guide_key in ('planning', 'composition', 'light', 'colour'));

insert into public.products (slug, name, name_emphasis, category, tagline, includes, price_cents, version, item_count, is_active, sort_order, guide_key)
values
  ('field-guide-planning',    'MWP Field Guide:', 'Planning',    'guide', 'One of the four MWP Field Guides.',
    array['One PDF guide', 'English or Hebrew'], 2999, '1.0', 1, false, 31, 'planning'),
  ('field-guide-composition', 'MWP Field Guide:', 'Composition', 'guide', 'One of the four MWP Field Guides.',
    array['One PDF guide', 'English or Hebrew'], 2999, '1.0', 1, false, 32, 'composition'),
  ('field-guide-light',       'MWP Field Guide:', 'Light',       'guide', 'One of the four MWP Field Guides.',
    array['One PDF guide', 'English or Hebrew'], 2999, '1.0', 1, false, 33, 'light'),
  ('field-guide-colour',      'MWP Field Guide:', 'Colour',      'guide', 'One of the four MWP Field Guides.',
    array['One PDF guide', 'English or Hebrew'], 2999, '1.0', 1, false, 34, 'colour')
on conflict (slug) do nothing;

-- the singles share the set's file (path and version); kept in step whenever the set's file changes
create or replace function public.sync_single_guide_files()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.product_id = (select id from public.products where slug = 'mwp-field-guides') then
    insert into public.product_files (product_id, path, size_bytes, version, uploaded_at)
    select p.id, new.path, new.size_bytes, new.version, new.uploaded_at
      from public.products p where p.guide_key is not null
    on conflict (product_id) do update
      set path = excluded.path, size_bytes = excluded.size_bytes, version = excluded.version, uploaded_at = excluded.uploaded_at;
    update public.products set version = new.version where guide_key is not null;
  end if;
  return new;
end $$;
revoke all on function public.sync_single_guide_files() from public, anon, authenticated;

drop trigger if exists on_field_guides_file on public.product_files;
create trigger on_field_guides_file
  after insert or update on public.product_files
  for each row execute function public.sync_single_guide_files();

-- now: the singles get the set's current file
insert into public.product_files (product_id, path, size_bytes, version, uploaded_at)
select p.id, f.path, f.size_bytes, f.version, f.uploaded_at
  from public.products p
  cross join public.product_files f
 where p.guide_key is not null
   and f.product_id = (select id from public.products where slug = 'mwp-field-guides')
on conflict (product_id) do update
  set path = excluded.path, size_bytes = excluded.size_bytes, version = excluded.version, uploaded_at = excluded.uploaded_at;

update public.products p set version = s.version
  from public.products s
 where p.guide_key is not null and s.slug = 'mwp-field-guides';
