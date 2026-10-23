// ============================================================================
// checkout-webhook — receives Lemon Squeezy order events.
// Deploy with JWT verification OFF (the checkout provider can't send a Supabase token):
//   supabase functions deploy checkout-webhook --no-verify-jwt
// Events handled: order_created (status paid) and order_refunded.
// Idempotent: each event is recorded in webhook_events after it succeeds, and a
// repeat delivery of the same event returns 200 without doing anything twice.
// ============================================================================
import { requestPersonalCopies, admin, hmacHex, notifyMake, plain, safeEqual } from "../_shared/http.ts";

const SECRET = Deno.env.get("CHECKOUT_WEBHOOK_SECRET") ?? "";

type LsOrder = {
  meta: { event_name: string; test_mode?: boolean; custom_data?: Record<string, string> };
  data: {
    id: string;
    attributes: {
      order_number: number; identifier: string; status: string;
      user_email: string; user_name: string; currency: string;
      subtotal: number; tax: number; total: number;
      discount_total?: number; refunded?: boolean; refunded_at?: string | null; refunded_amount?: number;
      created_at?: string; urls?: { receipt?: string };
      first_order_item: { variant_id: number; product_name: string; variant_name: string; price: number };
    };
  };
};

const text = (body: string, status = 200) => new Response(body, { status });

Deno.serve(async (req) => {
  if (req.method !== "POST") return text("method not allowed", 405);
  if (!SECRET) return text("webhook secret not configured", 500);

  const raw = await req.text();
  const signature = req.headers.get("x-signature") ?? "";
  if (!signature || !safeEqual(await hmacHex(SECRET, raw), signature)) return text("bad signature", 401);

  let body: LsOrder;
  try { body = JSON.parse(raw); } catch { return text("bad json", 400); }

  const db = admin();
  const event = body.meta?.event_name;
  const orderId = String(body.data?.id ?? "");
  const a = body.data?.attributes;
  if (!event || !orderId || !a) return text("unexpected payload", 400);

  const eventId = event === "order_refunded" ? `${event}:${orderId}:${a.refunded_at ?? ""}` : `${event}:${orderId}`;
  const { data: seen } = await db.from("webhook_events").select("event_id").eq("event_id", eventId).maybeSingle();
  if (seen) return text("already processed");

  try {
    if (event === "order_created") {
      if (a.status !== "paid") return text(`ignored status ${a.status}`);
      await handlePaid(db, orderId, a, body.meta.custom_data ?? {}, body.meta.test_mode === true);
    } else if (event === "order_refunded") {
      await handleRefund(db, orderId, a.refunded !== false, a, body.meta.test_mode === true);
    } else {
      return text(`ignored ${event}`);
    }
    await db.from("webhook_events").insert({ event_id: eventId, provider: "lemonsqueezy", payload: body });
    return text("ok");
  } catch (err) {
    // Non-2xx makes Lemon Squeezy retry later; nothing is half-recorded as processed.
    console.error(eventId, err);
    return text("processing failed", 500);
  }
});

// Bundle slug -> the products it unlocks (slugs as set in the admin). Every bundle with MWP Presets includes the
// Lightroom Classic plugin, which is otherwise sold on its own (Jeinna, 23 Oct 2026).
const BUNDLES: Record<string, string[]> = {
  "presets-field-guides": ["mwp-presets", "mwp-lightroom-plugin", "mwp-field-guides"],
  "presets-panel": ["mwp-presets", "mwp-lightroom-plugin", "mwp-panel"],
  "field-guides-panel": ["mwp-field-guides", "mwp-panel"],
  "full-set": ["mwp-presets", "mwp-lightroom-plugin", "mwp-panel", "mwp-field-guides"],
};

async function handlePaid(
  db: ReturnType<typeof admin>, orderId: string, a: LsOrder["data"]["attributes"], custom: Record<string, string>, testMode: boolean,
) {
  const email = a.user_email.trim().toLowerCase();

  const { data: product, error: pErr } = await db.from("products")
    .select("id, name, name_emphasis, slug")
    .eq("checkout_variant_id", String(a.first_order_item.variant_id)).maybeSingle();
  if (pErr) throw pErr;
  if (!product) throw new Error(`no product for variant ${a.first_order_item.variant_id}`);

  const { data: customer, error: cErr } = await db.from("customers")
    .upsert({ email, name: a.user_name || null }, { onConflict: "email" })
    .select("id, email, name, created_at").single();
  if (cErr) throw cErr;

  const { data: order, error: oErr } = await db.from("orders").upsert({
    checkout_order_id: orderId,
    order_number: String(a.order_number),
    customer_id: customer.id,
    subtotal_cents: a.subtotal,
    tax_cents: a.tax,
    total_cents: a.total,
    currency: a.currency,
    status: "paid",
    source: custom.source?.slice(0, 64) ?? null,
  }, { onConflict: "checkout_order_id" }).select("id").single();
  if (oErr) throw oErr;

  const { error: iErr } = await db.from("order_items")
    .upsert({ order_id: order.id, product_id: product.id, price_cents: a.subtotal }, { onConflict: "order_id,product_id" });
  if (iErr) throw iErr;

  const { error: eErr } = await db.from("entitlements").upsert(
    { customer_id: customer.id, product_id: product.id, order_id: order.id, revoked_at: null, view_only: false },
    { onConflict: "customer_id,product_id" });
  if (eErr) throw eErr;

  // A bundle also unlocks each product in it, so My downloads shows them as separate downloads and
  // only one file per product is ever uploaded. A product the buyer already owns keeps its own order,
  // so refunding the bundle never takes away something bought separately.
  const parts = BUNDLES[product.slug] ?? [];
  if (parts.length) {
    const { data: partRows, error: ppErr } = await db.from("products").select("id, slug").in("slug", parts);
    if (ppErr) throw ppErr;
    for (const part of partRows ?? []) {
      const { data: owned } = await db.from("entitlements").select("id, revoked_at, view_only")
        .eq("customer_id", customer.id).eq("product_id", part.id).maybeSingle();
      if (owned && !owned.revoked_at && !owned.view_only) continue;   // an ambassador's read-only guides become a download
      const { error: bErr } = await db.from("entitlements").upsert(
        { customer_id: customer.id, product_id: part.id, order_id: order.id, revoked_at: null, view_only: false },
        { onConflict: "customer_id,product_id" });
      if (bErr) throw bErr;
    }
  }

  await requestPersonalCopies();   // start making their marked copies right away

  const { count } = await db.from("orders").select("id", { count: "exact", head: true })
    .eq("customer_id", customer.id).eq("status", "paid");

  await notifyMake("MAKE_ORDER_WEBHOOK", {
    type: "order",
    order_id: order.id,
    checkout_order_id: orderId,
    order_number: String(a.order_number),
    order_date: (a.created_at ?? new Date().toISOString()).slice(0, 10),
    test_mode: testMode,
    status_label: testMode ? "Test order" : "Paid",
    email,
    name: plain(a.user_name),
    product: plain([product.name, product.name_emphasis].filter(Boolean).join(" ")),
    product_slug: product.slug,
    subtotal: a.subtotal / 100,
    discount: (a.discount_total ?? 0) / 100,
    tax: a.tax / 100,
    total: a.total / 100,
    currency: a.currency,
    receipt_url: a.urls?.receipt ?? null,
    source: plain(custom.source),
    repeat_customer: (count ?? 1) > 1,
    downloads_url: `${Deno.env.get("SITE_URL")}/account/?email=${encodeURIComponent(email)}`,
  });
}

// A full refund revokes access; a partial refund (a goodwill partial credit) keeps it.
async function handleRefund(
  db: ReturnType<typeof admin>, orderId: string, full: boolean, a: LsOrder["data"]["attributes"], testMode: boolean,
) {
  const { data: order, error } = await db.from("orders")
    .update({ status: full ? "refunded" : "partially_refunded", refunded_at: new Date().toISOString() })
    .eq("checkout_order_id", orderId).select("id, order_number, customer_id").maybeSingle();
  if (error) throw error;
  if (!order) throw new Error(`refund for unknown order ${orderId}`); // retried until the order exists

  if (full) {
    const { error: rErr } = await db.from("entitlements")
      .update({ revoked_at: new Date().toISOString() }).eq("order_id", order.id);
    if (rErr) throw rErr;
  }

  const { data: customer } = await db.from("customers").select("email").eq("id", order.customer_id).single();
  await notifyMake("MAKE_ORDER_WEBHOOK", {
    type: full ? "refund" : "partial_refund", order_id: order.id, checkout_order_id: orderId,
    order_number: order.order_number, email: customer?.email, test_mode: testMode,
    refunded_amount: (a.refunded_amount ?? (full ? a.total : 0)) / 100, currency: a.currency,
  });
}
