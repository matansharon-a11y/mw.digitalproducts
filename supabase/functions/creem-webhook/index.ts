// ============================================================================
// creem-webhook — receives Creem's events (24 Nov 2026, getting ready for the move from Lemon Squeezy).
// Creem → Developers → Webhooks: this function's address, with its signing secret set as the function secret
// CREEM_WEBHOOK_SECRET (and CREEM_WEBHOOK_SECRET_TEST for the test-mode webhook). Deploy with JWT verification off.
//   checkout.completed → the order is paid: the shop's own fulfilment (_shared/fulfill.ts), like Lemon Squeezy's
//   refund.created     → a full refund takes the downloads (and the affiliate's sale) back; a partial one keeps them
//   dispute.created    → recorded and raised in monday's Shop Orders as "Not delivered" for the team to look at
// Signature: HMAC-SHA256 of the raw body with the webhook secret, hex, in the creem-signature header (Creem's docs).
// Creem retries (up to 5 times over ~6 hours) with the same event id: each event is recorded in webhook_events after
// it succeeds, and a repeat delivery returns 200 without doing anything twice.
// Test-mode orders (mode "test"/"sandbox") unlock nothing, except for the admin (or ALLOW_TEST_ORDERS=true).
// ============================================================================
import { cleanCode } from "../_shared/affiliates.ts";
import { fulfillPaid, fulfillRefund } from "../_shared/fulfill.ts";
import { admin, hmacHex, notifyMake, safeEqual } from "../_shared/http.ts";

const SECRETS = [Deno.env.get("CREEM_WEBHOOK_SECRET"), Deno.env.get("CREEM_WEBHOOK_SECRET_TEST")].filter((s): s is string => !!s);
const text = (body: string, status = 200) => new Response(body, { status });

// deno-lint-ignore no-explicit-any
type Any = any;
const idOf = (v: Any) => (v && typeof v === "object" ? String(v.id ?? "") : String(v ?? ""));
const cents = (v: Any) => Math.round(Number(v) || 0);

Deno.serve(async (req) => {
  if (req.method !== "POST") return text("method not allowed", 405);
  if (!SECRETS.length) return text("webhook secret not configured", 500);

  const raw = await req.text();
  const signature = (req.headers.get("creem-signature") ?? "").trim().toLowerCase();
  let signed = false;
  for (const s of SECRETS) if (safeEqual(await hmacHex(s, raw), signature)) signed = true;   // every secret: no timing hint
  if (!signature || !signed) return text("bad signature", 401);

  let body: Any;
  try { body = JSON.parse(raw); } catch { return text("bad json", 400); }
  const event = String(body?.eventType ?? "");
  const obj = body?.object;
  if (!event || !obj) return text("unexpected payload", 400);

  const db = admin();
  const eventId = `creem:${body.id ?? `${event}:${idOf(obj)}`}`;
  const { data: seen } = await db.from("webhook_events").select("event_id").eq("event_id", eventId).maybeSingle();
  if (seen) return text("already processed");

  try {
    if (event === "checkout.completed") {
      const order = obj.order ?? {};
      if (order.status && order.status !== "paid") return text(`ignored status ${order.status}`);
      const testMode = String(order.mode ?? obj.mode ?? "prod") !== "prod";
      const customer = obj.customer && typeof obj.customer === "object" ? obj.customer : {};
      const product = obj.product && typeof obj.product === "object" ? obj.product : { id: obj.product ?? order.product };
      const meta: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj.metadata ?? {})) meta[k] = String(v ?? "");
      const discount = order.discount && typeof order.discount === "object" ? order.discount : null;
      const total = cents(order.amount_paid ?? order.amount);
      await fulfillPaid(db, {
        provider: "creem",
        providerOrderId: idOf(order),
        orderNumber: idOf(order),
        email: String(customer.email ?? ""),
        name: String(customer.name ?? ""),
        country: /^[A-Za-z]{2}$/.test(String(customer.country ?? "")) ? String(customer.country) : null,
        subtotalCents: cents(order.sub_total ?? total), taxCents: cents(order.tax_amount), totalCents: total,
        discountCents: cents(order.discount_amount),
        currency: String(order.currency ?? product.currency ?? "USD").toUpperCase(),
        createdAt: String(order.created_at ?? body.created_at ?? new Date().toISOString()),
        receiptUrl: null,   // Creem's receipts live in its own customer portal
        testMode,
        product: { column: testMode ? "creem_test_product_id" : "creem_product_id", value: idOf(product), label: String(product.name ?? "Creem product") },
        custom: meta,
        usedCode: cleanCode(discount?.code ?? discount?.discount_code ?? discount?.discountCode) || null,
      });
    } else if (event === "refund.created") {
      const order = obj.order && typeof obj.order === "object" ? obj.order : { id: obj.order };
      const refunded = cents(obj.refund_amount);
      const paid = cents(order.amount_paid ?? order.amount);
      await fulfillRefund(db, {
        providerOrderId: idOf(order), full: !paid || refunded >= paid, refundedCents: refunded,
        currency: String(obj.refund_currency ?? order.currency ?? "USD").toUpperCase(),
        testMode: String(obj.mode ?? order.mode ?? "prod") !== "prod",
      });
    } else if (event === "dispute.created") {
      const orderId = idOf(obj.order);
      const { data: o } = await db.from("orders").select("id, order_number").eq("checkout_order_id", orderId).maybeSingle();
      await notifyMake("MAKE_ORDER_WEBHOOK", {
        type: "order", order_id: o?.id ?? null, checkout_order_id: orderId, order_number: o?.order_number ?? orderId,
        order_date: String(body.created_at ?? new Date().toISOString()).slice(0, 10), test_mode: false,
        status_label: "Not delivered", email: "", name: "", product: "DISPUTE opened at Creem: check it in Creem's dashboard",
        product_slug: "", subtotal: 0, discount: 0, tax: 0, total: 0, currency: "USD", receipt_url: null, source: "",
        repeat_customer: false, downloads_url: "",
      });
    } else {
      return text(`ignored ${event}`);
    }
    const { error: logErr } = await db.from("webhook_events").insert({ event_id: eventId, provider: "creem", payload: body });
    if (logErr) throw logErr;   // unrecorded: Creem retries, and the handlers above are safe to run again
    return text("ok");
  } catch (err) {
    console.error(eventId, err);
    return text("processing failed", 500);   // Creem retries later; nothing is half-recorded as processed
  }
});
