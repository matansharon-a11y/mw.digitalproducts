-- The four products and the four bundles go Live (Jeinna, 5 Nov 2026). They have been on sale since launch (checkout
-- links, the November Sale), but were still marked Draft: Matan's approval tick in monday's Shop Products board never
-- reached them, and a bundle could never pass that step (it has no file of its own; its products do). Draft changed
-- nothing for buyers, but it kept the hourly "approvals" check asking Make every hour (about 2,900 Make operations a
-- month). Only products that can really be sold: a checkout link and variant, and a file unless it's a bundle.
-- Each change is mirrored to monday's Shop Products board by the existing product trigger.
update public.products p
   set is_active = true
 where p.slug in ('mwp-lightroom-plugin', 'mwp-panel', 'mwp-presets', 'mwp-field-guides',
                  'presets-field-guides', 'presets-panel', 'field-guides-panel', 'full-set')
   and p.is_active = false
   and p.checkout_url is not null and p.checkout_variant_id is not null
   and (p.category = 'bundle' or exists (select 1 from public.product_files f where f.product_id = p.id));
