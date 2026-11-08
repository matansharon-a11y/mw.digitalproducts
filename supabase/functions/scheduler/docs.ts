// The receipt / invoice email the admin sends from Sales → Orders (admin-docs, migration 20261106000004). Make asks for
// it with the one-time code (purpose "doc:<receipt document>[:<invoice document>]"); this builds it and marks the
// documents emailed. One email to the order's customer, in Hebrew or English. Text: a draft for Matan's approval,
// signed Matan (Jeinna, 5 Nov 2026).

// deno-lint-ignore no-explicit-any
type Db = any;

const SUPPORT = "https://shop.mw.photography/support/";
const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const first = (name: string) => esc(String(name ?? "").trim().split(/\s+/)[0] || "");
const UUID = /^[0-9a-f-]{36}$/i;

export async function isHebrew(db: Db, customerId: string, email: string): Promise<boolean> {
  const [{ data: e }, { data: b }, { data: s }] = await Promise.all([
    db.from("entitlements").select("guide_lang").eq("customer_id", customerId).eq("guide_lang", "he").limit(1),
    db.from("beta_members").select("terms_lang").eq("customer_id", customerId).eq("terms_lang", "he").limit(1),
    db.from("subscribers").select("lang").eq("email", email).eq("lang", "he").limit(1),
  ]);
  return !!((e ?? []).length || (b ?? []).length || (s ?? []).length);
}

export function documentEmail(lang: "en" | "he", name: string, orderNo: string, date: string, receipt: string, invoice: string | null) {
  const hi = first(name);
  const btn = (href: string, label: string) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:4px 8px 4px 0;padding:10px 18px;border-radius:20px;background:#9A6418;color:#fff;text-decoration:none">${label}</a>`;
  if (lang === "he") {
    return {
      subject: invoice ? `הקבלה והחשבונית להזמנה ${orderNo} מ-MWP` : `הקבלה להזמנה ${orderNo} מ-MWP`,
      html: `<div dir="rtl" style="font-family:Heebo,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;text-align:right">
<p>${hi ? `היי ${hi},` : "היי,"}</p>
<p>${invoice ? "מצורפות הקבלה והחשבונית" : "מצורפת הקבלה"} להזמנה שלך מספר ${esc(orderNo)} מ-${esc(date)}.</p>
<p>${btn(receipt, "לצפייה בקבלה")}${invoice ? btn(invoice, "להורדת החשבונית (PDF)") : ""}</p>
<p>התשלום עבר דרך למון סקוויזי, שותף התשלומים הרשמי שלנו, ולכן הקבלה והחשבונית הן שלהם. בעמוד הקבלה אפשר גם להדפיס אותה וליצור חשבונית עם פרטי החיוב שלך.</p>
<p>שאלות? אנחנו כאן: <a href="${SUPPORT}">עזרה ותמיכה</a>.</p>
<p>מתן | MW Photo Tours</p></div>`,
    };
  }
  return {
    subject: invoice ? `Your MWP receipt and invoice (order ${orderNo})` : `Your MWP receipt (order ${orderNo})`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
<p>${hi ? `Hi ${hi},` : "Hi,"}</p>
<p>Here ${invoice ? "are the receipt and invoice" : "is the receipt"} for your order ${esc(orderNo)} from ${esc(date)}.</p>
<p>${btn(receipt, "View your receipt")}${invoice ? btn(invoice, "Download your invoice (PDF)") : ""}</p>
<p>Your payment went through Lemon Squeezy, our official payment partner, so the receipt and invoice come from them. On the receipt page you can also print it or create an invoice with your billing details.</p>
<p>Questions? We're here: <a href="${SUPPORT}">Help and support</a>.</p>
<p>Matan | MW Photo Tours</p></div>`,
  };
}

export async function documentEmails(db: Db, ids: string[]) {
  const [receiptId, invoiceId] = ids;
  if (!UUID.test(receiptId ?? "")) return [];
  const { data: r } = await db.from("order_documents").select("id, order_id, url, kind").eq("id", receiptId).eq("kind", "receipt").maybeSingle();
  if (!r) return [];
  const { data: inv } = invoiceId && UUID.test(invoiceId)
    ? await db.from("order_documents").select("id, url").eq("id", invoiceId).eq("order_id", r.order_id).eq("kind", "invoice").maybeSingle()
    : { data: null };
  const { data: o } = await db.from("orders").select("order_number, created_at, customer_id, customers(email, name)").eq("id", r.order_id).maybeSingle();
  const email = o?.customers?.email;
  if (!email) return [];
  const he = await isHebrew(db, o.customer_id, email);
  const date = new Date(o.created_at).toLocaleDateString(he ? "he-IL" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const m = documentEmail(he ? "he" : "en", o.customers?.name ?? "", String(o.order_number ?? ""), date, r.url, inv?.url ?? null);
  const now = new Date().toISOString();
  await db.from("order_documents").update({ emailed_at: now, emailed_to: email }).in("id", [r.id, ...(inv ? [inv.id] : [])]);
  return [{ email, subject: m.subject, body_html: m.html }];
}

// A Morning invoice-receipt to the buyer (admin-docs "morning_email", 8 Nov 2026). Text: a draft for Matan's approval.
export function morningDocEmail(lang: "en" | "he", name: string, orderNo: string, date: string, number: string, url: string) {
  const hi = first(name);
  const btn = (href: string, label: string) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:4px 0;padding:10px 18px;border-radius:20px;background:#9A6418;color:#fff;text-decoration:none">${label}</a>`;
  if (lang === "he") {
    return {
      subject: `חשבונית מס קבלה ${number} להזמנה ${orderNo} מ-MWP`,
      html: `<div dir="rtl" style="font-family:Heebo,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;text-align:right">
<p>${hi ? `היי ${hi},` : "היי,"}</p>
<p>מצורפת חשבונית המס קבלה מספר ${esc(number)} להזמנה שלך מספר ${esc(orderNo)} מ-${esc(date)}.</p>
<p>${btn(url, "להורדת החשבונית (PDF)")}</p>
<p>שאלות? אנחנו כאן: <a href="${SUPPORT}">עזרה ותמיכה</a>.</p>
<p>מתן | MW Photo Tours</p></div>`,
    };
  }
  return {
    subject: `Your MWP invoice-receipt ${number} (order ${orderNo})`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
<p>${hi ? `Hi ${hi},` : "Hi,"}</p>
<p>Here is tax invoice-receipt ${esc(number)} for your order ${esc(orderNo)} from ${esc(date)}.</p>
<p>${btn(url, "Download your invoice-receipt (PDF)")}</p>
<p>Questions? We're here: <a href="${SUPPORT}">Help and support</a>.</p>
<p>Matan | MW Photo Tours</p></div>`,
  };
}

export async function morningDocEmails(db: Db, id: string) {
  if (!UUID.test(id ?? "")) return [];
  const { data: d } = await db.from("morning_documents").select("id, order_id, kind, status, url, number, payload")
    .eq("id", id).eq("kind", "invoice_receipt").eq("status", "issued").maybeSingle();
  if (!d?.url) return [];
  const { data: o } = await db.from("orders").select("order_number, created_at, customer_id, customers(email, name)").eq("id", d.order_id).maybeSingle();
  const email = o?.customers?.email;
  if (!email) return [];
  // the same language as the document itself
  const he = d.payload?.lang === "he" || (d.payload?.lang == null && await isHebrew(db, o.customer_id, email));
  const date = new Date(o.created_at).toLocaleDateString(he ? "he-IL" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const m = morningDocEmail(he ? "he" : "en", o.customers?.name ?? "", String(o.order_number ?? ""), date, String(d.number ?? ""), d.url);
  await db.from("morning_documents").update({ emailed_at: new Date().toISOString(), emailed_to: email }).eq("id", d.id);
  return [{ email, subject: m.subject, body_html: m.html }];
}
