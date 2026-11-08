// Test of the Morning documents job (supabase/functions/scheduler/morning.ts) with an in-memory stand-in for the database
// and for Make's webhook. Nothing reaches Morning. Run: MAKE_MORNING_WEBHOOK_URL=https://hook.test deno run --allow-env tools/test_morning_job.ts
import { morning, morningList, morningResult, morningSend } from "../supabase/functions/scheduler/morning.ts";

type Row = Record<string, unknown>;
const T: Record<string, Row[]> = {};
const table = (n: string) => (T[n] ??= []);
let ids = 0;
const uuid = () => `00000000-0000-0000-0000-${String(++ids).padStart(12, "0")}`;
function q(name: string) {
  const rows = table(name);
  const filters: ((r: Row) => boolean)[] = [];
  let op = "select", payload: unknown = null, single = false, lim = Infinity;
  const api: Record<string, unknown> = {
    select() { return api; },
    insert(p: unknown) { op = "insert"; payload = p; return api; },
    update(p: unknown) { op = "update"; payload = p; return api; },
    delete() { op = "delete"; return api; },
    eq(c: string, v: unknown) { filters.push((r) => r[c] === v); return api; },
    neq(c: string, v: unknown) { filters.push((r) => r[c] !== v); return api; },
    is(c: string, v: unknown) { filters.push((r) => (r[c] ?? null) === v); return api; },
    gte(c: string, v: string) { filters.push((r) => String(r[c]) >= v); return api; },
    lt(c: string, v: string) { filters.push((r) => r[c] != null && String(r[c]) < v); return api; },
    like(c: string, v: string) { const p = v.replace("%", ""); filters.push((r) => String(r[c]).startsWith(p)); return api; },
    in(c: string, v: unknown[]) { filters.push((r) => v.includes(r[c])); return api; },
    order() { return api; },
    limit(n: number) { lim = n; return api; },
    single() { single = true; return api; },
    maybeSingle() { single = true; return api; },
    then(res: (x: unknown) => void) {
      const match = (r: Row) => filters.every((f) => f(r));
      if (op === "insert") {
        const list = (Array.isArray(payload) ? payload : [payload]) as Row[];
        const made = list.map((r) => ({ id: uuid(), created_at: new Date().toISOString(), ...r }));
        rows.push(...made);
        return res({ data: single ? made[0] : made, error: null });
      }
      if (op === "update") {
        const hit = rows.filter(match);
        for (const r of hit) {
          // the database trigger: an issued document never changes
          if (name === "morning_documents" && r.status === "issued" && (payload as Row).status !== "issued") throw new Error("issued row changed");
          Object.assign(r, payload);
        }
        return res({ data: single ? hit[0] ?? null : hit, error: null });
      }
      if (op === "delete") { for (const r of rows.filter(match)) rows.splice(rows.indexOf(r), 1); return res({ data: null, error: null }); }
      const found = rows.filter(match).slice(0, lim);
      return res({ data: single ? found[0] ?? null : found, error: null });
    },
  };
  return api;
}
const db = { from: q };

// Make's webhook: remember the codes it was handed
const codes: string[] = [];
let hookUp = true;
globalThis.fetch = ((_u: string, init: RequestInit) => {
  codes.push(JSON.parse(String(init.body)).nonce);
  return Promise.resolve(new Response("Accepted", { status: hookUp ? 200 : 500 }));
}) as typeof fetch;

let fails = 0;
const ok = (cond: unknown, msg: string) => { console.log(`${cond ? "ok  " : "FAIL"} ${msg}`); if (!cond) fails++; };
const docs = (order: string) => table("morning_documents").filter((d) => d.order_id === order);
const doc = (order: string, kind: string) => docs(order).find((d) => d.kind === kind)!;

// ---- seed
const now = new Date().toISOString();
table("morning_settings").push({ id: 1, mode: "preview", email_customer: false, payment_type: 3, vat_israel: 1, vat_abroad: 2, start_from: "2026-11-01T00:00:00Z" });
const presets = { slug: "mwp-presets", name: "MWP", name_emphasis: "Presets" };
const guides = { slug: "mwp-field-guides", name: "MWP", name_emphasis: "Field Guides" };
const A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", C = "cccccccc-cccc-cccc-cccc-cccccccccccc";
table("orders").push(
  { id: A, order_number: "1001", checkout_order_id: "9001", created_at: now, total_cents: 1999, currency: "USD", status: "paid", test_mode: false, customer_id: "cA", customers: { email: "dana@example.com", name: "Dana Levi", country: "US" }, order_items: [{ products: presets }] },
  { id: B, order_number: "1002", checkout_order_id: "9002", created_at: now, total_cents: 6799, currency: "USD", status: "paid", test_mode: false, customer_id: "cB", customers: { email: "noa@example.com", name: "Noa Cohen", country: "IL" }, order_items: [{ products: guides }] },
  { id: C, order_number: "1003", checkout_order_id: "9003", created_at: now, total_cents: 1999, currency: "USD", status: "paid", test_mode: true, customer_id: "cC", customers: { email: "t@example.com", name: "T", country: "US" }, order_items: [{ products: presets }] },
);
table("subscribers").push({ email: "noa@example.com", lang: "he" });

// ---- 1. preview mode: both documents of both real orders go as previews; the test order is left alone
let r = await morning(db) as Row;
ok(r.sent === 4 && codes.length === 1, `preview run sends 4 documents in one hand-over (${JSON.stringify(r)})`);
ok(!docs(C).length, "the test order gets nothing");
let list = await morningList(db, codes[0]) as { docs: { id: string; path: string; body: string }[] };
ok(list.docs.length === 4 && list.docs.every((d) => d.path === "documents/preview"), "Make gets 4 previews, never a real create");
ok(((await morningList(db, codes[0])) as { docs: unknown[] }).docs.length === 0, "the code works once");
const bodyA = JSON.parse(list.docs.find((d) => d.id === doc(A, "invoice_receipt").id)!.body);
ok(bodyA.type === 320 && bodyA.lang === "en" && bodyA.currency === "USD" && bodyA.income[0].price === 19.99 && bodyA.income[0].vatType === 2, "invoice-receipt: English, USD 19.99, exempt abroad");
ok(bodyA.payment[0].type === 3 && bodyA.payment[0].price === 19.99 && /^\d{4}-\d{2}-\d{2}$/.test(bodyA.payment[0].date), "payment: credit card, the amount, the order's date");
ok(bodyA.client.emails.length === 0 && bodyA.client.add === false && bodyA.client.country === "US", "no customer email (setting off), no new Morning client");
const bodyB = JSON.parse(list.docs.find((d) => d.id === doc(B, "invoice_receipt").id)!.body);
ok(bodyB.lang === "he" && bodyB.income[0].description.startsWith("מדריכי השטח של MWP") && bodyB.income[0].vatType === 1, "Hebrew buyer in Israel: Hebrew document, Hebrew name, VAT included");
const woB = JSON.parse(list.docs.find((d) => d.id === doc(B, "work_order").id)!.body);
ok(woB.type === 100 && !woB.payment && woB.client.emails.length === 0, "work order: no payment, no email");
for (const d of list.docs) await morningResult(db, { nonce: codes[0], id: d.id, status: "200", data: JSON.stringify({ file: "JVBERi0".padEnd(400, "A") }) });
ok(docs(A).every((d) => d.status === "preview" && d.preview_pdf), "previews saved with their PDF");
r = await morning(db) as Row;
ok(r.skipped === "nothing due" && codes.length === 1, "next run: nothing due, Make not called");

// ---- 2. a result with a wrong code or for a document outside the code is refused
ok(((await morningResult(db, { nonce: "x".repeat(64), id: doc(A, "work_order").id, status: "201", data: "{}" })) as Row).error === "unauthorized", "unknown code refused");

// ---- 3. the admin issues order A: the invoice-receipt first, then the work order naming its number
table("morning_issue_requests").push({ order_id: A, action: "create", requested_at: now });
r = await morning(db, A) as Row;
ok(r.sent === 1 && doc(A, "invoice_receipt").status === "sending" && doc(A, "work_order").status === "preview", "issue: only the invoice-receipt goes first");
list = await morningList(db, codes.at(-1)) as typeof list;
ok(list.docs.length === 1 && list.docs[0].path === "documents", "Make is told to create it");
await morningResult(db, { nonce: codes.at(-1), id: list.docs[0].id, status: "201", data: JSON.stringify({ id: "m-320", number: 60031, url: { origin: "https://www.greeninvoice.co.il/api/v1/documents/download?d=abc", he: "https://evil.example/" } }) });
ok(doc(A, "invoice_receipt").status === "issued" && doc(A, "invoice_receipt").number === "60031" && String(doc(A, "invoice_receipt").url).includes("greeninvoice"), "invoice-receipt issued, number and Morning link kept");
ok(doc(A, "work_order").status === "sending", "the work order followed at once");
list = await morningList(db, codes.at(-1)) as typeof list;
ok(JSON.parse(list.docs[0].body).remarks.includes("60031") && list.docs[0].path === "documents", "the work order names invoice-receipt 60031");
await morningResult(db, { nonce: codes.at(-1), id: list.docs[0].id, status: "201", data: JSON.stringify({ id: "m-100", number: "10071" }) });
ok(doc(A, "work_order").status === "issued" && !table("morning_issue_requests").length, "work order issued; the request is done");
// a late, repeated answer can't touch an issued document
await morningResult(db, { nonce: codes.at(-1), id: list.docs[0].id, status: "400", data: "{}" });
ok(doc(A, "work_order").status === "issued", "a repeated answer leaves the issued document alone");

// ---- 4. issue mode: B goes out for real; Morning refuses the first try (4xx) → retried; then the answer gets lost
T.morning_settings[0].mode = "issue";
r = await morning(db) as Row;
ok(r.sent === 1 && doc(B, "invoice_receipt").action === "create", "issue mode: order B's invoice-receipt is created (A untouched)");
let id = doc(B, "invoice_receipt").id as string;
await morningList(db, codes.at(-1));
await morningResult(db, { nonce: codes.at(-1), id, status: "400", data: JSON.stringify({ errorCode: 2439, errorMessage: "סוג אמצעי תשלום לא תקין" }) });
ok(doc(B, "invoice_receipt").status === "failed" && String(doc(B, "invoice_receipt").error).includes("2439"), "Morning's refusal is kept with its code");
r = await morning(db) as Row;
ok(r.sent === 1 && doc(B, "invoice_receipt").attempts === 2, `a refusal is tried again (${JSON.stringify(r)} attempts ${doc(B, "invoice_receipt").attempts})`);
doc(B, "invoice_receipt").sent_at = new Date(Date.now() - 30 * 60 * 1000).toISOString();
r = await morning(db) as Row;
ok(doc(B, "invoice_receipt").status === "failed" && doc(B, "invoice_receipt").attempts === 99 && r.skipped, "no answer for 20 minutes: failed, and never retried by itself");
r = await morning(db) as Row;
ok(r.skipped && doc(B, "invoice_receipt").attempts === 99, "still not retried on the next run");

// ---- 5. Make down: nothing reached Morning, so it's marked to try again
T.morning_documents = T.morning_documents.filter((d) => d.order_id !== B);
hookUp = false;
r = await morning(db) as Row;
ok(r.ok === false && doc(B, "invoice_receipt").status === "failed" && doc(B, "invoice_receipt").attempts === 1, "Make refused the hand-over: failed, will be tried again");
hookUp = true;

// ---- 6. off: nothing at all
T.morning_settings[0].mode = "off";
ok(((await morning(db)) as Row).skipped === "off", "off: nothing runs");

// ---- 7. a payout invoice to Lemon Squeezy: Israeli buyers 18% included, abroad 0%, unknown lines listed (8 Nov 2026)
T.orders.push({ id: "p1", checkout_order_id: "9001", vat_rate: 0.18, country: "IL", customers: { country: "IL" } },
              { id: "p2", checkout_order_id: "9002", vat_rate: 0, country: "US", customers: { country: "US" } });
const pay = { id: "99999999-9999-9999-9999-999999999999", kind: "payout", status: "waiting", action: "preview", payout_date: "2026-11-01",
  payout_rows: [{ sale: "Order #9001", order_id: "9001", net_cents: 5761 }, { sale: "Order #9002", order_id: "9002", net_cents: 1504 },
                { sale: "Refund - Order #9002", order_id: "9002", net_cents: -200 }, { sale: "Order #7777", order_id: "7777", net_cents: 1000 }], attempts: 0 };
T.morning_documents.push(pay);
r = await morningSend(db, pay.id) as Row;
const pd = T.morning_documents.find((d) => d.id === pay.id)!;
// deno-lint-ignore no-explicit-any
const pl = pd.payload as any, sm = pd.summary as any;
ok(r.ok === true && pd.status === "sending" && pd.action === "preview", "payout: sent as a preview");
ok(pl.type === 320 && pl.client.name === "Lemon Squeezy, LLC" && pl.client.emails.length === 0, "payout: invoice-receipt to Lemon Squeezy, no email");
ok(pl.income.length === 2 && pl.income[0].vatType === 1 && pl.income[0].price === 57.61 && pl.income[1].vatType === 2 && pl.income[1].price === 23.04, `payout: Israel 57.61 (VAT incl.) and abroad 23.04 at 0% (${JSON.stringify(pl.income.map((i: any) => [i.price, i.vatType]))})`);
ok(sm.vat_cents === 879 && sm.total_cents === 8065 && sm.unmatched.length === 1, `payout: VAT $8.79, total $80.65, 1 unknown line (${JSON.stringify(sm)})`);
ok(pl.payment[0].type === 4 && pl.payment[0].price === 80.65 && pl.payment[0].date === "2026-11-01", "payout: one bank transfer for the payout, on its date");

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
if (fails) Deno.exit(1);
