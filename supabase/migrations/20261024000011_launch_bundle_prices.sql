-- Launch prices and bundles (Matan, 24 Oct 2026).
-- One rule for every combination: one product at its own price, any two save $20, all three save $50.
-- Shekels about 3 to the dollar, rounded to ₪…9. The struck-out "before" price is the sum of the parts.
-- The bundles are a launch offer (countdown on the pages, LAUNCH_END in tools/brand.py); after it ends,
-- change prices here or in the admin. Lemon Squeezy charges its own prices: set the same ones there by hand.
update public.products as p set
  price_cents = v.usd, compare_at_cents = v.usd_was,
  price_ils_cents = v.ils, compare_at_ils_cents = v.ils_was
from (values
  ('mwp-presets',           6999, null::int,  20900, null::int),
  ('mwp-panel',             6999, null,       20900, null),
  ('mwp-field-guides',      7999, null,       23900, null),
  ('presets-panel',        11999, 13998,      35900, 41800),
  ('presets-field-guides', 12999, 14998,      38900, 44800),
  ('field-guides-panel',   12999, 14998,      38900, 44800),
  ('full-set',             16999, 21997,      50900, 65700)
) as v(slug, usd, usd_was, ils, ils_was)
where p.slug = v.slug;
