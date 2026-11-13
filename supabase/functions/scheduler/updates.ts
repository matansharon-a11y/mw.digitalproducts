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

// The email's look (Jeinna, 13 Nov 2026: "make it html, I don't like sending emails like text"): the same card as the
// after-purchase email (checkin.ts): dark MWP header, a version tag, what's new in a box, the gold button, how to
// update, help, Matan's signature. The words are unchanged (WHATS_NEW above and the lines below).
const GOLD = "#9A6418", DARK = "#14110E", INK = "#1A1A1A", MUTED = "#5B5B5B", LINE = "#ECE6DC", SOFT = "#FBF8F3";
const CONTACT = "contact@matanwildphotography.com";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const first = (name: string) => esc(name.trim().split(/\s+/)[0] || "");

function card(lang: "en" | "he", body: string) {
  const rtl = lang === "he", dir = rtl ? "rtl" : "ltr", align = rtl ? "right" : "left";
  const font = rtl ? "Heebo, Arial, sans-serif" : "'Google Sans', Arial, sans-serif";
  const foot = rtl ? "קיבלתם את המייל הזה כי המוצר נמצא אצלכם בהורדות שלי בחנות של MWP." : "You're getting this email because this product is in your My downloads at the MWP Shop.";
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F1EA">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1EA"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;font-family:${font};font-size:15px;line-height:1.6;color:${INK};direction:${dir};text-align:${align}">
<tr><td style="background:${DARK};padding:22px 24px;text-align:center"><span style="font-family:Arial,sans-serif;font-weight:700;letter-spacing:.18em;color:#F4AF56;font-size:14px" dir="ltr">MWP</span></td></tr>
${body}
<tr><td style="padding:14px 24px;background:${SOFT};font-size:12px;color:#8A8A8A;text-align:center">${foot}</td></tr>
</table></td></tr></table></body></html>`;
}

export function updateEmail(lang: "en" | "he", name: string, slug: string, fallback: string, version: string) {
  const [en, he] = NAMES[slug] ?? [fallback, fallback];
  const rtl = lang === "he";
  const v = esc(version);
  const n = WHATS_NEW[`${slug}@${version.trim()}`]?.[lang];
  const T = rtl ? {
    subject: `גרסה חדשה של ${he}`,
    hi: first(name) ? `היי ${first(name)},` : "היי,",
    line: `יצאה גרסה חדשה של ${esc(he)}: גרסה ${v}.`,
    tag: `גרסה ${v}`,
    free: `כמו כל העדכונים, היא בחינם. נכנסים ל<a href="${ACCOUNT}?lang=he" style="color:${GOLD}">הורדות שלי</a> עם המייל הזה ומורידים אותה משם.`,
    btn: "לעמוד ההורדות שלי", url: `${ACCOUNT}?lang=he`, how: "איך מעדכנים",
    help: `שאלות? אנחנו כאן: <a href="${SUPPORT}?lang=he" style="color:${GOLD}">עזרה ותמיכה</a>, או במייל <a href="mailto:${CONTACT}" style="color:${GOLD}" dir="ltr">${CONTACT}</a>.`,
    sign: "מתן | MW Photo Tours",
  } : {
    subject: `A new version of ${en} is ready`,
    hi: first(name) ? `Hi ${first(name)},` : "Hi,",
    line: `${esc(en.charAt(0).toUpperCase() + en.slice(1))} has a new version: ${v}.`,
    tag: `Version ${v}`,
    free: `Like every update, it's free. Sign in to <a href="${ACCOUNT}" style="color:${GOLD}">My downloads</a> with this email and download it there.`,
    btn: "Open My downloads", url: ACCOUNT, how: "How to update",
    help: `Questions? We're here: <a href="${SUPPORT}" style="color:${GOLD}">Help and support</a>, or <a href="mailto:${CONTACT}" style="color:${GOLD}">${CONTACT}</a>.`,
    sign: "Matan | MW Photo Tours",
  };
  const items = n ? n.items.map((i) => `<tr><td style="padding:11px 18px;border-top:1px solid ${LINE};color:${MUTED}">${i.replace(/<b>/g, `<b style="color:${INK}">`)}</td></tr>`).join("") : "";
  const news = n ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:12px;overflow:hidden;margin:0 0 20px">
<tr><td style="padding:12px 18px;background:${SOFT};font-weight:700;font-size:13px;letter-spacing:.04em;color:${GOLD}">${n.title}</td></tr>${items}</table>` : "";
  const how = n && n.after.length ? `<p style="margin:0 0 6px;font-weight:700">${T.how}</p>${n.after.map((a) => `<p style="margin:0 0 10px;color:${MUTED}">${a}</p>`).join("")}` : "";
  const body = `<tr><td style="padding:28px 24px 8px">
<p style="margin:0 0 14px">${T.hi}</p>
${n ? `<p style="margin:0 0 14px">${n.lead}</p>` : ""}
<p style="margin:0 0 18px"><span style="display:inline-block;padding:3px 10px;border-radius:12px;background:${DARK};color:#F4AF56;font-size:12px;font-weight:700;letter-spacing:.04em" dir="${rtl ? "rtl" : "ltr"}">${T.tag}</span></p>
<p style="margin:0 0 20px">${T.line}</p>
${news}
<p style="margin:0 0 20px">${T.free}</p>
<p style="margin:0 0 24px;text-align:center"><a href="${T.url}" style="display:inline-block;padding:13px 26px;border-radius:24px;background:${GOLD};color:#fff;text-decoration:none;font-weight:700">${T.btn}</a></p>
${how}
</td></tr>
<tr><td style="padding:12px 24px 6px">
<p style="margin:0 0 18px;color:${MUTED}">${T.help}</p>
<p style="margin:0 0 24px">${T.sign}</p>
</td></tr>`;
  return { subject: T.subject, html: card(lang, body) };
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
