// ============================================================================
// MWP Presets — admin dashboard
// Sign-in with email and password; access is granted only if the user is in the
// `admins` table (checked by the database, not by this script). Every write
// below is also enforced by row level security, so a tampered browser can't
// do more than an admin could.
// ============================================================================
import { supabase, money, shortDate, bytes, esc, mediaUrl } from "../assets/js/lib/api.js";
import { CONFIG, IS_CONFIGURED } from "../assets/js/config.js";
import { toast } from "../assets/js/lib/ui.js";
import { CATEGORIES } from "../assets/js/lib/catalog.js";
import { EMAIL_RE, setBusy, setStatus } from "../assets/js/pages/shared-forms.js";

document.documentElement.classList.remove("no-js");
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------------------------------------------------------------- gate
const gate = $("#gate");
const app = $("#app");

async function boot() {
  if (!IS_CONFIGURED) {
    $("#gate-msg").textContent = "Add the Supabase URL and anon key in assets/js/config.js first.";
    $("#gate-form").hidden = true;
    return;
  }
  const { data } = await supabase.auth.getSession();
  if (data.session) await enter(data.session.user);
}

async function enter(user) {
  // Two-step sign-in: once the account has an authenticator, the password alone doesn't open the admin.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") return askCode(user);
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || !isAdmin) {
    $("#gate-msg").textContent = `${user.email} isn't an admin. Ask the owner to add you, then sign in again.`;
    await supabase.auth.signOut();
    return;
  }
  gate.hidden = true;
  app.hidden = false;
  $("#admin-email").textContent = user.email;
  show("overview");
  refreshTicketBadge();
}

$("#gate-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const email = form.elements.email.value.trim().toLowerCase();
  const password = form.elements.password.value;
  const status = $(".form-status", form);
  if (!EMAIL_RE.test(email)) return setStatus(status, "Enter a valid email.", "error");
  if (!password) return setStatus(status, "Enter your password.", "error");
  const btn = $("button[type=submit]", form);
  setBusy(btn, true);
  // Email and password only (Matan, 13 Oct 2026): no sign-in links for the admin.
  const { error } = await supabase.auth.signInWithPassword({ email, password });   // onAuthStateChange opens the admin
  setBusy(btn, false);
  if (error) return setStatus(status, /invalid/i.test(error.message) ? "Wrong email or password." : error.message, "error");
  form.elements.password.value = "";
});

supabase?.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" && session && app.hidden) enter(session.user);
});

// ---------------------------------------------------------------- two-step sign-in
const verifiedTotp = async () => {
  const { data, error } = await supabase.auth.mfa.listFactors();
  check(error);
  return { factor: data.totp.find((f) => f.status === "verified"), all: data.all };
};
const CODE_RE = /^\d{6}$/;
const codeError = (error) => /invalid|expired/i.test(error.message) ? "That code didn't work. Wait for a new one and try again." : error.message;

function askCode(user) {
  $("#gate-form").hidden = true;
  $("#code-form").hidden = false;
  $("#gate-msg").textContent = `Enter the 6-digit code from your authenticator app for ${user.email}.`;
  $("#gate-code").focus();
}

$("#code-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const code = form.elements.code.value.trim();
  const status = $(".form-status", form);
  if (!CODE_RE.test(code)) return setStatus(status, "Enter the 6 digits.", "error");
  const btn = $("button[type=submit]", form);
  setBusy(btn, true);
  try {
    const { factor } = await verifiedTotp();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) return setStatus(status, codeError(error), "error");
    form.elements.code.value = "";
    const { data } = await supabase.auth.getUser();
    await enter(data.user);
  } catch { setStatus(status, "Something went wrong. Please try again.", "error"); }
  finally { setBusy(btn, false); }
});
$("#code-cancel").addEventListener("click", async () => { await supabase.auth.signOut(); location.reload(); });

let pendingFactor = null;
async function loadSecurity() {
  const { factor } = await verifiedTotp();
  $("#mfa-on").hidden = !factor;
  $("#mfa-off").hidden = !!factor;
  $("#mfa-enroll").hidden = true;
}

$("#mfa-start").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  setBusy(btn, true);
  try {
    // an earlier setup left unfinished would block a new one
    const { all } = await verifiedTotp();
    for (const f of all.filter((f) => f.factor_type === "totp" && f.status !== "verified")) await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "MWP admin" });
    check(error);
    pendingFactor = data.id;
    $("#mfa-qr").src = data.totp.qr_code;
    $("#mfa-secret").textContent = data.totp.secret;
    $("#mfa-off").hidden = true;
    $("#mfa-enroll").hidden = false;
    $("#mfa-code").focus();
  } finally { setBusy(btn, false); }
});

$("#mfa-enroll").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const code = form.elements.code.value.trim();
  const status = $(".form-status", form);
  if (!CODE_RE.test(code)) return setStatus(status, "Enter the 6 digits.", "error");
  const btn = $("button[type=submit]", form);
  setBusy(btn, true);
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: pendingFactor, code });
  setBusy(btn, false);
  if (error) return setStatus(status, codeError(error), "error");
  form.elements.code.value = "";
  toast("Two-step sign-in is on.");
  loadSecurity();
});
$("#admin-signout").addEventListener("click", async () => { await supabase.auth.signOut(); location.reload(); });

// ---------------------------------------------------------------- navigation
const loaders = { overview: loadOverview, products: loadProducts, orders: loadOrders, customers: loadCustomers, ambassadors: loadAmbassadors, testers: loadTesters, support: loadTickets, security: loadSecurity };

function show(tab) {
  $$("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== tab; });
  const navTab = tab === "editor" ? "products" : tab;
  $$(".admin-nav [data-tab]").forEach((b) => {
    if (b.dataset.tab === navTab) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  loaders[tab]?.();
  window.scrollTo({ top: 0 });
}
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-tab]");
  if (t) show(t.dataset.tab);
});

function check(error) { if (error) { toast(error.message, { type: "error", timeout: 7000 }); throw error; } }

// ---------------------------------------------------------------- overview
let periodDays = 7;
$$("[data-days]").forEach((b) => b.addEventListener("click", () => {
  periodDays = Number(b.dataset.days);
  $$("[data-days]").forEach((x) => x.classList.toggle("btn--ghost", x !== b));
  loadOverview();
}));

async function loadOverview() {
  const { data: s, error } = await supabase.rpc("admin_stats", { p_days: periodDays });
  check(error);
  const revenue = s.revenue.length
    ? s.revenue.map((r) => money(r.cents, r.currency)).join(" · ")
    : money(0, "USD");
  const tiles = [
    ["Revenue", revenue, `last ${s.period_days} days, paid orders`],
    ["Paid orders", s.orders_paid, `${s.orders_refunded} refunded`],
    ["New customers", s.new_customers, ""],
    ["Sampler sign-ups", s.new_subscribers, ""],
    ["Downloads", s.downloads, ""],
    ["Open tickets", s.open_tickets, "all time"],
  ];
  $("#tiles").innerHTML = tiles.map(([label, value, sub]) => `
    <div class="tile"><span class="tile__label">${esc(label)}</span><span class="tile__value${String(value).length > 9 ? " tile__value--long" : ""}">${esc(value)}</span>${sub ? `<span class="tile__sub">${esc(sub)}</span>` : ""}</div>`).join("");
  drawChart(s.daily);
  $("#top-products").innerHTML = s.top_products.length
    ? `<table class="table"><thead><tr><th>Pack</th><th class="num">Sold</th><th class="num">Revenue</th></tr></thead><tbody>
        ${s.top_products.map((t) => `<tr><td>${esc(t.name)}</td><td class="num">${t.units}</td><td class="num">${money(t.cents, t.currency)}</td></tr>`).join("")}
      </tbody></table>`
    : `<p class="meta" style="margin-top:var(--s-3)">No sales in this period yet.</p>`;
}

/** Single-series bar chart: bars rounded at the top only, 2px gaps, hover tooltip, recessive grid. */
function drawChart(daily) {
  const el = $("#chart");
  const W = el.clientWidth || 800, H = el.clientHeight || 220;
  const pad = { l: 28, r: 4, t: 8, b: 22 };
  const max = Math.max(1, ...daily.map((d) => d.orders));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const bw = iw / daily.length;
  const gap = Math.min(2, bw * 0.2);
  const y = (v) => pad.t + ih - (v / top) * ih;
  const total = daily.reduce((n, d) => n + d.orders, 0);
  $("#chart-total").textContent = `${total} in total`;
  el.setAttribute("aria-label", `Paid orders per day over the last ${daily.length} days, ${total} in total`);

  const grid = [];
  for (let v = 0; v <= top; v += step) {
    grid.push(`<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/>
      <text class="axis-label" x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`);
  }
  const labelEvery = Math.ceil(daily.length / 7);
  const bars = daily.map((d, i) => {
    const x = pad.l + i * bw + gap / 2, w = Math.max(1, bw - gap), h = y(0) - y(d.orders);
    const r = Math.min(4, w / 2, h);
    const path = h > 0
      ? `M${x},${y(0)} V${y(d.orders) + r} Q${x},${y(d.orders)} ${x + r},${y(d.orders)} H${x + w - r} Q${x + w},${y(d.orders)} ${x + w},${y(d.orders) + r} V${y(0)} Z`
      : "";
    const label = i % labelEvery === 0
      ? `<text class="axis-label" x="${x + w / 2}" y="${H - 4}" text-anchor="middle">${new Date(d.day + "T00:00:00").toLocaleDateString(CONFIG.LOCALE, { month: "short", day: "numeric" })}</text>` : "";
    return `<g><rect class="hit" x="${pad.l + i * bw}" y="${pad.t}" width="${bw}" height="${ih}" data-i="${i}"/>${path ? `<path class="bar" d="${path}"/>` : ""}${label}</g>`;
  }).join("");
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid.join("")}${bars}</svg>`;

  const tip = $("#chart-tip");
  el.onmousemove = (e) => {
    const hit = e.target.closest(".hit");
    $$(".bar.is-hover", el).forEach((b) => b.classList.remove("is-hover"));
    if (!hit) { tip.hidden = true; return; }
    const d = daily[Number(hit.dataset.i)];
    hit.nextElementSibling?.classList.add("is-hover");
    tip.textContent = `${shortDate(d.day + "T00:00:00")} · ${d.orders} order${d.orders === 1 ? "" : "s"}`;
    tip.style.left = `${e.clientX}px`;
    tip.style.top = `${e.clientY}px`;
    tip.hidden = false;
  };
  el.onmouseleave = () => { tip.hidden = true; };
}
function niceStep(max) {
  const raw = max / 4, mag = 10 ** Math.floor(Math.log10(raw));
  return Math.max(1, [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw));
}
window.addEventListener("resize", debounceResize(() => { if (!app.hidden && !$("[data-panel=overview]").hidden) loadOverview(); }));
function debounceResize(fn) { let t; return () => { clearTimeout(t); t = setTimeout(fn, 300); }; }

// ---------------------------------------------------------------- products list
async function loadProducts() {
  const { data, error } = await supabase.from("products")
    .select("id, slug, name, name_emphasis, category, price_cents, currency, is_active, is_featured, cover_path, sort_order, product_files(path, version)")
    .order("sort_order");
  check(error);
  $("#product-list").innerHTML = data.length ? `<div class="panel" style="padding:0">${data.map((p) => `
    <div class="product-row">
      ${p.cover_path ? `<img src="${esc(mediaUrl(p.cover_path, { width: 160 }))}" alt="">` : `<span class="noimg"></span>`}
      <div>
        <p><strong>${esc(p.name)}</strong> ${esc(p.name_emphasis || "")}</p>
        <p class="meta">${esc(CATEGORIES[p.category]?.one || "Product")} · ${esc(p.slug)} · ${money(p.price_cents, p.currency)} · ${p.product_files ? `zip v${esc(p.product_files.version)}` : "no zip yet"}${p.is_featured ? " · featured" : ""}</p>
      </div>
      <span class="status status--${p.is_active ? "live" : "draft"}">${p.is_active ? "Live" : "Draft"}</span>
      <button class="btn btn--sm btn--ghost" type="button" data-edit="${p.id}">Edit</button>
    </div>`).join("")}</div>`
    : `<div class="empty">No products yet. Create the first one.</div>`;
}
$("#product-list").addEventListener("click", (e) => {
  const b = e.target.closest("[data-edit]");
  if (b) openEditor(b.dataset.edit);
});
$("#new-product").addEventListener("click", () => openEditor(null));

// ---------------------------------------------------------------- product editor
const pf = $("#product-form");
let editing = null; // full product row being edited

const lines = (t) => String(t || "").split("\n").map((s) => s.trim()).filter(Boolean);
const toCents = (v) => (v === "" || v == null ? null : Math.round(Number(v) * 100));
const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

pf.elements.name.addEventListener("input", () => {
  if (!editing) pf.elements.slug.value = slugify(`${pf.elements.name.value} ${pf.elements.name_emphasis.value}`);
});
pf.elements.name_emphasis.addEventListener("input", () => {
  if (!editing) pf.elements.slug.value = slugify(`${pf.elements.name.value} ${pf.elements.name_emphasis.value}`);
});

async function openEditor(id) {
  pf.reset();
  setStatus($(".form-status", pf), "");
  editing = null;
  if (id) {
    const { data, error } = await supabase.from("products")
      .select("*, product_media(*), product_files(*), product_extra_files(*), product_tutorials(*)").eq("id", id).single();
    check(error);
    editing = data;
    const f = pf.elements;
    f.id.value = data.id;
    ["name", "name_emphasis", "slug", "badge", "category", "tagline", "description", "currency", "item_count",
      "checkout_url", "checkout_variant_id", "version", "sort_order"].forEach((k) => { f[k].value = data[k] ?? ""; });
    f.price.value = (data.price_cents / 100).toFixed(2);
    f.compare_at.value = data.compare_at_cents ? (data.compare_at_cents / 100).toFixed(2) : "";
    f.price_ils.value = data.price_ils_cents != null ? (data.price_ils_cents / 100).toFixed(2) : "";
    f.compare_at_ils.value = data.compare_at_ils_cents ? (data.compare_at_ils_cents / 100).toFixed(2) : "";
    f.includes.value = data.includes.join("\n");
    f.compatibility.value = data.compatibility.join("\n");
    f.is_active.checked = data.is_active;
    f.is_featured.checked = data.is_featured;
  }
  $("#editor-title").textContent = editing ? `${editing.name} ${editing.name_emphasis || ""}` : "New product";
  $("#editor-media").hidden = !editing;
  if (editing) renderMedia();
  show("editor");
}

pf.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = pf.elements;
  const status = $(".form-status", pf);
  if (!pf.checkValidity()) { pf.reportValidity(); return; }
  const row = {
    name: f.name.value.trim(),
    name_emphasis: f.name_emphasis.value.trim() || null,
    slug: f.slug.value.trim(),
    badge: f.badge.value.trim() || null,
    tagline: f.tagline.value.trim() || null,
    description: f.description.value.trim() || null,
    price_cents: toCents(f.price.value),
    compare_at_cents: toCents(f.compare_at.value),
    price_ils_cents: toCents(f.price_ils.value),
    compare_at_ils_cents: toCents(f.compare_at_ils.value),
    currency: f.currency.value.trim().toUpperCase(),
    item_count: f.item_count.value ? Number(f.item_count.value) : null,
    category: f.category.value,
    includes: lines(f.includes.value),
    compatibility: lines(f.compatibility.value),
    checkout_url: f.checkout_url.value.trim() || null,
    checkout_variant_id: f.checkout_variant_id.value.trim() || null,
    version: f.version.value.trim() || "1.0",
    sort_order: Number(f.sort_order.value || 100),
    is_active: f.is_active.checked,
    is_featured: f.is_featured.checked,
  };
  if (row.is_active && (!row.checkout_url || !row.checkout_variant_id)) {
    return setStatus(status, "A live product needs a checkout link and variant ID.", "error");
  }
  if (row.is_active && !editing?.product_files) {
    return setStatus(status, "Upload the .zip before making the product live.", "error");
  }
  const btn = $("button[type=submit]", pf);
  setBusy(btn, true, "Saving…");
  const q = editing
    ? supabase.from("products").update(row).eq("id", editing.id)
    : supabase.from("products").insert(row);
  const { data, error } = await q.select("*, product_media(*), product_files(*), product_extra_files(*), product_tutorials(*)").single();
  setBusy(btn, false);
  if (error) {
    const msg = error.code === "23505" ? "That slug or variant ID is already used by another product." : error.message;
    return setStatus(status, msg, "error");
  }
  const wasNew = !editing;
  editing = data;
  f.id.value = data.id;
  $("#editor-title").textContent = `${data.name} ${data.name_emphasis || ""}`;
  $("#editor-media").hidden = false;
  renderMedia();
  setStatus(status, wasNew ? "Saved. Now add images and the zip below." : "Saved.", "ok");
});

// ---------------------------------------------------------------- images
/** Resizes in the browser to max 2400px on the long edge and encodes WebP (q 0.86). */
async function toWebp(file, maxEdge = 2400, quality = 0.86) {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn't an image.`);
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
  const canvas = new OffscreenCanvas(w, h);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type: "image/webp", quality });
  return { blob, width: w, height: h };
}

async function uploadImage(file, label) {
  const { blob, width, height } = await toWebp(file);
  const path = `${editing.slug}/${label}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}.webp`;
  const { error } = await supabase.storage.from("product-media")
    .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  check(error);
  return { path, width, height };
}

async function refreshEditing() {
  const { data, error } = await supabase.from("products")
    .select("*, product_media(*), product_files(*), product_extra_files(*), product_tutorials(*)").eq("id", editing.id).single();
  check(error);
  editing = data;
  renderMedia();
}

function renderMedia() {
  for (const slot of $$(".media-slot")) {
    const path = editing[slot.dataset.slot];
    $(".media-slot__img", slot).style.backgroundImage = path ? `url("${mediaUrl(path, { width: 440 })}")` : "";
  }
  const media = [...editing.product_media].sort((a, b) => a.sort_order - b.sort_order);
  const pairs = new Map();
  media.filter((m) => m.kind !== "gallery").forEach((m) => {
    const p = pairs.get(m.pair_key) || {}; p[m.kind] = m; pairs.set(m.pair_key, p);
  });
  $("#pairs").innerHTML = [...pairs.entries()].map(([key, p]) => `
    <div class="media-card">
      <div class="media-card__imgs">
        ${p.before ? `<img src="${esc(mediaUrl(p.before.path, { width: 400 }))}" alt="">` : "<span></span>"}
        ${p.after ? `<img src="${esc(mediaUrl(p.after.path, { width: 400 }))}" alt="">` : "<span></span>"}
      </div>
      <p class="meta">${esc(p.after?.caption || p.after?.alt || "")}</p>
      <button class="btn btn--sm btn--ghost" type="button" data-del-pair="${esc(key)}">Remove pair</button>
    </div>`).join("") || `<p class="meta">No pairs yet. The first pair shows on the home page when this pack is featured.</p>`;
  $("#gallery").innerHTML = media.filter((m) => m.kind === "gallery").map((m) => `
    <div class="media-card">
      <img src="${esc(mediaUrl(m.path, { width: 400 }))}" alt="">
      <p class="meta">${esc(m.alt)}</p>
      <button class="btn btn--sm btn--ghost" type="button" data-del-media="${m.id}">Remove</button>
    </div>`).join("") || `<p class="meta">No gallery images.</p>`;
  const file = editing.product_files;
  $("#file-info").textContent = file
    ? `Current file: ${file.path.split("/").pop()} · ${bytes(file.size_bytes)} · version ${file.version} · uploaded ${shortDate(file.uploaded_at)}`
    : "No file uploaded yet. The product can't go live without one.";
  const extras = editing.product_extra_files || [];
  $("#extra-files").innerHTML = extras.map((x) => `
    <div class="row row--between"><p class="meta"><strong>${esc(x.label)}</strong> (${esc(x.file_key)}) · ${esc(x.path.split("/").pop())} · ${bytes(x.size_bytes)} · version ${esc(x.version)} · uploaded ${shortDate(x.uploaded_at)}</p>
    <button class="btn btn--sm btn--ghost" type="button" data-del-extra="${esc(x.file_key)}">Remove</button></div>`).join("") || `<p class="meta">No extra downloads.</p>`;
  const APP = { lightroom: "Lightroom", "lightroom-classic": "Lightroom Classic", photoshop: "Photoshop", other: "Other" };
  const tuts = [...(editing.product_tutorials || [])].sort((a, b) => a.sort_order - b.sort_order);
  $("#tutorials").innerHTML = tuts.map((t) => `
    <div class="row row--between"><p class="meta"><strong>${esc(APP[t.app] || t.app)}</strong> · ${esc(t.title)}${t.title_he ? ` · <span dir="rtl">${esc(t.title_he)}</span>` : ""} · <a class="link" href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.url)}</a> · order ${t.sort_order}</p>
    <button class="btn btn--sm btn--ghost" type="button" data-del-tutorial="${t.id}">Remove</button></div>`).join("") || `<p class="meta">No tutorials yet.</p>`;
}

// Cover and hover images
$$(".media-slot input[type=file]").forEach((input) => input.addEventListener("change", async () => {
  const file = input.files[0];
  if (!file) return;
  const slot = input.closest(".media-slot").dataset.slot;
  try {
    toast("Uploading image…");
    const { path } = await uploadImage(file, slot === "cover_path" ? "cover" : "hover");
    const old = editing[slot];
    check((await supabase.from("products").update({ [slot]: path }).eq("id", editing.id)).error);
    if (old) await supabase.storage.from("product-media").remove([old]);
    await refreshEditing();
    toast("Image saved.");
  } catch (err) { toast(err.message, { type: "error" }); }
  input.value = "";
}));

const nextSort = () => Math.max(0, ...editing.product_media.map((m) => m.sort_order)) + 10;

$("#pair-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = $("button[type=submit]", form);
  setBusy(btn, true, "Uploading…");
  try {
    const key = crypto.randomUUID().slice(0, 8);
    const alt = form.elements.alt.value.trim();
    const caption = form.elements.caption.value.trim() || null;
    const [b, a] = await Promise.all([
      uploadImage(form.elements.before.files[0], `before-${key}`),
      uploadImage(form.elements.after.files[0], `after-${key}`),
    ]);
    const sort = nextSort();
    check((await supabase.from("product_media").insert([
      { product_id: editing.id, kind: "before", pair_key: key, alt: `${alt}, before editing`, caption, sort_order: sort, ...b },
      { product_id: editing.id, kind: "after", pair_key: key, alt: `${alt}, edited with the preset`, caption, sort_order: sort, ...a },
    ])).error);
    form.reset();
    await refreshEditing();
    toast("Pair added.");
  } catch (err) { toast(err.message, { type: "error" }); }
  setBusy(btn, false);
});

$("#gallery-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = $("button[type=submit]", form);
  setBusy(btn, true, "Uploading…");
  try {
    const alt = form.elements.alt.value.trim();
    let sort = nextSort();
    for (const file of form.elements.files.files) {
      const img = await uploadImage(file, "gallery");
      check((await supabase.from("product_media").insert({ product_id: editing.id, kind: "gallery", alt, sort_order: sort, ...img })).error);
      sort += 10;
    }
    form.reset();
    await refreshEditing();
    toast("Gallery updated.");
  } catch (err) { toast(err.message, { type: "error" }); }
  setBusy(btn, false);
});

$("#editor-media").addEventListener("click", async (e) => {
  const pairKey = e.target.closest("[data-del-pair]")?.dataset.delPair;
  const mediaId = e.target.closest("[data-del-media]")?.dataset.delMedia;
  if (!pairKey && !mediaId) return;
  if (!confirm("Remove this from the product? The image files are deleted too.")) return;
  const rows = editing.product_media.filter((m) => (pairKey ? m.pair_key === pairKey : m.id === mediaId));
  try {
    check((await supabase.from("product_media").delete().in("id", rows.map((r) => r.id))).error);
    await supabase.storage.from("product-media").remove(rows.map((r) => r.path));
    await refreshEditing();
  } catch (err) { toast(err.message, { type: "error" }); }
});

// ---------------------------------------------------------------- paid zip
$("#zip-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const file = form.elements.zip.files[0];
  if (!file) return;
  if (!/\.zip$/i.test(file.name)) return toast("Please choose a .zip file.", { type: "error" });
  const btn = $("button[type=submit]", form);
  const bar = $("#zip-progress");
  setBusy(btn, true, "Uploading…");
  bar.hidden = false; bar.removeAttribute("value"); // indeterminate while uploading
  try {
    const version = pf.elements.version.value.trim() || "1.0";
    const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "-");
    const path = `${editing.slug}/v${version}/${safeName}`;
    const { error } = await supabase.storage.from("presets")
      .upload(path, file, { contentType: "application/zip", upsert: true });
    check(error);
    check((await supabase.from("product_files").upsert({
      product_id: editing.id, path, size_bytes: file.size, version, uploaded_at: new Date().toISOString(),
    })).error);
    if (editing.version !== version) {
      check((await supabase.from("products").update({ version }).eq("id", editing.id)).error);
    }
    form.reset();
    await refreshEditing();
    toast("Zip uploaded. Buyers now get this version.");
  } catch (err) {
    toast(err.message.includes("exceeded") ? "File is larger than your Supabase upload limit (see README, step 7)." : err.message, { type: "error", timeout: 8000 });
  }
  bar.hidden = true;
  setBusy(btn, false);
});

// Extra downloads (e.g. MWP Panel's Lightroom Classic plugin): same private bucket, their own row each
$("#extra-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget, f = form.elements;
  const file = f.zip.files[0];
  if (!file || !/\.zip$/i.test(file.name)) return toast("Please choose a .zip file.", { type: "error" });
  const key = f.key.value.trim(), label = f.label.value.trim(), version = f.version.value.trim();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key)) return toast("Key: lowercase letters, numbers and dashes, e.g. lightroom-classic.", { type: "error" });
  const btn = $("button[type=submit]", form);
  setBusy(btn, true, "Uploading…");
  try {
    const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "-");
    const path = `${editing.slug}/${key}/v${version}/${safeName}`;
    check((await supabase.storage.from("presets").upload(path, file, { contentType: "application/zip", upsert: true })).error);
    check((await supabase.from("product_extra_files").upsert({
      product_id: editing.id, file_key: key, label, path, size_bytes: file.size, version, uploaded_at: new Date().toISOString(),
    })).error);
    form.reset();
    await refreshEditing();
    toast(`${label} uploaded. Owners see it in My downloads now.`);
  } catch (err) {
    toast(err.message.includes("exceeded") ? "File is larger than your Supabase upload limit (see README, step 7)." : err.message, { type: "error", timeout: 8000 });
  }
  setBusy(btn, false);
});

$("#tutorial-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget, f = form.elements;
  const url = f.url.value.trim();
  if (!/^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(url)) return toast("Please paste a YouTube link (https://youtu.be/… or https://www.youtube.com/…).", { type: "error" });
  const btn = $("button[type=submit]", form);
  setBusy(btn, true, "Saving…");
  try {
    check((await supabase.from("product_tutorials").insert({
      product_id: editing.id, app: f.app.value, title: f.title.value.trim(), title_he: f.title_he.value.trim() || null,
      url, sort_order: Number(f.sort_order.value) || 100,
    })).error);
    form.reset();
    await refreshEditing();
    toast("Tutorial added. Owners see it in My downloads.");
  } catch (err) { toast(err.message, { type: "error", timeout: 8000 }); }
  setBusy(btn, false);
});

$("#editor-media").addEventListener("click", async (e) => {
  const extra = e.target.closest("[data-del-extra]"), tut = e.target.closest("[data-del-tutorial]");
  if (!extra && !tut) return;
  if (!confirm(extra ? "Remove this extra download? Owners stop seeing its button (the file itself stays in storage)." : "Remove this tutorial link?")) return;
  try {
    check((extra
      ? await supabase.from("product_extra_files").delete().eq("product_id", editing.id).eq("file_key", extra.dataset.delExtra)
      : await supabase.from("product_tutorials").delete().eq("id", tut.dataset.delTutorial)).error);
    await refreshEditing();
    toast("Removed.");
  } catch (err) { toast(err.message, { type: "error" }); }
});

// ---------------------------------------------------------------- tables + CSV
function tableHTML(cols, rows) {
  return `<thead><tr>${cols.map((c) => `<th class="${c.num ? "num" : ""}">${esc(c.label)}</th>`).join("")}</tr></thead>
    <tbody>${rows.length ? rows.map((r) => `<tr>${cols.map((c) => `<td class="${c.num ? "num" : ""}">${c.html ? c.html(r) : esc(c.value(r))}</td>`).join("")}</tr>`).join("")
      : `<tr><td colspan="${cols.length}" class="meta">Nothing here yet.</td></tr>`}</tbody>`;
}

function downloadCsv(name, cols, rows) {
  // A cell starting with = + - @ (or a tab / return) would run as a formula in Excel or Sheets: prefix it with '.
  const cell = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [cols.map((c) => cell(c.label)).join(","), ...rows.map((r) => cols.map((c) => cell(c.value(r))).join(","))].join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: `${name}-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// Orders
const orderCols = [
  { label: "Date", value: (r) => shortDate(r.created_at) },
  { label: "Order", value: (r) => r.order_number || r.checkout_order_id },
  { label: "Customer", value: (r) => r.email },
  { label: "Packs", value: (r) => r.products },
  { label: "Total", num: true, value: (r) => money(r.total_cents, r.currency) },
  { label: "Source", value: (r) => r.source || "" },
  { label: "Status", value: (r) => r.status, html: (r) => `<span class="status status--${esc(r.status)}">${esc(r.status.replace("_", " "))}</span>` },
  // Lemon Squeezy test-mode checkouts: kept for the record, left out of every total
  { label: "Test", value: (r) => (r.test_mode ? "test" : ""), html: (r) => (r.test_mode ? `<span class="status status--test">Test order</span>` : "") },
];
let orderRows = [];
async function loadOrders() {
  const term = $("#orders-search").value.trim();
  let q = supabase.from("admin_orders").select("*").order("created_at", { ascending: false }).limit(500);
  if (term) q = q.or(`email.ilike.%${term.replace(/[%,()]/g, "")}%,order_number.eq.${term.replace(/[^0-9A-Za-z-]/g, "") || "0"}`);
  const { data, error } = await q;
  check(error);
  orderRows = data;
  $("#orders-table").innerHTML = tableHTML(orderCols, data);
}
$("#orders-search").addEventListener("input", debounce(loadOrders));
$("#orders-csv").addEventListener("click", () => downloadCsv("orders", orderCols, orderRows));

// Customers
const customerCols = [
  { label: "Email", value: (r) => r.email },
  { label: "Name", value: (r) => r.name || "" },
  { label: "Country", value: (r) => r.country || "" },
  { label: "Paid orders", num: true, value: (r) => r.paid_orders },
  { label: "Lifetime value", num: true, value: (r) => money(r.lifetime_cents, "USD") },
  { label: "Last order", value: (r) => (r.last_order_at ? shortDate(r.last_order_at) : "") },
  { label: "Marketing", value: (r) => (r.marketing_opt_in ? "Yes" : "No") },
];
let customerRows = [];
async function loadCustomers() {
  const term = $("#customers-search").value.trim().replace(/[%,()]/g, "");
  let q = supabase.from("admin_customers").select("*").order("lifetime_cents", { ascending: false }).limit(1000);
  if (term) q = q.or(`email.ilike.%${term}%,name.ilike.%${term}%`);
  const { data, error } = await q;
  check(error);
  customerRows = data;
  $("#customers-table").innerHTML = tableHTML(customerCols, data);
}
$("#customers-search").addEventListener("input", debounce(loadCustomers));
$("#customers-csv").addEventListener("click", () => downloadCsv("customers", customerCols, customerRows));

// ---------------------------------------------------------------- ambassadors
const AMB_STATUS = { active: "Active", ended: "Ended", ended_breach: "Ended, breach" };
const ambCols = [
  { label: "Name", value: (r) => r.customers?.name || "" },
  { label: "Email", value: (r) => r.customers?.email || "" },
  { label: "Instagram", value: (r) => (r.instagram ? "@" + r.instagram : "") },
  { label: "Facebook", value: (r) => r.facebook || "" },
  { label: "Joined", value: (r) => shortDate(r.agreed_at) },
  { label: "Status", value: (r) => AMB_STATUS[r.status] || r.status,
    html: (r) => `<span class="status status--amb-${esc(r.status)}">${esc(AMB_STATUS[r.status] || r.status)}</span>${r.ended_at ? ` <span class="meta">${esc(shortDate(r.ended_at))}</span>` : ""}` },
  { label: "", value: () => "",
    html: (r) => r.status === "active"
      ? `<div class="row amb-acts"><button class="btn btn--sm btn--ghost" type="button" data-end="${esc(r.id)}">End</button><button class="btn btn--sm btn--ghost amb-breach" type="button" data-end="${esc(r.id)}" data-breach>End (breach)</button></div>`
      : "" },
];
let ambRows = [];
async function loadAmbassadors() {
  const term = $("#amb-search").value.trim().toLowerCase();
  const { data, error } = await supabase.from("beta_members")
    .select("id, instagram, facebook, agreed_at, status, ended_at, terms_version, customers(email, name)")
    .order("agreed_at", { ascending: false }).limit(500);
  check(error);
  ambRows = term ? data.filter((r) => [r.customers?.email, r.customers?.name, r.instagram].some((v) => (v || "").toLowerCase().includes(term))) : data;
  const active = data.filter((r) => r.status === "active").length;
  $("#amb-count").textContent = `${active} active · ${data.length} of 26 places used`;
  $("#amb-table").innerHTML = tableHTML(ambCols, ambRows);
}
$("#amb-search").addEventListener("input", debounce(loadAmbassadors));
$("#amb-csv").addEventListener("click", () => downloadCsv("ambassadors", ambCols.filter((c) => c.label), ambRows));
$("#amb-table").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-end]");
  if (!btn) return;
  const breach = btn.hasAttribute("data-breach");
  const row = ambRows.find((r) => r.id === btn.dataset.end);
  const who = row?.customers?.name || row?.customers?.email || "this ambassador";
  const ok = window.confirm(breach
    ? `End ${who}'s ambassadorship for a breach of the terms?\n\nTheir free access to the tools is removed now. Anything they bought stays. monday will be updated.`
    : `End ${who}'s ambassadorship?\n\nThey keep their licence for life, as the terms say. monday will be updated.`);
  if (!ok) return;
  setBusy(btn, true);
  const { error } = await supabase.rpc("end_ambassador", { p_member: btn.dataset.end, p_breach: breach });
  if (error) { toast(error.message, { type: "error", timeout: 7000 }); setBusy(btn, false); return; }
  toast(breach ? "Ended for breach. Their free access is removed and monday is updated." : "Ended. They keep their licence, and monday is updated.");
  loadAmbassadors();
});

// ---------------------------------------------------------------- testers (10 at most; add_tester / remove_tester in the database)
const tstCols = [
  { label: "Name", value: (r) => r.customers?.name || "" },
  { label: "Email", value: (r) => r.customers?.email || "" },
  { label: "Approved", value: (r) => shortDate(r.added_at) },
  { label: "Status", value: (r) => (r.removed_at ? "Removed" : "Active"),
    html: (r) => r.removed_at ? `<span class="status status--amb-ended">Removed</span> <span class="meta">${esc(shortDate(r.removed_at))}</span>` : `<span class="status status--amb-active">Active</span>` },
  { label: "", value: () => "",
    html: (r) => r.removed_at ? "" : `<button class="btn btn--sm btn--ghost" type="button" data-remove-tester="${esc(r.id)}">Remove</button>` },
];
let tstRows = [];
async function loadTesters() {
  const { data, error } = await supabase.from("testers")
    .select("id, added_at, removed_at, customers(email, name)").order("added_at", { ascending: false }).limit(200);
  check(error);
  tstRows = data;
  $("#tst-count").textContent = `${data.filter((r) => !r.removed_at).length} of 10 places used`;
  $("#tst-table").innerHTML = tableHTML(tstCols, tstRows);
  loadTesterCode();
}
// the current tester code (admins only can read it)
async function loadTesterCode() {
  const { data } = await supabase.from("tester_code").select("code").maybeSingle();
  $("#tst-code-now").textContent = data?.code || "not set yet";
}
$("#tst-code-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const btn = f.querySelector("button");
  setBusy(btn, true);
  const { error } = await supabase.rpc("set_tester_code", { p_code: f.elements.code.value });
  setBusy(btn, false);
  if (error) { toast(error.message, { type: "error", timeout: 7000 }); return; }
  f.reset();
  toast("Tester code saved. The old code no longer works.");
  loadTesterCode();
});
$("#tst-table").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-remove-tester]");
  if (!btn) return;
  const row = tstRows.find((r) => r.id === btn.dataset.removeTester);
  const who = row?.customers?.name || row?.customers?.email || "this tester";
  if (!window.confirm(`Remove ${who} as a tester?\n\nTheir free access to the tools is removed now. Anything they bought stays. monday will be updated.`)) return;
  setBusy(btn, true);
  const { error } = await supabase.rpc("remove_tester", { p_tester: btn.dataset.removeTester });
  if (error) { toast(error.message, { type: "error", timeout: 7000 }); setBusy(btn, false); return; }
  toast("Removed. Their free access is gone, and monday is updated.");
  loadTesters();
});

// ---------------------------------------------------------------- support
let ticketFilter = "open";
$$("[data-ticket-filter]").forEach((b) => b.addEventListener("click", () => {
  ticketFilter = b.dataset.ticketFilter;
  $$("[data-ticket-filter]").forEach((x) => x.classList.toggle("btn--ghost", x !== b));
  loadTickets();
}));

const CATEGORY = { download: "Download", install: "Install help", refund: "Refund request", other: "Other" };

async function loadTickets() {
  let q = supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(200);
  if (ticketFilter === "open") q = q.neq("status", "resolved");
  const { data, error } = await q;
  check(error);
  $("#tickets").innerHTML = data.length ? data.map((t) => `
    <article class="ticket">
      <div class="ticket__head">
        <div>
          <p><strong>${esc(t.subject)}</strong></p>
          <p class="meta">${esc(t.name || "")} · <a class="link" href="mailto:${esc(t.email)}?subject=${encodeURIComponent("Re: " + t.subject)}">${esc(t.email)}</a> · ${esc(CATEGORY[t.category])}${t.order_number ? ` · order ${esc(t.order_number)}` : ""} · ${shortDate(t.created_at)}</p>
        </div>
        <select class="select input--sm" data-ticket="${t.id}" aria-label="Status">
          ${["new", "waiting", "resolved"].map((s) => `<option value="${s}" ${t.status === s ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}
        </select>
      </div>
      <p class="ticket__msg">${esc(t.message)}</p>
      ${t.category === "refund" ? `<p class="meta">Refunds are decided by Matan and issued in the Lemon Squeezy dashboard; access is removed automatically.</p>` : ""}
    </article>`).join("") : `<div class="empty">No ${ticketFilter === "open" ? "open " : ""}tickets.</div>`;
}
$("#tickets").addEventListener("change", async (e) => {
  const sel = e.target.closest("[data-ticket]");
  if (!sel) return;
  const { error } = await supabase.from("support_tickets").update({ status: sel.value }).eq("id", sel.dataset.ticket);
  if (error) return toast(error.message, { type: "error" });
  toast("Status updated.");
  refreshTicketBadge();
  if (ticketFilter === "open" && sel.value === "resolved") loadTickets();
});

async function refreshTicketBadge() {
  const { count } = await supabase.from("support_tickets").select("id", { count: "exact", head: true }).neq("status", "resolved");
  const pill = $("#open-tickets");
  pill.textContent = count || "";
  pill.hidden = !count;
}

boot();
