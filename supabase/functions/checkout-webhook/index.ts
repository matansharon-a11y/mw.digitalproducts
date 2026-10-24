// ============================================================================
// checkout-webhook — receives Lemon Squeezy order events.
// Deploy with JWT verification OFF (the checkout provider can't send a Supabase token):
//   supabase functions deploy checkout-webhook --no-verify-jwt
// Events handled: order_created (status paid) and order_refunded.
// Test-mode orders (Lemon Squeezy's test card) unlock nothing, unless the buyer is the admin (to try the whole flow)
// or ALLOW_TEST_ORDERS=true is set: a test checkout link that reached the live site must never give products away.
// Idempotent: each event is recorded in webhook_events after it succeeds, and a
// repeat delivery of the same event returns 200 without doing anything twice.
// ============================================================================
import { requestPersonalCopies, admin, hmacHex, notifyMake, plain, safeEqual } from "../_shared/http.ts";

const SECRET = Deno.env.get("CHECKOUT_WEBHOOK_SECRET") ?? "";
const ALLOW_TEST_ORDERS = Deno.env.get("ALLOW_TEST_ORDERS") === "true";

type LsOrder = {
  meta: { event_name: string; test_mode?: boolean; custom_data?: Record<string, string> };
  data: {
    id: string;
    attributes: {
      order_number: number; identifier: string; status: string;
      user_email: string; user_name: string; currency: string;
      subtotal: number; tax: number; total: number;
      test_mode?: boolean; discount_total?: number; refunded?: boolean; refunded_at?: string | null; refunded_amount?: number;
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
  // Lemon Squeezy documents test mode on the order itself (data.attributes.test_mode); meta.test_mode is read too.
  // Either one marks a test order, so a test-card purchase can never unlock anything as if it were real.
  const testMode = a.test_mode === true || body.meta?.test_mode === true;

  const eventId = event === "order_refunded" ? `${event}:${orderId}:${a.refunded_at ?? ""}` : `${event}:${orderId}`;
  const { data: seen } = await db.from("webhook_events").select("event_id").eq("event_id", eventId).maybeSingle();
  if (seen) return text("already processed");

  try {
    if (event === "order_created") {
      if (a.status !== "paid") return text(`ignored status ${a.status}`);
      await handlePaid(db, orderId, a, body.meta.custom_data ?? {}, testMode);
    } else if (event === "order_refunded") {
      // Lemon Squeezy marks the order "refunded" (all of it) or "partial_refund" (a goodwill credit: access stays)
      const full = a.status === "refunded" || (a.status !== "partial_refund" && a.refunded === true && (a.refunded_amount ?? a.total) >= a.total);
      await handleRefund(db, orderId, full, a, testMode);
    } else {
      return text(`ignored ${event}`);
    }
    const { error: logErr } = await db.from("webhook_events").insert({ event_id: eventId, provider: "lemonsqueezy", payload: body });
    if (logErr) throw logErr;   // unrecorded: Lemon Squeezy retries, and the handlers above are safe to run again
    return text("ok");
  } catch (err) {
    // Non-2xx makes Lemon Squeezy retry later; nothing is half-recorded as processed.
    console.error(eventId, err);
    return text("processing failed", 500);
  }
});

// Bundle slug -> the products it unlocks (slugs as set in the admin). MWP Presets and the Lightroom Classic plugin are
// sold only together (Jeinna, 23 Oct 2026): buying MWP Presets unlocks the plugin, and so does every bundle with it.
const BUNDLES: Record<string, string[]> = {
  "mwp-presets": ["mwp-lightroom-plugin"],
  "presets-field-guides": ["mwp-presets", "mwp-lightroom-plugin", "mwp-field-guides"],
  "presets-panel": ["mwp-presets", "mwp-lightroom-plugin", "mwp-panel"],
  "field-guides-panel": ["mwp-field-guides", "mwp-panel"],
  "full-set": ["mwp-presets", "mwp-lightroom-plugin", "mwp-panel", "mwp-field-guides"],
};

async function handlePaid(
  db: ReturnType<typeof admin>, orderId: string, a: LsOrder["data"]["attributes"], custom: Record<string, string>, testMode: boolean,
) {
  // The purchase belongs to the account that started the checkout (cart.js sends its user id), even when the buyer
  // typed another email at checkout; otherwise to the email they paid with.
  let email = a.user_email.trim().toLowerCase();
  if (/^[0-9a-f-]{36}$/i.test(custom.user_id ?? "")) {
    const { data: u } = await db.auth.admin.getUserById(custom.user_id);
    const accountEmail = u?.user?.email_confirmed_at ? u.user.email?.trim().toLowerCase() : "";
    if (accountEmail) email = accountEmail;
  }

  if (testMode && !ALLOW_TEST_ORDERS) {
    const { data: isAdmin } = await db.from("admin_allowlist").select("email").eq("email", email).maybeSingle();
    if (!isAdmin) { console.warn(`test-mode order ${orderId} from ${email}: nothing unlocked`); return; }
  }

  // an old "paid" notice sent again (Lemon Squeezy's resend) never reopens a refunded order
  const { data: known } = await db.from("orders").select("status").eq("checkout_order_id", orderId).maybeSingle();
  if (known?.status === "refunded") { console.warn(`order ${orderId} is refunded: paid notice ignored`); return; }

  const { data: product, error: pErr } = await db.from("products")
    .select("id, name, name_emphasis, slug")
    .eq("checkout_variant_id", String(a.first_order_item.variant_id)).maybeSingle();
  if (pErr) throw pErr;

  // the customer's own name (My details) is kept; the checkout name only fills an empty one
  const { data: customer, error: cErr } = await db.from("customers")
    .upsert({ email }, { onConflict: "email" })
    .select("id, email, name, created_at").single();
  if (cErr) throw cErr;
  if (!customer.name && a.user_name) await db.from("customers").update({ name: a.user_name }).eq("id", customer.id);

  const { data: order, error: oErr } = await db.from("orders").upsert({
    checkout_order_id: orderId,
    order_number: String(a.order_number),
    customer_id: customer.id,
    subtotal_cents: a.subtotal,
    tax_cents: a.tax,
    total_cents: a.total,
    currency: a.currency,
    status: "paid",
    test_mode: testMode,
    source: custom.source?.slice(0, 64) ?? null,
  }, { onConflict: "checkout_order_id" }).select("id").single();
  if (oErr) throw oErr;

  // Paid for something the shop doesn't know (a variant the connect script hasn't linked, or a product bought from
  // the Lemon Squeezy storefront): keep the order and raise it in monday, instead of failing until the retries stop.
  if (!product) {
    console.error(`order ${orderId}: no product for variant ${a.first_order_item.variant_id}`);
    await notifyMake("MAKE_ORDER_WEBHOOK", {
      type: "order", order_id: order.id, checkout_order_id: orderId, order_number: String(a.order_number),
      order_date: (a.created_at ?? new Date().toISOString()).slice(0, 10), test_mode: testMode,
      status_label: "Paid, NOT DELIVERED: product not linked", email, name: plain(a.user_name),
      product: plain(`UNMATCHED: ${a.first_order_item.product_name} (variant ${a.first_order_item.variant_id})`),
      product_slug: "", subtotal: a.subtotal / 100, discount: (a.discount_total ?? 0) / 100, tax: a.tax / 100,
      total: a.total / 100, currency: a.currency, receipt_url: a.urls?.receipt ?? null, source: plain(custom.source),
      repeat_customer: false, downloads_url: "",
    });
    return;
  }

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
      const { data: owned } = await db.from("entitlements").select("id, order_id, revoked_at, view_only")
        .eq("customer_id", customer.id).eq("product_id", part.id).maybeSingle();
      // bought before: it keeps its own order. Free access (ambassador / tester) becomes paid access, so ending
      // the program never takes back what they paid for; read-only guides become a download.
      if (owned && owned.order_id && !owned.revoked_at && !owned.view_only) continue;
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
  if (!order) {
    if (testMode) return;   // a test order that unlocked nothing
    throw new Error(`refund for unknown order ${orderId}`); // retried until the order exists
  }

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
