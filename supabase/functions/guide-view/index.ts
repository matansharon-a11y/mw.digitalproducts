// ============================================================================
// guide-view — the Field Guides, to read online (shop.mw.photography/read/).
// Ambassadors can only read the guides this way (their copy can't be downloaded);
// buyers can read online too. Called with the reader's Supabase session token.
// Returns each guide's pages as 10-minute private links, and the line the reader
// draws across every page: "Name · email · MWP-XXXXXXXX".
// The pages are rendered once per version by the "Personal copies" worker.
// ============================================================================
import { admin, cors, fail, json, requestPersonalCopies } from "../_shared/http.ts";

const SLUG = "mwp-field-guides";
const LINK_SECONDS = 600;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return fail(req, "Method not allowed", 405);

  const db = admin();
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await db.auth.getUser(jwt);
  const user = auth?.user;
  if (!user?.email) return fail(req, "Please sign in again.", 401);
  const email = user.email.toLowerCase();

  // Asked at the same time (faster than one after another).
  const [{ data: customer }, { data: product }] = await Promise.all([
    db.from("customers").select("id, name").eq("email", email).maybeSingle(),
    db.from("products").select("id").eq("slug", SLUG).maybeSingle(),
  ]);
  if (!customer || !product) return fail(req, "The Field Guides aren't in your library.", 403);

  const [{ data: ent }, { data: file }, { data: view }] = await Promise.all([
    db.from("entitlements").select("id, revoked_at").eq("customer_id", customer.id).eq("product_id", product.id).maybeSingle(),
    db.from("product_files").select("version").eq("product_id", product.id).maybeSingle(),
    db.from("guide_views").select("version, guides").eq("product_id", product.id).maybeSingle(),
  ]);
  if (!ent || ent.revoked_at) return fail(req, "The Field Guides aren't in your library.", 403);
  if (!file) return fail(req, "The guides are being updated. Please try again shortly.", 503);
  if (!view) {   // only ever the very first time, before any version has been prepared
    await requestPersonalCopies();
    return json(req, { preparing: true, message: "We're getting the guides ready to read online. It usually takes a few minutes." }, 202);
  }
  // A new version uploaded: keep showing the current pages while the new ones are made, so nobody waits.
  if (view.version !== file.version) await requestPersonalCopies();

  type Page = { path: string; w: number; h: number; hd?: string; hw?: number; hh?: number };
  const guides = (view.guides ?? []) as { title: string; lang?: string; pages: Page[] }[];
  const paths = guides.flatMap((g) => g.pages.flatMap((p) => (p.hd ? [p.path, p.hd] : [p.path])));
  const { data: signed, error } = await db.storage.from("guide-pages").createSignedUrls(paths, LINK_SECONDS);
  if (error || !signed) { console.error(error); return fail(req, "Couldn't open the guides. Please try again.", 500); }
  const url = new Map(signed.map((s) => [s.path, s.signedUrl]));

  const licence = "MWP-" + ent.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return json(req, {
    stamp: [customer.name, email, licence].filter(Boolean).join(" · "),
    expires_in: LINK_SECONDS,
    guides: guides.map((g) => ({ title: g.title, lang: g.lang ?? null, pages: g.pages.map((p) => ({
      url: url.get(p.path), w: p.w, h: p.h,
      ...(p.hd && url.get(p.hd) ? { hd: url.get(p.hd), hw: p.hw, hh: p.hh } : {}),   // the sharp copy for the full-screen reader
    })) })),
  });
});
