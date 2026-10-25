-- Single Field Guides on sale (Matan, 25 Oct 2026): each of the four guides can be bought on its own, $29.99 / ₪89
-- (the set of four stays $79.99 / ₪239). Their checkout links come from "Connect Lemon Squeezy" once each guide has
-- its product there ("MWP Field Guide: Planning" …).
update public.products
   set is_active = true, price_ils_cents = 8900
 where guide_key is not null;
