// ============================================================================
// guide-view — the Field Guides, to read online (shop.mw.photography/read/).
// Since 14 Nov 2026 buyers read the guides only this way (entitlements.online_only; Matan: bought PDFs were passed
// on); ambassadors and testers always did (view_only); earlier PDF buyers can read online too.
// Called with the reader's Supabase session token. Returns each guide's pages as 10-minute private links, and the
// line the reader draws across every page: "Name · email · MWP-XXXXXXXX".
// A single guide's buyer gets only that guide (each rendered guide carries its key). Reading works on up to 2 devices
// per person (license_devices, anchored on their guides entitlement): a third device is refused until one is removed
// in My downloads. Actions: read (default, { device_id, device_name }), devices, remove ({ device_id }).
// The pages are rendered once per version by the "Personal copies" worker.
// ============================================================================
import { admin, cors, fail, json, requestPersonalCopies } from "../_shared/http.ts";

const SET = "mwp-field-guides";
const LINK_SECONDS = 600;
const MAX_DEVICES = 2;   // 2 devices for every product and everyone (Matan, 4 Nov 2026)
const DEVICE_RE = /^[A-Za-z0-9-]{8,80}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return fail(req, "Method not allowed", 405);

  const db = admin();
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await db.auth.getUser(jwt);
  const user = auth?.user;
  if (!user?.email) return fail(req, "Please sign in again.", 401);
  const email = user.email.toLowerCase();
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* an empty body is a read */ }
  const action = String(body.action ?? "read");

  // Asked at the same time (faster than one after another).
  const [{ data: customer }, { data: products }] = await Promise.all([
    db.from("customers").select("id, name").eq("email", email).maybeSingle(),
    db.from("products").select("id, slug, guide_key").eq("category", "guide"),
  ]);
  const set = (products ?? []).find((p: { slug: string }) => p.slug === SET);
  const singles = new Map((products ?? []).filter((p: { guide_key: string | null }) => p.guide_key).map((p: { id: string; guide_key: string }) => [p.id, p.guide_key]));
  if (!customer || !set) return fail(req, "The Field Guides aren't in your library.", 403);
  const { data: ents } = await db.from("entitlements").select("id, product_id, granted_at")
    .eq("customer_id", customer.id).is("revoked_at", null).in("product_id", [set.id, ...singles.keys()]).order("granted_at");
  const setEnt = (ents ?? []).find((e: { product_id: string }) => e.product_id === set.id);
  const singleEnts = (ents ?? []).filter((e: { product_id: string }) => singles.has(e.product_id));
  const anchor = setEnt ?? singleEnts[0];
  if (!anchor) return fail(req, "The Field Guides aren't in your library.", 403);

  // ---------------------------------------------------------------- devices
  const devices = async () => (await db.from("license_devices").select("device_id, device_name, created_at, last_seen_at")
    .eq("entitlement_id", anchor.id).order("created_at")).data ?? [];
  if (action === "devices") return json(req, { devices: await devices(), max: MAX_DEVICES });
  const deviceId = String(body.device_id ?? "");
  if (action === "remove") {
    if (!DEVICE_RE.test(deviceId)) return fail(req, "Unknown device.", 400);
    await db.from("license_devices").delete().eq("entitlement_id", anchor.id).eq("device_id", deviceId);
    return json(req, { devices: await devices(), max: MAX_DEVICES });
  }
  if (!DEVICE_RE.test(deviceId)) return fail(req, "Please reload the page and try again.", 400);
  const deviceName = String(body.device_name ?? "").slice(0, 80) || null;
  const now = new Date().toISOString();
  const { data: known } = await db.from("license_devices").select("id").eq("entitlement_id", anchor.id).eq("device_id", deviceId).maybeSingle();
  if (known) {
    await db.from("license_devices").update({ last_seen_at: now, device_name: deviceName }).eq("id", known.id);
  } else {
    const list = await devices();
    if (list.length >= MAX_DEVICES) {
      return json(req, {
        error: `Your Field Guides are already open on ${MAX_DEVICES} devices. To read here, remove one of them in My downloads.`,
        code: "device_limit", devices: list, max: MAX_DEVICES,
      }, 409);
    }
    const { error } = await db.from("license_devices").insert({ entitlement_id: anchor.id, device_id: deviceId, device_name: deviceName });
    if (error) { console.error("device insert failed", error); return fail(req, "Couldn't open the guides. Please try again.", 500); }
  }

  // ---------------------------------------------------------------- the pages
  const [{ data: file }, { data: view }] = await Promise.all([
    db.from("product_files").select("version").eq("product_id", set.id).maybeSingle(),
    db.from("guide_views").select("version, guides").eq("product_id", set.id).maybeSingle(),
  ]);
  if (!file) return fail(req, "The guides are being updated. Please try again shortly.", 503);
  if (!view) {   // only ever the very first time, before any version has been prepared
    await requestPersonalCopies();
    return json(req, { preparing: true, message: "We're getting the guides ready to read online. It usually takes a few minutes." }, 202);
  }
  // A new version uploaded: keep showing the current pages while the new ones are made, so nobody waits.
  if (view.version !== file.version) await requestPersonalCopies();

  type Page = { path: string; w: number; h: number; hd?: string; hw?: number; hh?: number };
  let guides = (view.guides ?? []) as { title: string; lang?: string; key?: string | null; pages: Page[] }[];
  if (!setEnt) {   // single guides only: just the ones bought
    const keys = new Set(singleEnts.map((e: { product_id: string }) => singles.get(e.product_id)));
    if (guides.some((g) => !("key" in g))) {   // pages from before guides were tagged: being re-rendered
      await requestPersonalCopies();
      return json(req, { preparing: true, message: "We're getting your guide ready to read online. It usually takes a few minutes." }, 202);
    }
    guides = guides.filter((g) => g.key && keys.has(g.key));
    if (!guides.length) return fail(req, "Couldn't find your guide. Please contact support.", 500);
  }
  const paths = guides.flatMap((g) => g.pages.flatMap((p) => (p.hd ? [p.path, p.hd] : [p.path])));
  const { data: signed, error } = await db.storage.from("guide-pages").createSignedUrls(paths, LINK_SECONDS);
  if (error || !signed) { console.error(error); return fail(req, "Couldn't open the guides. Please try again.", 500); }
  const url = new Map(signed.map((s) => [s.path, s.signedUrl]));

  const licence = "MWP-" + anchor.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return json(req, {
    stamp: [customer.name, email, licence].filter(Boolean).join(" · "),
    expires_in: LINK_SECONDS,
    guides: guides.map((g) => ({ title: g.title, lang: g.lang ?? null, pages: g.pages.map((p) => ({
      url: url.get(p.path), w: p.w, h: p.h,
      ...(p.hd && url.get(p.hd) ? { hd: url.get(p.hd), hw: p.hw, hh: p.hh } : {}),   // the sharp copy for the full-screen reader
    })) })),
  });
});
