// ============================================================================
// get-download — returns a 5-minute signed link to a pack the caller owns.
// Called from My downloads with the customer's Supabase session token.
// Checks: signed in → owns the product → access not revoked → under the daily
// limit. Every download is logged with a salted IP hash (no raw IPs stored).
// ============================================================================
import { admin, clientIp, cors, fail, json, requestPersonalCopies, sha256Hex } from "../_shared/http.ts";

const DAILY_LIMIT = Number(Deno.env.get("DOWNLOAD_DAILY_LIMIT") ?? "5");
const LINK_SECONDS = 300;
// Categories downloaded as a personal, marked copy (see tools/personalize). Panel is protected by its licence instead.
const PERSONAL = ["preset", "guide"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return fail(req, "Method not allowed", 405);

  const db = admin();
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await db.auth.getUser(jwt);
  const user = auth?.user;
  if (!user?.email) return fail(req, "Please sign in again.", 401);

  // file: one of the product's extra downloads (product_extra_files, e.g. MWP Panel's "lightroom-classic"); none = the main zip
  let slug = "", lang = "", fileKey = "";
  try { const body = await req.json(); slug = String(body.slug ?? ""); lang = String(body.lang ?? ""); fileKey = String(body.file ?? ""); } catch { /* handled below */ }
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return fail(req, "Unknown product.", 400);
  if (fileKey && !/^[a-z0-9-]{1,40}$/.test(fileKey)) return fail(req, "Unknown file.", 400);

  const email = user.email.toLowerCase();
  const { data: customer } = await db.from("customers")
    .select("id, auth_user_id").eq("email", email).maybeSingle();
  if (!customer) return fail(req, "We couldn't find a purchase on this email.", 403);
  if (!customer.auth_user_id) {
    // First sign-in: link the login to the customer record so RLS shows their library.
    await db.from("customers").update({ auth_user_id: user.id }).eq("id", customer.id);
  }

  const { data: product } = await db.from("products").select("id, name, category").eq("slug", slug).maybeSingle();
  if (!product) return fail(req, "Unknown product.", 404);

  const { data: ent } = await db.from("entitlements")
    .select("id, revoked_at, view_only, guide_lang").eq("customer_id", customer.id).eq("product_id", product.id).maybeSingle();
  if (!ent) return fail(req, "This pack isn't in your library.", 403);
  if (ent.revoked_at) return fail(req, "Access to this pack was removed after a refund.", 403);
  // Ambassadors read the Field Guides online (guide-view); their copy can't be downloaded.
  if (ent.view_only) return fail(req, "In the Ambassador Program the Field Guides are read online. Open them with Read online in My downloads.", 403);

  // Field Guides come in one language, chosen once in My downloads ('both' = bought before the choice existed).
  let guideLang: string | null = ent.guide_lang ?? null;
  if (product.category === "guide" && !guideLang) {
    if (lang !== "en" && lang !== "he") {
      return json(req, { choose_lang: true, message: "Choose the language of your Field Guides: English or Hebrew." });
    }
    await db.from("entitlements").update({ guide_lang: lang }).eq("id", ent.id).is("guide_lang", null);
    const { data: again } = await db.from("entitlements").select("guide_lang").eq("id", ent.id).maybeSingle();
    guideLang = again?.guide_lang ?? lang;
  }

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await db.from("downloads").select("id", { count: "exact", head: true })
    .eq("entitlement_id", ent.id).gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return fail(req, "You've reached today's download limit for this pack. Please try tomorrow or contact support.", 429);
  }

  const { data: file } = fileKey
    ? await db.from("product_extra_files").select("path, version").eq("product_id", product.id).eq("file_key", fileKey).maybeSingle()
    : await db.from("product_files").select("path, version").eq("product_id", product.id).maybeSingle();
  if (!file) return fail(req, "This pack's file is being updated. Please try again shortly.", 503);

  // Presets and guides are downloaded as the buyer's own marked copy. If it isn't ready yet
  // (new purchase, or a new version was just uploaded), ask for it and tell the page to wait.
  if (PERSONAL.includes(product.category) && !fileKey) {
    const { data: mine } = await db.from("personal_files").select("path, version").eq("entitlement_id", ent.id).maybeSingle();
    // a one-language copy carries its language in the version, so it's made again if the choice changes
    const want = guideLang === "en" || guideLang === "he" ? `${file.version}:${guideLang}` : file.version;
    if (!mine || mine.version !== want) {
      await requestPersonalCopies();
      return json(req, { preparing: true, message: "We're making your personal copy. It's usually ready in a few minutes; this page will start the download when it is." }, 202);
    }
    file.path = mine.path;
  }

  const fileName = file.path.split("/").pop();
  const { data: signed, error } = await db.storage.from("presets")
    .createSignedUrl(file.path, LINK_SECONDS, { download: fileName });
  if (error || !signed) {
    console.error("sign failed", error);
    return fail(req, "Couldn't prepare the download. Please try again.", 500);
  }

  const salt = Deno.env.get("IP_HASH_SALT") ?? "";
  await db.from("downloads").insert({
    entitlement_id: ent.id,
    ip_hash: clientIp(req) ? await sha256Hex(salt + clientIp(req)) : null,
    user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
  });

  return json(req, { url: signed.signedUrl, expires_in: LINK_SECONDS });
});
