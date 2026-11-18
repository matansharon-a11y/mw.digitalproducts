// The MWP Affiliate Program in the cart (Matan, 18 Nov 2026). An affiliate's link — any shop address with
// ?code=MWPKELVIN10 — is remembered on this device for 30 days. While their code is active, the cart takes 10% off and
// every checkout carries the code (so Lemon Squeezy charges the same price) and the affiliate as "ref" (so the sale is
// theirs even if the buyer ends up paying with another code). Checkout accepts one discount code: during a sale the
// buyer gets whichever discount is bigger, and the affiliate still earns from the sale through the link.
import { saleFor } from "./sale.js";
import { CONFIG } from "../config.js";

const KEY = "mwp_ref";
const DAYS = 30;
const RECHECK_MS = 6 * 3600 * 1000;
const CODE = /^[A-Z0-9]{4,32}$/;

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}
function write(v) {
  try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch { /* blocked */ }
}

// The affiliate code this visit came with (or one remembered from the last 30 days)
export function refCode() {
  const r = read();
  if (!r?.code || Date.now() - (r.at || 0) > DAYS * 86400 * 1000) return "";
  return r.code;
}

// { pct, code, label } when the remembered code is an active affiliate code today, else null
function refDiscount() {
  const r = read();
  if (!r?.code || !r.valid || Date.now() - (r.at || 0) > DAYS * 86400 * 1000) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (r.starts_on && today < r.starts_on) return null;
  if (r.ends_on && today >= r.ends_on) return null;
  return { pct: r.pct || 10, code: r.code, affiliate: true };
}

// The discount the cart and checkout use for one product: the sale's or the affiliate's, whichever is bigger
export function offerFor(slug) {
  const sale = saleFor(slug), ref = refDiscount();
  if (!ref) return sale;
  if (!sale) return ref;
  return ref.pct > sale.pct ? ref : sale;
}

// A price after that discount: dollars to the cent (as checkout charges), shekels to the whole shekel
export function offerPrice(cents, slug, cur) {
  const o = offerFor(slug);
  if (!o || cents == null) return cents;
  const v = cents * (100 - o.pct) / 100;
  return cur === "ILS" ? Math.round(v / 100) * 100 : Math.round(v);
}

// Checks a code with the shop (is it an affiliate's, and from when), at most every few hours
async function check(code) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/affiliate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ action: "check", code }),
  });
  const out = await res.json().catch(() => ({}));
  return res.ok ? out : { valid: false };
}

// On every page: remember a ?code= from the address, and (re)check the remembered one. Calls onChange when the
// cart's prices may have changed.
export async function initReferral(onChange) {
  let fresh = "";
  try {
    const q = new URLSearchParams(location.search);
    fresh = String(q.get("code") || q.get("ref") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  } catch { /* no address */ }
  let r = read();
  if (fresh && CODE.test(fresh) && fresh !== r?.code) {
    r = { code: fresh, at: Date.now() };   // a new link: the latest one counts (last click)
    write(r);
  } else if (fresh && r?.code === fresh) {
    r.at = Date.now(); write(r);          // the same link again: 30 days from now
  }
  if (!r?.code) return;
  if (Date.now() - (r.at || 0) > DAYS * 86400 * 1000) { write(null); onChange?.(); return; }
  if (r.checked && Date.now() - r.checked < RECHECK_MS) return;
  try {
    const c = await check(r.code);
    write({ ...r, valid: Boolean(c.valid), pct: c.pct || 10, starts_on: c.starts_on || null, ends_on: c.ends_on || null, checked: Date.now() });
    onChange?.();
  } catch { /* offline: keep what we had */ }
}
