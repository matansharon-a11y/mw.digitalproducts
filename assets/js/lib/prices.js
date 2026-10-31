// Prices on the home and sales pages. Every price spot is <span data-price="slug"> (plus data-was for a
// struck-out "before" price). They read the prices set in the admin; until a product has a price there,
// the spot stays empty (never 0.00). The Hebrew pages show the shekel prices set in the admin, the English ones
// dollars (SHOW_ILS, also in cart.js and tools/bake_prices.py; Matan, 24 Oct 2026). Checkout still charges
// dollars, so every Hebrew section with prices says so (ilsNotes), and the cart shows the dollar amount.
import { CONFIG } from "../config.js";
import { saleFor, salePrice } from "./sale.js";

let rows = null;

const SHOW_ILS = true;
const ILS_NOTE = "המחירים מוצגים בשקלים. התשלום בקופה הוא בדולרים, והסכום בדולרים מופיע בעגלה לפני התשלום.";
const he = () => SHOW_ILS && document.documentElement.lang === "he";
const fmt = (cents, cur) => {
  const n = (cents || 0) / 100;
  const num = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (cur === "ILS") return "₪" + num;
  if (cur === "USD") return "$" + num;
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n); } catch { return num + " " + cur; }
};

function textFor(el) {
  const slug = el.dataset.price;
  const r = rows && rows[slug];
  const was = el.hasAttribute("data-was");
  const [c, cur] = he()
    ? [r ? (was ? r.compare_at_ils_cents : r.price_ils_cents) : null, "ILS"]
    : [r ? (was ? r.compare_at_cents : r.price_cents) : null, r?.currency || "USD"];
  if (!c) return "";   // no price (or "before" price) set: show nothing, never 0.00
  if (was || !saleFor(slug)) return fmt(c, cur);
  // November Sale (sale.js): the original struck through, then the sale price. A bundle card already strikes
  // through the sum of its parts (data-was), so there only the sale price shows.
  const now = fmt(salePrice(c, slug, cur), cur);
  const hasWas = el.closest("section, .plan, .cart-panel")?.querySelector(`[data-was][data-price="${slug}"]`);
  return hasWas ? now : `<s class="sale-was">${fmt(c, cur)}</s> ${now}`;
}

// <span data-save="slug">: "Save $20.00" when the bundle has a "before" price, else nothing.
function saveFor(el) {
  const r = rows && rows[el.dataset.save];
  if (!r) return "";
  const [now, was, cur] = he() ? [r.price_ils_cents, r.compare_at_ils_cents, "ILS"] : [r.price_cents, r.compare_at_cents, r.currency || "USD"];
  const sale = salePrice(now, el.dataset.save, cur);   // during the sale, the saving includes it
  if (!was || !sale || was <= sale) return "";
  return (document.documentElement.lang === "he" ? "חוסכים " : "Save ") + fmt(was - sale, cur);
}

// One line at the end of every Hebrew section that shows prices: checkout charges dollars. Taken away again
// when the page switches to English in place.
function ilsNotes() {
  const on = he();
  document.querySelectorAll(".ils-note").forEach((n) => { if (!on) n.remove(); });
  if (!on) return;
  document.querySelectorAll("[data-price]:not([data-was])").forEach((el) => {
    const sec = el.closest("section");
    if (!sec || el.closest(".cart-panel, .acct-menu") || sec.querySelector(":scope .ils-note")) return;
    const p = document.createElement("p");
    p.className = "ils-note";
    p.setAttribute("data-no-i18n", "");
    p.style.cssText = "margin:20px auto 0;max-width:640px;font-size:13px;line-height:1.5;color:#9CB1C2;text-align:center";
    p.textContent = ILS_NOTE;
    (sec.querySelector(":scope > .container, :scope > .wrap") || sec).append(p);
  });
}

function paint(root = document) {
  ilsNotes();
  if (!rows) return;   // no prices yet: keep what the page has (the prices baked in at deploy, or hidden placeholders)
  root.querySelectorAll("[data-price]").forEach((el) => {
    const t = textFor(el);
    if (el.innerHTML !== t) el.innerHTML = t;   // only our own formatted prices (and <s> during the sale)
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
  const [base, cur] = r ? (he() ? [r.price_ils_cents, "ILS"] : [r.price_cents, r.currency || "USD"]) : [0, ""];
  const cents = salePrice(base, p.slug, cur);
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

async function load(tries = 3) {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) return;
  // a slow or dropped connection gets two more tries (after 2 s and 5 s): until the prices are in, the price spots stay hidden
  const again = () => { if (tries > 1) setTimeout(() => load(tries - 1), tries === 3 ? 2000 : 5000); };
  try {
    const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/page_prices?select=*`, {
      headers: { apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) return again();
    rows = {};
    (await res.json()).forEach((r) => { rows[r.slug] = r; });
    try { localStorage.setItem(CACHE, JSON.stringify(rows)); } catch { /* private mode */ }
    paint();
    document.documentElement.classList.add("prices-on");   // the real prices are in: show the price spots (hidden in SITE_CSS until now)
    try { productData(); } catch { /* no product on this page */ }
  } catch { again(); /* offline or blocked: the price spots stay hidden, the buy buttons still work */ }
}

// The last prices this browser saw: a returning visitor sees prices at once, before the live ones arrive.
const CACHE = "mwp_prices";

export function initPrices() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE) || "null");
    if (cached && typeof cached === "object") { rows = cached; paint(); document.documentElement.classList.add("prices-on"); }
  } catch { /* no cache */ }
  load();
  // the sales pages re-render parts of the page, and the home page switches language in place
  let queued = false;
  new MutationObserver(() => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => { queued = false; paint(); });
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["lang"] });
}
