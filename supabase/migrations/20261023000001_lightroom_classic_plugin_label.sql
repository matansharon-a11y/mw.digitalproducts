-- Naming by product type (23 Oct 2026): the Lightroom Classic add-on that comes with MWP Presets is a "plugin"
-- (Lightroom's own term, Plug-in Manager), so it never collides with MWP Panel, the Photoshop panel.
update public.product_extra_files set label = 'Lightroom Classic plugin'
 where file_key = 'lightroom-classic' and label = 'Lightroom Classic panel';
