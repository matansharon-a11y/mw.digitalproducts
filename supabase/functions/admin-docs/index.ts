// ============================================================================
// admin-docs: receipts and invoices for an order, from the admin (Jeinna, 6 Nov 2026).
// Lemon Squeezy is the merchant of record, so the documents are its own: the order's receipt (a signed page on its
// My Orders site where the buyer can also print it and make their own invoice) and its invoice PDF
// (POST /v1/orders/:id/generate-invoice, which needs the billing address: the shop doesn't collect addresses).
// Every document is kept in order_documents against its order.
//
// Actions (POST, the admin's own session token, which must pass is_admin(): two-step sign-in included):
//   receipt {order_id}                       → { url }   the receipt link (asked from Lemon Squeezy if the order has none)
//   invoice {order_id, billing}              → { url, document_id }   a new invoice PDF link
//   email   {order_id, document_id?}         → { ok }    emails the customer the receipt (and the invoice, if given),
//                                                         through Make's "MWP Shop · Update emails" scenario (one-time
//                                                         code, then the scheduler's update_list hands the email over)
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { admin, cors, fail, json } from "../_shared/http.ts";

const LS = "https://api.lemonsqueezy.com/v1";
// the same Make scenario the update emails use (supabase/functions/scheduler/updates.ts)
const EMAIL_HOOK = Deno.env.get("MAKE_UPDATES_WEBHOOK_URL") || "https://hook.eu1.make.com/xwf14t67ho423q9sb05pipde9bgv87v6";
const LS_URL = /^https:\/\/([a-z0-9-]+\.)*lemonsqueezy\.com\//;
const COUNTRY = /^[A-Z]{2}$/;

async function lemon(path: string, init: RequestInit = {}) {
  const key = Deno.env.get("LEMONSQUEEZY_API_KEY") ?? "";
  if (!key) throw new Error("The Lemon Squeezy key isn't set on the server.");
  const res = await fetch(`${LS}${path}`, {
    ...init,
    headers: { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json", Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const why = body?.errors?.[0]?.detail || body?.errors?.[0]?.title || `answered ${res.status}`;
    throw new Error(res.status === 404 ? "Lemon Squeezy doesn't know this order (a test-mode order can't be read with the live key)." : `Lemon Squeezy: ${why}`);
  }
  return body;
}

const clean = (v: unknown, max = 120) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return fail(req, "Method not allowed", 405);

  // the caller must be the admin: checked with their own token, so is_admin() also requires their two-step sign-in
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return fail(req, "Please sign in again.", 401);
  const asCaller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: isAdmin } = await asCaller.rpc("is_admin");
  if (isAdmin !== true) return fail(req, "Only the admin can do this.", 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = String(body.action ?? "");
  const orderId = String(body.order_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return fail(req, "Unknown order.");

  const db = admin();
  const { data: order } = await db.from("orders")
    .select("id, checkout_order_id, order_number, receipt_url, test_mode, status, customers(email, name, country)").eq("id", orderId).maybeSingle();
  if (!order) return fail(req, "Order not found.", 404);
  const customer = (order as unknown as { customers?: { email: string; name: string | null; country: string | null } }).customers;

  try {
    // the order's receipt link: saved by the webhook since 4 Nov 2026; older orders ask Lemon Squeezy once
    const receiptUrl = async (): Promise<string> => {
      if (order.receipt_url) return order.receipt_url as string;
      const lo = await lemon(`/orders/${encodeURIComponent(order.checkout_order_id)}`);
      const url = lo?.data?.attributes?.urls?.receipt;
      if (!url || !LS_URL.test(url)) throw new Error("Lemon Squeezy has no receipt link for this order.");
      await db.from("orders").update({ receipt_url: url }).eq("id", orderId);
      return url;
    };

    if (action === "receipt") {
      const url = await receiptUrl();
      await db.from("order_documents").insert({ order_id: orderId, kind: "receipt", url });
      return json(req, { url });
    }

    if (action === "invoice") {
      const b = (body.billing ?? {}) as Record<string, unknown>;
      const billing = {
        name: clean(b.name), address: clean(b.address, 200), city: clean(b.city), state: clean(b.state),
        zip_code: clean(b.zip_code, 20), country: clean(b.country, 2).toUpperCase(), notes: clean(b.notes, 300), locale: clean(b.locale, 5) || "en",
      };
      const missing = (["name", "address", "city", "zip_code", "country"] as const).filter((k) => !billing[k]);
      if ((billing.country === "US" || billing.country === "CA") && !billing.state) missing.push("state" as never);
      if (missing.length) return fail(req, `Fill in: ${missing.join(", ").replace("zip_code", "postcode")}.`);
      if (!COUNTRY.test(billing.country)) return fail(req, "Country must be a 2-letter code, like IL or US.");
      const qs = new URLSearchParams(Object.entries(billing).filter(([, v]) => v) as [string, string][]);
      const res = await lemon(`/orders/${encodeURIComponent(order.checkout_order_id)}/generate-invoice?${qs}`, { method: "POST" });
      const url = res?.meta?.urls?.download_invoice;
      if (!url || !LS_URL.test(url)) throw new Error("Lemon Squeezy didn't return an invoice link.");
      const { data: doc, error } = await db.from("order_documents").insert({ order_id: orderId, kind: "invoice", url, billing }).select("id").single();
      if (error) throw error;
      return json(req, { url, document_id: doc.id });
    }

    if (action === "email") {
      if (!customer?.email) return fail(req, "This order has no customer email.");
      const { data: rdoc, error: rErr } = await db.from("order_documents").insert({ order_id: orderId, kind: "receipt", url: await receiptUrl() }).select("id").single();
      if (rErr) throw rErr;
      const receiptId = rdoc.id;
      const invoiceId = /^[0-9a-f-]{36}$/i.test(String(body.document_id ?? "")) ? String(body.document_id) : "";
      const nonce = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
      // purpose doc:<receipt doc>[:<invoice doc>]: the scheduler builds the email from these rows (update_list)
      await db.from("sync_nonces").insert({ nonce, purpose: `doc:${receiptId}${invoiceId ? ":" + invoiceId : ""}` });
      const res = await fetch(EMAIL_HOOK, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nonce }), signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error("The email service didn't take the request. Please try again.");
      return json(req, { ok: true, to: customer.email });
    }

    // a Morning invoice-receipt, by email to the buyer (8 Nov 2026): only an issued one, with its Morning link
    if (action === "morning_email") {
      if (!customer?.email) return fail(req, "This order has no customer email.");
      const { data: md } = await db.from("morning_documents").select("id, status, url, number")
        .eq("order_id", orderId).eq("kind", "invoice_receipt").maybeSingle();
      if (!md || md.status !== "issued") return fail(req, "Issue the invoice-receipt in Morning first.");
      if (!md.url) return fail(req, "Morning didn't give a link for this document. Send it from Morning itself.");
      const nonce = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
      await db.from("sync_nonces").insert({ nonce, purpose: `mdoc:${md.id}` });
      const res = await fetch(EMAIL_HOOK, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nonce }), signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error("The email service didn't take the request. Please try again.");
      return json(req, { ok: true, to: customer.email });
    }

    return fail(req, "Unknown action.");
  } catch (err) {
    console.error(action, err);
    return fail(req, (err as Error).message || "Something went wrong.", 502);
  }
});
