// ============================================================================
// subscribe — sign-ups. Stores the address with its consent, then Make.com adds it to monday (Shop Customers).
//   source 'free-guide' (the shop's pop-up, 25 Oct 2026): also full name, phone and language. Nothing is given here
//   (anyone can type any email): the page then emails a sign-in link, and when it's clicked the database gives the
//   free Field Guides sample and applies these details (grant_free_sample, migration 20261025000001).
// Repeat sign-ups are harmless (upsert). The sampler is re-sent at most once a day per
// address, and one IP can sign up 10 times an hour, so a script can't use up the Make.com
// operations or send the sampler to strangers over and over.
// ============================================================================
import { admin, clientIp, cors, EMAIL_RE, fail, json, notifyMake, sha256Hex } from "../_shared/http.ts";
import { mondayPhone, parsePhone } from "../_shared/phone.ts";

const PER_IP_PER_HOUR = 10;
const ALL_PER_HOUR = 200;   // sign-ups from everyone together

const SOURCES = new Set(["free-sampler", "newsletter", "launch-waitlist", "free-guide"]);
// Free text that travels inside JSON to Make: no control characters or double quotes, trimmed, capped.
const text = (v: unknown, max: number) =>
  String(v ?? "").replace(/[\u0000-\u001f\u007f"\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return fail(req, "Method not allowed", 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail(req, "Invalid request."); }

  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
  const source = SOURCES.has(String(body.source)) ? String(body.source) : "free-sampler";
  if (!EMAIL_RE.test(email)) return fail(req, "Please enter a valid email address.");
  const guide = source === "free-guide";
  const name = guide ? text(body.name, 120) : "";
  const phone = guide ? text(body.phone, 40).replace(/[^\d+()\- ]/g, "") : "";
  const lang = body.lang === "he" ? "he" : "en";
  const consent = guide ? body.consent === true : true;   // the free guide comes either way; consent = marketing
  if (guide && name.length < 2) return fail(req, "Please enter your full name.");
  if (guide && !/^\+?[\d()\- ]{7,24}$/.test(phone) || guide && phone.replace(/\D/g, "").length < 7)
    return fail(req, "Please enter a valid phone number.");

  const db = admin();
  const salt = Deno.env.get("IP_HASH_SALT") ?? "";
  const ip = clientIp(req);
  const ipHash = ip ? await sha256Hex(salt + ip) : null;
  const emailHash = await sha256Hex(salt + email);
  const hourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  if (ipHash) {
    const { count } = await db.from("form_attempts").select("id", { count: "exact", head: true })
      .eq("form", "subscribe").eq("ip_hash", ipHash).gte("created_at", hourAgo);
    if ((count ?? 0) >= PER_IP_PER_HOUR) return fail(req, "Too many sign-ups from here. Please try again in an hour.", 429);
  }
  // the address can be faked: a cap for everyone together keeps a flood from using up Make's operations
  const { count: all } = await db.from("form_attempts").select("id", { count: "exact", head: true })
    .eq("form", "subscribe").gte("created_at", hourAgo);
  if ((all ?? 0) >= ALL_PER_HOUR) return fail(req, "Too many sign-ups from here. Please try again in an hour.", 429);
  const { count: recent } = await db.from("form_attempts").select("id", { count: "exact", head: true })
    .eq("form", "subscribe").eq("email_hash", emailHash).gte("created_at", dayAgo);
  await db.from("form_attempts").insert({ form: "subscribe", ip_hash: ipHash, email_hash: emailHash });

  const { error } = await db.from("subscribers")
    .upsert(guide ? { email, source, consent, name, phone, lang } : { email, source, consent: true },
            { onConflict: "email", ignoreDuplicates: false });
  if (error) {
    console.error(error);
    return fail(req, "Couldn't sign you up just now. Please try again.", 500);
  }

  // Already signed up in the last day: keep the answer the same, but don't send the sampler again.
  if ((recent ?? 0) === 0) {
    await notifyMake("MAKE_SUBSCRIBE_WEBHOOK", guide
      ? { type: "subscribe", email, source, name, phone: parsePhone(phone, lang).e164,
          phone_cv: mondayPhone("phone_mm8f7tjs", phone, lang),   // Shop Customers' Phone column, or nothing
          language: lang === "he" ? "Hebrew" : "English", marketing: consent ? "yes" : "no",
          newsletter_label: consent ? "Subscribed" : "Not subscribed",
          newsletter_cv: consent ? '"color_mm801rf2":{"label":"Subscribed"},' : "",   // never downgrades someone subscribed
          signed_up_on: new Date().toISOString().slice(0, 10) }
      : { type: "subscribe", email, source });
  }
  return json(req, { ok: true });
});
