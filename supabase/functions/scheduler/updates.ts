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

// What is new in a version, shown in its update email. Keyed "<slug>@<version>"; a version without an entry gets the
// plain email. Trusted text written here (it may hold <b>), approved by Matan (plugin 1.5.0: 12 Nov 2026).
type News = { lead: string; title: string; items: string[]; after: string[] };
const WHATS_NEW: Record<string, { en: News; he: News }> = {
  "mwp-lightroom-plugin@1.5.0": {
    en: {
      lead: "Lightroom Classic 16 arrived this month with new tools, and version 1.5 of the plugin puts them one click away.",
      title: "New in 1.5",
      items: [
        "<b>Glow looks.</b> A new Glow category in Looks: Soft glow, Morning mist and Backlight, built on Lightroom's new Glow. Strength and Remove look work as with every look. Lightroom Classic 16.",
        "<b>Edit by distance.</b> A new Depth target in Edit. Lightroom masks the photo by distance, and you choose near or far in the Masks panel. Lightroom Classic 16.",
        "<b>Denoise from the panel.</b> One button in Expedition starts Lightroom's Denoise before step 1. Raw files, Lightroom Classic 15.3 or newer.",
        "<b>Remove reflections.</b> For photos taken through hide glass or a vehicle window. Raw files, Lightroom Classic 15.3 or newer.",
        "<b>Glow on the whole photo.</b> The Glow effect in Edit now uses Lightroom's own Glow on Lightroom Classic 16.",
        "<b>Looks that answer back.</b> If Lightroom does not apply a look, the panel now tells you why.",
        "<b>My looks keeps Glow.</b> Saved looks now include it.",
      ],
      after: [
        "On Lightroom Classic 13, 14 and 15 the plugin works as before. New buttons appear only where your Lightroom supports them.",
        "To update: replace the old &quot;MWP-Panel.lrplugin&quot; folder with the new one, then in Lightroom choose File › Plug-in Manager › Reload Plug-in.",
      ],
    },
    he: {
      lead: "לייטרום קלאסיק 16 יצא החודש עם כלים חדשים, וגרסה 1.5 של התוסף שמה אותם במרחק לחיצה אחת.",
      title: "מה חדש ב-1.5",
      items: [
        "<b>לוקים של Glow.</b> קטגוריה חדשה ב-Looks: Soft glow, Morning mist ו-Backlight, על בסיס ה-Glow החדש של לייטרום. Strength ו-Remove look עובדים כמו בכל לוק. לייטרום קלאסיק 16.",
        "<b>עריכה לפי מרחק.</b> יעד חדש ב-Edit בשם Depth. לייטרום יוצר מסכה לפי מרחק, ואתם בוחרים קרוב או רחוק בחלונית המסכות. לייטרום קלאסיק 16.",
        "<b>Denoise מתוך הפאנל.</b> כפתור אחד ב-Expedition מפעיל את ה-Denoise של לייטרום לפני שלב 1. קובצי RAW, לייטרום קלאסיק 15.3 ומעלה.",
        "<b>הסרת השתקפויות.</b> לתמונות שצולמו דרך זכוכית של מסתור או חלון של רכב. קובצי RAW, לייטרום קלאסיק 15.3 ומעלה.",
        "<b>Glow על כל התמונה.</b> האפקט Glow ב-Edit משתמש עכשיו ב-Glow של לייטרום עצמו, בלייטרום קלאסיק 16.",
        "<b>לוקים שמסבירים את עצמם.</b> אם לייטרום לא החיל לוק, הפאנל כותב עכשיו למה.",
        "<b>My looks שומר גם Glow.</b> לוקים שמורים כוללים אותו.",
      ],
      after: [
        "בלייטרום קלאסיק 13, 14 ו-15 התוסף עובד כמו קודם. כפתורים חדשים מופיעים רק במקום שבו הלייטרום שלכם תומך בהם.",
        "כדי לעדכן: מחליפים את התיקייה הישנה &quot;MWP-Panel.lrplugin&quot; בחדשה, ואז בלייטרום בוחרים File › Plug-in Manager › Reload Plug-in.",
      ],
    },
  },
  "mwp-panel@2.3.0": {
    en: {
      lead: "Photoshop 2027 arrived this month with new tools, and version 2.3 of the panel puts them one click away.",
      title: "New in 2.3",
      items: [
        "<b>Clarity.</b> A new effect in Edit, built on Photoshop's new Clarity layer. It works inside the area you picked, like every effect. Photoshop 2027.",
        "<b>Dehaze.</b> A new effect in Edit for haze and dust in the air, built on Photoshop's new Dehaze layer. Photoshop 2027.",
        "<b>Grain.</b> A new touch in Edit: Photoshop's new Grain layer over the whole photo, editable at any time. Photoshop 2027.",
        "<b>Compare.</b> A new touch in Edit that opens Photoshop's Quick Compare, before and after side by side. Photoshop 2027.",
        "<b>Relight (AI).</b> In Style › Light, a button that opens Photoshop's Relight. It is generative AI: it runs online and uses your Adobe generative credits, and many nature competitions do not allow it. Photoshop 2027.",
      ],
      after: [
        "On older Photoshop versions the panel works as before. The new buttons appear only in Photoshop 2027.",
        "To update: double-click the new .ccx file and let Creative Cloud install it over the old one, then restart Photoshop. Your licence stays as it is.",
      ],
    },
    he: {
      lead: "פוטושופ 2027 יצא החודש עם כלים חדשים, וגרסה 2.3 של הפאנל שמה אותם במרחק לחיצה אחת.",
      title: "מה חדש ב-2.3",
      items: [
        "<b>Clarity.</b> אפקט חדש ב-Edit, על בסיס שכבת ה-Clarity החדשה של פוטושופ. הוא פועל בתוך האזור שבחרתם, כמו כל אפקט. פוטושופ 2027.",
        "<b>Dehaze.</b> אפקט חדש ב-Edit לאובך ולאבק באוויר, על בסיס שכבת ה-Dehaze החדשה של פוטושופ. פוטושופ 2027.",
        "<b>Grain.</b> כלי חדש ב-Edit: שכבת ה-Grain החדשה של פוטושופ על כל התמונה, ואפשר לשנות אותה בכל רגע. פוטושופ 2027.",
        "<b>Compare.</b> כלי חדש ב-Edit שפותח את Quick Compare של פוטושופ, לפני ואחרי זה לצד זה. פוטושופ 2027.",
        "<b>Relight (AI).</b> ב-Style › Light, כפתור שפותח את Relight של פוטושופ. זו בינה מלאכותית יוצרת: היא פועלת אונליין ומשתמשת בקרדיטים הגנרטיביים שלכם ב-Adobe, והרבה תחרויות צילום טבע לא מתירות אותה. פוטושופ 2027.",
      ],
      after: [
        "בגרסאות ישנות יותר של פוטושופ הפאנל עובד כמו קודם. הכפתורים החדשים מופיעים רק בפוטושופ 2027.",
        "כדי לעדכן: לוחצים פעמיים על קובץ ה-ccx החדש ונותנים ל-Creative Cloud להתקין אותו מעל הישן, ואז מפעילים מחדש את פוטושופ. הרישיון נשאר כמו שהוא.",
      ],
    },
  },
};

function news(lang: "en" | "he", slug: string, version: string) {
  const n = WHATS_NEW[`${slug}@${version.trim()}`]?.[lang];
  if (!n) return { lead: "", list: "" };
  return {
    lead: `<p>${n.lead}</p>`,
    list: `<p><b>${n.title}</b></p><ul>${n.items.map((i) => `<li>${i}</li>`).join("")}</ul>${n.after.map((a) => `<p>${a}</p>`).join("")}`,
  };
}

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
  const nw = news(lang, slug, version);
  if (lang === "he") {
    const hi = first(name) ? `היי ${first(name)},` : "היי,";
    return {
      subject: `גרסה חדשה של ${he}`,
      html: wrap("he", `<p>${hi}</p>
${nw.lead}<p>יצאה גרסה חדשה של ${esc(he)}: גרסה ${v}.</p>
${nw.list}<p>כמו כל העדכונים, היא בחינם. נכנסים ל<a href="${ACCOUNT}?lang=he">הורדות שלי</a> עם המייל הזה ומורידים אותה משם.</p>
<p>שאלות? אנחנו כאן: <a href="${SUPPORT}?lang=he">עזרה ותמיכה</a>.</p>
<p>מתן | MW Photo Tours</p>`),
    };
  }
  const cap = en.charAt(0).toUpperCase() + en.slice(1);
  return {
    subject: `A new version of ${en} is ready`,
    html: wrap("en", `<p>${first(name) ? `Hi ${first(name)},` : "Hi,"}</p>
${nw.lead}<p>${esc(cap)} has a new version: ${v}.</p>
${nw.list}<p>Like every update, it's free. Sign in to <a href="${ACCOUNT}">My downloads</a> with this email and download it there.</p>
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
