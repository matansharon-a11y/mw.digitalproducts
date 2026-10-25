-- The plugin is sold as "Lightroom Plugin + Presets" (Jeinna, 25 Oct 2026): the name in the cart, at checkout, in
-- My downloads and in monday says the presets come with it. Slug unchanged (mwp-lightroom-plugin).
update public.products set name = 'MWP', name_emphasis = 'Lightroom Plugin + Presets' where slug = 'mwp-lightroom-plugin';
