// Test of the shop's own fulfilment (supabase/functions/_shared/fulfill.ts), as the Lemon Squeezy and Dodo Payments
// webhooks use it, and of Dodo's webhook signature check (_shared/dodo.ts). In-memory stand-in for the database;
// Make and GitHub calls are caught. Run: deno run --allow-env tools/test_fulfill.ts
import { fulfillPaid, fulfillRefund, type PaidOrder } from "../supabase/functions/_shared/fulfill.ts";
import { sign, verify } from "../supabase/functions/_shared/dodo.ts";

type Row = Record<string, unknown>;
const T: Record<string, Row[]> = {};
const table = (n: string) => (T[n] ??= []);
let ids = 0;
const uuid = () => `00000000-0000-0000-0000-${String(++ids).padStart(12, "0")}`;
function q(name: string) {
  const rows = table(name);
  const filters: ((r: Row) => boolean)[] = [];
  let op = "select", payload: Row | Row[] | null = null, single = false, conflict = "", countOnly = false, ignoreDup = false;
  const api: Record<string, unknown> = {
    select(_c?: string, o?: { count?: string; head?: boolean }) { if (o?.head) countOnly = true; return api; },
    insert(p: Row) { op = "insert"; payload = p; return api; },
    upsert(p: Row, o?: { onConflict?: string; ignoreDuplicates?: boolean }) { op = "upsert"; payload = p; conflict = o?.onConflict ?? "id"; ignoreDup = !!o?.ignoreDuplicates; return api; },
    update(p: Row) { op = "update"; payload = p; return api; },
    eq(c: string, v: unknown) { filters.push((r) => r[c] === v); return api; },
    neq(c: string, v: unknown) { filters.push((r) => r[c] !== v); return api; },
    in(c: string, v: unknown[]) { filters.push((r) => v.includes(r[c])); return api; },
    is(c: string, v: unknown) { filters.push((r) => (r[c] ?? null) === v); return api; },
    maybeSingle() { single = true; return api; },
    single() { single = true; return api; },
    then(res: (x: unknown) => void) {
      const match = (r: Row) => filters.every((f) => f(r));
      if (op === "upsert") {
        const p = payload as Row, keys = conflict.split(",");
        let have = rows.find((r) => keys.every((k) => r[k] === p[k]));
        if (have) { if (!ignoreDup) Object.assign(have, p); }
        else { have = { id: uuid(), created_at: new Date().toISOString(), ...(name === "affiliate_commissions" ? { status: "pending" } : {}), ...p }; rows.push(have); }   // the database default
        return res({ data: single ? have : [have], error: null });
      }
      if (op === "insert") { const r = { id: uuid(), ...(payload as Row) }; rows.push(r); return res({ data: r, error: null }); }
      if (op === "update") { const hit = rows.filter(match); hit.forEach((r) => Object.assign(r, payload)); return res({ data: single ? hit[0] ?? null : hit, error: null }); }
      const found = rows.filter(match);
      if (countOnly) return res({ count: found.length, data: null, error: null });
      return res({ data: single ? found[0] ?? null : found, error: null });
    },
  };
  return api;
}
const db = { from: q, auth: { admin: { getUserById: async (id: string) => ({ data: { user: id === "11111111-1111-1111-1111-111111111111" ? { email: "Account@Example.com", email_confirmed_at: "x" } : null } }) } } };
const sent: Row[] = [];
globalThis.fetch = ((_u: string, init?: RequestInit) => { try { sent.push(JSON.parse(String(init?.body ?? "{}"))); } catch { /* */ } return Promise.resolve(new Response("{}")); }) as typeof fetch;
Deno.env.set("MAKE_ORDER_WEBHOOK", "https://hook.test/orders");

let failed = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) failed++; };

// catalogue: two products, a bundle, an affiliate
const P = (slug: string, price: number, extra: Row = {}) => ({ id: `p-${slug}`, slug, name: slug, name_emphasis: null, price_cents: price, ...extra });
table("products").push(
  P("mwp-presets", 1999, { checkout_variant_id: "111", dodo_product_id: "pdt_presets" }),
  P("mwp-lightroom-plugin", 6999, { checkout_variant_id: "222", dodo_product_id: "pdt_plugin" }),
  P("mwp-panel", 4999, { checkout_variant_id: "333", dodo_product_id: "pdt_panel", dodo_test_product_id: "pdt_test_panel" }),
  P("mwp-field-guides", 7999, { checkout_variant_id: "444", dodo_product_id: "pdt_guides" }),
  P("full-set", 16999, { checkout_variant_id: "555", dodo_product_id: "pdt_full" }),
);
table("admin_allowlist").push({ email: "admin@example.com" });
table("affiliates").push({ id: "aff1", code: "MWPKELVIN10", email: "kelvin@example.com", customer_id: "k", rate: 0.1, status: "active", starts_on: "2026-01-01", ended_at: null });

const base = (o: Partial<PaidOrder>): PaidOrder => ({
  provider: "lemonsqueezy", providerOrderId: "9001", orderNumber: "5026400", email: "buyer@example.com", name: "Dana Levi",
  country: "IL", subtotalCents: 1999, taxCents: 0, totalCents: 1999, discountCents: 0, currency: "USD",
  createdAt: "2026-12-01T10:00:00Z", receiptUrl: "https://app.lemonsqueezy.com/my-orders/x", testMode: false,
  products: [{ column: "checkout_variant_id", value: "111", label: "MWP Presets" }], custom: { vat: "il" }, usedCode: null, ...o,
});
const ent = (email: string) => {
  const c = table("customers").find((r) => r.email === email);
  return table("entitlements").filter((e) => e.customer_id === c?.id && !e.revoked_at).map((e) => String(e.product_id).replace("p-", "")).sort();
};

// 1. a Lemon Squeezy order, as before
await fulfillPaid(db as never, base({}));
let o = table("orders").find((r) => r.checkout_order_id === "9001")!;
ok(o.provider === "lemonsqueezy" && o.vat_rate === 0.18 && o.country === "IL" && o.status === "paid", "Lemon Squeezy order saved (provider, VAT, country)");
ok(JSON.stringify(ent("buyer@example.com")) === '["mwp-presets"]', "Lemon Squeezy order unlocks the product");
ok(sent.some((x) => x.type === "order" && x.status_label === "Paid" && x.product_slug === "mwp-presets"), "monday told (Paid)");

// 2. the same notice again: nothing doubled
const before = table("orders").length + table("entitlements").length;
await fulfillPaid(db as never, base({}));
ok(table("orders").length + table("entitlements").length === before, "a repeated notice changes nothing");

// 3. a Dodo cart: two products in one payment, a bundle unlocks its parts, stacked codes, the account's email wins
await fulfillPaid(db as never, base({
  provider: "dodo", providerOrderId: "pay_abc", orderNumber: "pay_abc", email: "typed@example.com", receiptUrl: null,
  subtotalCents: 16728, totalCents: 16728, custom: { user_id: "11111111-1111-1111-1111-111111111111", ref: "" },
  products: [{ column: "dodo_product_id", value: "pdt_full", label: "x" }, { column: "dodo_product_id", value: "pdt_panel", label: "x" }],
  usedCode: "NOVEMBER15,MWPKELVIN10",
}));
o = table("orders").find((r) => r.checkout_order_id === "pay_abc")!;
ok(o.provider === "dodo" && o.discount_code === "NOVEMBER15,MWPKELVIN10", "Dodo order saved with its stacked codes");
ok(JSON.stringify(ent("account@example.com")) === '["full-set","mwp-field-guides","mwp-lightroom-plugin","mwp-panel","mwp-presets"]', `Dodo cart unlocks both products and the bundle's parts (${ent("account@example.com")})`);
ok(table("order_items").filter((i) => i.order_id === o.id).length === 2, "both products listed on the order");
const com = table("affiliate_commissions").find((c) => c.order_id === o.id);
ok(com?.affiliate_id === "aff1" && com?.via === "code" && com?.amount_cents === 1673, `affiliate credited from the stacked codes (10% of $167.28 = ${com?.amount_cents})`);

// 4. a Dodo test payment unlocks nothing for a stranger, but works for the admin
await fulfillPaid(db as never, base({ provider: "dodo", providerOrderId: "pay_test1", email: "stranger@example.com", testMode: true,
  products: [{ column: "dodo_test_product_id", value: "pdt_test_panel", label: "x" }] }));
ok(!table("orders").some((r) => r.checkout_order_id === "pay_test1"), "test payment from a stranger: nothing");
await fulfillPaid(db as never, base({ provider: "dodo", providerOrderId: "pay_test2", email: "admin@example.com", testMode: true,
  products: [{ column: "dodo_test_product_id", value: "pdt_test_panel", label: "x" }] }));
ok(JSON.stringify(ent("admin@example.com")) === '["mwp-panel"]', "test payment from the admin: delivered from the test catalogue");

// 5. an unknown product next to a known one: the known one is delivered, the unknown one is raised
await fulfillPaid(db as never, base({ provider: "dodo", providerOrderId: "pay_mix", email: "mix@example.com",
  products: [{ column: "dodo_product_id", value: "pdt_presets", label: "x" }, { column: "dodo_product_id", value: "pdt_nope", label: "Mystery" }] }));
ok(JSON.stringify(ent("mix@example.com")) === '["mwp-presets"]' && sent.some((x) => String(x.product).includes("UNMATCHED: Mystery")), "unknown product raised, known one delivered");

// 6. refunds: a full refund takes the cart back and voids the affiliate's sale; a partial one keeps everything
await fulfillRefund(db as never, { providerOrderId: "pay_abc", full: true, refundedCents: 16728, currency: "USD", testMode: false });
ok(JSON.stringify(ent("account@example.com")) === "[]" && table("affiliate_commissions").find((c) => c.order_id === o.id)?.status === "void", "full refund: downloads and the affiliate's sale taken back");
await fulfillRefund(db as never, { providerOrderId: "9001", full: false, refundedCents: 500, currency: "USD", testMode: false });
ok(JSON.stringify(ent("buyer@example.com")) === '["mwp-presets"]' && table("orders").find((r) => r.checkout_order_id === "9001")!.status === "partially_refunded", "partial refund keeps the download");

// 7. Dodo's webhook signature (Standard Webhooks)
const secret = "whsec_" + btoa("a-test-signing-key-32-bytes-long!!");
const ts = String(Math.floor(Date.now() / 1000)), body = '{"type":"payment.succeeded"}';
const sig = await sign(secret, "msg_1", ts, body);
const H = (o: Record<string, string>) => new Headers({ "webhook-id": "msg_1", "webhook-timestamp": ts, "webhook-signature": `v1,${sig}`, ...o });
ok(await verify(H({}), body, { live: secret, test: "" }) === "live", "signature: a live notice is accepted");
ok(await verify(H({}), body, { live: "whsec_" + btoa("another-key"), test: secret }) === "test", "signature: the test secret marks test mode");
ok(await verify(H({ "webhook-signature": `v1,bogus v1,${sig}` }), body, { live: secret, test: "" }) === "live", "signature: one of several signatures is enough");
ok(await verify(H({}), body + " ", { live: secret, test: "" }) === null, "signature: a changed body is refused");
ok(await verify(H({ "webhook-timestamp": String(Number(ts) - 600) }), body, { live: secret, test: "" }) === null, "signature: a 10-minute-old notice is refused");

console.log(failed ? `\n${failed} FAILED` : "\nall passed");
if (failed) Deno.exit(1);
