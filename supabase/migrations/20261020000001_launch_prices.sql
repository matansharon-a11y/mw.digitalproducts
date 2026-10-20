-- Launch prices (Matan, 20 Oct 2026). Dollars on the English pages, shekels on the Hebrew pages
-- (about 3.05 to the dollar, rounded to ₪…9). Every bundle costs less than its parts; a bundle's
-- "before" price is the sum of its parts at today's prices, shown struck out next to it.
-- Change later in the admin, or with a new migration.
update public.products as p set
  price_cents = v.usd, compare_at_cents = v.usd_was,
  price_ils_cents = v.ils, compare_at_ils_cents = v.ils_was
from (values
  ('mwp-presets',           5999, null::int,  17900, null::int),
  ('mwp-panel',             5999, null,       17900, null),
  ('mwp-field-guides',      7599, null,       22900, null),
  ('presets-panel',         9999, 11998,      29900, 35800),
  ('presets-field-guides', 10999, 13598,      33900, 40800),
  ('field-guides-panel',   10999, 13598,      33900, 40800),
  ('full-set',             14999, 19597,      45900, 58700)
) as v(slug, usd, usd_was, ils, ils_was)
where p.slug = v.slug;
