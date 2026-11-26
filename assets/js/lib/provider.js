// Which payment provider takes payments now (24 Nov 2026): "lemonsqueezy" until the switch, then "dodo".
// Read from the public checkout_provider view (only the provider's name), kept for 10 minutes on this device.
// With Dodo the cart is one payment for everything in it, and discount codes stack.
import { CONFIG } from "../config.js";

const KEY = "mwp_provider";
const TTL = 10 * 60 * 1000;
let now = "lemonsqueezy";
// The admin's preview of Dodo before the switch: ?pay=dodo (this tab only; ?pay=off ends it). The checkout function
// honours it only for the admin's account, so anyone else who tries it still pays through Lemon Squeezy.
let preview = false;
try {
  const q = new URLSearchParams(location.search).get("pay");
  if (q === "dodo") sessionStorage.setItem("mwp_pay_preview", "dodo");
  if (q === "off") sessionStorage.removeItem("mwp_pay_preview");
  preview = sessionStorage.getItem("mwp_pay_preview") === "dodo";
} catch { /* blocked */ }
export const isPreview = () => preview;
try {
  const c = JSON.parse(sessionStorage.getItem(KEY) || "null");
  if (c?.p) now = c.p;
} catch { /* blocked */ }

export const provider = () => (preview ? "dodo" : now);
export const isDodo = () => preview || now === "dodo";

// Asks the shop (at most every 10 minutes); calls onChange when the answer differs from what the page assumed
export async function loadProvider(onChange) {
  try {
    const c = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (c?.p && Date.now() - c.at < TTL) return now;
  } catch { /* blocked */ }
  try {
    const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/checkout_provider?select=provider`, {
      headers: { apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}` },
    });
    const rows = await res.json();
    const p = res.ok && rows?.[0]?.provider === "dodo" ? "dodo" : "lemonsqueezy";
    try { sessionStorage.setItem(KEY, JSON.stringify({ p, at: Date.now() })); } catch { /* blocked */ }
    if (p !== now) { now = p; onChange?.(); }
  } catch { /* offline: keep what we had */ }
  return now;
}
