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

  const { data: product } = await db.from("products").select("checkout_variant_id").eq("slug", slug).maybeSingle();
  const variant = String(product?.checkout_variant_id ?? "");
  if (!/^\d+$/.test(variant)) return fail(req, "Unknown product.", 404);

  const custom: Record<string, string> = { user_id: user.id };
  if (source) custom.source = source;
  if (vat) custom.vat = vat;
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
