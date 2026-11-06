-- Israeli VAT on orders (Matan, 6 Nov 2026). Israeli visitors pay the price with 18% VAT through the checkout-il
-- function, which marks their checkout (custom vat = "il"); the webhook keeps the rate here, so the order, the
-- Finances tab and the Morning invoice-receipt all follow what was actually charged. 0.18: Israeli VAT included in
-- the total; 0: no Israeli VAT (buyers abroad, regular checkout); null: orders from before this.
alter table public.orders add column if not exists vat_rate numeric(4, 3) check (vat_rate is null or vat_rate in (0, 0.18));
