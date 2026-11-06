// Israeli VAT in the price (Matan, 6 Nov 2026): Israeli law requires the price shown to an Israeli consumer to include
// VAT, so visitors in Israel see, and pay, the price + 18%; everyone else sees and pays the price set in the admin
// (0% Israeli VAT). Approved prices: the admin price × 1.18, dollars to the cent, shekels to the whole shekel (no other
// rounding; Matan: "exact"). Used by prices.js (the pages), cart.js (rows, totals, checkout) and, in Python, by
// tools/bake_prices.py (the Hebrew pages); the server charges the same in the checkout-il function.
export const IL_VAT = 0.18;
export const IL_VAT_ON = true;

// Who counts as Israeli: the Hebrew site, or a device set to Israel's time zone (no location lookup, nothing stored).
export function isIsraeli() {
  if (!IL_VAT_ON) return false;
  if (document.documentElement.lang === "he") return true;
  try { if (localStorage.getItem("mwp_lang") === "he") return true; } catch { /* blocked */ }
  try { return ["Asia/Jerusalem", "Asia/Tel_Aviv"].includes(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch { return false; }
}

// a price with Israeli VAT: dollars to the cent, shekels to the whole shekel
export function withVat(cents, cur) {
  if (cents == null) return cents;
  const v = cents * (1 + IL_VAT);
  return cur === "ILS" ? Math.round(v / 100) * 100 : Math.round(v);
}

// a price-list row (page_prices) or a cart item, priced for this visitor
export function forVisitor(r) {
  if (!r || !isIsraeli()) return r;
  return {
    ...r,
    price_cents: withVat(r.price_cents, "USD"), compare_at_cents: withVat(r.compare_at_cents, "USD"),
    price_ils_cents: withVat(r.price_ils_cents, "ILS"), compare_at_ils_cents: withVat(r.compare_at_ils_cents, "ILS"),
    vat_il: true,
  };
}
