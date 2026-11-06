-- Israeli VAT on orders (Matan, 6 Nov 2026). The prices stay the same for everyone; for buyers in Israel they include
-- 18% VAT. The cart marks an Israeli visitor's checkout (custom vat = "il") and the webhook keeps the rate here, so
-- the Morning invoice-receipt breaks the VAT out of the total. 0.18: Israeli VAT included in the total; 0: no
-- Israeli VAT (buyers abroad); null: orders from before this (Morning then goes by the buyer's country).
alter table public.orders add column if not exists vat_rate numeric(4, 3) check (vat_rate is null or vat_rate in (0, 0.18));
