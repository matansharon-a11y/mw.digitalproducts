// Prices on the home and sales pages. Every price spot is <span data-price="slug"> (plus data-was for a
// struck-out "before" price). They read the prices set in the admin; until a product has a price there,
// the spot shows 0.00. English shows dollars, Hebrew shows shekels.
import { CONFIG } from "../config.js";

let rows = null;

const he = () => document.documentElement.lang === "he";
const fmt = (cents, cur) => {
  const n = (cents || 0) / 100;
  const num = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (cur === "ILS") return "₪" + num;
  if (cur === "USD") return "$" + num;
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n); } catch { return num + " " + cur; }
};

function textFor(el) {
  const r = rows && rows[el.dataset.price];
  const was = el.hasAttribute("data-was");
  if (he()) {
    const c = r ? (was ? r.compare_at_ils_cents : r.price_ils_cents) : null;
    return was && !c ? "" : fmt(c, "ILS");   // no "before" price set: show nothing
  }
  const c = r ? (was ? r.compare_at_cents : r.price_cents) : null;
  if (was && !c) return "";
  return fmt(c, r?.currency || "USD");
}

// <span data-save="slug">: "Save $20.00" when the bundle has a "before" price, else nothing.
function saveFor(el) {
  const r = rows && rows[el.dataset.save];
  if (!r) return "";
  const [now, was, cur] = he() ? [r.price_ils_cents, r.compare_at_ils_cents, "ILS"] : [r.price_cents, r.compare_at_cents, r.currency || "USD"];
  if (!was || !now || was <= now) return "";
  return (he() ? "חוסכים " : "Save ") + fmt(was - now, cur);
}

function paint(root = document) {
  root.querySelectorAll("[data-price]").forEach((el) => {
    const t = textFor(el);
    if (el.textContent !== t) el.textContent = t;
  });
  root.querySelectorAll("[data-save]").forEach((el) => {
    const t = saveFor(el);
    if (el.textContent !== t) el.textContent = t;
    if (el.hidden !== !t) el.hidden = !t;
  });
}

// Product pages carry <script type="application/json" id="mwp-product"> (name, description, image, url, slug).
// Once the live price is in, it becomes schema.org Product data for search engines, priced from the admin,
// so the price in search results always matches the page.
function productData() {
  const src = document.getElementById("mwp-product");
  if (!src || !rows) return;
  const p = JSON.parse(src.textContent);
  const r = rows[p.slug];
  const [cents, cur] = r ? (he() ? [r.price_ils_cents, "ILS"] : [r.price_cents, r.currency || "USD"]) : [0, ""];
  if (!cents) return;
  const ld = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description, image: p.image,
    brand: { "@type": "Brand", name: "MWP" }, url: p.url,
    offers: { "@type": "Offer", price: (cents / 100).toFixed(2), priceCurrency: cur, availability: "https://schema.org/InStock", url: p.url },
  };
  let out = document.getElementById("mwp-product-ld");
  if (!out) { out = document.createElement("script"); out.type = "application/ld+json"; out.id = "mwp-product-ld"; document.head.append(out); }
  out.textContent = JSON.stringify(ld);
}

async function load() {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) return;
  try {
    const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/page_prices?select=*`, {
      headers: { apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) return;
    rows = {};
    (await res.json()).forEach((r) => { rows[r.slug] = r; });
    paint();
    document.documentElement.classList.add("prices-on");   // the real prices are in: show the price spots (hidden in SITE_CSS until now)
    try { productData(); } catch { /* no product on this page */ }
  } catch { /* offline or not set up yet: the 0.00 placeholders stay */ }
}

export function initPrices() {
  paint();
  load();
  // the sales pages re-render parts of the page, and the home page switches language in place
  let queued = false;
  new MutationObserver(() => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => { queued = false; paint(); });
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["lang"] });
}
