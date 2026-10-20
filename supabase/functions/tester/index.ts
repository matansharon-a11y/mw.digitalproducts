// ============================================================================
// tester — the testers page (shop.mw.photography/testers/), shared by link only.
//   join { name, email, code, lang } → right tester code: they become a tester (or already are) and get an
//                    emailed sign-in link back to the page ({ emailed: true }).
//   link { email, lang } → if this email is an approved tester, emails them a one-time sign-in link back
//                    to the page. The answer is the same either way (it doesn't reveal who's a tester).
//   me (signed in) → { tester, name, products } so the page can show their downloads.
// Testers are approved in the shop admin (at most 10). Their downloads go through get-download like
// everyone's: stamped personal copies, 5-minute links, a daily limit; MWP Panel needs its licence sign-in.
// ============================================================================
import { admin, clientIp, cors, EMAIL_RE, fail, json, safeEqual, sha256Hex } from "../_shared/http.ts";

const SITE = Deno.env.get("SITE_URL") ?? "https://shop.mw.photography";
const MAX_LINKS_PER_HOUR = 5;   // per IP
const SLUGS = ["mwp-presets", "mwp-panel", "mwp-field-guides"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return fail(req, "Method not allowed", 405);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const db = admin();

  if (body.action === "link") {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return fail(req, "Please enter a valid email.", 400);
    const salt = Deno.env.get("IP_HASH_SALT") ?? "";
    const ipHash = clientIp(req) ? await sha256Hex(salt + clientIp(req)) : null;
    if (ipHash) {
      const hourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
      const { count } = await db.from("beta_attempts").select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash).gte("created_at", hourAgo);
      if ((count ?? 0) >= MAX_LINKS_PER_HOUR) return fail(req, "Too many requests. Please wait a minute and try again.", 429);
      await db.from("beta_attempts").insert({ ip_hash: ipHash });
    }
    const { data: c } = await db.from("customers").select("id, testers(removed_at)").eq("email", email).maybeSingle();
    const t = Array.isArray(c?.testers) ? c?.testers[0] : c?.testers;
    if (t && !t.removed_at) {
      const lang = body.lang === "he" ? "he" : "en";
      const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: `${SITE}/testers/${lang === "he" ? "?lang=he" : ""}`, shouldCreateUser: true } });
      if (error) { console.error("tester link", error); return fail(req, "Couldn't send the link. Please try again in a minute.", 500); }
    }
    return json(req, { ok: true });
  }

  // join { name, email, code, lang } → with the tester code Matan set in the admin, the email becomes a tester
  // straight away (same as add_tester; 10 at most) and gets an emailed sign-in link. Tries are limited per IP.
  if (body.action === "join") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").replace(/[\u0000-\u001f"\\<>]/g, "").trim().slice(0, 80);
    const code = String(body.code ?? "").trim().toUpperCase();
    if (!name) return fail(req, "Please enter your name.", 400);
    if (!EMAIL_RE.test(email)) return fail(req, "Please enter a valid email.", 400);
    if (!code) return fail(req, "Please enter your tester code.", 400);
    const salt = Deno.env.get("IP_HASH_SALT") ?? "";
    const ipHash = clientIp(req) ? await sha256Hex(salt + clientIp(req)) : null;
    if (ipHash) {
      const hourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
      const { count } = await db.from("beta_attempts").select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash).gte("created_at", hourAgo);
      if ((count ?? 0) >= MAX_LINKS_PER_HOUR) return fail(req, "Too many tries. Please wait an hour and try again.", 429);
      await db.from("beta_attempts").insert({ ip_hash: ipHash });
    }
    const { data: row } = await db.from("tester_code").select("code_hash").maybeSingle();
    if (!row || !safeEqual(await sha256Hex(code), row.code_hash)) return fail(req, "That tester code isn't right.", 403);
    const { error: tErr } = await db.rpc("add_tester_by_code", { p_email: email, p_name: name });
    if (tErr) {
      if (/tester_program_full/.test(tErr.message)) return fail(req, "The testers group is full right now. Please contact us.", 409);
      console.error("tester join", tErr); return fail(req, "Couldn't add you. Please try again.", 500);
    }
    // Everyone gets an emailed sign-in link (security fix, needs Matan's OK: it replaces the "no email step"
    // decision of 13 Oct). Signing in on the page with only the shared code let anyone who knew the code
    // open another person's account by typing their email.
    const lang = body.lang === "he" ? "he" : "en";
    const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: `${SITE}/testers/${lang === "he" ? "?lang=he" : ""}`, shouldCreateUser: true } });
    if (error) { console.error("tester link", error); return fail(req, "You're in, but the sign-in link didn't send. Please try again in a minute.", 500); }
    return json(req, { ok: true, emailed: true });
  }

  if (body.action === "me") {
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth } = await db.auth.getUser(jwt);
    const email = auth?.user?.email?.toLowerCase();
    if (!email) return fail(req, "Please sign in again.", 401);
    const { data: c } = await db.from("customers").select("id, name, auth_user_id, testers(removed_at)").eq("email", email).maybeSingle();
    const t = Array.isArray(c?.testers) ? c?.testers[0] : c?.testers;
    if (!c || !t || t.removed_at) return json(req, { tester: false });
    if (!c.auth_user_id) await db.from("customers").update({ auth_user_id: auth!.user!.id }).eq("id", c.id);
    const { data: ents } = await db.from("entitlements")
      .select("revoked_at, products!inner(slug, name, name_emphasis, category, version)")
      .eq("customer_id", c.id).in("products.slug", SLUGS).is("revoked_at", null);
    // deno-lint-ignore no-explicit-any
    const products = (ents ?? []).map((e: any) => e.products).sort((a: any, b: any) => SLUGS.indexOf(a.slug) - SLUGS.indexOf(b.slug));
    return json(req, { tester: true, name: c.name, email, products });
  }

  return fail(req, "Unknown action.", 400);
});
