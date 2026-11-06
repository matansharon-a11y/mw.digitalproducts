// Morning (Green Invoice) documents for every shop sale (Matan, 6 Nov 2026; migration 20261106000005).
// For each paid order: a tax invoice-receipt (320) and then a work order (100) that names it.
//
//   morning {order_id?}  (every 5 minutes, and at once when the admin clicks Preview / Issue)
//        → prepares the documents that are due, marks them "sending" and hands Make's scenario
//          "MWP Shop · Morning documents" a one-time code
//   morning_list {nonce}  (Make, with that code) → the documents: { docs: [{ id, path, body }] }
//   morning_result {nonce, id, status, data}  (Make, after each one) → Morning's answer is saved
//
// Mode (morning_settings): "preview" makes Morning's demo PDFs only (nothing is issued); "issue" issues every new sale;
// the admin's own clicks (morning_issue_requests) work in both. An issued document is never sent again: a row that
// reached "issued" can't change (a database trigger), and a send whose answer never came back is not retried
// automatically (Morning may have issued it), the admin checks Morning first.

import { isHebrew } from "./docs.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

// the webhook only ever carries a one-time code (Make then asks the scheduler for the documents)
const HOOK = Deno.env.get("MAKE_MORNING_WEBHOOK_URL") || "https://hook.eu1.make.com/b4k9t5f9fp2h6jc9p0wgmdwyq8amai9v";
const UUID = /^[0-9a-f-]{36}$/i;
const DOC_URL = /^https:\/\/([a-z0-9-]+\.)*(greeninvoice\.co\.il|morning\.co)\//;
const MAX_AUTO_TRIES = 3;
const LOST = 99;   // attempts value for a send whose answer never came back: no automatic retry

// Product names on the documents. English: the shop's own names; Hebrew: the Hebrew site's names (MWP in Latin letters).
const HE_NAMES: Record<string, string> = {
  "mwp-lightroom-plugin": "התוסף ללייטרום קלאסיק של MWP (כולל הפריסטים)",
  "mwp-panel": "פאנל התוסף לפוטושופ של MWP",
  "mwp-presets": "הפריסטים של MWP",
  "mwp-field-guides": "מדריכי השטח של MWP",
  "presets-panel": "התוסף ללייטרום + התוסף לפוטושופ של MWP",
  "presets-field-guides": "התוסף ללייטרום + מדריכי השטח של MWP",
  "field-guides-panel": "מדריכי השטח + התוסף לפוטושופ של MWP",
  "full-set": "הסט המלא של MWP",
  "field-guide-planning": "מדריך השטח של MWP: תכנון",
  "field-guide-composition": "מדריך השטח של MWP: קומפוזיציה",
  "field-guide-light": "מדריך השטח של MWP: אור",
  "field-guide-colour": "מדריך השטח של MWP: צבע",
};

const israelDate = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const plainText = (s: unknown, max = 200) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

type Settings = { mode: "off" | "preview" | "issue"; email_customer: boolean; payment_type: number; vat_israel: number; vat_abroad: number; start_from: string };
type Order = {
  id: string; order_number: string | null; checkout_order_id: string; created_at: string; total_cents: number; currency: string;
  status: string; test_mode: boolean; customer_id: string; vat_rate?: number | string | null;
  customers: { email: string; name: string | null; country: string | null } | null;
  order_items: { products: { slug: string; name: string; name_emphasis: string | null } | null }[];
};

/** The JSON Morning gets for one document (exported for the tests). */
export function buildDoc(kind: "invoice_receipt" | "work_order", o: Order, s: Settings, he: boolean, invoiceNumber: string | null) {
  const c = o.customers ?? { email: "", name: null, country: null };
  const country = (c.country ?? "").toUpperCase();
  const amount = Math.round(o.total_cents) / 100;
  const currency = (o.currency || "USD").toUpperCase();
  const no = o.order_number ?? "";
  const products = (o.order_items ?? []).map((i) => i.products).filter(Boolean) as { slug: string; name: string; name_emphasis: string | null }[];
  const name = products.length
    ? products.map((p) => he ? (HE_NAMES[p.slug] ?? plainText(`${p.name} ${p.name_emphasis ?? ""}`)) : plainText(`${p.name} ${p.name_emphasis ?? ""}`)).join(" + ")
    : (he ? "מוצר דיגיטלי מחנות MWP" : "MWP Shop digital product");
  const doc: Record<string, unknown> = {
    type: kind === "invoice_receipt" ? 320 : 100,
    lang: he ? "he" : "en",
    currency,
    vatType: 0,
    description: he ? `הזמנה ${no} בחנות MWP` : `MWP Shop order ${no}`,
    client: {
      name: plainText(c.name, 120) || c.email,
      emails: kind === "invoice_receipt" && s.email_customer && c.email ? [c.email] : [],
      ...(/^[A-Z]{2}$/.test(country) ? { country } : {}),
      add: false,
    },
    income: [{
      description: he ? `${name} (הורדה דיגיטלית)` : `${name} (digital download)`,
      quantity: 1, price: amount, currency,
      // Israeli VAT inside the price (orders.vat_rate, marked by the cart); older orders: the buyer's country
      vatType: (o.vat_rate != null ? Number(o.vat_rate) > 0 : country === "IL") ? s.vat_israel : s.vat_abroad,
    }],
  };
  if (kind === "invoice_receipt") {
    doc.payment = [{ type: s.payment_type, price: amount, currency, date: israelDate(new Date(o.created_at)) }];
    doc.remarks = he ? `שולם בחנות MWP דרך למון סקוויזי (הזמנה ${o.checkout_order_id}).` : `Paid in the MWP Shop through Lemon Squeezy (order ${o.checkout_order_id}).`;
  } else {
    doc.remarks = invoiceNumber
      ? (he ? `הזמנת עבודה לחשבונית מס קבלה ${invoiceNumber} (הזמנה ${no} בחנות MWP).` : `Work order for invoice-receipt ${invoiceNumber} (MWP Shop order ${no}).`)
      : (he ? `הזמנת עבודה לחשבונית המס קבלה של הזמנה ${no} בחנות MWP.` : `Work order for the invoice-receipt of MWP Shop order ${no}.`);
  }
  return doc;
}

const ORDER_COLS = "id, order_number, checkout_order_id, created_at, total_cents, currency, status, test_mode, customer_id, vat_rate, customers(email, name, country), order_items(products(slug, name, name_emphasis))";

export async function morning(db: Db, onlyOrder = "") {
  const { data: s } = await db.from("morning_settings").select("*").eq("id", 1).maybeSingle();
  if (!s || s.mode === "off") return { skipped: "off" };
  if (!HOOK) return { skipped: "MAKE_MORNING_WEBHOOK_URL isn't set" };

  // a send whose answer never came back (20 minutes): Morning may have issued it, so it's never retried by itself
  await db.from("morning_documents").update({ status: "failed", attempts: LOST,
    error: "Morning's answer never came back. Check in Morning whether this document was issued before trying again." })
    .eq("status", "sending").lt("sent_at", new Date(Date.now() - 20 * 60 * 1000).toISOString());

  // what to do, per order: the admin's requests first, then (automatic) the new sales
  const want = new Map<string, "preview" | "create">();
  const { data: reqs } = await db.from("morning_issue_requests").select("order_id, action").order("requested_at").limit(20);
  for (const r of reqs ?? []) want.set(r.order_id, r.action);
  if (!onlyOrder) {
    const auto = s.mode === "issue" ? "create" : "preview";
    const since = new Date(Math.max(new Date(s.start_from).getTime(), Date.now() - 30 * 864e5)).toISOString();
    const { data: recent } = await db.from("orders").select("id").eq("status", "paid").eq("test_mode", false)
      .gte("created_at", since).order("created_at").limit(200);
    const ids = (recent ?? []).map((o: { id: string }) => o.id);
    const { data: have } = ids.length
      ? await db.from("morning_documents").select("order_id, kind, status, action, attempts").in("order_id", ids)
      : { data: [] };
    for (const id of ids) {
      if (want.has(id)) continue;
      const rows = (have ?? []).filter((d: { order_id: string }) => d.order_id === id);
      const done = (k: string) => rows.some((d: { kind: string; status: string }) => d.kind === k && (d.status === "issued" || (auto === "preview" && d.status === "preview")));
      const stuck = rows.some((d: { status: string; attempts: number }) => d.status === "sending" || (d.status === "failed" && d.attempts >= MAX_AUTO_TRIES));
      if (!stuck && !(done("invoice_receipt") && done("work_order"))) want.set(id, auto);
      if (want.size >= 20) break;
    }
  }
  // the invoice-receipt was just issued by the automatic mode: its work order follows at once
  if (onlyOrder && !want.has(onlyOrder) && s.mode === "issue") want.set(onlyOrder, "create");
  if (onlyOrder && !want.has(onlyOrder)) return { skipped: "nothing asked for this order" };
  if (!want.size) return { skipped: "nothing due" };

  const send: { id: string; action: "preview" | "create" }[] = [];
  for (const [orderId, action] of want) {
    const { data: o } = await db.from("orders").select(ORDER_COLS).eq("id", orderId).maybeSingle();
    const forget = () => db.from("morning_issue_requests").delete().eq("order_id", orderId);
    if (!o || o.status !== "paid" || o.test_mode || !o.customers?.email) { await forget(); continue; }
    const he = await isHebrew(db, o.customer_id, o.customers.email);
    const { data: rows } = await db.from("morning_documents").select("id, kind, status, number, action, attempts").eq("order_id", orderId);
    const row = (k: string) => (rows ?? []).find((d: { kind: string }) => d.kind === k);
    const inv = row("invoice_receipt"), wo = row("work_order");
    if (inv?.status === "sending" || wo?.status === "sending") continue;

    // the invoice-receipt first; for a real issue, the work order only once the invoice-receipt is issued (it names its number)
    const steps: ("invoice_receipt" | "work_order")[] = [];
    if (inv?.status !== "issued") steps.push("invoice_receipt");
    if (wo?.status !== "issued" && (action === "preview" || inv?.status === "issued")) steps.push("work_order");
    if (action === "preview") {
      // a preview of something already issued is pointless; a fresh preview replaces the old one
      if (inv?.status === "issued" && wo?.status === "issued") { await forget(); continue; }
    }
    if (!steps.length) { await forget(); continue; }
    for (const kind of steps) {
      const payload = buildDoc(kind, o as Order, s as Settings, he, kind === "work_order" ? (inv?.number ?? null) : null);
      const existing = row(kind);
      const fields = { payload, action, status: "sending", sent_at: new Date().toISOString(), error: null, doc_type: payload.type };
      const { data: saved, error } = existing
        ? await db.from("morning_documents").update({ ...fields, attempts: existing.action === action ? (existing.attempts ?? 0) + 1 : 1 }).eq("id", existing.id).neq("status", "issued").select("id").maybeSingle()
        : await db.from("morning_documents").insert({ ...fields, order_id: orderId, kind, attempts: 1 }).select("id").maybeSingle();
      if (error) throw error;
      if (saved) send.push({ id: saved.id, action });
    }
    // a preview request is done once sent; an issue request stays until both documents are issued (morning_result)
    if (action === "preview") await forget();
  }
  if (!send.length) return { skipped: "nothing to send" };

  const nonce = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const { error: nErr } = await db.from("sync_nonces").insert({ nonce, purpose: `morning:${send.map((d) => d.id).join(",")}` });
  if (nErr) throw nErr;
  let ok = false;
  try {
    const res = await fetch(HOOK, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nonce }), signal: AbortSignal.timeout(8000) });
    ok = res.ok;
  } catch (err) { console.error("morning hook", err); }
  if (!ok) {
    // Make never got the code, so nothing reached Morning: safe to try again
    await db.from("morning_documents").update({ status: "failed", error: "Make didn't take the request. It will be tried again." }).in("id", send.map((d) => d.id));
  }
  return { ok, sent: send.length };
}

async function checkNonce(db: Db, nonce: string, markUsed: boolean) {
  if (nonce.length < 32) return null;
  const q = db.from("sync_nonces").select("purpose, used_at").eq("nonce", nonce).like("purpose", "morning:%")
    .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());
  const { data } = await q.maybeSingle();
  if (!data) return null;
  if (markUsed) {
    if (data.used_at) return null;   // the list is handed over once
    await db.from("sync_nonces").update({ used_at: new Date().toISOString() }).eq("nonce", nonce).is("used_at", null);
  }
  return String(data.purpose).slice("morning:".length).split(",").filter((id) => UUID.test(id));
}

// Make asks for the documents with its one-time code
export async function morningList(db: Db, nonceIn: unknown) {
  const ids = await checkNonce(db, String(nonceIn ?? ""), true);
  if (!ids?.length) return { error: "unauthorized", docs: [] };
  const { data } = await db.from("morning_documents").select("id, action, payload, status").in("id", ids).eq("status", "sending");
  // deno-lint-ignore no-explicit-any
  const docs = (data ?? []).map((d: any) => ({
    id: d.id,
    path: d.action === "create" ? "documents" : "documents/preview",
    body: JSON.stringify(d.payload),
  }));
  return { docs };
}

// Make hands back Morning's answer for one document
export async function morningResult(db: Db, body: Record<string, unknown>) {
  const ids = await checkNonce(db, String(body.nonce ?? ""), false);
  const id = String(body.id ?? "");
  if (!ids?.includes(id)) return { error: "unauthorized" };
  const { data: row } = await db.from("morning_documents").select("id, order_id, kind, action, status").eq("id", id).maybeSingle();
  if (!row || row.status !== "sending") return { skipped: "not waiting for an answer" };
  const status = Number(body.status ?? 0);
  // deno-lint-ignore no-explicit-any
  let data: any = body.data;
  if (typeof data === "string") { try { data = JSON.parse(data); } catch { data = { errorMessage: data.slice(0, 300) }; } }
  data = data ?? {};

  if (row.action === "preview") {
    if (status === 200 && typeof data.file === "string" && data.file.length > 100) {
      await db.from("morning_documents").update({ status: "preview", preview_pdf: data.file, error: null }).eq("id", id);
    } else {
      await db.from("morning_documents").update({ status: "failed", error: morningError(status, data) }).eq("id", id);
    }
    return { ok: true };
  }

  // a real document
  if (status >= 200 && status < 300 && data.id) {
    const urls = data.url ?? {};
    const url = [urls.origin, urls.he, urls.en, typeof urls === "string" ? urls : ""].find((u) => typeof u === "string" && DOC_URL.test(u)) ?? null;
    await db.from("morning_documents").update({
      status: "issued", morning_id: String(data.id), number: data.number != null ? String(data.number) : null, url,
      preview_pdf: null, error: null, issued_at: new Date().toISOString(),
    }).eq("id", id);
    // the invoice-receipt is out: the work order follows at once (it names the invoice-receipt's number)
    if (row.kind === "invoice_receipt") {
      try { await morning(db, row.order_id); } catch (err) { console.error("morning work order", err); }
    } else {
      await db.from("morning_issue_requests").delete().eq("order_id", row.order_id);
    }
    return { ok: true };
  }
  // Morning refused it (4xx: nothing was issued, so it may be tried again); anything else is unclear: no automatic retry
  const refused = status >= 400 && status < 500;
  await db.from("morning_documents").update({
    status: "failed", error: morningError(status, data), ...(refused ? {} : { attempts: LOST }),
  }).eq("id", id);
  return { ok: true };
}

// deno-lint-ignore no-explicit-any
function morningError(status: number, data: any) {
  const msg = plainText(data?.errorMessage ?? data?.message ?? "", 300);
  if (!status) return `No answer from Morning${msg ? `: ${msg}` : ""}. Check in Morning before trying again.`;
  return `Morning answered ${status}${data?.errorCode ? ` (code ${data.errorCode})` : ""}${msg ? `: ${msg}` : ""}`;
}
