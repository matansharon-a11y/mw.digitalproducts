// ============================================================================
// checkout — makes the buyer's checkout: Lemon Squeezy's in English, or Dodo Payments' once the switch says so (below).
// Lemon Squeezy's, in English (Jeinna, 10 Nov 2026: "just use either English or
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

  const db = admin();
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await db.auth.getUser(jwt);
  const user = auth?.user;
  if (!user?.email) return fail(req, "Please sign in again.", 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* checked below */ }
  const source = String(body.source ?? "").slice(0, 64);
  const vat = body.vat === "il" ? "il" : "";
  const ref = String(body.ref ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);   // an affiliate's link

  // Which provider takes payments now (shop_settings; set to Dodo once Dodo approves the store)
  const { data: setting } = await db.from("shop_settings").select("value").eq("key", "checkout_provider").maybeSingle();
  if (setting?.value === "dodo") return dodoCheckout(req, db, body, { source, vat, ref, user });
  // Preview before the switch (Jeinna, 26 Nov 2026): the admin alone can try Dodo's checkout with ?pay=dodo on any page
  // (cart.js sends provider "dodo"); everyone else stays on Lemon Squeezy. Test orders unlock nothing except for the admin.
  if (body.provider === "dodo") {
    const { data: adm } = await db.from("admin_allowlist").select("email").eq("email", user.email.toLowerCase()).maybeSingle();
    if (adm) return dodoCheckout(req, db, body, { source, vat, ref, user });
  }

  // Lemon Squeezy: one product per checkout
  if (!key) return fail(req, "Checkout isn't set up.", 503);
  const slug = String(body.slug ?? "");
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return fail(req, "Unknown product.", 400);
  // Lemon Squeezy checks the code itself (its products and dates); this only keeps the value tidy
  const discount = String(body.discount_code ?? "");

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

// ---------------------------------------------------------------- Dodo Payments (from the switch; 24 Nov 2026)
// POST /checkouts (Dodo's API: Bearer key; dodo_test_ keys use test.dodopayments.com and Dodo's separate test catalogue).
// The whole cart is one payment (product_cart, up to 20), the codes stack (discount_codes: the sale's and an
// affiliate's together, as Matan decided), and the page is in the site's language (force_language "he" / "en").
// On failure this answers 424: the cart then says checkout isn't available, and never falls back to a Lemon Squeezy link.
async function dodoCheckout(req: Request, db: ReturnType<typeof admin>, body: Record<string, unknown>, o: {
  source: string; vat: string; ref: string; user: { id: string; email?: string; user_metadata?: Record<string, unknown> };
}) {
  const key = Deno.env.get("DODO_API_KEY") ?? "";
  if (!key) return fail(req, "Checkout isn't available right now.", 424);
  const test = key.startsWith("dodo_test_");
  const base = test ? "https://test.dodopayments.com" : "https://live.dodopayments.com";
  const slugs = [...new Set((Array.isArray(body.slugs) ? body.slugs : [body.slug]).map(String))]
    .filter((x) => /^[a-z0-9-]{1,80}$/.test(x)).slice(0, 20);
  if (!slugs.length) return fail(req, "Unknown product.", 400);
  const col = test ? "dodo_test_product_id" : "dodo_product_id";
  const { data: rows } = await db.from("products").select("slug, dodo_product_id, dodo_test_product_id").in("slug", slugs);
  const ids = slugs.map((x) => String((rows ?? []).find((r) => r.slug === x)?.[col] ?? ""));
  if (ids.some((x) => !x)) return fail(req, "Checkout isn't available right now.", 424);
  const codes = [...new Set((Array.isArray(body.discount_codes) ? body.discount_codes : [body.discount_code]).map(String))]
    .filter((c) => /^[A-Z0-9]{3,32}$/.test(c)).slice(0, 5);
  const metadata: Record<string, string> = { user_id: o.user.id };
  if (o.source) metadata.source = o.source;
  if (o.vat) metadata.vat = o.vat;
  if (o.ref) metadata.ref = o.ref;
  if (codes.length) metadata.codes = codes.join(",");
  const site = (Deno.env.get("SITE_URL") || "https://shop.mw.photography").replace(/\/$/, "");
  const lang = body.lang === "he" ? "he" : "en";
  const payload = {
    product_cart: ids.map((product_id) => ({ product_id, quantity: 1 })),
    customer: { email: o.user.email, ...(o.user.user_metadata?.name ? { name: String(o.user.user_metadata.name).slice(0, 100) } : {}) },
    ...(codes.length ? { discount_codes: codes } : {}),
    metadata,
    return_url: `${site}/thank-you/${lang === "he" ? "?lang=he" : ""}`,
    customization: { force_language: lang, theme: "dark" },
  };
  try {
    const res = await fetch(`${base}/checkouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    const out = await res.json().catch(() => null);
    const url = String(out?.checkout_url ?? "");
    if (!res.ok || !/^https:\/\//.test(url)) {
      console.error("dodo checkout failed", res.status, JSON.stringify(out).slice(0, 400));
      return fail(req, "Checkout isn't available right now.", 424);
    }
    return json(req, { url, provider: "dodo" });
  } catch (err) {
    console.error("dodo checkout error", err);
    return fail(req, "Checkout isn't available right now.", 424);
  }
}
