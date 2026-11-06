// ============================================================================
// checkout-il: a Lemon Squeezy checkout at the Israeli price, VAT included (Matan, 6 Nov 2026).
// Israeli law requires the price shown to an Israeli consumer to include VAT, so the site shows Israeli visitors
// the admin price × 1.18 (assets/js/lib/vat.js) and this function makes their checkout charge exactly that:
// POST /v1/checkouts with custom_price on the product's own variant (the webhook knows the variant as before),
// the buyer's account email and id, the visit's source, the sale code the cart sends (Lemon Squeezy only accepts
// a real code for that product and date) and custom vat = "il", which the webhook keeps on the order
// (orders.vat_rate 0.18) so the Morning invoice-receipt shows the 18% on its own line.
//
// POST { slug, source?, discount_code? } with the buyer's session token → { url }
// ============================================================================
import { admin, cors, fail, json } from "../_shared/http.ts";

const LS = "https://api.lemonsqueezy.com/v1";
const STORE = Deno.env.get("LEMONSQUEEZY_STORE_ID") || "502637";
export const IL_VAT = 0.18;   // the same as IL_VAT in assets/js/lib/vat.js
const LS_URL = /^https:\/\/([a-z0-9-]+\.)*(lemonsqueezy\.com|mw\.photography)\//;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return fail(req, "Method not allowed", 405);

  // checkout needs an account (as for every checkout): the buyer's own session, with a confirmed email
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const db = admin();
  const { data: auth } = jwt ? await db.auth.getUser(jwt) : { data: null };
  const user = auth?.user;
  if (!user?.email) return fail(req, "Please sign in first.", 401);
  if (!user.email_confirmed_at) return fail(req, "Please confirm your email first.", 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const slug = String(body.slug ?? "");
  if (!/^[a-z0-9-]{2,64}$/.test(slug)) return fail(req, "Unknown product.");
  const source = String(body.source ?? "").replace(/[^\w.-]/g, "").slice(0, 64);
  const code = String(body.discount_code ?? "");

  const { data: p } = await db.from("products").select("slug, price_cents, checkout_variant_id, checkout_url").eq("slug", slug).maybeSingle();
  if (!p?.checkout_variant_id || !p.checkout_url || !(p.price_cents > 0)) return fail(req, "This product can't be bought right now.", 404);
  const price = Math.round(p.price_cents * (1 + IL_VAT));   // to the cent, as vat.js

  const key = Deno.env.get("LEMONSQUEEZY_API_KEY") ?? "";
  if (!key) return fail(req, "Checkout isn't available right now.", 503);
  const checkoutData: Record<string, unknown> = {
    email: user.email,
    custom: { user_id: user.id, vat: "il", ...(source ? { source } : {}) },
  };
  if (/^[A-Z0-9]{3,32}$/.test(code)) checkoutData.discount_code = code;
  try {
    const res = await fetch(`${LS}/checkouts`, {
      method: "POST",
      headers: { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            custom_price: price,
            checkout_data: checkoutData,
            checkout_options: { button_color: "#9A6418" },   // the shop's deeper gold, as cart.js
          },
          relationships: {
            store: { data: { type: "stores", id: STORE } },
            variant: { data: { type: "variants", id: String(p.checkout_variant_id) } },
          },
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const out = await res.json().catch(() => ({}));
    const url = out?.data?.attributes?.url;
    if (!res.ok || typeof url !== "string" || !LS_URL.test(url)) {
      console.error("checkout-il", res.status, JSON.stringify(out?.errors ?? out).slice(0, 500));
      return fail(req, "Checkout couldn't open. Please try again.", 502);
    }
    return json(req, { url, price_cents: price });
  } catch (err) {
    console.error("checkout-il", err);
    return fail(req, "Checkout couldn't open. Please try again.", 502);
  }
});
