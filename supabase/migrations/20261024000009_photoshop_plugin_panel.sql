-- ============================================================================
-- MWP Panel is now "MWP Photoshop Plugin Panel" everywhere, and the products always come in this order
-- (Matan, 24 Oct 2026): the Lightroom Classic plugin, MWP Photoshop Plugin Panel, MWP Presets, MWP Field Guides,
-- then the bundles. The slug (mwp-panel), files, licences and orders stay as they are. Renaming the product
-- sends it to monday (Shop Products) through the scheduler, like any product change.
-- ============================================================================

update public.products set name = 'MWP', name_emphasis = 'Photoshop Plugin Panel' where slug = 'mwp-panel';

-- what's included, as the bundles and the product list it: the new name, never "MWP Panel"
update public.products
   set includes = (select array_agg(regexp_replace(x, 'MWP Panel(: (the )?Photoshop (plugin|panel))?', 'MWP Photoshop Plugin Panel', 'g') order by n)
                     from unnest(includes) with ordinality as u(x, n))
 where exists (select 1 from unnest(includes) x where x like '%MWP Panel%');

update public.products p
   set sort_order = o.pos
  from (values ('mwp-lightroom-plugin', 10), ('mwp-panel', 20), ('mwp-presets', 30), ('mwp-field-guides', 40),
               ('presets-field-guides', 50), ('presets-panel', 60), ('field-guides-panel', 70), ('full-set', 80)) as o(slug, pos)
 where p.slug = o.slug;
