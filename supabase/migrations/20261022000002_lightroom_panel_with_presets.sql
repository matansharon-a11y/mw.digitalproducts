-- The Lightroom Classic panel comes with MWP Presets, not MWP Panel (Oct 2026): MWP Panel is the Photoshop plugin again.
-- The extra download moves from mwp-panel to mwp-presets (same file, nothing re-uploaded) and its button reads
-- "Lightroom Classic panel". Presets owners (bundles included) see it in My downloads; Panel-only owners no longer do.
update public.product_extra_files x
   set product_id = (select id from public.products where slug = 'mwp-presets'),
       label = 'Lightroom Classic panel'
 where x.file_key = 'lightroom-classic'
   and x.product_id = (select id from public.products where slug = 'mwp-panel')
   and not exists (select 1 from public.product_extra_files y
                    where y.file_key = 'lightroom-classic'
                      and y.product_id = (select id from public.products where slug = 'mwp-presets'));
