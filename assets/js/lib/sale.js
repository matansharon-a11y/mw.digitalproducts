// The November Sale (Jeinna, with Matan's OK, 30 Oct 2026): 15% off everything and 20% off the full set,
// 1 November 00:00 to 30 November 23:59, Israel time. One place for it: prices.js shows the sale prices on the pages,
// cart.js in the cart, and every checkout link carries the matching Lemon Squeezy discount code, so checkout charges
// the same price. The codes are made in Lemon Squeezy (tools/ls_discounts.py, the "Lemon Squeezy" workflow), limited
// to the same products and dates. The offer box's dates are in tools/brand.py (LAUNCH_START, LAUNCH_END): keep in step.
export const SALE = {
  start: "2026-11-01T00:00:00+02:00",
  end: "2026-11-30T23:59:00+02:00",
  pct: 15, code: "NOVEMBER15",
  special: { "full-set": { pct: 20, code: "NOVEMBER20" } },
};

const on = (now = Date.now()) => now >= Date.parse(SALE.start) && now <= Date.parse(SALE.end);

// The sale for one product right now: { pct, code }, or null outside the sale.
export function saleFor(slug, now) {
  if (!slug || !on(now)) return null;
  const s = SALE.special[slug];
  return s ? { pct: s.pct, code: s.code } : { pct: SALE.pct, code: SALE.code };
}

// A price after the sale: dollars to the cent (as Lemon Squeezy charges), shekels to the whole shekel.
export function salePrice(cents, slug, cur, now) {
  const s = saleFor(slug, now);
  if (!s || cents == null) return cents;
  const v = cents * (100 - s.pct) / 100;
  return cur === "ILS" ? Math.round(v / 100) * 100 : Math.round(v);
}
