// ============================================================================
// subscribe — free sampler / newsletter sign-up. Stores the address with its
// consent, then Make.com adds it to the MailerLite group that sends the sampler.
// Repeat sign-ups are harmless (upsert). The sampler is re-sent at most once a day per
// address, and one IP can sign up 10 times an hour, so a script can't use up the Make.com
// operations or send the sampler to strangers over and over.
// ============================================================================
import { admin, clientIp, cors, EMAIL_RE, fail, json, notifyMake, sha256Hex } from "../_shared/http.ts";

const PER_IP_PER_HOUR = 10;
const ALL_PER_HOUR = 200;   // sign-ups from everyone together

const SOURCES = new Set(["free-sampler", "newsletter", "launch-waitlist"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return fail(req, "Method not allowed", 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail(req, "Invalid request."); }

  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
  const source = SOURCES.has(String(body.source)) ? String(body.source) : "free-sampler";
  if (!EMAIL_RE.test(email)) return fail(req, "Please enter a valid email address.");

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
    .upsert({ email, source, consent: true }, { onConflict: "email", ignoreDuplicates: false });
  if (error) {
    console.error(error);
    return fail(req, "Couldn't sign you up just now. Please try again.", 500);
  }

  // Already signed up in the last day: keep the answer the same, but don't send the sampler again.
  if ((recent ?? 0) === 0) await notifyMake("MAKE_SUBSCRIBE_WEBHOOK", { type: "subscribe", email, source });
  return json(req, { ok: true });
});
