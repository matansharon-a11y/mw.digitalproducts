-- The Lightroom Classic plugin includes MWP Presets; the presets are also sold alone (Jeinna, 25 Oct 2026, with Matan's
-- OK; reverses 23 Oct, when MWP Presets came with the plugin).
--  * mwp-lightroom-plugin: $69.99 / ₪209, and buying it unlocks MWP Presets (checkout-webhook BUNDLES).
--  * mwp-presets: $19.99 / ₪59, just the presets.
--  * The bundles still give both (plugin and presets) and keep their prices and slugs; their names say "Lightroom Plugin"
--    instead of "Presets". Lemon Squeezy charges its own prices: set the same ones there by hand.
-- Nobody loses anything: whoever got the plugin with MWP Presets before keeps it.

update public.products as p set price_cents = v.usd, price_ils_cents = v.ils, compare_at_cents = null, compare_at_ils_cents = null
from (values ('mwp-lightroom-plugin', 6999, 20900), ('mwp-presets', 1999, 5900)) as v(slug, usd, ils)
where p.slug = v.slug;

update public.products set name = 'Lightroom Plugin +' where slug in ('presets-panel', 'presets-field-guides');

update public.products set tagline = 'Sort, keyword, edit and export a whole shoot. MWP Presets included.',
       includes = array['The Lightroom Classic plugin', 'MWP Presets included: 50 presets and 33 LUTs', 'Built-in help and video tutorials']
 where slug = 'mwp-lightroom-plugin';
