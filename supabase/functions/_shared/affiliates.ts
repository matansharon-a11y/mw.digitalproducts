// ============================================================================
// The MWP Affiliate Program (Matan, 18 Nov 2026; launches January 2027). Shared by the affiliate function (invite,
// accept, end), the checkout webhook (a sale brought by an affiliate) and the admin.
//
// Provider-neutral on purpose: the program lives in the shop's own tables (affiliates, affiliate_commissions,
// affiliate_payouts). The payment provider only holds a copy of each code (Lemon Squeezy now; another provider
// later), made by the adapter below, so moving providers means making the same codes there, nothing else.
//
// Who earns: an order paid with the affiliate's code ("code"), or, when the buyer came through the affiliate's link
// and paid with another code or none ("link"). Never the affiliate's own purchase. Not before their start date or
// after their agreement ended. 10% of what the buyer paid (after the discount: Matan, 18 Nov 2026). A sale counts
// 14 days after the order (the refund period); a full refund before then voids it.
// ============================================================================
import { AMBASSADOR_PRODUCTS } from "./ambassador.ts";

export const PROGRAM_START = "2027-01-01";   // codes work from this day at the earliest
export const HOLD_DAYS = 14;                 // the refund period
export const DISCOUNT_PCT = 10;              // buyers' discount with an affiliate code
export const AFFILIATE_PRODUCTS = AMBASSADOR_PRODUCTS;   // every MWP tool, free (the guides to read online)
export const TERMS_VERSION = "2026-11-18.1";
export const CODE_RE = /^[A-Z0-9]{4,32}$/;

// "Kelvin Smith" → MWPKELVIN10 (the first name, Latin letters only)
export function suggestCode(name: string): string {
  const first = String(name ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").trim().split(/\s+/)[0] ?? "";
  const letters = first.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  return letters ? `MWP${letters}${DISCOUNT_PCT}` : "";
}

export const cleanCode = (v: unknown) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);

const day = (d: Date) => d.toISOString().slice(0, 10);

// The agreement's dates for someone accepting now: from 1 Jan 2027 (or today, if later), for one year.
export function agreementDates(now = new Date()): { starts_on: string; ends_on: string } {
  const start = day(now) > PROGRAM_START ? day(now) : PROGRAM_START;
  const end = new Date(`${start}T00:00:00Z`);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  return { starts_on: start, ends_on: day(end) };
}

type Affiliate = {
  id: string; code: string; email: string; customer_id: string | null; rate: number | string; status: string;
  starts_on: string | null; ended_at: string | null;
};

// ---------------------------------------------------------------- a sale
// Called by the checkout webhook once the order is saved. `code` is the discount code the buyer used (if any),
// `ref` the affiliate code their visit came with (the cart's ?code= link). Safe to call again for the same order.
// deno-lint-ignore no-explicit-any
export async function recordAffiliateSale(db: any, o: {
  orderId: string; customerId: string; buyerEmail: string; totalCents: number; currency: string; orderedAt: string;
  code?: string | null; ref?: string | null; testMode?: boolean;
}): Promise<{ affiliate: string; amount_cents: number } | null> {
  if (o.testMode) return null;   // test orders never earn
  // `code` can list several (Dodo stacks codes: "NOVEMBER15,MWPKELVIN10"): the affiliate's one is picked below
  const codes = String(o.code ?? "").split(",").map(cleanCode).filter(Boolean), ref = cleanCode(o.ref);
  if (!codes.length && !ref) return null;
  const wanted = [...new Set([...codes, ref].filter(Boolean))];
  const { data: rows } = await db.from("affiliates")
    .select("id, code, email, customer_id, rate, status, starts_on, ended_at").in("code", wanted).neq("status", "invited");
  const byCode = new Map(((rows ?? []) as Affiliate[]).map((a) => [a.code, a]));
  // the code typed or applied at checkout wins over the link the visit came from
  const code = codes.find((c) => byCode.has(c)) ?? "";
  const a = (code && byCode.get(code)) || (ref && byCode.get(ref));
  if (!a) return null;
  const via = code ? "code" : "link";
  const at = new Date(o.orderedAt);
  if (a.starts_on && day(at) < a.starts_on) return null;                 // before their agreement began
  if (a.ended_at && at.getTime() > Date.parse(a.ended_at)) return null;   // after it ended
  if (a.customer_id === o.customerId || a.email === o.buyerEmail.toLowerCase()) return null;   // their own purchase
  const rate = Number(a.rate) || 0.1;
  const base = Math.max(0, Math.round(o.totalCents));
  const amount = Math.round(base * rate);
  const available = new Date(at.getTime() + HOLD_DAYS * 86400 * 1000).toISOString();
  const { error } = await db.from("affiliate_commissions").upsert({
    affiliate_id: a.id, order_id: o.orderId, via, base_cents: base, rate, amount_cents: amount,
    currency: o.currency || "USD", available_at: available,
  }, { onConflict: "order_id", ignoreDuplicates: true });
  if (error) throw error;
  return { affiliate: a.code, amount_cents: amount };
}

// A full refund: the sale doesn't count. One already paid out stays recorded (and is flagged) for the admin to settle.
// deno-lint-ignore no-explicit-any
export async function voidAffiliateSale(db: any, orderId: string, reason = "refunded"): Promise<void> {
  const { error } = await db.from("affiliate_commissions").update({ status: "void", void_reason: reason })
    .eq("order_id", orderId).eq("status", "pending");
  if (error) throw error;
  const { data: paid } = await db.from("affiliate_commissions").select("id").eq("order_id", orderId).eq("status", "paid").maybeSingle();
  if (paid) {
    await db.from("affiliate_commissions").update({ void_reason: `${reason} after it was paid: deduct it from the next payment` }).eq("id", paid.id);
    console.warn(`affiliate commission ${paid.id}: order refunded after payout`);
  }
}

// ---------------------------------------------------------------- free tools
// Like ambassadors and testers: every tool, the Field Guides to read online. Anything bought stays as it is.
// deno-lint-ignore no-explicit-any
export async function grantAffiliateTools(db: any, customerId: string): Promise<void> {
  const { data: products } = await db.from("products").select("id, slug").in("slug", AFFILIATE_PRODUCTS);
  for (const p of products ?? []) {
    const { data: owned } = await db.from("entitlements").select("id, order_id, revoked_at")
      .eq("customer_id", customerId).eq("product_id", p.id).maybeSingle();
    if (owned && !owned.revoked_at) continue;   // already has it (bought, or another program)
    const row = { customer_id: customerId, product_id: p.id, view_only: p.slug === "mwp-field-guides", revoked_at: null, order_id: null };
    const { error } = owned
      ? await db.from("entitlements").update(row).eq("id", owned.id)
      : await db.from("entitlements").insert(row);
    if (error) throw error;
  }
}

// Take the free tools back when the agreement ends, unless the person is still an ambassador or a tester.
// deno-lint-ignore no-explicit-any
export async function revokeAffiliateTools(db: any, customerId: string): Promise<boolean> {
  const { data: other } = await db.rpc("has_free_access_role", { p_customer: customerId });
  if (other === true) return false;
  const { data: products } = await db.from("products").select("id").in("slug", AFFILIATE_PRODUCTS);
  const ids = (products ?? []).map((p: { id: string }) => p.id);
  if (!ids.length) return false;
  const { error } = await db.from("entitlements").update({ revoked_at: new Date().toISOString() })
    .eq("customer_id", customerId).is("order_id", null).is("revoked_at", null).in("product_id", ids);
  if (error) throw error;
  return true;
}

// ---------------------------------------------------------------- the code at the payment provider (Lemon Squeezy)
// The only provider-specific part. When the shop moves to another provider, add its version here and make the
// active affiliates' codes there (same code, same percent, same end date).
const LS = "https://api.lemonsqueezy.com/v1";
async function lemon(path: string, init: RequestInit = {}) {
  const key = Deno.env.get("LEMONSQUEEZY_API_KEY") ?? "";
  if (!key) throw new Error("The Lemon Squeezy key isn't set on the server.");
  const res = await fetch(`${LS}${path}`, {
    ...init,
    headers: { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json", Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(20000),
  });
  const body = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    const why = body?.errors?.[0]?.detail || body?.errors?.[0]?.title || `answered ${res.status}`;
    throw Object.assign(new Error(`Lemon Squeezy: ${why}`), { status: res.status });
  }
  return body;
}
const STORE = () => Deno.env.get("LEMONSQUEEZY_STORE_ID") || "502637";

// Make the affiliate's code at the provider that takes payments now (shop_settings): 10% off every product, from
// their start date to their end date. Returns what to keep in affiliates.provider_codes under that provider's name.
// deno-lint-ignore no-explicit-any
export async function createProviderCode(db: any, a: { name: string; code: string; starts_on: string; ends_on: string }) {
  const { data: setting } = await db.from("shop_settings").select("value").eq("key", "checkout_provider").maybeSingle();
  return setting?.value === "dodo" ? createDodoCode(a) : createLemonCode(a);
}

// ---- Dodo Payments: POST /discounts (percent in basis points: 1000 = 10%; no product limit = every product)
const DODO = () => {
  const key = Deno.env.get("DODO_API_KEY") ?? "";
  if (!key) throw new Error("The Dodo key isn't set on the server.");
  return { key, base: key.startsWith("dodo_test_") ? "https://test.dodopayments.com" : "https://live.dodopayments.com" };
};
export async function createDodoCode(a: { name: string; code: string; starts_on: string; ends_on: string }) {
  const { key, base } = DODO();
  const res = await fetch(`${base}/discounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ type: "percentage", amount: DISCOUNT_PCT * 100, code: a.code, name: `Affiliate: ${a.name}`.slice(0, 100),
      starts_at: `${a.starts_on}T00:00:00Z`, expires_at: `${a.ends_on}T00:00:00Z` }),
    signal: AbortSignal.timeout(20000),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`Dodo: ${out?.message || out?.error || `answered ${res.status}`}`), { status: res.status });
  return { provider: "dodo", id: String(out.discount_id), test_mode: key.startsWith("dodo_test_"), reused: false };
}
export async function deleteDodoCode(id: string): Promise<void> {
  const { key, base } = DODO();
  const res = await fetch(`${base}/discounts/${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20000) });
  if (!res.ok && res.status !== 404) throw new Error(`Dodo: answered ${res.status}`);
}

// ---- Lemon Squeezy
async function createLemonCode(a: { name: string; code: string; starts_on: string; ends_on: string }) {
  const store = await lemon(`/stores/${STORE()}`);
  const test = store?.meta?.test_mode === true;
  // an existing code with the same name (made before, in this mode) is reused
  const have = await lemon(`/discounts?filter[store_id]=${STORE()}&page[size]=100`);
  const found = (have?.data ?? []).find((d: { attributes: { code: string; test_mode?: boolean } }) =>
    d.attributes.code === a.code && Boolean(d.attributes.test_mode) === test);
  if (found) return { provider: "lemonsqueezy", id: String(found.id), test_mode: test, reused: true };
  const made = await lemon("/discounts", { method: "POST", body: JSON.stringify({ data: { type: "discounts", attributes: {
    name: `Affiliate: ${a.name}`.slice(0, 100), code: a.code, amount: DISCOUNT_PCT, amount_type: "percent",
    is_limited_to_products: false, is_limited_redemptions: false,
    starts_at: `${a.starts_on}T00:00:00Z`, expires_at: `${a.ends_on}T00:00:00Z`, test_mode: test },
    relationships: { store: { data: { type: "stores", id: STORE() } } } } }) });
  return { provider: "lemonsqueezy", id: String(made?.data?.id), test_mode: test, reused: false };
}

// Delete it when the agreement ends (a code that's already gone is fine)
export async function deleteProviderCode(id: string): Promise<void> {
  try { await lemon(`/discounts/${id}`, { method: "DELETE" }); }
  catch (err) { if ((err as { status?: number }).status !== 404) throw err; }
}

// The discount code a Lemon Squeezy order was paid with (its order webhook only carries the amount)
export async function providerOrderCode(orderId: string): Promise<string | null> {
  try {
    const r = await lemon(`/discount-redemptions?filter[order_id]=${encodeURIComponent(orderId)}`);
    return cleanCode(r?.data?.[0]?.attributes?.discount_code) || null;
  } catch (err) {
    console.error("discount code lookup", orderId, err);
    return null;
  }
}
