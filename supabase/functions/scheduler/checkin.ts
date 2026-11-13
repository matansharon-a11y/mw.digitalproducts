// The after-purchase email (Jeinna, 8 Nov 2026, with Matan: "that is the email they should receive after purchasing").
// A few minutes after each paid order, the shop's own "Download and install" email (Lemon Squeezy's payment receipt comes
// separately), in Hebrew or English: thanks, My downloads, 3 getting-started steps, a block per product bought with its install steps (only facts from the site's FAQs), My
// downloads, and help by email to contact@. Sent by Make's "MWP Shop · Update emails" scenario (one-time code, purpose
// checkin:<order ids>, then update_list hands the emails over). orders.checkin_sent_at keeps each order to one email.

import { isHebrew } from "./docs.ts";
import { HE_NAMES } from "./morning.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

const GOLD = "#9A6418", DARK = "#14110E", INK = "#1A1A1A", MUTED = "#5B5B5B", LINE = "#ECE6DC";
const ACCOUNT = "https://shop.mw.photography/account/";
const INSTAGRAM = "https://www.instagram.com/mw_phototours/";
const CONTACT = "contact@matanwildphotography.com";
const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const ltr = (s: string) => `<b dir="ltr" style="white-space:nowrap">${s}</b>`;

type Part = "plugin" | "panel" | "presets" | "guides";
// what each product is made of (the plugin includes the presets: its block says so)
const PARTS: Record<string, Part[]> = {
  "mwp-lightroom-plugin": ["plugin"], "mwp-panel": ["panel"], "mwp-presets": ["presets"], "mwp-field-guides": ["guides"],
  "presets-panel": ["plugin", "panel"], "presets-field-guides": ["plugin", "guides"], "field-guides-panel": ["panel", "guides"],
  "full-set": ["plugin", "panel", "presets", "guides"],
  "field-guide-planning": ["guides"], "field-guide-composition": ["guides"], "field-guide-light": ["guides"], "field-guide-colour": ["guides"],
};
const BLOCKS: Record<Part, { en: [string, string]; he: [string, string] }> = {
  plugin: {
    en: ["Lightroom Classic plugin", `Unzip the download. In Lightroom Classic open <b>File › Plug-in Manager</b>, click <b>Add</b> and choose the <b>MWP-Panel.lrplugin</b> folder. MWP Presets are included.`],
    he: ["התוסף ללייטרום קלאסיק", `פותחים את הקובץ שהורדתם. בלייטרום קלאסיק נכנסים ל-${ltr("File › Plug-in Manager")}, לוחצים ${ltr("Add")} ובוחרים את התיקייה ${ltr("MWP-Panel.lrplugin")}. הפריסטים של MWP כלולים.`],
  },
  panel: {
    en: ["MWP Photoshop Plugin Panel", "Photoshop 2023 or newer, on Mac or Windows. The download has an Installation Guide with the common fixes, and the video tutorials are in My downloads. You can use it on 2 computers."],
    he: ["פאנל התוסף לפוטושופ של MWP", "לפוטושופ 2023 ומעלה, במק או בווינדוס. בהורדה יש מדריך התקנה עם פתרונות לבעיות נפוצות, ובעמוד ההורדות שלי יש סרטוני הדרכה. אפשר להשתמש בו בשני מחשבים."],
  },
  presets: {
    en: ["MWP Presets", "The pack has an install guide with a page for each program, plus 50 DNG files for Lightroom Mobile on your phone or tablet. Most installs take a couple of minutes."],
    he: ["הפריסטים של MWP", "בחבילה יש מדריך התקנה עם עמוד לכל תוכנה, וגם 50 קובצי DNG ללייטרום בטלפון או בטאבלט. רוב ההתקנות לוקחות כמה דקות."],
  },
  guides: {
    en: ["MWP Field Guides", "Read them online with Read online in My downloads, on any device: computer, iPad or phone, up to 2 devices at a time. Nothing to install."],
    he: ["מדריכי השטח של MWP", "קוראים אותם אונליין, בכפתור קריאה אונליין בעמוד ההורדות שלי, בכל מכשיר: מחשב, אייפד או טלפון, בעד שני מכשירים בו־זמנית. אין מה להתקין."],
  },
};
const T = {
  en: { subject: (p: string) => `Download and install: ${p}`, hi: (n: string) => (n ? `Hi ${n},` : "Hi,"),
        lead: (p: string) => `Thank you for buying ${p}! Your payment receipt from Lemon Squeezy is in a separate email. This one is your guide to downloading and installing: your files are waiting in My downloads.`,
        steps_h: "Getting started",
        steps: [
          "Open My downloads and sign in with the email you used at checkout.",
          "Click Download (for the Field Guides: Read online). A download is made just for you, so if it says it's being prepared, give it a few minutes.",
          "Install it with the steps below. The download has its own install guide too.",
        ],
        your: "How to install", btn: "Open My downloads",
        help_h: "Having trouble? Need help?",
        help: `Write to us at <a href="mailto:${CONTACT}" style="color:${GOLD}">${CONTACT}</a>. A person replies within one business day.`,
        share: `Made a photo you love with it? We'd love to see it: tag <a href="${INSTAGRAM}" style="color:${GOLD}">@mw_phototours</a>.`,
        sign: "Matan | MW Photo Tours", foot: "You're getting this email because you bought from the MWP Shop." },
  he: { subject: (p: string) => `הורדה והתקנה: ${p}`, hi: (n: string) => (n ? `היי ${n},` : "היי,"),
        lead: (p: string) => `תודה שקניתם את ${p}! את הקבלה על התשלום שלחה לכם למון סקוויזי במייל נפרד. המייל הזה הוא המדריך שלכם להורדה ולהתקנה: הקבצים מחכים לכם בעמוד ההורדות שלי.`,
        steps_h: "איך מתחילים",
        steps: [
          "נכנסים לעמוד ההורדות שלי ומתחברים עם המייל שאיתו קניתם.",
          "לוחצים על הורדה (במדריכי השטח: קריאה אונליין). ההורדה מוכנת במיוחד בשבילכם, אז אם כתוב שהיא בהכנה, תנו לזה כמה דקות.",
          "מתקינים לפי ההסבר כאן למטה. גם בתוך ההורדה יש מדריך התקנה.",
        ],
        your: "איך מתקינים", btn: "לעמוד ההורדות שלי",
        help_h: "נתקלתם בבעיה? צריכים עזרה?",
        help: `כתבו לנו ל-<a href="mailto:${CONTACT}" style="color:${GOLD}" dir="ltr">${CONTACT}</a>. אדם אמיתי עונה תוך יום עסקים.`,
        share: `יצאה לכם תמונה שאתם אוהבים? נשמח לראות: תייגו את <a href="${INSTAGRAM}" style="color:${GOLD}" dir="ltr">@mw_phototours</a>.`,
        sign: "מתן | MW Photo Tours", foot: "קיבלתם את המייל הזה כי קניתם בחנות של MWP." },
};

export function checkinEmail(lang: "en" | "he", name: string, product: string, parts: Part[]) {
  const t = T[lang], rtl = lang === "he";
  const dir = rtl ? "rtl" : "ltr", align = rtl ? "right" : "left";
  const font = rtl ? "Heebo, Arial, sans-serif" : "'Google Sans', Arial, sans-serif";
  const first = esc(String(name ?? "").trim().split(/\s+/)[0] || "");
  const rows = parts.map((p) => `<tr><td style="padding:14px 18px;border-top:1px solid ${LINE}">
<p style="margin:0 0 4px;font-weight:700;color:${INK}">${BLOCKS[p][lang][0]}</p>
<p style="margin:0;color:${MUTED}">${BLOCKS[p][lang][1]}</p></td></tr>`).join("");
  const steps = t.steps.map((x, i) => `<tr><td width="34" valign="top" style="padding:4px 0"><span style="display:inline-block;width:24px;height:24px;line-height:24px;border-radius:12px;background:${DARK};color:#F4AF56;font-size:13px;font-weight:700;text-align:center">${i + 1}</span></td>
<td style="padding:4px 0;color:${INK}">${x}</td></tr>`).join("");
  const html = `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F1EA">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1EA"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;font-family:${font};font-size:15px;line-height:1.6;color:${INK};direction:${dir};text-align:${align}">
<tr><td style="background:${DARK};padding:22px 24px;text-align:center"><span style="font-family:Arial,sans-serif;font-weight:700;letter-spacing:.18em;color:#F4AF56;font-size:14px" dir="ltr">MWP</span></td></tr>
<tr><td style="padding:28px 24px 8px">
<p style="margin:0 0 14px">${t.hi(first)}</p>
<p style="margin:0 0 20px">${t.lead(`<b>${esc(product)}</b>`)}</p>
<p style="margin:0 0 20px;text-align:center"><a href="${ACCOUNT}${rtl ? "?lang=he" : ""}" style="display:inline-block;padding:13px 26px;border-radius:24px;background:${GOLD};color:#fff;text-decoration:none;font-weight:700">${t.btn}</a></p>
<p style="margin:0 0 8px;font-weight:700">${t.steps_h}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px">${steps}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:12px;overflow:hidden">
<tr><td style="padding:12px 18px;background:#FBF8F3;font-weight:700;font-size:13px;letter-spacing:.04em;color:${GOLD}">${t.your}</td></tr>${rows}</table>
</td></tr>
<tr><td style="padding:18px 24px 6px">
<p style="margin:0 0 4px;font-weight:700">${t.help_h}</p>
<p style="margin:0 0 18px;color:${MUTED}">${t.help}</p>
<p style="margin:0 0 18px;color:${MUTED}">${t.share}</p>
<p style="margin:0 0 24px">${t.sign}</p>
</td></tr>
<tr><td style="padding:14px 24px;background:#FBF8F3;font-size:12px;color:#8A8A8A;text-align:center">${t.foot}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: t.subject(product), html };
}

const SINCE = "2026-11-09T06:50:00Z";   // only orders from 9 Nov 2026 on: existing buyers never get it again (Jeinna)

// every 5 minutes: orders paid at least 2 minutes ago (the webhook has given access by then) that haven't had it → hand Make a one-time code
export async function checkins(db: Db, hook: (purpose: string) => Promise<boolean>) {
  const { data } = await db.from("orders").select("id").eq("status", "paid").eq("test_mode", false).is("checkin_sent_at", null)
    .gte("created_at", SINCE).lte("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
    .order("created_at").limit(40);
  const ids = (data ?? []).map((o: { id: string }) => o.id);
  if (!ids.length) return { skipped: "nothing due" };
  const ok = await hook(`checkin:${ids.join(",")}`);
  return { ok, orders: ids.length };
}

// update_list (Make, with the code): the emails, and each order marked so it never gets a second one
export async function checkinEmails(db: Db, ids: string[]) {
  const UUID = /^[0-9a-f-]{36}$/i;
  ids = ids.filter((x) => UUID.test(x)).slice(0, 40);
  if (!ids.length) return [];
  const { data: orders } = await db.from("orders")
    .select("id, status, test_mode, checkin_sent_at, vat_rate, customer_id, customers(email, name), order_items(products(slug, name, name_emphasis))")
    .in("id", ids);
  const out: { email: string; subject: string; body_html: string }[] = [];
  // deno-lint-ignore no-explicit-any
  for (const o of (orders ?? []) as any[]) {
    if (o.status !== "paid" || o.test_mode || o.checkin_sent_at || !o.customers?.email) continue;
    const products = (o.order_items ?? []).map((i: any) => i.products).filter(Boolean);
    const parts = [...new Set(products.flatMap((p: any) => PARTS[p.slug] ?? []))] as Part[];
    if (!parts.length) continue;
    const he = Number(o.vat_rate) > 0 || await isHebrew(db, o.customer_id, o.customers.email);
    const name = products.map((p: any) => he ? (HE_NAMES[p.slug] ?? `${p.name} ${p.name_emphasis ?? ""}`.trim()) : `${p.name} ${p.name_emphasis ?? ""}`.trim()).join(" + ");
    // only marked once it's on its way: a concurrent call can't send it twice
    const { data: marked } = await db.from("orders").update({ checkin_sent_at: new Date().toISOString() })
      .eq("id", o.id).is("checkin_sent_at", null).select("id");
    if (!marked?.length) continue;
    const m = checkinEmail(he ? "he" : "en", o.customers.name ?? "", name, parts);
    out.push({ email: o.customers.email, subject: m.subject, body_html: m.html });
  }
  return out;
}
