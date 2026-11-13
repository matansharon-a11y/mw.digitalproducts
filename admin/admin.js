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
    document.documentElement.classList.remove("admin-resume");
    return;
  }
  // A reload keeps you signed in (Jeinna, 7 Nov 2026): while the saved session is checked the page says so (the sign-in
  // form only shows when there's really no session), and a passing hiccup never signs you out.
  gate.classList.add("is-checking");
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) await enter(data.session.user);
  } catch (err) {
    console.error(err);
    $("#gate-msg").textContent = "Couldn't reach the server. Please reload the page.";
  } finally {
    gate.classList.remove("is-checking");
    document.documentElement.classList.remove("admin-resume");   // set by index.html when a session was saved
  }
}

// is_admin(), asked again once with a renewed session if the first answer is an error (not a "no")
async function checkAdmin() {
  let r = await supabase.rpc("is_admin");
  if (r.error) {
    await supabase.auth.refreshSession().catch(() => {});
    r = await supabase.rpc("is_admin");
  }
  return r;
}

async function enter(user) {
  // Two-step sign-in: once the account has an authenticator, the password alone doesn't open the admin.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") return askCode(user);
  const { data: isAdmin, error } = await checkAdmin();
  if (error) {   // the server didn't answer: keep the session, just say so
    $("#gate-msg").textContent = "Couldn't check your admin access right now. Please reload the page in a moment.";
    return;
  }
  if (!isAdmin) {
    $("#gate-msg").textContent = `${user.email} isn't an admin. Ask the owner to add you, then sign in again.`;
    await supabase.auth.signOut();
    return;
  }
  gate.hidden = true;
  app.hidden = false;
  $("#admin-email").textContent = user.email;
  show(location.hash.slice(1) || "overview", { history: false });
  refreshTicketBadge();
  refreshCompatBadge();
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

let entering = false;   // boot() and the SIGNED_IN event can both arrive on a reload: open the admin once
supabase?.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" && session && app.hidden && !gate.classList.contains("is-checking") && !entering) {
    entering = true;
    enter(session.user).finally(() => { entering = false; });
  }
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
const loaders = { overview: loadOverview, products: loadProducts, compat: loadCompat, orders: loadOrders, finance: loadFinance, morning: loadMorning, customers: loadCustomers, signups: loadSignups, ambassadors: loadAmbassadors, testers: loadTesters, support: loadTickets, security: loadSecurity };

// ---------------------------------------------------------------- navigation (6 Nov 2026)
// Six sections in the sidebar; a section with more than one view shows tabs above it. Every view has its own address
// (#orders, #compat …), so reload, Back and a link in an email open the right place, and each section remembers the
// tab you were on.
const GROUPS = {
  overview: { label: "Overview", tabs: [["overview", "Overview"]] },
  sales: { label: "Sales", tabs: [["orders", "Orders"], ["finance", "Finances"], ["morning", "Morning invoices"]] },
  products: { label: "Products", tabs: [["products", "Catalogue"], ["compat", "Compatibility"]] },
  people: { label: "People", tabs: [["customers", "Customers"], ["signups", "Sign-ups"], ["ambassadors", "Ambassadors"], ["testers", "Testers"]] },
  support: { label: "Support", tabs: [["support", "Tickets"]] },
  settings: { label: "Settings", tabs: [["security", "Two-step sign-in"]] },
};
const groupOf = (tab) => (tab === "editor" ? "products" : Object.keys(GROUPS).find((g) => GROUPS[g].tabs.some(([t]) => t === tab)));
const isView = (tab) => tab === "editor" || !!groupOf(tab);
let lastTab = {};
// a country code as "🇮🇱 Israel" (the browser's own country names), and a date with the time (7 Nov 2026)
let regionNames = null;
try { regionNames = new Intl.DisplayNames(["en"], { type: "region" }); } catch { /* old browser: codes only */ }
const flagOf = (cc) => String.fromCodePoint(...[...cc].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
function countryName(cc) {
  const raw = String(cc || "").trim();
  cc = raw.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return raw;   // typed by the customer in My details ("Israel"): shown as typed
  let name = cc;
  try { name = regionNames?.of(cc) || cc; } catch { /* unknown code */ }
  return `${flagOf(cc)} ${name}`;
}
const dateTime = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
try { lastTab = JSON.parse(sessionStorage.getItem("mwp_admin_tabs") || "{}"); } catch { /* private mode */ }

function show(tab, { history = true } = {}) {
  if (!isView(tab)) tab = "overview";
  const group = groupOf(tab);
  $$("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== tab; });
  $$(".admin-nav [data-group]").forEach((b) => {
    if (b.dataset.group === group) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  const tabs = GROUPS[group].tabs, sub = $("#subnav");
  const current = tab === "editor" ? "products" : tab;
  sub.hidden = tabs.length < 2;
  sub.setAttribute("aria-label", `${GROUPS[group].label} views`);
  sub.innerHTML = tabs.map(([t, label]) => `<button type="button" role="tab" data-tab="${t}" aria-selected="${t === current}" tabindex="${t === current ? 0 : -1}">${esc(label)}${t === "compat" ? `<span class="pill pill--warn" data-compat-count hidden></span>` : ""}</button>`).join("");
  paintCompatBadge();
  if (tab !== "editor") {
    lastTab[group] = tab;
    try { sessionStorage.setItem("mwp_admin_tabs", JSON.stringify(lastTab)); } catch { /* private mode */ }
    if (history && location.hash !== `#${tab}`) window.history.pushState(null, "", `#${tab}`);
  }
  loaders[tab]?.();
  window.scrollTo({ top: 0 });
}
document.addEventListener("click", (e) => {
  const g = e.target.closest(".admin-nav [data-group]");
  if (g) return show(lastTab[g.dataset.group] || GROUPS[g.dataset.group].tabs[0][0]);
  const t = e.target.closest("[data-tab]");
  if (t) show(t.dataset.tab);
});
// arrow keys move between the tabs of a section
$("#subnav").addEventListener("keydown", (e) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
  const btns = $$("#subnav [role=tab]"), i = btns.indexOf(document.activeElement);
  if (i < 0) return;
  e.preventDefault();
  const n = e.key === "Home" ? 0 : e.key === "End" ? btns.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + btns.length) % btns.length;
  show(btns[n].dataset.tab);
  $(`#subnav [data-tab="${btns[n].dataset.tab}"]`)?.focus();
});
window.addEventListener("popstate", () => show(location.hash.slice(1) || "overview", { history: false }));

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
    ["Buyers", s.buyers ?? "–", "people who paid"],
    ["New accounts", s.new_customers, "sign-ups, not sales"],
    ["Sampler sign-ups", s.new_subscribers, ""],
    ["Downloads", s.downloads, ""],
    ["Open tickets", s.open_tickets, "all time"],
  ];
  $("#tiles").innerHTML = tiles.map(([label, value, sub]) => `
    <div class="tile"><span class="tile__label">${esc(label)}</span><span class="tile__value${String(value).length > 9 ? " tile__value--long" : ""}">${esc(value)}</span>${sub ? `<span class="tile__sub">${esc(sub)}</span>` : ""}</div>`).join("");
  drawChart(s.daily);
  loadAttention();
  $("#top-products").innerHTML = s.top_products.length
    ? `<table class="table"><thead><tr><th>Pack</th><th class="num">Sold</th><th class="num">Revenue</th></tr></thead><tbody>
        ${s.top_products.map((t) => `<tr><td>${esc(t.name)}</td><td class="num">${t.units}</td><td class="num">${money(t.cents, t.currency)}</td></tr>`).join("")}
      </tbody></table>`
    : `<p class="meta" style="margin-top:var(--s-3)">No sales in this period yet.</p>`;
  loadNewAccounts();
}

// New accounts without a paid order in the period (admin_new_accounts, migration 20261105000002)
async function loadNewAccounts() {
  const box = $("#new-accounts");
  const { data, error } = await supabase.rpc("admin_new_accounts", { p_days: periodDays });
  if (error) { box.innerHTML = `<p class="meta">${esc(error.message)}</p>`; return; }
  $("#new-accounts-count").textContent = `${data.length} in the last ${periodDays} days`;
  box.innerHTML = data.length
    ? `<div style="overflow-x:auto"><table class="table"><thead><tr><th>Joined</th><th>Name</th><th>Email</th><th>Came from</th><th>Emails OK</th><th>Phone</th></tr></thead><tbody>
        ${data.map((a) => `<tr><td>${shortDate(a.created_at)}</td><td>${esc(a.name || "–")}</td><td>${esc(a.email)}</td><td>${esc(a.came_from)}</td><td>${a.marketing_opt_in ? "Yes" : "No"}</td><td>${esc(a.phone || "–")}</td></tr>`).join("")}
      </tbody></table></div>`
    : `<p class="meta" style="margin-top:var(--s-3)">Everyone who joined in this period has bought.</p>`;
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
      <span class="row" style="gap:8px;flex-wrap:nowrap">${p.product_files?.path ? `<button class="btn btn--sm btn--ghost" type="button" data-dl-file="${esc(p.product_files.path)}" title="Download the original zip">Download zip</button>` : ""}<button class="btn btn--sm btn--ghost" type="button" data-edit="${p.id}">Edit</button></span>
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
  if (row.is_active && row.category !== "bundle" && !editing?.product_files) {   // a bundle has no file: its products do
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
  $("#file-info").innerHTML = file
    ? `Current file: ${esc(file.path.split("/").pop())} · ${bytes(file.size_bytes)} · version ${esc(file.version)} · uploaded ${shortDate(file.uploaded_at)}
       <button class="btn btn--sm btn--ghost" type="button" data-dl-file="${esc(file.path)}">Download zip</button>`
    : "No file uploaded yet. The product can't go live without one.";
  renderUpdateNotice();
  const extras = editing.product_extra_files || [];
  $("#extra-files").innerHTML = extras.map((x) => `
    <div class="row row--between"><p class="meta"><strong>${esc(x.label)}</strong> (${esc(x.file_key)}) · ${esc(x.path.split("/").pop())} · ${bytes(x.size_bytes)} · version ${esc(x.version)} · uploaded ${shortDate(x.uploaded_at)}</p>
    <span class="row"><button class="btn btn--sm btn--ghost" type="button" data-dl-file="${esc(x.path)}">Download</button><button class="btn btn--sm btn--ghost" type="button" data-del-extra="${esc(x.file_key)}">Remove</button></span></div>`).join("") || `<p class="meta">No extra downloads.</p>`;
  const APP = { lightroom: "Lightroom", "lightroom-classic": "Lightroom Classic", photoshop: "Photoshop", other: "Other" };
  const tuts = [...(editing.product_tutorials || [])].sort((a, b) => a.sort_order - b.sort_order);
  $("#tutorials").innerHTML = tuts.map((t) => `
    <div class="row row--between"><p class="meta"><strong>${esc(APP[t.app] || t.app)}</strong> · ${esc(t.title)}${t.title_he ? ` · <span dir="rtl">${esc(t.title_he)}</span>` : ""} · <a class="link" href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.url)}</a> · order ${t.sort_order}</p>
    <button class="btn btn--sm btn--ghost" type="button" data-del-tutorial="${t.id}">Remove</button></div>`).join("") || `<p class="meta">No tutorials yet.</p>`;
}

// Update emails (migration 20261104000002): a new version of the file → offer to email everyone who owns the product.
// Nothing is sent until "Email the owners" is clicked.
async function renderUpdateNotice() {
  const box = $("#update-notice");
  box.hidden = true;
  const id = editing?.id;
  const { data, error } = await supabase.rpc("update_notice_for", { p_product: id });
  if (error || !data?.length || editing?.id !== id) return;
  const n = data[0];
  const who = n.owners === 1 ? "1 person owns" : `${n.owners} people own`;
  if (n.status === "new" || n.status === "failed") {
    box.innerHTML = `<p><strong>Version ${esc(n.version)} is up.</strong> ${who} this product. Email them that the new version is in My downloads?${n.status === "failed" ? " (The last try didn't go out.)" : ""}</p>
      <div class="row"><button class="btn btn--sm" type="button" data-notice-send="${n.id}"${n.owners ? "" : " disabled"}>Email the owners</button>
      <button class="btn btn--sm btn--ghost" type="button" data-notice-skip="${n.id}">No email</button></div>`;
  } else if (n.status === "sending") {
    const stuck = Date.now() - Date.parse(n.created_at) > 15 * 60 * 1000;
    box.innerHTML = `<p>Sending the update email for version ${esc(n.version)}…</p>${stuck ? `<div class="row"><button class="btn btn--sm btn--ghost" type="button" data-notice-send="${n.id}">Try again</button></div>` : ""}`;
  } else {
    box.innerHTML = `<p class="meta">Update email for version ${esc(n.version)} sent to ${n.recipients ?? 0} ${n.recipients === 1 ? "person" : "people"} on ${shortDate(n.sent_at)}.</p>`;
  }
  box.hidden = false;
}

$("#update-notice").addEventListener("click", async (e) => {
  const send = e.target.closest("[data-notice-send]");
  const skip = e.target.closest("[data-notice-skip]");
  if (!send && !skip) return;
  const id = (send || skip).dataset.noticeSend || (send || skip).dataset.noticeSkip;
  if (send && !confirm("Send the update email to everyone who owns this product?")) return;
  const { error } = await supabase.rpc("decide_update_notice", { p_notice: id, p_send: !!send });
  if (error) return toast(error.message, { type: "error" });
  toast(send ? "Sending the update email. It takes a minute or two." : "Closed. No email sent.");
  await renderUpdateNotice();
  if (send) setTimeout(renderUpdateNotice, 60000);
});

// Download the product's original file (admin only: storage policy "presets: admin read"). A 5-minute private link,
// the master copy as uploaded, without a buyer's name stamped in (Jeinna, 5 Nov 2026).
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-dl-file]");
  if (!b) return;
  const path = b.dataset.dlFile;
  const { data, error } = await supabase.storage.from("presets").createSignedUrl(path, 300, { download: path.split("/").pop() });
  if (error || !data?.signedUrl) return toast(error?.message || "Couldn't prepare the download.", { type: "error" });
  location.href = data.signedUrl;
});

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
    <tbody>${rows.length ? rows.map((r) => `<tr>${cols.map((c) => `<td class="${c.num ? "num" : ""}${c.wrap ? " wrap" : ""}">${c.html ? c.html(r) : esc(c.value(r))}</td>`).join("")}</tr>`).join("")
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
// ---------------------------------------------------------------- Compatibility (6 Nov 2026)
// Data: compat_overview() (migration 20261106000002). The daily job (scheduler compat.ts) fills it; here the admin reads
// it and records what they checked. Status per product = the most urgent of its Adobe dependencies:
//   Update needed  an alert was marked "Needs update"
//   Worth a look   an open alert from the release notes (e.g. the plugin interface changed)
//   Needs testing  an open alert for a new major version, or never tested on the current major version
//   Compatible     tested on the current major version, nothing open
const CSTATUS = {
  update: { label: "Update needed", cls: "bad", rank: 4 },
  investigate: { label: "Worth a look", cls: "look", rank: 3 },
  test: { label: "Needs testing", cls: "warn", rank: 2 },
  autofail: { label: "Automatic checks failed", cls: "bad", rank: 4 },
  unverified: { label: "Not checked on the latest version yet", cls: "warn", rank: 1 },
  auto: { label: "Passed automatic checks", cls: "ok", rank: -1 },
  // never "Compatible" without a recorded test: "Tested OK" needs one, otherwise only "No known issues"
  clear: { label: "No known issues", cls: "none", rank: 0 },
  ok: { label: "Tested OK", cls: "ok", rank: -1 },
};
const ALERT_STATUS = { open: "To do", reviewed: "Reviewed", tested: "Tested OK", needs_update: "Needs update", resolved: "Resolved" };
const LEVEL_LABEL = { test: "Needs testing", investigate: "Worth a look", confirmed: "Confirmed problem" };
// "Reviewed" (by you or by the automatic product checks) is settled: only open ones and "Needs update" count
const ACTIVE = (a) => a.status === "open" || a.status === "needs_update";
let compat = null, compatFilter = "active";
const vmajor = (v) => Number(String(v || "").split(".")[0]);

// The latest automatic check of a product (tools/compat/check.py): a one-line result, the list behind it
function checksHTML(slug) {
  const c = (compat.checks || []).find((x) => x.product_slug === slug);
  if (!c) return `<p class="meta cchecks__none">Automatic checks: the first run is on its way (daily, and right after every Adobe update).</p>`;
  const items = c.checks || [];
  const failed = items.filter((i) => !i.ok), warns = items.filter((i) => i.level === "warn");
  const head = c.ok ? `Automatic checks passed: ${items.length - warns.length} of ${items.length}${warns.length ? `, ${warns.length} note${warns.length === 1 ? "" : "s"}` : ""}` : `${failed.length} automatic check${failed.length === 1 ? "" : "s"} failed`;
  const against = Object.entries(c.against || {}).map(([k, v]) => `${(compat.apps.find((a) => a.key === k) || { name: k }).name} ${v}`).join(", ");
  return `<details class="cchecks${c.ok ? "" : " cchecks--bad"}"${c.ok ? "" : " open"}>
    <summary><span class="cdot cdot--${c.ok ? "ok" : "bad"}"></span>${esc(head)} <span class="meta">· v${esc(c.file_version || "?")} · ${shortDate(c.ran_at)}</span></summary>
    <p class="meta">Checked against ${esc(against)}. The product file itself is opened and checked; Photoshop and Lightroom can't run on a server, so this checks everything an Adobe update can break in the files, not the app's screen.</p>
    <ul>${items.map((i) => `<li class="cchk cchk--${i.level}"><span>${i.level === "pass" ? "✓" : i.level === "warn" ? "!" : "✗"}</span><b>${esc(i.name)}</b>${i.detail ? ` <span class="meta">${esc(i.detail)}</span>` : ""}</li>`).join("")}</ul>
  </details>`;
}

function depStatus(d) {
  const app = compat.apps.find((a) => a.key === d.app);
  const mine = compat.alerts.filter((a) => a.product_slug === d.product_slug && a.app === d.app);
  if (mine.some((a) => a.status === "needs_update")) return "update";
  if (mine.some((a) => ACTIVE(a) && a.level === "investigate")) return "investigate";
  if (mine.some((a) => ACTIVE(a) && a.level !== "investigate")) return "test";
  if (d.last_verified_version && app?.latest_version && vmajor(d.last_verified_version) === vmajor(app.latest_version)) return "ok";
  // the automatic product checks (Product checks workflow) against this app's latest version
  if (d.auto_ok === false) return "autofail";
  if (d.auto_ok === true && app?.latest_version && d.auto_checked_version === app.latest_version) return "auto";
  if (d.major_alerts && app?.latest_version) return "unverified";
  return "clear";
}
function productStatuses() {
  const by = new Map();
  for (const d of compat?.deps || []) {
    const st = depStatus(d);
    const p = by.get(d.product_slug) || { slug: d.product_slug, name: d.product_name, deps: [], status: "ok" };   // the most urgent wins
    p.deps.push({ ...d, status: st });
    if (CSTATUS[st].rank > CSTATUS[p.status].rank) p.status = st;
    by.set(d.product_slug, p);
  }
  return [...by.values()];
}

// badge on Products and the Compatibility tab: products that need a look, a test or an update
let compatCount = 0;
function paintCompatBadge() {
  for (const el of [$("#compat-badge"), ...$$("[data-compat-count]")]) {
    if (!el) continue;
    el.hidden = !compatCount;
    el.textContent = compatCount;
    el.title = `${compatCount} product${compatCount === 1 ? "" : "s"} to check for Adobe compatibility`;
  }
}
async function refreshCompatBadge() {
  const { data, error } = await supabase.rpc("compat_overview");
  if (error) return;   // before the migration, or a network blip: no badge
  compat = data;
  compatCount = productStatuses().filter((p) => CSTATUS[p.status].rank > 0).length;
  paintCompatBadge();
}

async function loadCompat() {
  const { data, error } = await supabase.rpc("compat_overview");
  if (error) { $("#compat-products").innerHTML = `<p class="meta">${esc(error.message)}</p>`; return; }
  compat = data;
  // never checked yet: start the first (silent) check right away
  if (!compat.last_run) {
    const since = Date.now();
    await supabase.rpc("compat_check_now");
    $("#compat-checked").textContent = "Checking Adobe for the first time…";
    waitForRun(since, null);
  }
  renderCompat();
}

function renderCompat() {
  const run = compat.last_run;
  if (run) {
    const failed = compat.apps.filter((a) => a.last_error);
    $("#compat-checked").innerHTML = `Last checked ${esc(new Date(run.started_at).toLocaleString(CONFIG.LOCALE, { dateStyle: "medium", timeStyle: "short" }))}${failed.length ? ` · <span class="c-bad">couldn't read ${esc(failed.map((a) => a.name).join(", "))}</span>` : " · all four Adobe pages read"}`;
  }
  const prods = productStatuses();
  compatCount = prods.filter((p) => CSTATUS[p.status].rank > 0).length;
  paintCompatBadge();

  const counts = Object.fromEntries(Object.keys(CSTATUS).map((k) => [k, prods.filter((p) => p.status === k).length]));
  $("#compat-summary").innerHTML = Object.entries(CSTATUS).filter(([k]) => counts[k]).map(([k, c]) =>
    `<span class="cbadge cbadge--${c.cls}"><b>${counts[k]}</b> ${esc(c.label)}</span>`).join("")
    + `<span class="cbadge cbadge--none">Field Guides: no Adobe dependency (PDFs)</span>`;

  const appOf = (k) => compat.apps.find((a) => a.key === k) || { name: k };
  $("#compat-products").innerHTML = prods.map((p) => `
    <article class="cprod">
      <header class="cprod__head"><h2 class="cprod__name">${esc(p.name)}</h2><span class="cbadge cbadge--${CSTATUS[p.status].cls}">${esc(CSTATUS[p.status].label)}</span></header>
      ${checksHTML(p.slug)}
      ${p.deps.map((d) => {
        const app = appOf(d.app), latest = app.latest_version;
        return `<div class="cdep">
          <div class="cdep__main">
            <p class="cdep__app"><b>${esc(app.name)}</b>${d.min_version ? ` <span class="meta">needs ${esc(d.min_version)}+</span>` : ""}</p>
            <p class="meta">${esc(d.what)}</p>
          </div>
          <dl class="cdep__facts">
            <div><dt>Latest Adobe</dt><dd>${latest ? `${esc(latest)}${app.latest_label ? ` <span class="meta">${esc(app.latest_label)}</span>` : ""}` : "–"}</dd></div>
            <div><dt>Checked</dt><dd>${d.auto_checked_version ? `${d.auto_ok ? "Passed" : "Failed"} on ${esc(d.auto_checked_version)} <span class="meta">${shortDate(d.auto_checked_at)}</span>` : d.major_alerts ? `<span class="meta">Waiting for the first run</span>` : `<span class="meta">Covered by the product's checks</span>`}${d.last_verified_version ? `<br><span class="meta">Tested by hand on ${esc(d.last_verified_version)}</span>` : ""}</dd></div>
            <div><dt>Status</dt><dd><span class="cdot cdot--${CSTATUS[d.status].cls}"></span>${esc(CSTATUS[d.status].label)}</dd></div>
          </dl>
          ${latest && d.last_verified_version !== latest ? `<div class="cdep__acts">
            <button class="linkish" type="button" data-verify="${esc(d.product_slug)}|${esc(d.app)}|${esc(latest)}" title="Optional: only if you tried it yourself">I tested it on ${esc(latest)}</button>
          </div>` : ""}
        </div>`;
      }).join("")}
    </article>`).join("") || `<p class="meta">No products are linked to Adobe apps.</p>`;

  const list = compat.alerts.filter((a) => compatFilter === "all" || ACTIVE(a));
  $$("[data-compat-filter]").forEach((b) => b.classList.toggle("btn--ghost", b.dataset.compatFilter !== compatFilter));
  $("#compat-alerts").innerHTML = list.length ? list.map((a) => `
    <article class="calert calert--${a.level}">
      <header class="calert__head">
        <p><span class="cbadge cbadge--${a.level === "investigate" ? "look" : a.level === "confirmed" ? "bad" : "warn"}">${esc(LEVEL_LABEL[a.level] || a.level)}</span>
          <b>${esc(appOf(a.app).name)} ${esc(a.version)}</b> · ${esc(a.product_name)}</p>
        <span class="meta">${shortDate(a.created_at)}${a.emailed_at ? " · emailed" : a.baseline ? " · found at setup" : ""}</span>
      </header>
      <p>${esc(a.reason)}</p>
      ${(a.quotes || []).length ? `<blockquote class="calert__quotes">${a.quotes.map((q) => `<p>“${esc(q)}”</p>`).join("")}<cite>Adobe's release notes</cite></blockquote>` : ""}
      <p><b>What to do:</b> ${esc(a.action)}</p>
      <form class="calert__form" data-alert="${a.id}">
        <label class="visually-hidden" for="st-${a.id}">Status</label>
        <select class="select input--sm" id="st-${a.id}" name="status">${Object.entries(ALERT_STATUS).map(([k, l]) => `<option value="${k}"${k === a.status ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>
        <label class="visually-hidden" for="nt-${a.id}">Note</label>
        <input class="input input--sm" id="nt-${a.id}" name="note" placeholder="Note (what you checked)" value="${esc(a.note || "")}" maxlength="500">
        <button class="btn btn--sm" type="submit">Save</button>
      </form>
    </article>`).join("")
    : `<p class="meta">${compatFilter === "all" ? "No alerts yet." : "Nothing to do. New findings appear here and come by email."}</p>`;

  $("#compat-apps").innerHTML = `<thead><tr><th>App</th><th>Latest version</th><th>Released</th><th>First seen</th><th>Last checked</th><th>Source</th></tr></thead><tbody>${compat.apps.map((a) => `
    <tr><td>${esc(a.name)}</td><td>${esc(a.latest_version || "–")}</td><td>${esc(a.latest_label || "–")}</td><td>${a.latest_seen_at ? shortDate(a.latest_seen_at) : "–"}</td><td>${a.checked_at ? shortDate(a.checked_at) : "–"}</td>
    <td>${a.last_error ? `<span class="c-bad">Can't read (${a.error_count}×)</span><br><span class="meta">${esc(a.last_error)}</span>` : a.checked_at ? `<span class="c-ok">OK</span>` : "–"}</td></tr>`).join("")}</tbody>`;
  $("#compat-history").innerHTML = compat.versions.length
    ? `<thead><tr><th>Seen</th><th>App</th><th>Version</th><th>Notes that matched</th></tr></thead><tbody>${compat.versions.map((v) => `
      <tr><td>${shortDate(v.detected_at)}</td><td>${esc(appOf(v.app).name)}</td><td>${esc(v.version)}${v.is_major ? ` <span class="cbadge cbadge--warn">major</span>` : ""}${v.baseline ? ` <span class="meta">first check</span>` : ""}</td>
      <td>${(v.topics || []).length ? esc([...new Set(v.topics.map((t) => t.label + (t.strong ? "" : " (minor)")))].join(", ")) : `<span class="meta">nothing relevant</span>`}</td></tr>`).join("")}</tbody>`
    : `<tbody><tr><td class="meta">Nothing recorded yet.</td></tr></tbody>`;
}

// "Check Adobe now": wait for the run to finish, then say what it found (6 Nov 2026: before, nothing came back).
// The job writes a compat_runs row when it starts (ok = null) and fills ok + summary when it ends.
const APP_NAMES = { photoshop: "Photoshop", lightroom_classic: "Lightroom Classic", camera_raw: "Camera Raw", lightroom: "Lightroom" };
function runReport(run) {
  const s = run.summary || {};
  const apps = Object.keys(APP_NAMES).filter((k) => s[k]);
  const read = apps.filter((k) => !s[k].error), failed = apps.filter((k) => s[k].error);
  const fresh = read.filter((k) => s[k].new && !s[k].baseline);
  const lines = [];
  lines.push(read.length ? `Read ${read.length} of ${apps.length} Adobe pages: ${read.map((k) => `${APP_NAMES[k]} ${s[k].version}`).join(" · ")}.` : "Couldn't read any Adobe page.");
  if (read.some((k) => s[k].baseline)) lines.push("First check: today's versions are saved as the starting point (no email).");
  else lines.push(fresh.length ? `New since the last check: ${fresh.map((k) => `${APP_NAMES[k]} ${s[k].version}${s[k].major ? " (major)" : ""}`).join(", ")}.` : "No new Adobe versions since the last check.");
  lines.push(s.alerts_created ? `${s.alerts_created} new alert${s.alerts_created === 1 ? "" : "s"} below${s.email_requested ? ", and an email is on its way" : ""}.` : "No new alerts.");
  if (s.product_checks_requested) lines.push("The automatic product checks have started; their results appear on each product in about 2 minutes.");
  if (failed.length) lines.push(`Couldn't read: ${failed.map((k) => `${APP_NAMES[k]} (${s[k].error})`).join("; ")}.`);
  return { ok: !failed.length, lines };
}
function showRunResult(run) {
  const box = $("#compat-result");
  const r = runReport(run);
  box.className = `compat-result compat-result--${r.ok ? "ok" : "bad"}`;
  box.innerHTML = `<p><b>${r.ok ? "Check finished" : "Check finished with problems"}</b> · ${esc(new Date(run.started_at).toLocaleTimeString(CONFIG.LOCALE, { timeStyle: "short" }))}</p><ul>${r.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`;
  box.hidden = false;
}
async function waitForRun(since, btn) {
  const box = $("#compat-result");
  box.className = "compat-result"; box.hidden = false;
  box.innerHTML = `<p><b>Checking Adobe…</b> Reading the four release pages. This takes up to a minute.</p>`;
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    await new Promise((r) => setTimeout(r, 4000));
    const { data } = await supabase.rpc("compat_overview");
    const run = data?.last_run;
    if (run && Date.parse(run.started_at) >= since - 60000 && run.ok !== null && run.ok !== undefined) {
      compat = data; renderCompat(); showRunResult(run);
      if (btn) setBusy(btn, false);
      return;
    }
  }
  box.className = "compat-result compat-result--bad";
  box.innerHTML = `<p><b>No answer yet.</b> The check may still be running: reload this page in a minute.</p>`;
  if (btn) setBusy(btn, false);
}

$("#compat-check").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  setBusy(btn, true, "Checking…");
  const since = Date.now();
  const { data, error } = await supabase.rpc("compat_check_now");
  if (error) { setBusy(btn, false); return toast(error.message, { type: "error" }); }
  if (/last 5 minutes/.test(data || "")) {   // checked moments ago: show that result
    setBusy(btn, false);
    toast(data);
    if (compat?.last_run) showRunResult(compat.last_run);
    return;
  }
  waitForRun(since, btn);
});
$("[data-panel=compat]").addEventListener("click", async (e) => {
  const f = e.target.closest("[data-compat-filter]");
  if (f) { compatFilter = f.dataset.compatFilter; return renderCompat(); }
  const v = e.target.closest("[data-verify], [data-verify-other]");
  if (!v) return;
  const [slug, appKey, ver] = (v.dataset.verify || v.dataset.verifyOther).split("|");
  const version = ver || prompt("Which version did you test on? (for example 27.11)", compat.apps.find((a) => a.key === appKey)?.latest_version || "");
  if (!version) return;
  const { error } = await supabase.rpc("compat_mark_verified", { p_product: slug, p_app: appKey, p_version: version.trim() });
  if (error) return toast(error.message, { type: "error" });
  toast(`Recorded: tested on ${version.trim()}.`);
  loadCompat();
});
$("[data-panel=compat]").addEventListener("submit", async (e) => {
  const form = e.target.closest("[data-alert]");
  if (!form) return;
  e.preventDefault();
  const { error } = await supabase.rpc("compat_set_alert", { p_alert: form.dataset.alert, p_status: form.elements.status.value, p_note: form.elements.note.value });
  if (error) return toast(error.message, { type: "error" });
  toast("Saved.");
  loadCompat();
});

// "Needs attention" on the overview: only what asks for action, each with a way to it
async function loadAttention() {
  const box = $("#attention");
  await refreshCompatBadge();
  const items = [];
  const prods = compat ? productStatuses().filter((p) => CSTATUS[p.status].rank > 0) : [];
  for (const p of prods) items.push({ cls: CSTATUS[p.status].cls, text: `${p.name}: ${CSTATUS[p.status].label.toLowerCase()} (Adobe)`, tab: "compat" });
  const failed = (compat?.apps || []).filter((a) => a.last_error);
  if (failed.length) items.push({ cls: "bad", text: `The Adobe check can't read ${failed.map((a) => a.name).join(", ")}`, tab: "compat" });
  const tickets = Number($("#open-tickets")?.textContent || 0);
  if (tickets) items.push({ cls: "warn", text: `${tickets} open support ticket${tickets === 1 ? "" : "s"}`, tab: "support" });
  box.hidden = !items.length;
  box.innerHTML = `<h2 class="admin-h2">Needs attention</h2><ul>${items.map((i) => `<li><span class="cdot cdot--${i.cls}"></span><span>${esc(i.text)}</span><button class="linkish" type="button" data-tab="${i.tab}">Open</button></li>`).join("")}</ul>`;
}

// ---------------------------------------------------------------- Finances (Jeinna, 6 Nov 2026)
// Gross = what customers paid (tax included). Tax = the VAT in it: the 18% Israeli VAT inside an Israeli buyer's price
// (orders.vat_rate; Matan reports it), plus any tax Lemon Squeezy (the merchant of record) collects itself. Lemon Squeezy's fee isn't in its API, so it is ESTIMATED from its published rates
// (docs.lemonsqueezy.com/help/getting-started/fees, 6 Nov 2026): 5% of the order total + 50¢, +1.5% for buyers outside
// the US, +1.5% for PayPal (the shop can't tell which orders were PayPal). Net = gross − tax − fee. Refunded orders
// bring nothing in (whether Lemon Squeezy returns its fee on a refund isn't stated, so it isn't counted).
const FEES = { pct: 5, fixedCents: 50, intlPct: 1.5, paypalPct: 1.5, source: "https://docs.lemonsqueezy.com/help/getting-started/fees" };
let finRows = [];

function finPeriods() {
  const out = [], now = new Date();
  for (let i = 0; i < 12; i++) {
    const a = new Date(now.getFullYear(), now.getMonth() - i, 1), b = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    out.push({ key: `m${i}`, label: i === 0 ? `This month (${a.toLocaleDateString("en-GB", { month: "long", year: "numeric" })})` : a.toLocaleDateString("en-GB", { month: "long", year: "numeric" }), from: a, to: b });
  }
  out.push({ key: "y", label: "Last 12 months", from: new Date(now.getFullYear(), now.getMonth() - 11, 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 1), months: true });
  out.push({ key: "all", label: "All time", from: new Date(2020, 0, 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 1), months: true });
  return out;
}

function finCalc(r) {
  // the +1.5% applies to buyers outside the US: each order by its own billing country (unknown: counted as outside)
  const intl = !/^(US|USA|UNITED STATES( OF AMERICA)?)$/.test(String(r.country || "").trim().toUpperCase());
  const counts = r.status !== "refunded";
  const gross = counts ? r.total_cents : 0;
  // the tax in the total: the Israeli VAT included in an Israeli buyer's price (orders.vat_rate, 18%) plus any tax
  // Lemon Squeezy collects itself (none so far)
  const rate = Number(r.vat_rate) || 0;
  const vat = counts && rate > 0 ? Math.round(r.total_cents - r.total_cents / (1 + rate)) : 0;
  const tax = counts ? (r.tax_cents || 0) + vat : 0;
  const fee = counts ? Math.round(FEES.fixedCents + r.total_cents * (FEES.pct + (intl ? FEES.intlPct : 0)) / 100) : 0;
  return { gross, tax, vat, fee, net: gross - tax - fee };
}

async function loadFinance() {
  const sel = $("#fin-period");
  if (!sel.options.length) {
    sel.innerHTML = finPeriods().map((p) => `<option value="${p.key}">${esc(p.label)}</option>`).join("");
    sel.addEventListener("change", loadFinance);
    $("#fin-csv").addEventListener("click", () => downloadCsv("finances", finCols, finRows));
  }
  const p = finPeriods().find((x) => x.key === sel.value) || finPeriods()[0];
  const { data, error } = await supabase.rpc("admin_finance", { p_from: p.from.toISOString(), p_to: p.to.toISOString() });
  check(error);
  finRows = data;
  renderFinance();
}

function renderFinance() {
  const p = finPeriods().find((x) => x.key === $("#fin-period").value) || finPeriods()[0];
  const rows = finRows;
  const cur = rows[0]?.currency || "USD";
  const sum = (k) => rows.reduce((n, r) => n + finCalc(r)[k], 0);
  const paid = rows.filter((r) => r.status !== "refunded");
  const refunded = rows.filter((r) => r.status === "refunded");
  const tiles = [
    ["Gross sales", money(sum("gross"), cur), `${paid.length} order${paid.length === 1 ? "" : "s"}, what customers paid`],
    ["Tax", money(sum("tax"), cur), "Israeli VAT (18%) in Israeli buyers' prices, plus any tax Lemon Squeezy collects"],
    ["Lemon Squeezy fees", money(sum("fee"), cur), "estimated"],
    ["Net to you", money(sum("net"), cur), "estimated, before payout fees"],
    ["Refunded", refunded.length ? `${refunded.length}` : "0", refunded.length ? `${money(refunded.reduce((n, r) => n + r.total_cents, 0), cur)} returned` : "orders"],
  ];
  $("#fin-tiles").innerHTML = tiles.map(([l, v, sub]) => `<div class="tile"><span class="tile__label">${esc(l)}</span><span class="tile__value${String(v).length > 9 ? " tile__value--long" : ""}">${esc(v)}</span><span class="tile__sub">${esc(sub)}</span></div>`).join("");

  // by month, for the longer periods
  $("#fin-months-panel").hidden = !p.months;
  if (p.months) {
    const by = new Map();
    for (const r of rows) {
      const k = r.created_at.slice(0, 7);
      const m = by.get(k) || { orders: 0, gross: 0, tax: 0, fee: 0, net: 0 };
      const c = finCalc(r);
      if (r.status !== "refunded") m.orders++;
      for (const x of ["gross", "tax", "fee", "net"]) m[x] += c[x];
      by.set(k, m);
    }
    const keys = [...by.keys()].sort().reverse();
    $("#fin-months").innerHTML = keys.length
      ? `<thead><tr><th>Month</th><th class="num">Orders</th><th class="num">Gross</th><th class="num">Tax</th><th class="num">Fees (est.)</th><th class="num">Net (est.)</th></tr></thead><tbody>${keys.map((k) => {
          const m = by.get(k);
          return `<tr><td>${esc(new Date(k + "-01T00:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" }))}</td><td class="num">${m.orders}</td><td class="num">${money(m.gross, cur)}</td><td class="num">${money(m.tax, cur)}</td><td class="num">${money(m.fee, cur)}</td><td class="num"><b>${money(m.net, cur)}</b></td></tr>`;
        }).join("")}</tbody>`
      : `<tbody><tr><td class="meta">No orders in this period.</td></tr></tbody>`;
  }

  const STATUS = { paid: "Paid", refunded: "Refunded", partially_refunded: "Partly refunded" };
  $("#fin-orders").innerHTML = rows.length
    ? `<thead><tr><th>Date</th><th>Order</th><th>Customer</th><th>Country</th><th>Products</th><th>Status</th><th class="num">Paid</th><th class="num">Tax</th><th class="num">Fee (est.)</th><th class="num">Net (est.)</th></tr></thead><tbody>${rows.map((r) => {
        const c = finCalc(r);
        return `<tr><td>${esc(dateTime(r.created_at))}</td><td>${esc(r.order_number || "")}</td><td>${esc(r.email)}</td><td>${esc(countryName(r.country))}</td><td>${esc(r.products || "")}</td><td>${esc(STATUS[r.status] || r.status)}</td><td class="num">${money(r.total_cents, r.currency)}${r.status === "refunded" ? " (refunded)" : ""}</td><td class="num">${money(c.tax, r.currency)}${c.vat ? `<div class="meta">18% VAT</div>` : ""}</td><td class="num">${money(c.fee, r.currency)}</td><td class="num"><b>${money(c.net, r.currency)}</b></td></tr>`;
      }).join("")}</tbody>`
    : `<tbody><tr><td class="meta">No orders in this period.</td></tr></tbody>`;

  $("#fin-note").innerHTML = `Lemon Squeezy's fee is estimated from <a class="link" href="${FEES.source}" target="_blank" rel="noopener">its published rates</a>: ${FEES.pct}% of the order total + 50¢, plus ${FEES.intlPct}% when the buyer is outside the US (each order by its buyer's billing country; an order without a country yet is counted as outside the US). PayPal orders cost another ${FEES.paypalPct}%, which isn't included. Lemon Squeezy's payout fee (when the money moves to your bank) isn't included either. The exact figures are in Lemon Squeezy → Payouts.${rows.some((r) => r.status === "partially_refunded") ? " Partly refunded orders are counted in full: check the refunded part in Lemon Squeezy." : ""} Test orders are left out.`;
}

const finCols = [
  { label: "Date", value: (r) => dateTime(r.created_at) },
  { label: "Order", value: (r) => r.order_number || "" },
  { label: "Customer", value: (r) => r.email },
  { label: "Country", value: (r) => countryName(r.country) },
  { label: "Products", value: (r) => r.products || "" },
  { label: "Status", value: (r) => r.status },
  { label: "Currency", value: (r) => r.currency },
  { label: "Paid", value: (r) => (r.total_cents / 100).toFixed(2) },
  { label: "Tax", value: (r) => (finCalc(r).tax / 100).toFixed(2) },
  { label: "Lemon Squeezy fee (estimated)", value: (r) => (finCalc(r).fee / 100).toFixed(2) },
  { label: "Net (estimated)", value: (r) => (finCalc(r).net / 100).toFixed(2) },
  { label: "Discount code", value: (r) => r.discount_code || "" },
];

const orderCols = [
  { label: "Date", value: (r) => dateTime(r.created_at) },
  { label: "Order", value: (r) => r.order_number || r.checkout_order_id },
  { label: "Customer", value: (r) => r.email },
  { label: "Country", value: (r) => countryName(r.country) },
  { label: "Packs", wrap: true, value: (r) => r.products },
  { label: "Total", num: true, value: (r) => money(r.total_cents, r.currency) },
  { label: "Source", value: (r) => r.source || "" },
  { label: "Status", value: (r) => r.status, html: (r) => `<span class="status status--${esc(r.status)}">${esc(r.status.replace("_", " "))}</span>` },
  // Lemon Squeezy test-mode checkouts: kept for the record, left out of every total
  { label: "Test", value: (r) => (r.test_mode ? "test" : ""), html: (r) => (r.test_mode ? `<span class="status status--test">Test order</span>` : "") },
  // Receipt and invoice (Lemon Squeezy's documents for the order: admin-docs function, 6 Nov 2026)
  { label: "Documents", value: () => "", html: (r) => {
    const docs = orderDocs.filter((d) => d.order_id === r.id);
    const sent = docs.filter((d) => d.emailed_at).sort((a, b) => b.emailed_at.localeCompare(a.emailed_at))[0];
    void sent;
    return `<div class="docs" data-order="${r.id}"><button class="btn btn--sm btn--ghost" type="button" data-docs-open>Documents</button></div>`;
  } },
];
let orderDocs = [];
// ---- Morning (Green Invoice) documents: an invoice-receipt and a work order per sale (scheduler morning.ts, 6 Nov 2026)
let morningDocs = [], morningMode = null;
const MKIND = { invoice_receipt: "Invoice-receipt", work_order: "Work order" };
function morningLink(d) {
  const label = `${MKIND[d.kind]}${d.number ? ` ${esc(d.number)}` : ""}`;
  if (d.status === "issued") return d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener">${label}</a>` : `<span>${label}</span>`;
  if (d.status === "preview") return `<button class="linkish" type="button" data-mpreview="${d.id}" title="Morning's demo PDF: nothing was issued">${MKIND[d.kind]} preview</button>`;
  if (d.status === "failed") return `<span class="mfail" title="${esc(d.error || "")}">${MKIND[d.kind]}: failed</span>`;
  return `<span class="meta">${MKIND[d.kind]}: sending…</span>`;
}
// an issued invoice-receipt can be emailed to the buyer (the work order is internal), 8 Nov 2026
function emailBuyerBtn(d) {
  if (!d || d.kind !== "invoice_receipt" || d.status !== "issued") return "";
  return `<button class="btn btn--sm${d.emailed_at ? " btn--ghost" : ""}" type="button" data-memail="${d.order_id}">${d.emailed_at ? "Email again" : "Email to buyer"}</button>${d.emailed_at ? `<div class="meta">Emailed ${esc(dateTime(d.emailed_at))}${d.emailed_to ? ` to ${esc(d.emailed_to)}` : ""}</div>` : ""}`;
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-memail]");
  if (!b) return;
  const id = b.dataset.memail;
  const o = orderRows.find((x) => x.id === id) || morningRows.find((x) => x.order_id === id)?.orders;
  if (!confirm(`Email the Morning invoice-receipt for order ${o?.order_number || ""} to the buyer${(o?.email || o?.customers?.email) ? ` (${o.email || o.customers.email})` : ""}?`)) return;
  setBusy(b, true, "Sending…");
  try {
    const r = await adminDocs({ action: "morning_email", order_id: id });
    toast(`Invoice-receipt emailed to ${r.to}.`);
    setTimeout(() => (location.hash === "#morning" ? loadMorning() : loadOrderDocs()), 2500);
  } catch (err) { toast(err.message, { type: "error", timeout: 8000 }); }
  setBusy(b, false);
});

// the order's documents panel
let docsOrder = null;
function renderDocsPanel() {
  const r = docsOrder;
  if (!r) return;
  const docs = orderDocs.filter((d) => d.order_id === r.id);
  const sent = docs.filter((d) => d.emailed_at).sort((a, b) => b.emailed_at.localeCompare(a.emailed_at))[0];
  $("#docs-for").textContent = `Order ${r.order_number || r.checkout_order_id} · ${r.email} · ${money(r.total_cents, r.currency)}`;
  $("#docs-body").dataset.order = r.id;
  const mdocs = morningDocs.filter((d) => d.order_id === r.id);
  const row = (kind) => {
    const d = mdocs.find((x) => x.kind === kind);
    const state = !d ? `<span class="meta">Not sent</span>`
      : d.status === "issued" ? `<span class="dchip dchip--ok">Issued${d.number ? ` ${esc(d.number)}` : ""}</span>`
      : d.status === "preview" ? `<span class="dchip dchip--warn">Preview</span>`
      : d.status === "failed" ? `<span class="dchip dchip--bad">Failed</span>`
      : `<span class="dchip dchip--muted">Sending…</span>`;
    const open = d?.status === "issued" && d.url ? `<a class="btn btn--sm btn--ghost" href="${esc(d.url)}" target="_blank" rel="noopener">Open PDF</a>`
      : d?.status === "preview" ? `<button class="btn btn--sm btn--ghost" type="button" data-mpreview="${d.id}">View preview</button>` : "";
    return `<li class="drow"><span class="drow__name">${MKIND[kind]}</span>${state}<span class="drow__act">${open}${emailBuyerBtn(d)}</span>${d?.status === "failed" ? `<p class="meta drow__why">${esc(d.error || "")}</p>` : ""}</li>`;
  };
  let morning = "";
  if (r.test_mode) morning = `<p class="meta">Test orders never get Morning documents.</p>`;
  else if (morningMode === "off") morning = mdocs.length
    ? `<ul class="dlist">${row("invoice_receipt")}${row("work_order")}</ul><p class="meta">Issued to the buyer before 8 Nov 2026: cancel it with a credit note in Sales → Morning invoices. Sales are now invoiced to Lemon Squeezy once per payout.</p>`
    : `<p class="meta">Invoiced in Morning to Lemon Squeezy with its payout (Sales → Morning invoices).</p>`;
  else {
    const issued = mdocs.filter((d) => d.status === "issued");
    const both = issued.length === 2;
    const busy = mdocs.some((d) => d.status === "sending");
    const acts = r.status !== "paid" || both || busy ? "" : `<div class="row dacts">
      ${!mdocs.some((d) => d.status === "preview") ? `<button class="btn btn--sm btn--ghost" type="button" data-morning="preview">Make a preview</button>` : ""}
      <button class="btn btn--sm" type="button" data-morning="create">${issued.length ? "Issue the work order" : "Issue in Morning"}</button></div>`;
    const refund = r.status !== "paid" && issued.some((d) => d.kind === "invoice_receipt") ? `<p class="mfail">Refunded: cancel the invoice-receipt in Morning with a credit note.</p>` : "";
    morning = `<ul class="dlist">${row("invoice_receipt")}${row("work_order")}</ul>${refund}${acts}`;
  }
  $("#docs-body").innerHTML = `
    <section class="dsec"><h3 class="h4">Morning <span class="meta">tax documents</span></h3>${morning}</section>
    <section class="dsec"><h3 class="h4">Lemon Squeezy <span class="meta">payment receipt</span></h3>
      <div class="row dacts">
        <button class="btn btn--sm btn--ghost" type="button" data-doc="receipt" title="Lemon Squeezy's receipt page (print or save it as PDF from there)">Open receipt</button>
        <button class="btn btn--sm btn--ghost" type="button" data-doc="invoice" title="Lemon Squeezy's invoice PDF (needs the billing address)">Invoice PDF</button>
        <button class="btn btn--sm btn--ghost" type="button" data-doc="email" title="Email the receipt to ${esc(r.email)}">Email receipt</button>
      </div>
      ${sent ? `<p class="meta">Receipt emailed ${shortDate(sent.emailed_at)}.</p>` : ""}
    </section>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-docs-open]");
  if (!b) return;
  docsOrder = orderRows.find((o) => o.id === b.closest("[data-order]").dataset.order);
  renderDocsPanel();
  $("#docs-dialog").showModal();
});
$("#docs-close").addEventListener("click", () => $("#docs-dialog").close());
async function loadMorningDocs(ids) {
  const [{ data: st }, { data }] = await Promise.all([
    supabase.from("morning_settings").select("mode").eq("id", 1).maybeSingle(),
    ids.length ? supabase.from("morning_documents").select("id, order_id, kind, status, number, url, error, emailed_at, emailed_to").in("order_id", ids.slice(0, 300)) : Promise.resolve({ data: [] }),
  ]);
  morningMode = st?.mode ?? null;
  morningDocs = data || [];
}
// the demo PDF Morning made (kept until the document is issued)
async function openMorningPreview(id) {
  const { data, error } = await supabase.from("morning_documents").select("preview_pdf").eq("id", id).maybeSingle();
  if (error || !data?.preview_pdf) return toast("The preview isn't available.", { type: "error" });
  const bytes = Uint8Array.from(atob(data.preview_pdf), (c) => c.charCodeAt(0));
  openDoc(URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })));
}
document.addEventListener("click", async (e) => {
  const pv = e.target.closest("[data-mpreview]");
  if (pv) return openMorningPreview(pv.dataset.mpreview);
  const b = e.target.closest("[data-morning]");
  if (!b) return;
  const id = b.closest("[data-order]").dataset.order;
  const order = orderRows.find((o) => o.id === id) || morningRows.find((o) => o.order_id === id);
  const create = b.dataset.morning === "create";
  if (create && !confirm(`Issue the Morning documents for order ${order?.order_number || ""}?\n\nThey are real tax documents: once issued they can only be cancelled with a credit note.`)) return;
  setBusy(b, true, create ? "Issuing…" : "Asking…");
  const { data, error } = await supabase.rpc("morning_request", { p_order: id, p_action: b.dataset.morning });
  setBusy(b, false);
  if (error) return toast(error.message, { type: "error", timeout: 8000 });
  toast(data);
  // the answer comes back in a minute: look again a few times
  for (const wait of [20000, 40000, 70000]) setTimeout(() => (location.hash === "#morning" ? loadMorning() : loadOrderDocs()), wait);
});
// admin-docs: the admin's own session token goes along; the function checks is_admin() with it
async function adminDocs(body) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Please sign in again.");
  const res = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/admin-docs`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: CONFIG.SUPABASE_ANON_KEY, authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || `Request failed (${res.status})`);
  return out;
}
// open a document in a new tab (the browser's PDF viewer for an invoice: save or print from there)
function openDoc(url) {
  // (with "noopener" window.open always returns null, which looked like a blocked pop-up and sent the admin page away)
  const w = window.open(url, "_blank");
  if (w) w.opener = null;
  else toast("Your browser blocked the new tab. Allow pop-ups for this page and try again.", { type: "error", timeout: 8000 });
}
$("#docs-dialog").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-doc]");
  if (!b) return;
  const id = b.closest("[data-order]").dataset.order;
  const order = orderRows.find((o) => o.id === id);
  if (b.dataset.doc === "invoice") { $("#docs-dialog").close(); return openInvoiceDialog(order); }
  if (b.dataset.doc === "email" && !confirm(`Email the receipt for order ${order.order_number || ""} to ${order.email}?`)) return;
  setBusy(b, true, b.dataset.doc === "email" ? "Sending…" : "Opening…");
  try {
    if (b.dataset.doc === "receipt") openDoc((await adminDocs({ action: "receipt", order_id: id })).url);
    else { const r = await adminDocs({ action: "email", order_id: id }); toast(`Receipt emailed to ${r.to}.`); }
    loadOrderDocs();
  } catch (err) { toast(err.message, { type: "error", timeout: 8000 }); }
  setBusy(b, false);
});
async function loadOrderDocs() {
  const ids = orderRows.map((o) => o.id);
  if (!ids.length) return;
  const [{ data }] = await Promise.all([
    supabase.from("order_documents").select("order_id, kind, emailed_at, created_at").in("order_id", ids.slice(0, 300)),
    loadMorningDocs(ids),
  ]);
  orderDocs = data || [];
  $("#orders-table").innerHTML = tableHTML(orderCols, orderRows);
  if ($("#docs-dialog").open) { docsOrder = orderRows.find((o) => o.id === docsOrder?.id) || docsOrder; renderDocsPanel(); }
}

// Invoice: Lemon Squeezy needs the billing address (the shop doesn't collect addresses)
let invOrder = null;
function openInvoiceDialog(order) {
  invOrder = order;
  const f = $("#inv-form");
  f.reset();
  f.elements.name.value = order.name || "";
  f.elements.country.value = (order.country || "").toUpperCase().slice(0, 2);
  $("#inv-for").textContent = `Order ${order.order_number || ""} · ${order.email}`;
  setStatus($(".form-status", f), "");
  $("#inv-dialog").showModal();
  f.elements.name.focus();
}
$("#inv-cancel").addEventListener("click", () => $("#inv-dialog").close());
$("#inv-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.currentTarget, send = e.submitter?.dataset.send === "1";
  const billing = Object.fromEntries(["name", "address", "city", "state", "zip_code", "country", "notes"].map((k) => [k, f.elements[k].value.trim()]));
  billing.country = billing.country.toUpperCase();
  const btn = e.submitter;
  setBusy(btn, true, send ? "Sending…" : "Creating…");
  try {
    const inv = await adminDocs({ action: "invoice", order_id: invOrder.id, billing });
    if (send) {
      const r = await adminDocs({ action: "email", order_id: invOrder.id, document_id: inv.document_id });
      toast(`Invoice and receipt emailed to ${r.to}.`);
    } else {
      openDoc(inv.url);
      toast("Invoice created.");
    }
    $("#inv-dialog").close();
    loadOrderDocs();
  } catch (err) { setStatus($(".form-status", f), err.message, "error"); }
  setBusy(btn, false);
});
let orderRows = [];
async function loadOrders() {
  const term = $("#orders-search").value.trim();
  let q = supabase.from("admin_orders").select("*").order("created_at", { ascending: false }).limit(500);
  if (term) q = q.or(`email.ilike.%${term.replace(/[%,()]/g, "")}%,order_number.eq.${term.replace(/[^0-9A-Za-z-]/g, "") || "0"}`);
  const { data, error } = await q;
  check(error);
  orderRows = data;
  $("#orders-table").innerHTML = tableHTML(orderCols, data);
  loadOrderDocs();
}
$("#orders-search").addEventListener("input", debounce(loadOrders));
$("#orders-csv").addEventListener("click", () => downloadCsv("orders", orderCols.filter((c) => c.label !== "Documents"), orderRows));

// Customers
const customerCols = [
  { label: "Joined", value: (r) => dateTime(r.created_at) },
  { label: "Email", value: (r) => r.email },
  { label: "Name", value: (r) => r.name || "" },
  { label: "Country", value: (r) => countryName(r.country) },
  { label: "Paid orders", num: true, value: (r) => r.paid_orders },
  { label: "Lifetime value", num: true, value: (r) => money(r.lifetime_cents, "USD") },
  { label: "Last order", value: (r) => (r.last_order_at ? shortDate(r.last_order_at) : "") },
  { label: "Marketing", value: (r) => (r.marketing_opt_in ? "Yes" : "No") },
];
let customerRows = [];
async function loadCustomers() {
  const term = $("#customers-search").value.trim().replace(/[%,()]/g, "");
  // the free-guide pop-up's sign-ups who haven't bought are under People → Sign-ups (Jeinna, 7 Nov 2026)
  let q = supabase.from("admin_customers").select("*").eq("signup_only", false).order("lifetime_cents", { ascending: false }).limit(1000);
  if (term) q = q.or(`email.ilike.%${term}%,name.ilike.%${term}%`);
  const { data, error } = await q;
  check(error);
  customerRows = data;
  $("#customers-table").innerHTML = tableHTML(customerCols, data);
}
$("#customers-search").addEventListener("input", debounce(loadCustomers));
$("#customers-csv").addEventListener("click", () => downloadCsv("customers", customerCols, customerRows));

// ---------------------------------------------------------------- sign-ups (the free-guide pop-up), 7 Nov 2026
const signupCols = [
  { label: "Signed up", value: (r) => dateTime(r.created_at) },
  { label: "Name", value: (r) => r.name || "" },
  { label: "Email", value: (r) => r.email },
  { label: "Phone", value: (r) => r.phone || "" },
  { label: "Country", value: (r) => countryName(r.country) },
  { label: "Language", value: (r) => (r.lang === "he" ? "Hebrew" : "English") },
  { label: "Emails OK", value: (r) => (r.consent ? "Yes" : "No") },
  { label: "Email confirmed", value: (r) => (r.confirmed_at ? dateTime(r.confirmed_at) : "Not yet") },
  { label: "Bought", value: (r) => (r.paid_orders > 0 ? `Yes (${r.paid_orders})` : "No") },
];
let signupRows = [];
async function loadSignups() {
  const term = $("#signups-search").value.trim().replace(/[%,()]/g, "");
  let q = supabase.from("admin_signups").select("*").order("created_at", { ascending: false }).limit(2000);
  if (term) q = q.or(`email.ilike.%${term}%,name.ilike.%${term}%,phone.ilike.%${term}%`);
  const { data, error } = await q;
  check(error);
  signupRows = data || [];
  $("#signups-count").textContent = `${signupRows.length} sign-up${signupRows.length === 1 ? "" : "s"}`;
  $("#signups-table").innerHTML = tableHTML(signupCols, signupRows);
}
$("#signups-search").addEventListener("input", debounce(loadSignups));
$("#signups-csv").addEventListener("click", () => downloadCsv("sign-ups", signupCols, signupRows));

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


// ---- Sales → Morning invoices (8 Nov 2026): one invoice-receipt to Lemon Squeezy per payout, and the earlier
// per-buyer documents with their credit notes
let morningRows = [];
const MSTATUS = { waiting: "Waiting", sending: "Sending…", preview: "Preview (not issued)", issued: "Issued", failed: "Failed" };
const usd = (c) => money(c || 0, "USD");

// The payout CSV from Lemon Squeezy: Date, Sale ("Order #9948604", "Refund - Order #…"), …, Net Total (USD)
function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
let payoutLines = null;
function readPayout(text) {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  const head = (rows.shift() || []).map((h) => h.trim().toLowerCase());
  const col = (name) => head.indexOf(name.toLowerCase());
  const [iDate, iSale, iNet] = [col("Date"), col("Sale"), col("Net Total (USD)")];
  if (iSale < 0 || iNet < 0) throw new Error("This isn't a Lemon Squeezy payout CSV: it needs the columns Sale and Net Total (USD).");
  const lines = rows.filter((r) => (r[iSale] || "").trim() && !/^totals?$/i.test((r[iSale] || "").trim())).map((r) => ({
    date: iDate >= 0 ? (r[iDate] || "").trim() : "",
    sale: (r[iSale] || "").trim().slice(0, 200),
    order_id: ((r[iSale] || "").match(/Order\s+#(\d+)/i) || [])[1] || "",
    net_cents: Math.round(parseFloat(String(r[iNet] || "0").replace(/[^0-9.-]/g, "")) * 100) || 0,
  }));
  if (!lines.length) throw new Error("The file has no payout lines.");
  return lines;
}
$("#payout-file").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  payoutLines = null;
  $("#payout-read").textContent = "";
  if (!file) return;
  try {
    payoutLines = readPayout(await file.text());
    const total = payoutLines.reduce((t, l) => t + l.net_cents, 0);
    // the payout's date: the last line's (as Lemon Squeezy lists it), in your own time zone
    const last = new Date(payoutLines[payoutLines.length - 1].date.replace(" ", "T"));
    if (!isNaN(last)) $("#payout-date").value = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
    $("#payout-read").textContent = `${payoutLines.length} lines, ${usd(total)} paid out in all. Check the payout date, then make the preview.`;
  } catch (err) { $("#payout-read").textContent = err.message; }
});
$("#payout-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.currentTarget, btn = e.submitter, st = $(".form-status", f);
  if (!payoutLines) return setStatus(st, "Choose the payout's CSV first.", "error");
  if (!f.elements.date.value) return setStatus(st, "Fill in the payout date.", "error");
  setBusy(btn, true, "Sending…");
  const { error } = await supabase.rpc("morning_payout_upload", { p_date: f.elements.date.value, p_rows: payoutLines });
  setBusy(btn, false);
  if (error) return setStatus(st, error.message, "error");
  setStatus(st, "Morning is making the preview. It appears below in a minute.", "ok");
  f.reset(); payoutLines = null; $("#payout-read").textContent = "";
  for (const wait of [15000, 35000, 70000]) setTimeout(loadMorning, wait);
  loadMorning();
});

function previewOrPdf(d) {
  if (!d) return "";
  if (d.status === "issued") return d.url ? `<a class="btn btn--sm btn--ghost" href="${esc(d.url)}" target="_blank" rel="noopener">Open PDF${d.number ? ` ${esc(d.number)}` : ""}</a>` : `<span>${esc(d.number || "")}</span>`;
  if (d.status === "preview") return `<button class="btn btn--sm btn--ghost" type="button" data-mpreview="${d.id}">View preview</button>`;
  return "";
}
function sendBtns(d) {
  if (!d || d.status === "issued" || d.status === "sending" || d.status === "waiting") return "";
  const issue = d.status === "preview" ? `<button class="btn btn--sm" type="button" data-msend="${d.id}" data-act="create">${d.kind === "credit_note" ? "Issue the credit note" : "Issue in Morning"}</button>` : "";
  return `${issue}<button class="btn btn--sm btn--ghost" type="button" data-msend="${d.id}" data-act="preview">${d.status === "failed" ? "Try again" : "Preview again"}</button>`;
}
async function loadMorning() {
  const { data: rows, error } = await supabase.from("morning_documents")
    .select("id, order_id, kind, status, number, url, error, action, created_at, sent_at, issued_at, emailed_at, emailed_to, payout_date, summary, linked_id, orders(order_number, status, total_cents, currency, customers(email, name))")
    .order("created_at", { ascending: false }).limit(300);
  if (error) { $("#payout-docs").innerHTML = `<p class="meta">Couldn't load the Morning documents.</p>`; return; }
  morningRows = rows || [];
  // payout invoices
  const payouts = morningRows.filter((d) => d.kind === "payout").sort((a, b) => (b.payout_date || "").localeCompare(a.payout_date || ""));
  $("#payout-docs").innerHTML = payouts.length ? `<table class="table"><thead><tr><th>Payout</th><th class="num">Buyers in Israel<br><span class="meta">VAT included</span></th><th class="num">VAT 18%</th><th class="num">Buyers abroad<br><span class="meta">0%</span></th><th class="num">Total</th><th>Document</th></tr></thead><tbody>${payouts.map((d) => {
    const m = d.summary || {};
    const note = (m.unmatched || []).length ? `<div class="meta">${m.unmatched.length} line${m.unmatched.length === 1 ? "" : "s"} not in the shop (checked with Lemon Squeezy)</div>` : "";
    return `<tr><td>${esc(d.payout_date ? new Date(d.payout_date + "T12:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "")}<div class="meta">${m.lines ?? ""} lines</div></td>
      <td class="num">${m.total_cents != null ? usd(m.il_cents) : ""}</td><td class="num">${m.total_cents != null ? usd(m.vat_cents) : ""}</td>
      <td class="num">${m.total_cents != null ? usd(m.abroad_cents) : ""}</td><td class="num"><b>${m.total_cents != null ? usd(m.total_cents) : ""}</b></td>
      <td><div class="mcell"><span class="dchip dchip--${d.status === "issued" ? "ok" : d.status === "failed" ? "bad" : d.status === "preview" ? "warn" : "muted"}">${esc(MSTATUS[d.status] || d.status)}</span>${previewOrPdf(d)}${sendBtns(d)}</div>${d.status === "failed" ? `<div class="meta mfail__why">${esc(d.error || "")}</div>` : ""}${note}</td></tr>`;
  }).join("")}</tbody></table>` : `<p class="meta">No payout invoices yet. Upload your first payout's CSV above.</p>`;
  // earlier per-buyer documents, with their credit notes
  const byOrder = new Map();
  for (const d of morningRows.filter((x) => x.order_id)) {
    if (!byOrder.has(d.order_id)) byOrder.set(d.order_id, { order: d.orders, docs: {} });
    byOrder.get(d.order_id).docs[d.kind] = d;
  }
  const cell = (d) => (d ? `${morningLink(d)}<div class="meta">${esc(MSTATUS[d.status] || d.status)}</div>` : `<span class="meta">None</span>`);
  const creditCell = (g) => {
    const inv = g.docs.invoice_receipt, cn = g.docs.credit_note;
    if (!inv || inv.status !== "issued") return `<span class="meta">Nothing to cancel</span>`;
    if (!cn) return `<button class="btn btn--sm" type="button" data-mcredit="${inv.order_id}">Cancel with credit note</button>`;
    return `<div class="mcell"><span class="dchip dchip--${cn.status === "issued" ? "ok" : cn.status === "failed" ? "bad" : "warn"}">${cn.status === "issued" ? "Cancelled" : esc(MSTATUS[cn.status] || cn.status)}</span>${previewOrPdf(cn)}${sendBtns(cn)}</div>${cn.status === "failed" ? `<div class="meta mfail__why">${esc(cn.error || "")}</div>` : ""}`;
  };
  $("#morning-docs").innerHTML = byOrder.size ? `<table class="table"><thead><tr><th>Order</th><th>Customer</th><th>Invoice-receipt</th><th>Work order</th><th>Credit note</th></tr></thead><tbody>${[...byOrder].map(([id, g]) => `<tr data-order="${id}">
    <td>${esc(g.order?.order_number || "")}<div class="meta">${money(g.order?.total_cents || 0, g.order?.currency || "USD")}</div></td>
    <td>${esc(g.order?.customers?.name || "")}<div class="meta">${esc(g.order?.customers?.email || "")}</div></td>
    <td>${cell(g.docs.invoice_receipt)}</td>
    <td>${cell(g.docs.work_order)}</td>
    <td>${creditCell(g)}</td></tr>`).join("")}</tbody></table>` : `<p class="meta">None.</p>`;
}
document.addEventListener("click", async (e) => {
  const c = e.target.closest("[data-mcredit]"), s = e.target.closest("[data-msend]");
  if (!c && !s) return;
  let r;
  if (c) {
    setBusy(c, true, "Asking…");
    r = await supabase.rpc("morning_credit_note", { p_order: c.dataset.mcredit });
    setBusy(c, false);
    if (!r.error) toast("Morning is making the credit note's preview. It appears here in a minute.");
  } else {
    const create = s.dataset.act === "create";
    const d = morningRows.find((x) => x.id === s.dataset.msend);
    if (create && !confirm(d?.kind === "credit_note"
      ? "Issue the credit note in Morning? It cancels the buyer's invoice-receipt for good."
      : `Issue this payout's invoice-receipt to Lemon Squeezy in Morning (${usd(d?.summary?.total_cents)})? A real tax document: it can only be cancelled with a credit note.`)) return;
    setBusy(s, true, create ? "Issuing…" : "Asking…");
    r = await supabase.rpc("morning_send", { p_id: s.dataset.msend, p_action: s.dataset.act });
    setBusy(s, false);
    if (!r.error) toast(r.data);
  }
  if (r.error) return toast(r.error.message, { type: "error", timeout: 8000 });
  for (const wait of [15000, 35000, 70000]) setTimeout(loadMorning, wait);
  loadMorning();
});
