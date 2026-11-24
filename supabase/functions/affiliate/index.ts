// ============================================================================
// affiliate — the MWP Affiliate Program (Matan, 18 Nov 2026; launches January 2027). Invite-only.
//
// Public:
//   check { code }                → { valid, pct, starts_on, ends_on }   the cart: is this an affiliate's code?
//   invite_info { token }         → { name, email, code, lang, accepted, starts_on, ends_on }   the invitation page
//   accept { token, agree, lang } → { ok, email, code }   they accepted the program on that page: every tool free,
//                                    their code made in Lemon Squeezy (from 1 Jan 2027, for a year), status active
// Admin only (the admin's own session; is_admin() includes the two-step sign-in):
//   invite { name, email, lang, instagram?, code? } → { id, code, link }   a personal invitation link (60 days)
//   relink { id }                 → { link }   a fresh link for someone not yet joined (the old one stops working)
//   make_code { id }              → { ok }     (re)make the code in Lemon Squeezy, if it failed when they joined
//   end { id, reason }            → { ok }     ends the agreement: code deleted, free tools taken back (anything
//                                              bought, and another program's access, stay); any balance is still paid
// The invitation link is shop.mw.photography/affiliates/?invite=<token>; only the token's hash is kept.
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { admin, clientIp, cors, EMAIL_RE, fail, json, requestPersonalCopies, sha256Hex } from "../_shared/http.ts";
import {
  agreementDates, CODE_RE, cleanCode, createProviderCode, deleteDodoCode, deleteProviderCode, DISCOUNT_PCT, grantAffiliateTools,
  revokeAffiliateTools, suggestCode, TERMS_VERSION,
} from "../_shared/affiliates.ts";

const INVITE_DAYS = 60;
const text = (v: unknown, max = 120) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const SITE = () => (Deno.env.get("SITE_URL") || "https://shop.mw.photography").replace(/\/$/, "");
const newToken = () => [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return fail(req, "Method not allowed", 405);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = String(body.action ?? "");
  const db = admin();

  if (action === "check") return check(req, db, body);
  if (action === "invite_info" || action === "accept") return accept(req, db, body);

  // ---- admin only
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const asCaller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: isAdmin } = jwt ? await asCaller.rpc("is_admin") : { data: false };
  if (isAdmin !== true) return fail(req, "Only the admin can do this.", 403);
  const { data: who } = await asCaller.auth.getUser();
  if (action === "invite") return invite(req, db, body, who?.user?.email ?? "");
  if (action === "relink") return relink(req, db, body);
  if (action === "make_code") return makeCode(req, db, body);
  if (action === "end") return end(req, db, body);
  return fail(req, "Unknown action.", 400);
});

// deno-lint-ignore no-explicit-any
type Db = any;

async function check(req: Request, db: Db, body: Record<string, unknown>) {
  const code = cleanCode(body.code);
  if (!CODE_RE.test(code)) return json(req, { valid: false });
  const { data: a } = await db.from("affiliates").select("rate, status, starts_on, ends_on").eq("code", code).eq("status", "active").maybeSingle();
  if (!a) return json(req, { valid: false });
  return json(req, { valid: true, pct: DISCOUNT_PCT, starts_on: a.starts_on, ends_on: a.ends_on });
}

// ---------------------------------------------------------------- invitation page
async function accept(req: Request, db: Db, body: Record<string, unknown>) {
  const token = String(body.token ?? "");
  const BAD = "This invitation link isn't valid any more. Please reply to Matan's email for a new one.";
  if (!/^[a-f0-9]{64}$/.test(token)) return fail(req, BAD, 404);
  const { data: a } = await db.from("affiliates")
    .select("id, name, email, lang, instagram, code, status, invited_at, starts_on, ends_on, customer_id, provider_codes")
    .eq("invite_token_hash", await sha256Hex(token)).maybeSingle();
  if (!a || a.status === "ended") return fail(req, BAD, 404);
  if (a.status === "invited" && Date.now() - Date.parse(a.invited_at) > INVITE_DAYS * 86400 * 1000) return fail(req, BAD, 410);
  const dates = a.status === "active" ? { starts_on: a.starts_on, ends_on: a.ends_on } : agreementDates();
  if (body.action === "invite_info") {
    return json(req, { name: a.name, email: a.email, code: a.code, lang: a.lang, accepted: a.status === "active", ...dates });
  }
  if (a.status === "active") return json(req, { ok: true, email: a.email, code: a.code });
  if (body.agree !== true) return fail(req, "Please accept the program's terms.", 400);

  // Claim it first, so a double click can't do it twice
  const lang = body.lang === "he" ? "he" : a.lang;
  const salt = Deno.env.get("IP_HASH_SALT") ?? "";
  const ip = clientIp(req);
  const { data: claimed } = await db.from("affiliates").update({
    status: "active", accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION, lang,
    ip_hash: ip ? await sha256Hex(salt + ip) : null, ...dates,
  }).eq("id", a.id).eq("status", "invited").select("id");
  if (!claimed?.length) return json(req, { ok: true, email: a.email, code: a.code });

  try {
    const { data: customer, error: cErr } = await db.from("customers")
      .upsert({ email: a.email }, { onConflict: "email" }).select("id, name").single();
    if (cErr) throw cErr;
    if (!customer.name) await db.from("customers").update({ name: a.name }).eq("id", customer.id);
    await db.from("affiliates").update({ customer_id: customer.id }).eq("id", a.id);
    await grantAffiliateTools(db, customer.id);
  } catch (err) {
    console.error("affiliate accept", a.id, err);
    await db.from("affiliates").update({ status: "invited", accepted_at: null }).eq("id", a.id);
    return fail(req, "Couldn't finish. Please try again in a minute.", 500);
  }
  await requestPersonalCopies();   // their stamped copies of the tools

  // Their code in Lemon Squeezy. If it fails, they're in anyway: the admin shows "Code missing" with a button.
  try {
    const made = await createProviderCode(db, { name: a.name, code: a.code, ...dates });
    await db.from("affiliates").update({ provider_codes: { ...(a.provider_codes ?? {}), [made.provider]: made } }).eq("id", a.id);
  } catch (err) {
    console.error("affiliate code", a.code, err);
  }
  return json(req, { ok: true, email: a.email, code: a.code });
}

// ---------------------------------------------------------------- admin
async function invite(req: Request, db: Db, body: Record<string, unknown>, by: string) {
  const name = text(body.name, 80);
  const email = String(body.email ?? "").trim().toLowerCase();
  const lang = body.lang === "he" ? "he" : "en";
  const instagram = String(body.instagram ?? "").trim().replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 60) || null;
  const code = cleanCode(body.code) || suggestCode(name);
  if (!name) return fail(req, "Please enter their name.");
  if (!EMAIL_RE.test(email)) return fail(req, "Please enter a valid email.");
  if (!CODE_RE.test(code)) return fail(req, "Please enter a code: letters and numbers only (for example MWPKELVIN10).");
  const { data: open } = await db.from("affiliates").select("id, status").eq("email", email).neq("status", "ended").maybeSingle();
  if (open) return fail(req, open.status === "active" ? "This person is already an affiliate." : "This person already has an invitation. Use “New link” on their row.", 409);
  const { data: taken } = await db.from("affiliates").select("id").eq("code", code).maybeSingle();
  if (taken) return fail(req, `The code ${code} is taken. Please choose another (for example with their last name's first letter).`, 409);
  const token = newToken();
  const { data: row, error } = await db.from("affiliates").insert({
    name, email, lang, instagram, code, invite_token_hash: await sha256Hex(token), note: by ? `Invited by ${by}` : null,
  }).select("id").single();
  if (error) { console.error(error); return fail(req, "Couldn't make the invitation. Please try again.", 500); }
  return json(req, { id: row.id, code, link: `${SITE()}/affiliates/?invite=${token}` });
}

async function relink(req: Request, db: Db, body: Record<string, unknown>) {
  const id = String(body.id ?? "");
  const token = newToken();
  const { data } = await db.from("affiliates").update({ invite_token_hash: await sha256Hex(token), invited_at: new Date().toISOString() })
    .eq("id", id).eq("status", "invited").select("id");
  if (!data?.length) return fail(req, "Only someone who hasn't joined yet gets a new link.", 409);
  return json(req, { link: `${SITE()}/affiliates/?invite=${token}` });
}

async function makeCode(req: Request, db: Db, body: Record<string, unknown>) {
  const { data: a } = await db.from("affiliates").select("id, name, code, status, starts_on, ends_on, provider_codes").eq("id", String(body.id ?? "")).maybeSingle();
  if (!a || a.status !== "active") return fail(req, "Only an active affiliate has a code.", 409);
  try {
    const made = await createProviderCode(db, { name: a.name, code: a.code, starts_on: a.starts_on, ends_on: a.ends_on });
    await db.from("affiliates").update({ provider_codes: { ...(a.provider_codes ?? {}), [made.provider]: made } }).eq("id", a.id);
    return json(req, { ok: true });
  } catch (err) {
    return fail(req, (err as Error).message, 502);
  }
}

async function end(req: Request, db: Db, body: Record<string, unknown>) {
  const reason = text(body.reason, 300) || "Agreement ended";
  const { data: a } = await db.from("affiliates").select("id, status, customer_id, provider_codes").eq("id", String(body.id ?? "")).maybeSingle();
  if (!a || a.status === "ended") return fail(req, "Already ended.", 409);
  const { error } = await db.from("affiliates").update({
    status: "ended", ended_at: new Date().toISOString(), end_reason: reason, invite_token_hash: null,
  }).eq("id", a.id);
  if (error) { console.error(error); return fail(req, "Couldn't end it. Please try again.", 500); }
  const notes: string[] = [];
  if (a.customer_id) {
    try { if (!(await revokeAffiliateTools(db, a.customer_id))) notes.push("They keep the tools through another program."); }
    catch (err) { console.error(err); notes.push("The free tools couldn't be taken back: try again."); }
  }
  const lsId = a.provider_codes?.lemonsqueezy?.id;
  if (lsId) {
    try { await deleteProviderCode(String(lsId)); }
    catch (err) { console.error(err); notes.push("Their code couldn't be deleted in Lemon Squeezy: delete it there by hand."); }
  }
  const dodoId = a.provider_codes?.dodo?.id;
  if (dodoId) {
    try { await deleteDodoCode(String(dodoId)); }
    catch (err) { console.error(err); notes.push("Their code couldn't be deleted at Dodo Payments: delete it there by hand."); }
  }
  return json(req, { ok: true, notes });
}
