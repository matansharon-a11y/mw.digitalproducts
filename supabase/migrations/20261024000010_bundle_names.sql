-- The two bundles with the Photoshop product carry its full name too (Matan, 24 Oct 2026):
-- "Presets + Photoshop Plugin Panel" and "Field Guides + Photoshop Plugin Panel". Slugs stay; monday follows (scheduler).
update public.products set name_emphasis = 'Photoshop Plugin Panel' where slug in ('presets-panel', 'field-guides-panel');
