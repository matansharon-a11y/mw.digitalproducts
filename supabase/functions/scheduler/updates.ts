// Update emails (Jeinna, 4 Nov 2026): a product's file got a new version and the admin clicked "Email the owners"
// (decide_update_notice in migration 20261104000002). One email per owner, in their language (Hebrew when anything they
// have with us is in Hebrew), sent by Make's Gmail, signed Matan (Jeinna, 5 Nov 2026). The texts are drafts for Matan's approval.

import { compatEmails } from "./compat.ts";
import { documentEmails, morningDocEmails } from "./docs.ts";
import { checkinEmails } from "./checkin.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

const ACCOUNT = "https://shop.mw.photography/account/";
const SUPPORT = "https://shop.mw.photography/support/";

// The names as the site writes them (CLAUDE.md "Names" and the Hebrew rule: everything in Hebrew, MWP in Latin letters)
const NAMES: Record<string, [string, string]> = {
  "mwp-lightroom-plugin": ["the MWP Lightroom Classic plugin", "התוסף ללייטרום קלאסיק של MWP"],
  "mwp-panel": ["MWP Photoshop Plugin Panel", "פאנל התוסף לפוטושופ של MWP"],
  "mwp-presets": ["MWP Presets", "הפריסטים של MWP"],
  "mwp-field-guides": ["MWP Field Guides", "מדריכי השטח של MWP"],
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const first = (name: string) => esc(name.trim().split(/\s+/)[0] || "");

function wrap(lang: "en" | "he", inner: string) {
  const dir = lang === "he" ? "rtl" : "ltr";
  const font = lang === "he" ? "Heebo, Arial, sans-serif" : "'Google Sans', Arial, sans-serif";
  return `<div dir="${dir}" style="font-family:${font};font-size:15px;line-height:1.6;color:#1a1a1a;text-align:${lang === "he" ? "right" : "left"}">${inner}</div>`;
}

export function updateEmail(lang: "en" | "he", name: string, slug: string, fallback: string, version: string) {
  const [en, he] = NAMES[slug] ?? [fallback, fallback];
  const v = esc(version);
  if (lang === "he") {
    const hi = first(name) ? `היי ${first(name)},` : "היי,";
    return {
      subject: `גרסה חדשה של ${he}`,
      html: wrap("he", `<p>${hi}</p>
<p>יצאה גרסה חדשה של ${esc(he)}: גרסה ${v}.</p>
<p>כמו כל העדכונים, היא בחינם. נכנסים ל<a href="${ACCOUNT}?lang=he">הורדות שלי</a> עם המייל הזה ומורידים אותה משם.</p>
<p>שאלות? אנחנו כאן: <a href="${SUPPORT}?lang=he">עזרה ותמיכה</a>.</p>
<p>מתן | MW Photo Tours</p>`),
    };
  }
  const cap = en.charAt(0).toUpperCase() + en.slice(1);
  return {
    subject: `A new version of ${en} is ready`,
    html: wrap("en", `<p>${first(name) ? `Hi ${first(name)},` : "Hi,"}</p>
<p>${esc(cap)} has a new version: ${v}.</p>
<p>Like every update, it's free. Sign in to <a href="${ACCOUNT}">My downloads</a> with this email and download it there.</p>
<p>Questions? We're here: <a href="${SUPPORT}">Help and support</a>.</p>
<p>Matan | MW Photo Tours</p>`),
  };
}

// Step 1 (job update_emails, from decide_update_notice): hand Make a one-time code. Make's own scenario
// ("MWP Shop · Update emails", 8379057) then asks this function for the list (step 2) and sends each email with Gmail.
// The webhook only ever carries that code, and Make posts it to this function's fixed address, so the webhook's
// address alone can't send anything to anyone.
const UPDATE_HOOK = Deno.env.get("MAKE_UPDATES_WEBHOOK_URL") || "https://hook.eu1.make.com/xwf14t67ho423q9sb05pipde9bgv87v6";

/** Hands Make's email scenario a one-time code for `purpose` ("update:<notice>" or "compat:<run>"). */
export async function emailHook(db: Db, purpose: string): Promise<boolean> {
  const nonce = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const { error: iErr } = await db.from("sync_nonces").insert({ nonce, purpose });
  if (iErr) throw iErr;
  try {
    const res = await fetch(UPDATE_HOOK, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ nonce }), signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch (err) { console.error("email hook", err); return false; }
}

export async function updateEmails(db: Db, noticeId: string) {
  const { data: n, error } = await db.from("update_notices").select("id, status").eq("id", noticeId).maybeSingle();
  if (error) throw error;
  if (!n || n.status !== "sending") return { skipped: "not waiting to send" };
  const ok = await emailHook(db, `update:${noticeId}`);
  if (!ok) await db.from("update_notices").update({ status: "failed" }).eq("id", noticeId);
  return { ok };
}

// Step 2 (job update_list, Make's call with the code): the emails to send, one per owner. The notice is marked sent.
export async function updateList(db: Db, nonceIn: unknown) {
  const nonce = String(nonceIn ?? "");
  // an unknown code gets an empty list (not an error), so a stray call to the webhook leaves no failed run in Make
  if (nonce.length < 32) return { error: "unauthorized", emails: [] };
  const { data: used, error: nErr } = await db.from("sync_nonces")
    .update({ used_at: new Date().toISOString() })
    .eq("nonce", nonce).or('purpose.like."update:*",purpose.like."compat:*",purpose.like."doc:*",purpose.like."mdoc:*",purpose.like."checkin:*"').is("used_at", null)
    .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
    .select("purpose");
  if (nErr) throw nErr;
  if (!used?.length) return { error: "unauthorized", emails: [] };
  // the compatibility monitor's alert email to the admin (compat.ts) uses the same scenario
  if (used[0].purpose.startsWith("compat:")) return { emails: await compatEmails(db) };
  // a receipt (and invoice) the admin sent to the customer from the admin (admin-docs, docs.ts)
  if (used[0].purpose.startsWith("checkin:")) return { emails: await checkinEmails(db, used[0].purpose.slice(8).split(",")) };
  if (used[0].purpose.startsWith("mdoc:")) return { emails: await morningDocEmails(db, used[0].purpose.slice(5)) };
  if (used[0].purpose.startsWith("doc:")) return { emails: await documentEmails(db, used[0].purpose.slice(4).split(":")) };
  const noticeId = used[0].purpose.slice("update:".length);

  const { data: n, error } = await db.from("update_notices")
    .select("id, version, status, product_id, products(slug, name, name_emphasis)").eq("id", noticeId).maybeSingle();
  if (error) throw error;
  if (!n || n.status !== "sending") return { emails: [] };
  const p = n.products ?? {};
  const fallback = `${p.name ?? ""} ${p.name_emphasis ?? ""}`.trim();
  const { data: people, error: rErr } = await db.rpc("update_recipients", { p_product: n.product_id });
  if (rErr) throw rErr;
  // deno-lint-ignore no-explicit-any
  const emails = (people ?? []).map((r: any) => {
    const m = updateEmail(r.lang === "he" ? "he" : "en", r.name ?? "", p.slug, fallback, n.version);
    return { email: r.email, subject: m.subject, body_html: m.html };
  });
  await db.from("update_notices").update({ status: "sent", sent_at: new Date().toISOString(), recipients: emails.length }).eq("id", noticeId);
  return { emails };
}
