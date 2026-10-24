// ============================================================================
// beta — the MWP Ambassador Program page (shop.mw.photography/beta/).
//   status {}                              → { open }: is the program still taking people? (26 at most)
//   signed_terms (signed in)               → { url } of their signed-terms PDF, or 202 while it's being made
//   apply { name, email, ..., lang }      → { ok }: an application (the questionnaire; no terms yet). It's saved
//         and sent to monday.com (Shop Ambassador Applications) through Make. Nothing is given: the team
//         decides in monday; the scheduler (job "applications") emails approved people a personal link.
//   accept_info { token }                  → { name, email, accepted }: for the page behind that link.
//   accept { token, agree, lang }          → { ok, email }: they read and accepted the terms on that page. Now
//         they become ambassadors: tools, beta_members (terms version), signed-terms PDF, Shop Ambassadors.
// No password: the page is open to anyone with the link. Applications are limited per IP.
// (Joining on the spot, the old "join" action, is gone: access now needs the team's approval.)
// ============================================================================
import { admin, clientIp, cors, EMAIL_RE, fail, json, notifyMake, requestPersonalCopies, sha256Hex } from "../_shared/http.ts";
import { grantAmbassador } from "../_shared/ambassador.ts";

const TERMS_VERSION = "2026-10-13.5";   // must match TERMS_VERSION in tools/ambassador_terms.py
const MAX_APPLICATIONS_PER_HOUR = 5;  // per IP
const MAX_ALL_PER_HOUR = 100;         // from everyone together (shared with the tester code, see tester/index.ts)

// The questionnaire (same order and wording as the page). Answers are kept in English labels for the team.
const QUESTIONS: [string, string, boolean][] = [   // [key, label, required]
  ["platforms", "Other platforms they share on (Instagram and Facebook are above)", false],
  ["shoot", "What do you love to photograph?", true],
  ["years", "How long have you been photographing?", true],
  ["role", "Is photography a hobby, a side income or your profession?", true],
  ["work", "Where can we see your work?", true],
  ["software", "Which software do you edit with?", true],
  ["apps", "Photoshop, Lightroom Classic, Lightroom mobile?", true],
  ["devices", "On which devices?", true],
  ["used_before", "Have you used editing panels or presets before?", true],
  ["why", "Why would you like to be an MWP ambassador?", true],
  ["values", "What values are important to you in your photography and in the way you share it?", true],
  ["sounds_good", "Does this sound good to you?", true],
  ["feedback", "Happy to send feedback and report bugs?", true],
  ["question", "Their question (when they chose \"I have a question\")", false],
];

// Free text: no control characters, trimmed, capped. Double quotes become typographic ones (it travels inside JSON to monday).
const text = (v: unknown, max = 1500) =>
  String(v ?? "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").replace(/"/g, "”").trim().slice(0, max);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return fail(req, "Method not allowed", 405);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const db = admin();
  const FULL = "The Ambassador Program is full. Thank you for your interest.";

  if (body.action === "status") {
    const { data: open, error } = await db.rpc("ambassador_program_open");
    if (error) { console.error(error); return fail(req, "Couldn't check the program. Please try again.", 500); }
    return json(req, { open: Boolean(open) });
  }
  if (body.action === "signed_terms") return signedTerms(req, db);
  if (body.action === "accept_info" || body.action === "accept") return accept(req, db, body);
  if (body.action === "feedback") return feedback(req, db, body);
  if (body.action !== "apply") return fail(req, "Unknown action.", 400);

  const salt = Deno.env.get("IP_HASH_SALT") ?? "";
  const ipHash = clientIp(req) ? await sha256Hex(salt + clientIp(req)) : null;
  // the address can be faked: applications and tester-code tries are also capped for everyone together
  const { count: all } = await db.from("beta_attempts").select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 3600 * 1000).toISOString());
  if ((all ?? 0) >= MAX_ALL_PER_HOUR) return fail(req, "Too many requests. Please wait a minute and try again.", 429);
  if (ipHash) {
    const hourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    const { count } = await db.from("beta_attempts").select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).gte("created_at", hourAgo);
    if ((count ?? 0) >= MAX_APPLICATIONS_PER_HOUR) return fail(req, "Too many requests. Please wait a minute and try again.", 429);
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const name = text(body.name, 80);
  const lang = body.lang === "he" ? "he" : "en";   // the language they read the terms in (their signed copy matches)
  const instagram = String(body.instagram ?? "").trim().replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 60);
  const facebook = text(body.facebook, 100);
  if (!EMAIL_RE.test(email)) return fail(req, "Please enter a valid email.", 400);
  if (!name) return fail(req, "Please enter your name.", 400);
  if (!instagram) return fail(req, "Please enter your Instagram handle.", 400);

  const raw = (body.answers ?? {}) as Record<string, unknown>;
  const answers: Record<string, string> = {};
  for (const [key, , required] of QUESTIONS) {
    const v = text(raw[key]);
    if (required && !v) return fail(req, "Please answer every question.", 400);
    answers[key] = v;
  }
  if (answers.sounds_good !== "I have a question") answers.question = "";
  else if (!answers.question) return fail(req, "Please answer every question.", 400);

  await db.from("beta_attempts").insert({ ip_hash: ipHash });

  // Already in, or already waiting for an answer?
  const { data: known } = await db.from("customers").select("id, beta_members(status)").eq("email", email).maybeSingle();
  const bm = Array.isArray(known?.beta_members) ? known?.beta_members[0] : known?.beta_members;
  if (bm && bm.status === "active") return json(req, { ok: true, already: "member" });
  const { data: waiting } = await db.from("ambassador_applications").select("id").eq("email", email).in("status", ["new", "approved"]).limit(1);
  if (waiting?.length) return json(req, { ok: true, already: "waiting" });
  if (!bm) {
    const { data: open } = await db.rpc("ambassador_program_open");
    if (open === false) return fail(req, FULL, 409);
  }

  const { data: app, error } = await db.from("ambassador_applications").insert({
    email, name, lang, instagram: instagram || null, facebook: facebook || null, answers,
    ip_hash: ipHash,
  }).select("id, created_at").single();
  if (error) { console.error(error); return fail(req, "Couldn't send your application. Please try again.", 500); }

  // To monday (Shop Ambassador Applications). Line breaks are written as \n so the text fits inside Make's JSON.
  const lines = [`Name: ${name}`, `Email: ${email}`, ...QUESTIONS.map(([k, label], i) => `${i + 2}. ${label}\n${answers[k] || "-"}`)];
  const esc = (s: string) => JSON.stringify(s).slice(1, -1);
  const sent = await notifyMake("MAKE_WEBHOOK_URL", {
    type: "ambassador_application",
    application_id: app.id,
    name, email,
    language: lang === "he" ? "Hebrew" : "English",
    platforms: esc(`@${instagram}${facebook ? ` · Facebook: ${facebook}` : ""} · ${answers.platforms}`.slice(0, 900)),
    work: esc(answers.work.slice(0, 900)),
    applied_on: app.created_at.slice(0, 10),
    sounds_good: esc(answers.question ? `${answers.sounds_good}: ${answers.question}`.slice(0, 900) : answers.sounds_good),
    feedback: esc(answers.feedback),
    answers_text: esc(lines.join("\n\n")),
  });
  if (!sent) console.error("application not sent to Make", app.id);
  return json(req, { ok: true });
});

// The ambassador's own signed-terms PDF, signed in.
// deno-lint-ignore no-explicit-any
async function signedTerms(req: Request, db: any): Promise<Response> {
  let member: { agreed_at: string; terms_pdf_path: string | null; terms_pdf_made_at: string | null } | null = null;
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await db.auth.getUser(jwt);
  const email = auth?.user?.email?.toLowerCase();
  if (email) {
    const { data } = await db.from("customers")
      .select("beta_members(agreed_at, terms_pdf_path, terms_pdf_made_at)").eq("email", email).maybeSingle();
    const b = data?.beta_members;
    member = (Array.isArray(b) ? b[0] : b) ?? null;
  }
  if (!member) return fail(req, "No signed terms found.", 404);
  const ready = member.terms_pdf_path && member.terms_pdf_made_at && member.terms_pdf_made_at >= member.agreed_at;
  if (!ready) {
    await requestPersonalCopies();
    return json(req, { preparing: true }, 202);
  }
  const day = member.agreed_at.slice(0, 10);
  const { data: signed, error } = await db.storage.from("documents")
    .createSignedUrl(member.terms_pdf_path, 300, { download: `MWP Ambassador terms - signed ${day}.pdf` });
  if (error || !signed) { console.error(error); return fail(req, "Couldn't prepare your copy. Please try again.", 500); }
  return json(req, { url: signed.signedUrl });
}

// ---------------------------------------------------------------- after approval: accept the terms
// The welcome email links to /beta/?accept=<token> (the token is only stored as a hash; good for 60 days).
// deno-lint-ignore no-explicit-any
async function accept(req: Request, db: any, body: Record<string, unknown>): Promise<Response> {
  const token = String(body.token ?? "");
  const BAD = "This link isn't valid any more. Please contact us.";
  if (!/^[a-f0-9]{64}$/.test(token)) return fail(req, BAD, 404);
  const { data: app } = await db.from("ambassador_applications")
    .select("id, email, name, lang, instagram, facebook, status, decided_at, ip_hash")
    .eq("accept_token_hash", await sha256Hex(token)).maybeSingle();
  if (!app || !["approved", "accepted"].includes(app.status)) return fail(req, BAD, 404);
  if (app.status === "approved" && Date.now() - Date.parse(app.decided_at) > 60 * 86400 * 1000) return fail(req, BAD, 410);
  if (body.action === "accept_info") return json(req, { name: app.name, email: app.email, accepted: app.status === "accepted" });

  if (app.status === "accepted") return json(req, { ok: true, email: app.email });
  if (body.agree !== true) return fail(req, "Please accept the Ambassador Program terms.", 400);
  // Claim it first, so a double click can't do it twice.
  const { data: claimed } = await db.from("ambassador_applications")
    .update({ status: "accepted", accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION,
              agreed_at: new Date().toISOString() })
    .eq("id", app.id).eq("status", "approved").select("id");
  if (!claimed?.length) return json(req, { ok: true, email: app.email });
  const lang = body.lang === "he" ? "he" : (app.lang === "he" ? "he" : "en");
  let r;
  try {
    r = await grantAmbassador(db, { email: app.email, name: app.name, instagram: app.instagram, facebook: app.facebook,
      lang, termsVersion: TERMS_VERSION, agreedAt: new Date().toISOString(), ipHash: app.ip_hash });
  } catch (err) {
    console.error("accept grant", err);
    await db.from("ambassador_applications").update({ status: "approved", accepted_at: null }).eq("id", app.id);
    return fail(req, "Couldn't finish. Please try again in a minute.", 500);
  }
  if ("full" in r) {
    await db.from("ambassador_applications").update({ status: "full" }).eq("id", app.id);
    await notifyMake("MAKE_WEBHOOK_URL", { type: "application_decided", application_id: app.id, result: "Program full",
      send_email: "no", email: app.email, subject: "", body_html: "" });
    return fail(req, "The Ambassador Program is full. Thank you for your interest.", 409);
  }
  await db.from("ambassador_applications").update({ member_id: r.memberId }).eq("id", app.id);
  await notifyMake("MAKE_WEBHOOK_URL", { type: "application_decided", application_id: app.id, result: "Access given",
    send_email: "no", email: app.email, subject: "", body_html: "" });
  return json(req, { ok: true, email: app.email });
}

// ---------------------------------------------------------------- feedback from ambassadors and testers
// Signed in only; the person must be an active ambassador or tester. Kept in `feedback` and sent to monday
// (Shop Feedback) through Make. 20 a day per person.
const KINDS = ["Bug", "Recommendation", "Report", "Other"];
const PRODUCTS = ["MWP Presets", "MWP Panel", "MWP Field Guides", "General"];
// deno-lint-ignore no-explicit-any
async function feedback(req: Request, db: any, body: Record<string, unknown>): Promise<Response> {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await db.auth.getUser(jwt);
  const email = auth?.user?.email?.toLowerCase();
  if (!email) return fail(req, "Please sign in again.", 401);
  const { data: c } = await db.from("customers").select("id, name, beta_members(status), testers(removed_at)").eq("email", email).maybeSingle();
  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) as Record<string, unknown> | undefined;
  const isAmb = one(c?.beta_members)?.status === "active";
  const isTester = Boolean(one(c?.testers)) && !one(c?.testers)?.removed_at;
  if (!c || (!isAmb && !isTester)) return fail(req, "Feedback is for ambassadors and testers.", 403);

  const kind = KINDS.includes(String(body.kind)) ? String(body.kind) : "Other";
  const product = PRODUCTS.includes(String(body.product)) ? String(body.product) : "General";
  const message = String(body.message ?? "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").replace(/"/g, "”").trim().slice(0, 4000);
  const setup = String(body.setup ?? "").replace(/[\u0000-\u001f"\<>]/g, "").slice(0, 300);
  if (message.length < 5) return fail(req, "Please write a few words.", 400);

  const dayAgo = new Date(Date.now() - 86400 * 1000).toISOString();
  const { count } = await db.from("feedback").select("id", { count: "exact", head: true }).eq("customer_id", c.id).gte("created_at", dayAgo);
  if ((count ?? 0) >= 20) return fail(req, "That's a lot of feedback for one day. Please send the rest tomorrow, or email us.", 429);

  const fromRole = isAmb && isTester ? "ambassador and tester" : isAmb ? "ambassador" : "tester";
  const { data: row, error } = await db.from("feedback")
    .insert({ customer_id: c.id, from_role: fromRole, kind, product, message, setup }).select("created_at").single();
  if (error) { console.error(error); return fail(req, "Couldn't send it. Please try again.", 500); }

  const esc = (s: string) => JSON.stringify(s).slice(1, -1);   // line breaks travel as \n inside Make's JSON
  await notifyMake("MAKE_WEBHOOK_URL", {
    type: "feedback", kind, product, from_role: fromRole[0].toUpperCase() + fromRole.slice(1),
    name: String(c.name || email).replace(/["\\\r\n]+/g, " "), email, sent_on: row.created_at.slice(0, 10),
    message: esc(message), setup: esc(setup),
  });
  return json(req, { ok: true });
}
