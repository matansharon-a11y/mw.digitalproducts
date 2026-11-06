// Israeli VAT (Matan, 6 Nov 2026): the prices stay as they are for everyone. For buyers in Israel they include 18% VAT
// (Israeli law: the price shown to a consumer includes VAT), and the pages and cart say so; buyers abroad pay 0% Israeli
// VAT. The checkout of an Israeli visitor carries custom vat = "il", the webhook keeps it on the order
// (orders.vat_rate 0.18), and the Morning invoice-receipt breaks the 18% out of the price on its own line.
export const IL_VAT = 0.18;

// Who counts as Israeli: the Hebrew site, a device set to Israel's time zone, or an account with an Israeli phone
// number (remembered on this device once seen at checkout; the webhook also checks the phone and country itself).
export function isIsraeli() {
  if (document.documentElement.lang === "he") return true;
  try { if (localStorage.getItem("mwp_il") === "1") return true; } catch { /* blocked */ }
  try { if (localStorage.getItem("mwp_lang") === "he") return true; } catch { /* blocked */ }
  try { return ["Asia/Jerusalem", "Asia/Tel_Aviv"].includes(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch { return false; }
}

// An Israeli phone number: +972 / 00972 / 972…, or a local number starting with 0 (as the webhook)
export function isIsraeliPhone(phone) {
  const d = String(phone ?? "").replace(/[\s().-]/g, "");
  return /^(\+|00)?972\d{8,9}$/.test(d) || /^0\d{8,9}$/.test(d);
}
