// Missed-orders check for Dodo Payments (Jeinna, 27 Nov 2026), run with the Lemon Squeezy one every hour (scheduler
// "reconcile"). The last 3 days of Dodo payments and refunds (GET /payments, GET /refunds with created_at_gte) against
// the shop's orders: a payment that succeeded but isn't in the shop, or a refund the shop didn't apply, goes to monday's
// Shop Orders once as "Not delivered" (deduplicated through webhook_events, provider "reconcile"). Same key as checkout:
// DODO_API_KEY (a dodo_test_ key reads Dodo's test mode). Amounts in dollars from Dodo's settlement figures.
// deno-lint-ignore-file no-explicit-any
type Notify = (name: string, payload: Record<string, unknown>) => Promise<boolean>;

const list = (j: any): any[] => (Array.isArray(j?.items) ? j.items : Array.isArray(j?.data) ? j.data : []);

async function fetchAll(base: string, key: string, path: string, since: string) {
  const out: any[] = [];
  for (let page = 0; page < 5; page++) {
    const res = await fetch(`${base}${path}?created_at_gte=${encodeURIComponent(since)}&page_size=100&page_number=${page}`,
      { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Dodo ${path} answered ${res.status}`);
    const items = list(await res.json());
    out.push(...items);
    if (items.length < 100) break;
  }
  return out;
}

export async function reconcileDodo(db: any, notify: Notify) {
  const key = Deno.env.get("DODO_API_KEY") ?? "";
  if (!key) return { skipped: "DODO_API_KEY not set" };
  const test = key.startsWith("dodo_test_");
  const base = test ? "https://test.dodopayments.com" : "https://live.dodopayments.com";
  const since = new Date(Date.now() - 3 * 86400_000).toISOString();
  const settled = Date.now() - 20 * 60_000;   // younger payments may still be on their way through the webhook
  const old = (x: any) => Date.parse(String(x?.created_at ?? "")) <= settled;

  const payments = (await fetchAll(base, key, "/payments", since)).filter((p) => p?.status === "succeeded" && old(p));
  const refunds = (await fetchAll(base, key, "/refunds", since)).filter((r) => r?.status === "succeeded" && old(r));
  const ids = [...new Set([...payments.map((p) => String(p.payment_id)), ...refunds.map((r) => String(r.payment_id))])];
  if (!ids.length) return { checked: 0, problems: [] };
  const { data: ours, error } = await db.from("orders").select("checkout_order_id, status").in("checkout_order_id", ids);
  if (error) throw error;
  const here = new Map((ours ?? []).map((o: any) => [o.checkout_order_id, o.status]));

  const checks: { id: string; kind: string; why: string; p: any }[] = [];
  for (const p of payments) {
    if (!here.has(String(p.payment_id))) checks.push({ id: String(p.payment_id), kind: "paid", why: "paid at Dodo, not in the shop: no access", p });
  }
  for (const r of refunds) {
    const st = here.get(String(r.payment_id));
    if (st && st === "paid" && r.is_partial === false) {
      checks.push({ id: String(r.payment_id), kind: "refunded", why: "refunded at Dodo, access still on", p: payments.find((p) => String(p.payment_id) === String(r.payment_id)) ?? r });
    }
  }
  const problems: { order: string; why: string }[] = [];
  for (const c of checks) {
    const eventId = `reconcile:dodo:${c.id}:${c.kind}`;   // each problem is raised once
    const { data: seen } = await db.from("webhook_events").select("event_id").eq("event_id", eventId).maybeSingle();
    if (seen) continue;
    const usd = String(c.p?.settlement_currency ?? "").toUpperCase() === "USD";
    const total = Number(usd ? c.p?.settlement_amount : c.p?.total_amount ?? c.p?.amount) || 0;
    const sent = await notify("MAKE_ORDER_WEBHOOK", {
      type: "order", checkout_order_id: c.id, order_number: c.id,
      order_date: String(c.p?.created_at ?? "").slice(0, 10), test_mode: test,
      status_label: "Not delivered", email: String(c.p?.customer?.email ?? "").toLowerCase(), name: String(c.p?.customer?.name ?? ""),
      product: `CHECK: ${c.why} (Dodo Payments)`, product_slug: "", subtotal: total / 100, discount: 0, tax: 0,
      total: total / 100, currency: usd ? "USD" : String(c.p?.currency ?? "USD").toUpperCase(), receipt_url: null, source: "",
      repeat_customer: false, downloads_url: "",
    });
    if (!sent) continue;   // not marked: the next hour tries again
    await db.from("webhook_events").insert({ event_id: eventId, provider: "reconcile", payload: { order: c.id, why: c.why, provider: "dodo" } });
    problems.push({ order: c.id, why: c.why });
  }
  return { checked: payments.length + refunds.length, problems };
}
