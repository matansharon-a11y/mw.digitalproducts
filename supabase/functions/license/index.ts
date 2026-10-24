// ============================================================================
// license — MWP Panel licence checks.
// The plugin signs the buyer in with Supabase's email one-time code (the same
// login as My downloads), then calls this function with that session token.
// Actions:
//   activate  { device_id, device_name }  → registers this computer (up to
//             PANEL_MAX_DEVICES, or AMBASSADOR_MAX_DEVICES for Ambassador Program
//             members) and returns who it's licensed to.
//   devices   {}                          → the buyer's registered computers.
//   remove    { device_id }               → frees a computer (My downloads).
// Access counts if the buyer owns MWP Panel or a bundle that includes it, and
// it hasn't been revoked (refund).
// ============================================================================
import { admin, clientIp, cors, fail, json, sha256Hex } from "../_shared/http.ts";

const BUYER_MAX_DEVICES = Number(Deno.env.get("PANEL_MAX_DEVICES") ?? "3");
const AMBASSADOR_MAX_DEVICES = Number(Deno.env.get("AMBASSADOR_MAX_DEVICES") ?? "2"); // the Ambassador terms: up to 2 devices
const RECHECK_DAYS = 7;        // the plugin checks in again after this many days
const OFFLINE_GRACE_DAYS = 14; // and keeps working offline this long after the last check
const PANEL_SLUGS = ["mwp-panel", "presets-panel", "field-guides-panel", "full-set"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return fail(req, "Method not allowed", 405);

  const db = admin();
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await db.auth.getUser(jwt);
  const user = auth?.user;
  if (!user?.email) return fail(req, "Please sign in again.", 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const action = String(body.action ?? "");

  const email = user.email.toLowerCase();
  const { data: customer } = await db.from("customers").select("id, name").eq("email", email).maybeSingle();
  if (!customer) return fail(req, "We couldn't find a purchase on this email.", 403);

  // The Panel entitlement: MWP Panel itself, or a bundle that includes it.
  const { data: ents } = await db.from("entitlements")
    .select("id, order_id, revoked_at, granted_at, products!inner(slug)")
    .eq("customer_id", customer.id).in("products.slug", PANEL_SLUGS)
    .order("granted_at", { ascending: true });
  const active = (ents ?? []).filter((e) => !e.revoked_at);
  if (!active.length) {
    const refunded = (ents ?? []).length > 0;
    return fail(req, refunded ? "This licence was cancelled after a refund." : "MWP Panel isn't in your library on this email.", 403);
  }
  const ent = active[0];

  // Ambassadors (the free program) get 2 computers; buyers get 3. Testers too (the same free access, for trying it).
  // Whoever paid for MWP Panel (alone or in a bundle) gets the buyer's 3, ambassador or not.
  const paid = active.some((e) => e.order_id);
  const { data: ambassador } = await db.from("beta_members").select("id").eq("customer_id", customer.id).eq("status", "active").maybeSingle();
  const { data: tester } = await db.from("testers").select("id").eq("customer_id", customer.id).is("removed_at", null).maybeSingle();
  const MAX_DEVICES = !paid && (ambassador || tester) ? AMBASSADOR_MAX_DEVICES : BUYER_MAX_DEVICES;

  const devices = async () => (await db.from("license_devices")
    .select("device_id, device_name, created_at, last_seen_at")
    .eq("entitlement_id", ent.id).order("last_seen_at", { ascending: false })).data ?? [];

  if (action === "devices") {
    return json(req, { devices: await devices(), max: MAX_DEVICES });
  }

  const deviceId = String(body.device_id ?? "");
  if (!/^[A-Za-z0-9-]{8,80}$/.test(deviceId)) return fail(req, "Unknown computer.", 400);

  if (action === "remove") {
    await db.from("license_devices").delete().eq("entitlement_id", ent.id).eq("device_id", deviceId);
    return json(req, { devices: await devices(), max: MAX_DEVICES });
  }

  if (action !== "activate") return fail(req, "Unknown action.", 400);

  const deviceName = String(body.device_name ?? "").slice(0, 80) || null;
  const salt = Deno.env.get("IP_HASH_SALT") ?? "";
  const ipHash = clientIp(req) ? await sha256Hex(salt + clientIp(req)) : null;
  const now = new Date().toISOString();

  // The same computer can run MWP Panel in Photoshop and in Photoshop (Beta). Each app keeps its own
  // plugin storage, so older copies of the plugin send a different id from each app: a computer already
  // listed under the same name counts once, but only from the same network (same IP hash). Without that,
  // any number of computers given the same name counted as one (launch audit, 24 Oct 2026).
  let { data: existing } = await db.from("license_devices").select("id")
    .eq("entitlement_id", ent.id).eq("device_id", deviceId).maybeSingle();
  if (!existing && deviceName && ipHash) {
    ({ data: existing } = await db.from("license_devices").select("id")
      .eq("entitlement_id", ent.id).eq("device_name", deviceName).eq("ip_hash", ipHash)
      .order("last_seen_at", { ascending: false }).limit(1).maybeSingle());
  }
  if (existing) {
    await db.from("license_devices").update({ last_seen_at: now, ip_hash: ipHash, device_name: deviceName })
      .eq("id", existing.id);
  } else {
    const list = await devices();
    if (list.length >= MAX_DEVICES) {
      return json(req, {
        error: `MWP Panel is already active on ${MAX_DEVICES} computers. Remove one in My downloads on shop.mw.photography, then try again.`,
        devices: list, max: MAX_DEVICES,
      }, 409);
    }
    const { error } = await db.from("license_devices").insert({
      entitlement_id: ent.id, device_id: deviceId, device_name: deviceName, ip_hash: ipHash,
    });
    if (error) {
      console.error("device insert failed", error);
      return fail(req, "Couldn't activate this computer. Please try again.", 500);
    }
  }

  const day = 24 * 3600 * 1000;
  return json(req, {
    licensed: true,
    licensed_to: { name: customer.name, email },
    device_count: (await devices()).length,
    max: MAX_DEVICES,
    check_again_after: new Date(Date.now() + RECHECK_DAYS * day).toISOString(),
    valid_offline_until: new Date(Date.now() + OFFLINE_GRACE_DAYS * day).toISOString(),
  });
});
