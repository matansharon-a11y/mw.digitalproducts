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
import { lsCustomerCountry } from "../_shared/lscountry.ts";
import { providerOrderCode } from "../_shared/affiliates.ts";
import { fulfillPaid, fulfillRefund } from "../_shared/fulfill.ts";
import { admin, hmacHex, safeEqual } from "../_shared/http.ts";

// The signing secrets are made by "Connect Lemon Squeezy" (tools/connect_lemonsqueezy.py), one for the test-mode
// webhook and one for the live one, and set here directly: no one ever types them. A request signed with either is
// accepted; test orders are then told apart by their test_mode flag.
const SECRETS = [Deno.env.get("LS_WEBHOOK_SECRET_LIVE"), Deno.env.get("LS_WEBHOOK_SECRET_TEST")].filter((s): s is string => !!s);

type LsOrder = {
  meta: { event_name: string; test_mode?: boolean; custom_data?: Record<string, string> };
  data: {
    id: string;
    attributes: {
      order_number: number; identifier: string; status: string; customer_id?: number;
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
  if (!SECRETS.length) return text("webhook secret not configured", 500);

  const raw = await req.text();
  const signature = req.headers.get("x-signature") ?? "";
  let signed = false;
  for (const s of SECRETS) if (safeEqual(await hmacHex(s, raw), signature)) signed = true;   // checks every secret: no timing hint
  if (!signature || !signed) return text("bad signature", 401);

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

// Lemon Squeezy's order → the shop's own fulfilment (_shared/fulfill.ts, shared with Creem since 24 Nov 2026)
async function handlePaid(
  db: ReturnType<typeof admin>, orderId: string, a: LsOrder["data"]["attributes"], custom: Record<string, string>, testMode: boolean,
) {
  await fulfillPaid(db, {
    provider: "lemonsqueezy",
    providerOrderId: orderId,
    orderNumber: String(a.order_number),
    email: a.user_email,
    name: a.user_name,
    country: await lsCustomerCountry(a.customer_id),   // the billing country (Lemon Squeezy's customer record)
    subtotalCents: a.subtotal, taxCents: a.tax, totalCents: a.total, discountCents: a.discount_total ?? 0,
    currency: a.currency,
    createdAt: a.created_at ?? new Date().toISOString(),
    receiptUrl: receiptUrl(a.urls?.receipt),
    testMode,
    product: { column: "checkout_variant_id", value: String(a.first_order_item.variant_id),
               label: `${a.first_order_item.product_name} (variant ${a.first_order_item.variant_id})` },
    custom,
    // its order notice only carries the discount's amount, so the code is asked for
    usedCode: (a.discount_total ?? 0) > 0 ? await providerOrderCode(orderId) : null,
  });
}

async function handleRefund(
  db: ReturnType<typeof admin>, orderId: string, full: boolean, a: LsOrder["data"]["attributes"], testMode: boolean,
) {
  await fulfillRefund(db, { providerOrderId: orderId, full, testMode, currency: a.currency,
    refundedCents: a.refunded_amount ?? (full ? a.total : 0) });
}

// Lemon Squeezy's receipt link, kept only when it's an https link on lemonsqueezy.com (the database checks the same).
function receiptUrl(u?: string | null): string | null {
  try {
    const url = new URL(u ?? "");
    return url.protocol === "https:" && (url.hostname === "lemonsqueezy.com" || url.hostname.endsWith(".lemonsqueezy.com")) ? url.href : null;
  } catch { return null; }
}

export { isIsraeliPhone } from "../_shared/fulfill.ts";
