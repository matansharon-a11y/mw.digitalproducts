// ============================================================================
// Data layer: one Supabase client, catalogue queries, Edge Function calls and
// formatting helpers. Pages import from here and never talk to Supabase directly.
// ============================================================================
import { createClient } from "../vendor/supabase-js-2.118.0.js";
import { CONFIG, FUNCTIONS_URL, IS_CONFIGURED } from "../config.js";

export const supabase = IS_CONFIGURED
  ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
    })
  : null;

export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}

function requireClient() {
  if (!supabase) {
    throw new ApiError("The shop is not connected yet. Add the Supabase URL and anon key in assets/js/config.js.");
  }
  return supabase;
}

// ---------------------------------------------------------------- formatting
export function money(cents, currency = "USD") {
  return new Intl.NumberFormat(CONFIG.LOCALE, {
    style: "currency", currency, minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function shortDate(iso) {
  return new Intl.DateTimeFormat(CONFIG.LOCALE, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function bytes(n) {
  if (!n) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

/** Public URL of an image in the product-media bucket; resized by Supabase when IMAGE_TRANSFORMS is on (Pro plan). */
export function mediaUrl(path, { width } = {}) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  const base = `${CONFIG.SUPABASE_URL}/storage/v1`;
  if (width && CONFIG.IMAGE_TRANSFORMS) {
    return `${base}/render/image/public/product-media/${encodeURI(path)}?width=${width}&quality=78`;
  }
  return `${base}/object/public/product-media/${encodeURI(path)}`;
}

/** Escape text before putting it into innerHTML. */
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------------------------------------------------------------- catalogue
const PRODUCT_FIELDS =
  "id, slug, name, name_emphasis, tagline, description, badge, price_cents, compare_at_cents, currency, " +
  "category, item_count, includes, compatibility, checkout_url, version, cover_path, hover_path, is_featured, sort_order, created_at";

export async function listProducts({ featuredOnly = false } = {}) {
  let q = requireClient().from("products").select(PRODUCT_FIELDS).eq("is_active", true).order("sort_order");
  if (featuredOnly) q = q.eq("is_featured", true);
  const { data, error } = await q;
  if (error) throw new ApiError(error.message);
  return data;
}

export async function getProduct(slug) {
  const { data, error } = await requireClient()
    .from("products")
    .select(`${PRODUCT_FIELDS}, product_media(id, kind, pair_key, path, alt, caption, width, height, sort_order)`)
    .eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error) throw new ApiError(error.message);
  if (data) data.product_media.sort((a, b) => a.sort_order - b.sort_order);
  return data;
}

/** Groups media into before/after pairs and gallery images. */
export function splitMedia(media = []) {
  const pairs = new Map();
  const gallery = [];
  for (const m of media) {
    if (m.kind === "gallery") { gallery.push(m); continue; }
    const key = m.pair_key || m.id;
    const pair = pairs.get(key) || {};
    pair[m.kind] = m;
    pairs.set(key, pair);
  }
  return { pairs: [...pairs.values()].filter((p) => p.before && p.after), gallery };
}

// ---------------------------------------------------------------- auth
export async function currentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function sendMagicLink(email, redirectPath = "/account/") {
  const { error } = await requireClient().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${CONFIG.SITE_URL}${redirectPath}`, shouldCreateUser: true },
  });
  if (error) throw new ApiError(error.message, error.status);
}

// Accounts: email + password. New accounts confirm their email first (Supabase sends the link),
// so nobody can open an account on someone else's email. Passwords go straight to Supabase Auth.
const back = (path) => `${CONFIG.SITE_URL}${path}`;

export async function signInWithPassword(email, password) {
  const { data, error } = await requireClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw new ApiError(error.message, error.status);
  return data;
}

/** Creates the account. Returns "signed-in", "confirm" (check your inbox) or "exists" (email already has an account). */
export async function signUpWithPassword(email, password, { name = "", redirectPath = "/account/" } = {}) {
  const { data, error } = await requireClient().auth.signUp({
    email: email.trim().toLowerCase(), password,
    options: { emailRedirectTo: back(redirectPath), data: name ? { name } : {} },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) return "exists";
    throw new ApiError(error.message, error.status);
  }
  if (data.session) return "signed-in";
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return "exists";
  return "confirm";
}

export async function sendPasswordReset(email, redirectPath = "/account/?reset=1") {
  const { error } = await requireClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: back(redirectPath) });
  if (error) throw new ApiError(error.message, error.status);
}

export async function updatePassword(password) {
  const { error } = await requireClient().auth.updateUser({ password });
  if (error) throw new ApiError(error.message, error.status);
}

// ---------------------------------------------------------------- My details
/** The signed-in customer's name, phone and address (also links the login to its customer record). */
export async function myProfile() {
  const { data, error } = await requireClient().rpc("my_profile");
  if (error) throw new ApiError(error.message);
  return data?.[0] ?? null;
}

export async function saveMyProfile(p) {
  const { error } = await requireClient().rpc("save_my_profile", {
    p_name: p.name, p_phone: p.phone, p_address_line1: p.address_line1, p_address_line2: p.address_line2,
    p_city: p.city, p_region: p.region, p_postal_code: p.postal_code, p_country: p.country,
  });
  if (error) throw new ApiError(error.message);
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

// ---------------------------------------------------------------- customer library
export async function myLibrary() {
  const { data, error } = await requireClient()
    .from("entitlements")
    .select("id, granted_at, revoked_at, view_only, guide_lang, products(slug, name, name_emphasis, category, cover_path, version, item_count)")
    .is("revoked_at", null)
    .order("granted_at", { ascending: false });
  if (error) throw new ApiError(error.message);
  return data;
}

// The extra downloads (no storage path) and the video tutorials of the products the person owns.
export async function myExtras() {
  const db = requireClient();
  const [files, videos] = await Promise.all([
    db.rpc("my_extra_files"),
    db.from("product_tutorials").select("app, title, title_he, url, sort_order, products(slug)").order("sort_order"),
  ]);
  // before the database has these (or on any error) My downloads simply shows the main downloads
  return { files: files.error ? [] : files.data || [], videos: videos.error ? [] : videos.data || [] };
}

// The signed-in person's orders (newest first): number, date, total, status and what each bought. Only their own:
// my_orders() reads the login, never an id or email from here.
export async function myOrders() {
  const { data, error } = await requireClient().rpc("my_orders");
  if (error) throw new ApiError(error.message);
  return data || [];
}

// ---------------------------------------------------------------- Edge Functions
async function callFunction(name, body, { auth = false } = {}) {
  const headers = { "content-type": "application/json", apikey: CONFIG.SUPABASE_ANON_KEY };
  if (auth) {
    const { data } = await requireClient().auth.getSession();
    if (!data.session) throw new ApiError("Please sign in first.", 401);
    headers.authorization = `Bearer ${data.session.access_token}`;
  } else {
    headers.authorization = `Bearer ${CONFIG.SUPABASE_ANON_KEY}`;
  }
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, { method: "POST", headers, body: JSON.stringify(body) });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(payload.error || `Request failed (${res.status})`, res.status);
  return payload;
}

// lang: the Field Guides buyer's language choice ("en" or "he"), sent once with their first download
// file: one of the product's extra downloads (e.g. "lightroom-classic"); none = the main zip
export const requestDownload = (slug, lang, file) => callFunction("get-download", { slug, ...(lang ? { lang } : {}), ...(file ? { file } : {}) }, { auth: true });
export const panelDevices = () => callFunction("license", { action: "devices" }, { auth: true });
export const removePanelDevice = (device_id) => callFunction("license", { action: "remove", device_id }, { auth: true });
export const sendSupport = (form) => callFunction("support", form);
// ambassadors and testers, signed in: feedback to the team (monday Shop Feedback)
export const sendFeedback = (form) => callFunction("beta", { action: "feedback", ...form }, { auth: true });
export const betaApply = (form) => callFunction("beta", { action: "apply", ...form });
// after approval: the personal link from the welcome email (?accept=<token>)
export const betaAcceptInfo = (token) => callFunction("beta", { action: "accept_info", token });
export const betaAccept = (token, lang) => callFunction("beta", { action: "accept", token, agree: true, lang });
export const betaStatus = () => callFunction("beta", { action: "status" });
// The ambassador's signed-terms PDF: { url } when ready, { preparing } while it's being made (202).
export const signedTerms = (receipt) => callFunction("beta", { action: "signed_terms", ...(receipt ? { receipt } : {}) }, { auth: !receipt });
export const guideView = () => callFunction("guide-view", {}, { auth: true });
export const testerLink = (email, lang) => callFunction("tester", { action: "link", email, lang });
export const testerJoin = (form) => callFunction("tester", { action: "join", ...form });
export const testerMe = () => callFunction("tester", { action: "me" }, { auth: true });
export const subscribe = (email, source = "free-sampler") => callFunction("subscribe", { email, source });
