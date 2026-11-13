// Payout invoice reminder (Jeinna, 13 Nov 2026: "send an email to Jeinna whenever she has to upload the payout invoices,
// with step-by-step instructions"). Lemon Squeezy pays out twice a month, on the 1st and the 15th. The day after
// each payout day (and again 3 days later if it's still not done) the admin gets one email: how many sales the payout
// should hold, and the steps from the Lemon Squeezy CSV to "Issue in Morning". Only when that half-month had paid
// sales and no payout invoice for the payout is in the shop yet. Sent like the other emails (Make's "Update emails"
// scenario, purpose payoutremind:<payout day>), to the admin(s) in admin_allowlist. Nothing goes to buyers.

// deno-lint-ignore no-explicit-any
type Db = any;

const ADMIN_URL = "https://shop.mw.photography/admin/#morning";
const LS_PAYOUTS = "https://app.lemonsqueezy.com/";
const GOLD = "#9A6418", DARK = "#14110E", INK = "#1A1A1A", MUTED = "#5B5B5B", LINE = "#ECE6DC", SOFT = "#FBF8F3";

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const nice = (s: string) => new Date(s + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// The payout this reminder is about: the latest 1st or 15th on or before today (Israel time), and the one before it.
export function payoutWindow(now = new Date()) {
  const il = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  const y = il.getFullYear(), m = il.getMonth(), d = il.getDate();
  const day = d >= 15 ? new Date(Date.UTC(y, m, 15)) : new Date(Date.UTC(y, m, 1));
  const prev = d >= 15 ? new Date(Date.UTC(y, m, 1)) : new Date(Date.UTC(y, m - 1, 15));
  return { payout: ymd(day), from: ymd(prev), last: (d >= 5 && d < 15) || d >= 19 };
}

async function due(db: Db) {
  const w = payoutWindow();
  const { data: orders } = await db.from("orders").select("total_cents, currency")
    .eq("status", "paid").eq("test_mode", false).gte("created_at", `${w.from}T00:00:00Z`).lt("created_at", `${w.payout}T00:00:00Z`);
  const { data: docs } = await db.from("morning_documents").select("id, status").eq("kind", "payout").gte("payout_date", w.payout);
  const issued = (docs ?? []).some((d: { status: string }) => d.status === "issued");
  return { ...w, sales: orders?.length ?? 0, gross: (orders ?? []).reduce((s: number, o: { total_cents: number }) => s + (o.total_cents || 0), 0), currency: orders?.[0]?.currency ?? "USD", started: (docs ?? []).length > 0, issued };
}

// cron (the 2nd and 16th, and the 5th and 19th as a second reminder) → one-time code for Make
export async function payoutReminder(db: Db, hook: (purpose: string) => Promise<boolean>) {
  const d = await due(db);
  if (!d.sales) return { skipped: "no paid sales in this payout", ...d };
  if (d.issued) return { skipped: "payout invoice already issued", ...d };
  const ok = await hook(`payoutremind:${d.payout}`);
  return { ok, ...d };
}

export function payoutReminderEmail(d: Awaited<ReturnType<typeof due>>) {
  const money = `${(d.gross / 100).toFixed(2)} ${d.currency}`;
  const step = (n: number, html: string) => `<tr><td width="34" valign="top" style="padding:7px 0"><span style="display:inline-block;width:24px;height:24px;line-height:24px;border-radius:12px;background:${DARK};color:#F4AF56;font-size:13px;font-weight:700;text-align:center">${n}</span></td><td style="padding:7px 0;color:${INK}">${html}</td></tr>`;
  const steps = [
    `Sign in to <a href="${LS_PAYOUTS}" style="color:${GOLD}">Lemon Squeezy</a> and open <b>Settings → Payouts</b>.`,
    `Open the payout from <b>${nice(d.payout)}</b> and <b>export its CSV</b> (it downloads to your computer).`,
    `Open the shop admin: <b>Sales → Morning invoices</b>.`,
    `Under <b>Payout CSV</b>, choose the file. The <b>Payout date</b> fills in by itself: check it says ${nice(d.payout)}.`,
    `Click <b>Make a preview</b>. After about a minute the preview appears under <b>Payout invoices</b>.`,
    `Open the preview and check its total matches the payout amount in Lemon Squeezy.`,
    `Click <b>Issue in Morning</b>. Done: the invoice is in Matan's Morning account.`,
  ].map((s, i) => step(i + 1, s)).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F1EA">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1EA"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;font-family:'Google Sans',Arial,sans-serif;font-size:15px;line-height:1.6;color:${INK}">
<tr><td style="background:${DARK};padding:22px 24px;text-align:center"><span style="font-family:Arial,sans-serif;font-weight:700;letter-spacing:.18em;color:#F4AF56;font-size:14px">MWP</span></td></tr>
<tr><td style="padding:28px 24px 8px">
<p style="margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:.05em;color:${GOLD}">${d.started ? "REMINDER · NOT ISSUED YET" : "TIME FOR THE PAYOUT INVOICE"}</p>
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3">Lemon Squeezy's payout of ${nice(d.payout)}</h1>
<p style="margin:0 0 18px">The payout should hold <b>${d.sales} sale${d.sales === 1 ? "" : "s"}</b> from ${nice(d.from)} on (${money} before Lemon Squeezy's fee). It needs one tax invoice-receipt in Morning. About 3 minutes:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px">${steps}</table>
<p style="margin:0 0 24px;text-align:center"><a href="${ADMIN_URL}" style="display:inline-block;padding:13px 26px;border-radius:24px;background:${GOLD};color:#fff;text-decoration:none;font-weight:700">Open Morning invoices</a></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:12px;margin:0 0 20px"><tr><td style="padding:14px 18px;background:${SOFT};color:${MUTED};font-size:14px">
<b style="color:${INK}">Good to know</b><br>Nothing is sent to buyers or to Lemon Squeezy: the invoice stays in Morning for Matan's books. Sales are reported for VAT by the 15th of the next month, so do it before then. If the payout isn't in Lemon Squeezy yet, ${d.last ? "try again tomorrow. This is the last reminder for this payout." : "try again tomorrow; you'll get one more reminder in 3 days if it's still not issued."}
</td></tr></table>
</td></tr>
<tr><td style="padding:14px 24px;background:${SOFT};font-size:12px;color:#8A8A8A;text-align:center">From the MWP Shop, to the shop's admin.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: `Payout invoice: Lemon Squeezy payout of ${nice(d.payout)} (${d.sales} sale${d.sales === 1 ? "" : "s"})`, html };
}

// update_list (Make, with the code): the email to the admin(s), only if it's still needed
export async function payoutReminderEmails(db: Db, _payout: string) {
  const d = await due(db);
  if (!d.sales || d.issued) return [];
  const { data: admins } = await db.from("admin_allowlist").select("email");
  const m = payoutReminderEmail(d);
  return (admins ?? []).map((a: { email: string }) => ({ email: a.email, subject: m.subject, body_html: m.html }));
}
