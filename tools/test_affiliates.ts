// Test of the affiliate program's money rules (supabase/functions/_shared/affiliates.ts) with an in-memory stand-in
// for the database. Nothing reaches Supabase or Lemon Squeezy. Run: deno run --allow-env tools/test_affiliates.ts
import { agreementDates, recordAffiliateSale, suggestCode, voidAffiliateSale } from "../supabase/functions/_shared/affiliates.ts";

type Row = Record<string, unknown>;
const T: Record<string, Row[]> = { affiliates: [], affiliate_commissions: [] };
let n = 0;
function q(name: string) {
  const rows = (T[name] ??= []);
  const filters: ((r: Row) => boolean)[] = [];
  let op = "select", payload: Row | null = null, single = false, opts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  const api: Record<string, unknown> = {
    select() { return api; },
    upsert(p: Row, o: typeof opts) { op = "upsert"; payload = p; opts = o ?? {}; return api; },
    update(p: Row) { op = "update"; payload = p; return api; },
    eq(c: string, v: unknown) { filters.push((r) => r[c] === v); return api; },
    neq(c: string, v: unknown) { filters.push((r) => r[c] !== v); return api; },
    in(c: string, v: unknown[]) { filters.push((r) => v.includes(r[c])); return api; },
    maybeSingle() { single = true; return api; },
    then(res: (x: unknown) => void) {
      const match = (r: Row) => filters.every((f) => f(r));
      if (op === "upsert") {
        const key = opts.onConflict!;
        const have = rows.find((r) => r[key] === payload![key]);
        if (have) { if (!opts.ignoreDuplicates) Object.assign(have, payload); }
        else rows.push({ id: `c${++n}`, status: "pending", ...payload });
        return res({ data: null, error: null });
      }
      if (op === "update") { const hit = rows.filter(match); hit.forEach((r) => Object.assign(r, payload)); return res({ data: hit, error: null }); }
      const found = rows.filter(match);
      return res({ data: single ? found[0] ?? null : found, error: null });
    },
  };
  return api;
}
const db = { from: q };
let failed = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) failed++; };

T.affiliates.push(
  { id: "a1", code: "MWPKELVIN10", email: "kelvin@example.com", customer_id: "k1", rate: 0.1, status: "active", starts_on: "2027-01-01", ended_at: null },
  { id: "a2", code: "MWPDANA10", email: "dana@example.com", customer_id: "d1", rate: 0.1, status: "active", starts_on: "2027-01-01", ended_at: "2027-06-01T00:00:00Z" },
  { id: "a3", code: "MWPNOA10", email: "noa@example.com", customer_id: null, rate: 0.1, status: "invited", starts_on: null, ended_at: null },
);
const sale = (o: Partial<Parameters<typeof recordAffiliateSale>[1]>) => recordAffiliateSale(db, {
  orderId: `o${++n}`, customerId: "buyer", buyerEmail: "buyer@example.com", totalCents: 12239, currency: "USD",
  orderedAt: "2027-01-10T10:00:00Z", ...o,
});

// the code paid with: 10% of what the buyer paid (after the discount), held 14 days
let r = await sale({ orderId: "o-code", code: "mwpkelvin10" });
let c = T.affiliate_commissions.find((x) => x.order_id === "o-code")!;
ok(r?.affiliate === "MWPKELVIN10" && c.amount_cents === 1224 && c.via === "code", `code: 10% of $122.39 = $12.24 (${JSON.stringify(r)})`);
ok(c.available_at === "2027-01-24T10:00:00.000Z", `code: counts 14 days after the order (${c.available_at})`);

// the link only (paid with a sale code): still theirs
r = await sale({ orderId: "o-link", code: "NOVEMBER15", ref: "MWPKELVIN10", totalCents: 5949 });
c = T.affiliate_commissions.find((x) => x.order_id === "o-link")!;
ok(c?.via === "link" && c.amount_cents === 595, "link: a sale paid with another code still counts for the affiliate whose link it came through");

// the code wins over another affiliate's link
r = await sale({ orderId: "o-both", code: "MWPKELVIN10", ref: "MWPDANA10" });
ok(r?.affiliate === "MWPKELVIN10", "the code paid with wins over the link");

// not counted: their own purchase, before the start, after the end, an invited (not joined) code, a test order, no code
ok(await sale({ code: "MWPKELVIN10", customerId: "k1" }) === null, "own purchase (same account): nothing");
ok(await sale({ code: "MWPKELVIN10", buyerEmail: "Kelvin@Example.com" }) === null, "own purchase (same email): nothing");
ok(await sale({ code: "MWPKELVIN10", orderedAt: "2026-12-31T23:00:00Z" }) === null, "before the program starts: nothing");
ok(await sale({ code: "MWPDANA10", orderedAt: "2027-07-01T00:00:00Z" }) === null, "after the agreement ended: nothing");
ok((await sale({ code: "MWPDANA10", orderedAt: "2027-05-01T00:00:00Z" }))?.affiliate === "MWPDANA10", "before it ended: counts");
ok(await sale({ code: "MWPNOA10" }) === null, "an invitation not yet accepted: nothing");
ok(await sale({ code: "MWPKELVIN10", testMode: true }) === null, "test order: nothing");
ok(await sale({}) === null, "no code, no link: nothing");

// the same order twice (webhook retry): one commission
const before = T.affiliate_commissions.length;
await sale({ orderId: "o-code", code: "MWPKELVIN10" });
ok(T.affiliate_commissions.length === before, "a retried notice doesn't count the sale twice");

// refunds: pending is voided; one already paid stays and is flagged
await voidAffiliateSale(db, "o-code");
ok(T.affiliate_commissions.find((x) => x.order_id === "o-code")!.status === "void", "a refund voids the sale");
T.affiliate_commissions.find((x) => x.order_id === "o-link")!.status = "paid";
await voidAffiliateSale(db, "o-link");
const paid = T.affiliate_commissions.find((x) => x.order_id === "o-link")!;
ok(paid.status === "paid" && /deduct/.test(String(paid.void_reason)), "refund after it was paid: kept, flagged to deduct");

// codes and dates
ok(suggestCode("Kelvin Smith") === "MWPKELVIN10" && suggestCode("  Zoë ") === "MWPZOE10", "suggested code: MWP + first name + 10");
ok(JSON.stringify(agreementDates(new Date("2026-11-20T10:00:00Z"))) === '{"starts_on":"2027-01-01","ends_on":"2028-01-01"}', "joining now: from 1 Jan 2027 for a year");
ok(JSON.stringify(agreementDates(new Date("2027-03-05T10:00:00Z"))) === '{"starts_on":"2027-03-05","ends_on":"2028-03-05"}', "joining later: from that day for a year");

console.log(failed ? `\n${failed} FAILED` : "\nall passed");
if (failed) Deno.exit(1);
