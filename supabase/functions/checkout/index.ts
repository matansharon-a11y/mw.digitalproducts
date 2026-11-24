// ============================================================================
// checkout — makes the buyer's Lemon Squeezy checkout in English (Jeinna, 10 Nov 2026: "just use either English or
// Hebrew, do not use any other language").
// Lemon Squeezy's checkout has no Hebrew. Left to itself it follows the browser, and a browser set to Hebrew only got
// the checkout in Bulgarian (it looks Russian; a customer couldn't find PayPal). A checkout made through the API with
// checkout_options.locale = "en" "overrides any store-level or browser-detected locale" (Lemon Squeezy's API docs).
// Called by cart.js with the buyer's session token; the email and account id come from the session, never the body.
// On any failure cart.js falls back to the product's plain checkout link, so buying never stops.
// ============================================================================
import { admin, cors, fail, json } from "../_shared/http.ts";

const API = "https://api.lemonsqueezy.com/v1/checkouts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return fail(req, "Method not allowed", 405);
  const key = Deno.env.get("LEMONSQUEEZY_API_KEY") ?? "";
  const store = Deno.env.get("LEMONSQUEEZY_STORE_ID") || "502637";   // MWP Shop
  if (!key) return fail(req, "Checkout isn't set up.", 503);

  const db = admin();
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await db.auth.getUser(jwt);
  const user = auth?.user;
  if (!user?.email) return fail(req, "Please sign in again.", 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* checked below */ }
  const slug = String(body.slug ?? "");
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return fail(req, "Unknown product.", 400);
  // Lemon Squeezy checks the code itself (its products and dates); this only keeps the value tidy
  const discount = String(body.discount_code ?? "");
  const source = String(body.source ?? "").slice(0, 64);
  const vat = body.vat === "il" ? "il" : "";
  const ref = String(body.ref ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);   // an affiliate's link

  // Which provider takes payments now (shop_settings; admin → Settings, set to Creem once Creem approves the store)
  const { data: setting } = await db.from("shop_settings").select("value").eq("key", "checkout_provider").maybeSingle();
  if (setting?.value === "creem") return creemCheckout(req, db, { slug, discount, source, vat, ref, user });

  const { data: product } = await db.from("products").select("checkout_variant_id").eq("slug", slug).maybeSingle();
  const variant = String(product?.checkout_variant_id ?? "");
  if (!/^\d+$/.test(variant)) return fail(req, "Unknown product.", 404);

  const custom: Record<string, string> = { user_id: user.id };
  if (source) custom.source = source;
  if (vat) custom.vat = vat;
  if (ref) custom.ref = ref;
  const payload = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_options: { locale: "en", button_color: "#9A6418" },
        checkout_data: { email: user.email, custom, ...(/^[A-Z0-9]{3,32}$/.test(discount) ? { discount_code: discount } : {}) },
      },
      relationships: {
        store: { data: { type: "stores", id: store } },
        variant: { data: { type: "variants", id: variant } },
      },
    },
  };
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    const out = await res.json().catch(() => null);
    const url = String(out?.data?.attributes?.url ?? "");
    if (!res.ok || !/^https:\/\//.test(url)) {
      console.error("checkout create failed", res.status, JSON.stringify(out?.errors ?? out).slice(0, 400));
      return fail(req, "Checkout isn't available right now.", 502);
    }
    return json(req, { url });
  } catch (err) {
    console.error("checkout create error", err);
    return fail(req, "Checkout isn't available right now.", 502);
  }
});

// ---------------------------------------------------------------- Creem (from the switch; 24 Nov 2026)
// POST /v1/checkouts (Creem's API: x-api-key; test keys use test-api.creem.io and Creem's separate test catalogue).
// Creem's checkout page picks its language from the browser and has no Hebrew, so a Hebrew browser gets English.
// On failure this answers 424: the cart then says checkout isn't available, and never falls back to a Lemon Squeezy link.
async function creemCheckout(req: Request, db: ReturnType<typeof admin>, o: {
  slug: string; discount: string; source: string; vat: string; ref: string; user: { id: string; email?: string };
}) {
  const key = Deno.env.get("CREEM_API_KEY") ?? "";
  if (!key) return fail(req, "Checkout isn't available right now.", 424);
  const test = key.startsWith("creem_test_");
  const base = test ? "https://test-api.creem.io" : "https://api.creem.io";
  const { data: product } = await db.from("products").select("creem_product_id, creem_test_product_id").eq("slug", o.slug).maybeSingle();
  const productId = String((test ? product?.creem_test_product_id : product?.creem_product_id) ?? "");
  if (!productId) return fail(req, "Checkout isn't available right now.", 424);
  const metadata: Record<string, string> = { user_id: o.user.id };
  if (o.source) metadata.source = o.source;
  if (o.vat) metadata.vat = o.vat;
  if (o.ref) metadata.ref = o.ref;
  const site = (Deno.env.get("SITE_URL") || "https://shop.mw.photography").replace(/\/$/, "");
  const body = {
    product_id: productId,
    request_id: crypto.randomUUID(),
    units: 1,
    customer: { email: o.user.email },
    metadata,
    success_url: `${site}/thank-you/`,
    ...(/^[A-Z0-9]{3,32}$/.test(o.discount) ? { discount_code: o.discount } : {}),
  };
  try {
    const res = await fetch(`${base}/v1/checkouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "x-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const out = await res.json().catch(() => null);
    const url = String(out?.checkout_url ?? "");
    if (!res.ok || !/^https:\/\//.test(url)) {
      console.error("creem checkout failed", res.status, JSON.stringify(out).slice(0, 400));
      return fail(req, "Checkout isn't available right now.", 424);
    }
    return json(req, { url, provider: "creem" });
  } catch (err) {
    console.error("creem checkout error", err);
    return fail(req, "Checkout isn't available right now.", 424);
  }
}
