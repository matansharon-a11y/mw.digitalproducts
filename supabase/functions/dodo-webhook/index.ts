// ============================================================================
// dodo-webhook — receives Dodo Payments' events (24 Nov 2026, getting ready for the move from Lemon Squeezy).
// Dodo → Developer → Webhooks: this function's address, with its signing secret set as the function secret
// DODO_WEBHOOK_SECRET (live) and DODO_WEBHOOK_SECRET_TEST (test mode). Deploy with JWT verification off.
//   payment.succeeded → the order is paid: the shop's own fulfilment (_shared/fulfill.ts), like Lemon Squeezy's;
//                       a Dodo order can hold the whole cart (product_cart), and its discount codes stack
//   refund.succeeded  → a full refund takes the downloads (and the affiliate's sale) back; a partial one keeps them
//   dispute.opened    → raised in monday's Shop Orders as "Not delivered" for the team to look at
// Signature (Standard Webhooks, Dodo's docs): base64 HMAC-SHA256 of "<webhook-id>.<webhook-timestamp>.<raw body>" with
// the secret (the part after "whsec_", base64-decoded), in webhook-signature as "v1,<sig>" (several may be listed).
// Older than 5 minutes is refused (replays). Dodo retries up to 8 times with the same webhook-id: each event is
// recorded in webhook_events after it succeeds, and a repeat delivery returns 200 without doing anything twice.
// The secret that matched tells test mode from live: test orders unlock nothing, except for the admin.
// ============================================================================
import { cleanCode } from "../_shared/affiliates.ts";
import { fulfillPaid, fulfillRefund } from "../_shared/fulfill.ts";
import { verify } from "../_shared/dodo.ts";
import { admin, notifyMake } from "../_shared/http.ts";

const LIVE = Deno.env.get("DODO_WEBHOOK_SECRET") ?? "";
const TEST = Deno.env.get("DODO_WEBHOOK_SECRET_TEST") ?? "";
const text = (body: string, status = 200) => new Response(body, { status });

// deno-lint-ignore no-explicit-any
type Any = any;

const API = (mode: "live" | "test") => (mode === "test" ? "https://test.dodopayments.com" : "https://live.dodopayments.com");
// The key for each mode: DODO_API_KEY holds the test key (dodo_test_…) until the live one replaces it
const KEY = (mode: "live" | "test") => {
  const main = Deno.env.get("DODO_API_KEY") ?? "", test = Deno.env.get("DODO_API_KEY_TEST") ?? "";
  return mode === "test" ? (test || (main.startsWith("dodo_test_") ? main : "")) : (main.startsWith("dodo_test_") ? "" : main);
};

// The codes a payment used: what the cart sent (metadata "codes") and what Dodo lists (a code typed at checkout)
async function codesOf(p: Any, mode: "live" | "test"): Promise<string[]> {
  const out = new Set(String(p.metadata?.codes ?? "").split(",").map(cleanCode).filter(Boolean));
  const listed = [...(Array.isArray(p.discounts) ? p.discounts : []), ...(p.discount_id ? [p.discount_id] : [])];
  for (const d of listed) {
    const code = cleanCode(typeof d === "object" ? d?.code : "");
    if (code) { out.add(code); continue; }
    const id = typeof d === "object" ? String(d?.discount_id ?? "") : String(d ?? "");
    if (!/^[A-Za-z0-9_-]{3,80}$/.test(id) || !KEY(mode)) continue;
    try {
      const res = await fetch(`${API(mode)}/discounts/${id}`, { headers: { Authorization: `Bearer ${KEY(mode)}` }, signal: AbortSignal.timeout(8000) });
      const c = cleanCode((await res.json().catch(() => ({})))?.code);
      if (c) out.add(c);
    } catch (err) { console.error("dodo discount lookup", id, err); }
  }
  return [...out];
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return text("method not allowed", 405);
  if (!LIVE && !TEST) return text("webhook secret not configured", 500);
  const raw = await req.text();
  const mode = await verify(req.headers, raw, { live: LIVE, test: TEST });
  if (!mode) return text("bad signature", 401);

  let body: Any;
  try { body = JSON.parse(raw); } catch { return text("bad json", 400); }
  const event = String(body?.type ?? "");
  const data = body?.data;
  if (!event || !data) return text("unexpected payload", 400);

  const db = admin();
  const eventId = `dodo:${req.headers.get("webhook-id")}`;
  const { data: seen } = await db.from("webhook_events").select("event_id").eq("event_id", eventId).maybeSingle();
  if (seen) return text("already processed");
  const testMode = mode === "test";

  try {
    if (event === "payment.succeeded") {
      const meta: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.metadata ?? {})) meta[k] = String(v ?? "");
      // Adaptive Currency stays on (Jeinna, 26 Nov 2026): the buyer pays in their own currency, and Dodo's
      // settlement_amount is the sale in dollars at the shop's price (test: PHP 1126.51 paid, settlement 1699 USD).
      // The shop records the dollars, so Finances, affiliates and the payout invoice all count in USD.
      const usd = String(data.settlement_currency ?? "").toUpperCase() === "USD" && Number.isFinite(Number(data.settlement_amount));
      const total = Math.round(Number(usd ? data.settlement_amount : data.total_amount) || 0);
      const tax = Math.round(Number(usd ? data.settlement_tax : data.tax) || 0);
      const currency = usd ? "USD" : String(data.currency ?? "USD").toUpperCase();
      const column = testMode ? "dodo_test_product_id" : "dodo_product_id";
      const cart: Any[] = Array.isArray(data.product_cart) ? data.product_cart : [];
      await fulfillPaid(db, {
        provider: "dodo",
        providerOrderId: String(data.payment_id),
        orderNumber: String(data.payment_id),
        email: String(data.customer?.email ?? ""),
        name: String(data.customer?.name ?? ""),
        country: /^[A-Za-z]{2}$/.test(String(data.billing?.country ?? "")) ? String(data.billing.country) : null,
        subtotalCents: total - tax, taxCents: tax, totalCents: total, discountCents: 0,
        currency,
        createdAt: String(data.created_at ?? body.timestamp ?? new Date().toISOString()),
        receiptUrl: null,   // Dodo's invoice is fetched with the API key (GET /invoices/payments/{id}), not a public link
        testMode,
        products: cart.map((c) => ({ column, value: String(c.product_id), label: "Dodo product" })),
        custom: meta,
        usedCode: (await codesOf(data, mode)).join(",") || null,
      });
    } else if (event === "refund.succeeded") {
      const { data: o } = await db.from("orders").select("total_cents").eq("checkout_order_id", String(data.payment_id)).maybeSingle();
      let amount = Math.round(Number(data.amount) || 0);
      let currency = String(data.currency ?? "USD").toUpperCase();
      // A refund comes in the currency the buyer paid: turn it into dollars at the payment's own rate
      // (settlement_amount / total_amount from Dodo), so it matches the order recorded in dollars
      if (currency !== "USD" && KEY(mode)) {
        try {
          const res = await fetch(`${API(mode)}/payments/${encodeURIComponent(String(data.payment_id))}`,
            { headers: { Authorization: `Bearer ${KEY(mode)}` }, signal: AbortSignal.timeout(8000) });
          const pay = await res.json().catch(() => ({}));
          const paid = Number(pay?.total_amount), settled = Number(pay?.settlement_amount);
          if (String(pay?.settlement_currency ?? "").toUpperCase() === "USD" && paid > 0 && settled >= 0) {
            amount = Math.round(amount * settled / paid);
            currency = "USD";
          }
        } catch (err) { console.error("dodo payment lookup for refund", err); }
      }
      const full = data.is_partial === false || (data.is_partial == null && o && amount >= o.total_cents);
      await fulfillRefund(db, {
        providerOrderId: String(data.payment_id), full: Boolean(full), refundedCents: amount,
        currency, testMode,
      });
    } else if (event === "dispute.opened") {
      const paymentId = String(data.payment_id ?? "");
      const { data: o } = await db.from("orders").select("id, order_number").eq("checkout_order_id", paymentId).maybeSingle();
      await notifyMake("MAKE_ORDER_WEBHOOK", {
        type: "order", order_id: o?.id ?? null, checkout_order_id: paymentId, order_number: o?.order_number ?? paymentId,
        order_date: String(body.timestamp ?? new Date().toISOString()).slice(0, 10), test_mode: testMode,
        status_label: "Not delivered", email: "", name: "", product: "DISPUTE opened at Dodo Payments: check it in Dodo's dashboard",
        product_slug: "", subtotal: 0, discount: 0, tax: 0, total: 0, currency: "USD", receipt_url: null, source: "",
        repeat_customer: false, downloads_url: "",
      });
    } else {
      return text(`ignored ${event}`);
    }
    const { error: logErr } = await db.from("webhook_events").insert({ event_id: eventId, provider: "dodo", payload: body });
    if (logErr) throw logErr;   // unrecorded: Dodo retries, and the handlers above are safe to run again
    return text("ok");
  } catch (err) {
    console.error(eventId, err);
    return text("processing failed", 500);   // Dodo retries later; nothing is half-recorded as processed
  }
});
