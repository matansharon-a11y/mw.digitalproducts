// Header icons (account menu + cart) and the cart drawer. Standalone: no imports, works on every shop page.
// Icons show no text; the label appears only on hover, keyboard focus, or when tapped/clicked.
const KEY = "mwp_cart";
const he = () => document.documentElement.lang === "he";
const T = (en, hb) => (he() ? hb : en);

const SVG = {
  user: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5"/></svg>',
  cart: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.8a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17.5" cy="20" r="1.3"/></svg>',
  dl: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>',
  receipt: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></svg>',
  help: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

const CSS = `
.nav-icons,.cart-panel,.cart-panel button{font-family:"Google Sans",Heebo,system-ui,sans-serif}
[dir=rtl] .cart-panel,[dir=rtl] .cart-panel button,[dir=rtl] .nav-icons{font-family:Heebo,system-ui,sans-serif}
.nav-icons{display:inline-flex;align-items:center;gap:4px;flex:none}
.nav-ico{position:relative;display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;border:0;background:none;color:inherit;cursor:pointer;text-decoration:none;padding:0;-webkit-tap-highlight-color:transparent}
.nav-ico:hover,.nav-ico.show-tip{background:rgba(254,251,241,.08)}
.nav-ico:focus-visible{outline:2px solid #F4AF56;outline-offset:2px}
.nav-ico .tip{position:absolute;top:calc(100% + 8px);left:50%;transform:translate(-50%,-4px);white-space:nowrap;padding:6px 10px;border-radius:8px;background:#FEFBF1;color:#0A0908;font-weight:600;font-size:12px;line-height:1.2;;opacity:0;pointer-events:none;transition:opacity .15s,transform .15s;z-index:5}
.nav-ico.show-tip .tip{opacity:1;transform:translate(-50%,0)}
@media (hover:hover){.nav-ico:hover .tip{opacity:1;transform:translate(-50%,0)}}
.nav-ico:focus-visible .tip{opacity:1;transform:translate(-50%,0)}
.nav-ico .count{position:absolute;top:4px;right:3px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;background:#F4AF56;color:#0A0908;font-weight:700;font-size:11px;line-height:17px;;text-align:center}
.nav-ico .count[hidden]{display:none}
.cart-scrim{position:fixed;inset:0;background:rgba(0,0,0,.55);opacity:0;pointer-events:none;transition:opacity .2s;z-index:90}
.cart-panel{position:fixed;top:0;bottom:0;inset-inline-end:0;width:min(420px,100vw);background:#141210;color:#FEFBF1;border-inline-start:1px solid rgba(156,177,194,.18);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .25s cubic-bezier(.16,1,.3,1);z-index:91;}
[dir=rtl] .cart-panel{transform:translateX(-100%)}
.cart-open .cart-scrim{opacity:1;pointer-events:auto}
.cart-open .cart-panel{transform:none}
.cart-head{display:flex;align-items:center;justify-content:space-between;padding:20px 22px;border-bottom:1px solid rgba(156,177,194,.15)}
.cart-head h2{margin:0;font-size:20px;font-weight:800}
.cart-x{width:40px;height:40px;border-radius:50%;border:0;background:none;color:inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.cart-x:hover{background:rgba(254,251,241,.08)}
.cart-body{flex:1;overflow:auto;padding:8px 22px}
.cart-empty{padding:48px 0;text-align:center;color:#CDD7DD}
.cart-empty a{display:inline-block;margin-top:14px;color:#F4AF56;font-weight:700}
.cart-row{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid rgba(156,177,194,.12)}
.cart-row img,.cart-row .cart-ph{width:64px;height:64px;border-radius:10px;object-fit:cover;background:#262626}
.cart-row .nm{font-weight:700;line-height:1.3}
.cart-row .pr{font-size:14px;color:#CDD7DD;margin-top:2px}
.cart-row .pr .usd{display:block;font-size:12px;color:#9CB1C2}
.cart-note.cart-usd{color:#FEFBF1;margin-bottom:10px}
.cart-row .acts{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.cart-row button,.cart-row a.pay{border:0;background:none;color:#9CB1C2;font-weight:600;font-size:13px;;cursor:pointer;padding:4px 0;text-decoration:underline;text-underline-offset:3px}
.cart-row a.pay{color:#F4AF56}
.cart-foot{padding:18px 22px 24px;border-top:1px solid rgba(156,177,194,.15);display:grid;gap:12px}
.cart-total{display:flex;justify-content:space-between;font-weight:800;font-size:17px}
.cart-go{display:flex;align-items:center;justify-content:center;min-height:50px;border-radius:30px;border:0;background:linear-gradient(90deg,#E4AA7C,#F4AF56);color:#0A0908;font-weight:800;font-size:16px;;text-decoration:none;cursor:pointer}
.cart-go[aria-disabled=true]{opacity:.45;pointer-events:none}
.cart-note{margin:0;font-size:13px;color:#9CB1C2;text-align:center}
.cart-notice{margin:12px 0 4px;padding:12px 14px;border-radius:12px;background:rgba(244,175,86,.1);border:1px solid rgba(244,175,86,.3);color:#FEFBF1;font-size:14px;line-height:1.5}
.cart-gate{display:flex;flex-direction:column;align-items:center;gap:14px;padding:36px 4px;text-align:center}
.cart-gate .gate-ic{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;color:#F4AF56;background:rgba(244,175,86,.1);box-shadow:inset 0 0 0 1px rgba(244,175,86,.35)}
.cart-gate h3{margin:6px 0 0;font-size:22px;font-weight:600;letter-spacing:-.01em}
.cart-gate p{margin:0;font-size:15px;line-height:1.6;color:#CDD7DD}
.cart-gate .cart-go{width:100%;margin-top:8px}
.cart-gate .gate-alt{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;border-radius:30px;border:1px solid rgba(254,251,241,.32);color:#FEFBF1;font-weight:700;text-decoration:none}
.cart-gate .gate-alt:hover{border-color:rgba(254,251,241,.6)}
.cart-gate .gate-back{border:0;background:none;color:#9CB1C2;font:inherit;font-size:14px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}

.acct-menu{position:fixed;z-index:95;width:260px;padding:8px;border-radius:18px;background:rgba(20,18,16,.92);backdrop-filter:blur(18px) saturate(150%);-webkit-backdrop-filter:blur(18px) saturate(150%);border:1px solid rgba(254,251,241,.1);box-shadow:0 30px 70px -20px rgba(0,0,0,.8);color:#FEFBF1;opacity:0;transform:translateY(-6px) scale(.98);transform-origin:top right;pointer-events:none;transition:opacity .18s,transform .18s;font-family:"Google Sans",Heebo,system-ui,sans-serif}
[dir=rtl] .acct-menu{transform-origin:top left;font-family:Heebo,"Google Sans",system-ui,sans-serif}
.acct-menu.open{opacity:1;transform:none;pointer-events:auto}
.acct-menu .who{display:flex;align-items:center;gap:12px;padding:12px 12px 14px;border-bottom:1px solid rgba(254,251,241,.08);margin-bottom:6px}
.acct-menu .av{flex:none;display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#E4AA7C,#F4AF56);color:#0A0908;font-weight:700;text-transform:uppercase}
.acct-menu .av.out{background:rgba(254,251,241,.08);color:#CDD7DD}
.acct-menu .who small{display:block;font-size:12px;color:#9CB1C2}
.acct-menu .who b{display:block;max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}
.acct-menu a,.acct-menu button.item{display:flex;align-items:center;gap:12px;width:100%;padding:11px 12px;border:0;border-radius:12px;background:none;color:#FEFBF1;font:500 14.5px/1.2 inherit;text-decoration:none;cursor:pointer;text-align:start}
.acct-menu a:hover,.acct-menu button.item:hover{background:rgba(254,251,241,.07)}
.acct-menu a svg,.acct-menu button.item svg{width:18px;height:18px;color:#F4AF56}
.acct-menu .sep{height:1px;margin:6px 4px;background:rgba(254,251,241,.08)}
.acct-menu button.item.out{color:#CDD7DD}
html .acct-menu button.item{justify-content:flex-start!important;text-align:start!important;font-weight:500!important;font-size:14.5px!important;letter-spacing:0!important;text-transform:none!important;min-height:0!important;box-shadow:none!important}
.nav-ico[aria-expanded=true] .tip{display:none}
@media (max-width:900px){.site-header .nav-icons{margin-inline-start:auto}.site-header .nav-icons + .lang-toggle{margin-inline-start:0}}
`;

export function getCart() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function save(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* private mode: cart lives for this page only */ }
  memory = items;
  refresh();
}
let memory = null;
// What each product includes, the same as checkout-webhook BUNDLES (plus the four single guides inside the set). The
// cart uses it so nobody pays twice: the Lightroom Classic plugin comes with MWP Presets (Jeinna, 25 Oct 2026), and a
// bundle includes its parts.
const GUIDES = ["field-guide-planning", "field-guide-composition", "field-guide-light", "field-guide-colour"];
const INCLUDES = {
  "mwp-lightroom-plugin": ["mwp-presets"],
  "mwp-field-guides": GUIDES,
  "presets-panel": ["mwp-lightroom-plugin", "mwp-presets", "mwp-panel"],
  "presets-field-guides": ["mwp-lightroom-plugin", "mwp-presets", "mwp-field-guides", ...GUIDES],
  "field-guides-panel": ["mwp-field-guides", "mwp-panel", ...GUIDES],
  "full-set": ["mwp-lightroom-plugin", "mwp-presets", "mwp-panel", "mwp-field-guides", ...GUIDES],
};
const includes = (a, b) => (INCLUDES[a] || []).includes(b);
const items = () => memory || (memory = getCart().filter((i, n, all) => all.findIndex((j) => j.slug === i.slug) === n));

// A cart keeps what it had when each item was added. Bring names, prices and checkout links up to date from the
// live price list (a cart filled before launch had no checkout links yet; a price may have changed since).
let refreshed = false;
async function refreshCart() {
  if (refreshed || !items().length) return;
  let rows;
  try { rows = await priceList(); } catch { return; }   // offline: keep what's saved, try again next page
  refreshed = true;
  const next = items().map((i) => {
    const r = rows[i.slug];
    return r ? { ...i, name: [r.name, r.name_emphasis].filter(Boolean).join(" ") || i.name, price_cents: r.price_cents,
      currency: r.currency || "USD", price_ils_cents: r.price_ils_cents, checkout_url: r.checkout_url || null } : i;
  });
  if (JSON.stringify(next) !== JSON.stringify(items())) save(next);
}


export function addToCart(p) {
  const list = items().filter((i) => i.slug !== p.slug);
  list.push({ slug: p.slug, name: p.name, price_cents: p.price_cents ?? null, currency: p.currency || "USD", price_ils_cents: p.price_ils_cents ?? null, checkout_url: p.checkout_url || null, image: p.image || null });
  save(list);
  openCart();
}
function removeFromCart(slug) { save(items().filter((i) => i.slug !== slug)); }

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function money(cents, cur) {
  if (cents == null) return "";
  // written like the page prices ("$59.99", "₪179.00") in both languages
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD" }).format(cents / 100); }
  catch { return (cents / 100).toFixed(2) + " " + cur; }
}

// The Hebrew site shows shekels (the prices set in the admin), but checkout still charges dollars (Matan, 24 Oct
// 2026). So in Hebrew every row also shows the dollar amount charged, and the total says it plainly. The same
// switch is in prices.js and tools/bake_prices.py.
const SHOW_ILS = true;
function priceOf(i) {
  if (!(SHOW_ILS && he() && i.price_ils_cents != null)) return money(i.price_cents, i.currency);
  return `${money(i.price_ils_cents, "ILS")}<span class="usd">בקופה: ${money(i.price_cents, i.currency)}</span>`;
}

let notice = "";   // a one-time line at the top of the cart (why something wasn't added)
function render() {
  const body = document.querySelector(".cart-body"), foot = document.querySelector(".cart-foot");
  if (!body) return;
  const list = items();
  const top = notice ? `<p class="cart-notice" role="status">${esc(notice)}</p>` : "";
  if (document.documentElement.classList.contains("cart-open")) notice = "";   // shown once, when the cart is open
  if (!list.length) {
    body.innerHTML = top + `<div class="cart-empty"><p>${T("Your cart is empty.", "העגלה ריקה.")}</p><a href="/#shop">${T("Browse the products", "לכל המוצרים")}</a></div>`;
    foot.hidden = true;
    return;
  }
  foot.hidden = false;
  const several = list.length > 1;
  body.innerHTML = top + list.map((i) => `<div class="cart-row">
      ${i.image ? `<img src="${esc(i.image)}" alt="">` : `<span class="cart-ph"></span>`}
      <div><div class="nm" data-no-i18n>${esc(i.name)}</div><div class="pr">${priceOf(i)}</div></div>
      <div class="acts">${several && i.checkout_url ? `<a class="pay" data-checkout href="${esc(i.checkout_url)}">${T("Pay", "לתשלום")}</a>` : ""}<button type="button" data-remove="${esc(i.slug)}">${T("Remove", "הסרה")}</button></div>
    </div>`).join("");
  const ils = SHOW_ILS && he() && list.every((i) => i.price_ils_cents != null);
  const cur = ils ? "ILS" : list[0].currency;
  const known = list.every((i) => (ils ? i.price_ils_cents : i.price_cents) != null);
  const total = list.reduce((s, i) => s + ((ils ? i.price_ils_cents : i.price_cents) || 0), 0);
  const ready = list.filter((i) => i.checkout_url);
  let go, note = "";
  if (!ready.length) {
    go = `<a class="cart-go" aria-disabled="true">${T("Checkout", "לתשלום")}</a>`;
    note = T("Checkout opens at launch.", "התשלום ייפתח בהשקה.");
  } else if (!several) {
    go = `<a class="cart-go" data-checkout href="${esc(ready[0].checkout_url)}">${T("Checkout", "לתשלום")}</a>`;
  } else {
    go = "";
    note = T("Each product has its own secure checkout. Tap Pay next to each one.", "לכל מוצר יש תשלום מאובטח משלו. לחצו על \"לתשלום\" ליד כל מוצר.");
  }
  const usdTotal = list.reduce((s, i) => s + (i.price_cents || 0), 0);
  const charge = ils && list.every((i) => i.price_cents != null)
    ? `<p class="cart-note cart-usd">המחירים מוצגים בשקלים. התשלום בקופה הוא בדולרים: ${money(usdTotal, list[0].currency)} בסך הכול.</p>` : "";
  foot.innerHTML = `${known ? `<div class="cart-total"><span>${T("Total", "סה״כ")}</span><span>${money(total, cur)}</span></div>` : ""}${charge}${go}${note ? `<p class="cart-note">${note}</p>` : ""}`;
}

// ---------------------------------------------------------------- add to cart from the home and sales pages
// Their buy buttons ("Get the presets", "Get the bundle" …) add that product to the cart. The product is the
// price card the button sits in; else the nearest price before it in the same section; else the button's
// words; else the page's own product. Names, prices and checkout links come from the public price list.
// MWP Presets and the Lightroom Classic plugin are one purchase (Jeinna, 23 Oct 2026): the plugin's buttons add MWP Presets.
const PAGE_PRODUCT = { presets: "mwp-presets", "lightroom-classic": "mwp-lightroom-plugin", panel: "mwp-panel", "field-guides": "mwp-field-guides" };
const IMG = "/assets/pages/img/";
const COVER = {
  "mwp-presets": "c88e041b857fb964607aaec43ad1753d.jpg", "mwp-lightroom-plugin": "86b95f1970bb30f72735d73708d9c095.jpg", "mwp-panel": "8f730b9bb76b93ca707cae719a309479.jpg",
  "mwp-field-guides": "0cf44582c4078749d18156eec10c90d3.jpg", "presets-panel": "8f730b9bb76b93ca707cae719a309479.jpg",
  "presets-field-guides": "c88e041b857fb964607aaec43ad1753d.jpg", "field-guides-panel": "0cf44582c4078749d18156eec10c90d3.jpg",
  "full-set": "c88e041b857fb964607aaec43ad1753d.jpg",
  "field-guide-planning": "0cf44582c4078749d18156eec10c90d3.jpg", "field-guide-composition": "0cf44582c4078749d18156eec10c90d3.jpg",
  "field-guide-light": "0cf44582c4078749d18156eec10c90d3.jpg", "field-guide-colour": "0cf44582c4078749d18156eec10c90d3.jpg",
};
const SLUGS = Object.keys(COVER);

function slugFor(a) {
  const href = a.getAttribute("href") || "";
  const plan = a.closest(".plan");
  const inPlan = plan?.querySelector("[data-price]:not([data-was])")?.dataset.price;
  if (inPlan) return inPlan;
  if (!/#buy\b/.test(href)) return null;                       // only buy buttons
  const section = a.closest("section") || document.body;
  let near = null;
  section.querySelectorAll("[data-price]:not([data-was])").forEach((el) => {
    if (el.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING) near = el.dataset.price;
  });
  if (near) return near;
  const t = a.textContent.toLowerCase().replace(/\s+/g, " ");
  if (/full set|everything/.test(t)) return "full-set";
  if (/(presets|lightroom plugin) ?\+ ?(photoshop plugin )?panel/.test(t)) return "presets-panel";
  if (/(presets|lightroom plugin) ?\+ ?field|field guides ?\+ ?presets/.test(t)) return "presets-field-guides";
  if (/field guides ?\+ ?panel/.test(t)) return "field-guides-panel";
  if (/lightroom (classic )?plugin/.test(t) && !/\+/.test(t)) return "mwp-lightroom-plugin";
  const folder = (href.match(/^(?:\.\.\/)?([\w-]+)\/#buy/) || [])[1] || location.pathname.split("/").filter(Boolean)[0];
  return PAGE_PRODUCT[folder] || null;
}

let priceRows = null;
async function priceList() {
  if (priceRows) return priceRows;
  const { CONFIG } = await import("../config.js");
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/page_prices?select=*`, {
    headers: { apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error("prices");
  priceRows = {};
  (await res.json()).forEach((r) => { priceRows[r.slug] = r; });
  return priceRows;
}
const FALLBACK_NAME = { "field-guide-planning": "MWP Field Guide: Planning", "field-guide-composition": "MWP Field Guide: Composition",
  "field-guide-light": "MWP Field Guide: Light", "field-guide-colour": "MWP Field Guide: Colour", "mwp-presets": "MWP Presets", "mwp-lightroom-plugin": "MWP Lightroom Plugin + Presets", "mwp-panel": "MWP Photoshop Plugin Panel", "mwp-field-guides": "MWP Field Guides",
  "presets-field-guides": "Lightroom Plugin + Field Guides", "presets-panel": "Lightroom Plugin + Photoshop Plugin Panel", "field-guides-panel": "Field Guides + Photoshop Plugin Panel", "full-set": "The full set" };

export async function addSlugToCart(slug) {
  // already covered by something in the cart (the plugin includes the presets; a bundle includes its parts)
  if (items().some((i) => i.slug === slug || includes(i.slug, slug))) {
    notice = items().some((i) => i.slug === slug) ? "" : T("This is already included in something in your cart.", "זה כבר כלול במשהו שנמצא בעגלה.");
    openCart(); return;
  }
  // already theirs (bought, alone or as part of something). Only checked for someone with a saved sign-in, so
  // visitors who aren't signed in don't load the account code.
  let signedIn = false;
  try { signedIn = Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k)); } catch { /* blocked */ }
  const { api, user } = signedIn ? await accountUser() : { api: null, user: null };
  if (user && api) {
    try {
      const own = new Set((await api.myLibrary()).filter((i) => !i.view_only && i.products).map((i) => i.products.slug));
      if (own.has(slug) || [...own].some((o) => includes(o, slug))) {
        notice = T("You already have this. Find it in My downloads.", "זה כבר אצלכם. הוא מחכה בעמוד ההורדות שלי.");
        openCart(); return;
      }
    } catch { /* couldn't check: checkout still works, and support can refund a double purchase */ }
  }
  // it includes things already in the cart: they come out, so nothing is paid twice
  const inside = items().filter((i) => includes(slug, i.slug));
  if (inside.length) {
    save(items().filter((i) => !includes(slug, i.slug)));
    notice = T("Taken out of your cart: this already includes it.", "הוצאנו מהעגלה את מה שכבר כלול כאן.");
  }
  let r = null;
  try { r = (await priceList())[slug] || null; } catch { /* offline: add it with its name, the price shows later */ }
  addToCart({
    slug, name: r ? [r.name, r.name_emphasis].filter(Boolean).join(" ") : FALLBACK_NAME[slug] || slug,
    price_cents: r ? r.price_cents : null, currency: r?.currency || "USD", price_ils_cents: r ? r.price_ils_cents : null,
    checkout_url: r?.checkout_url || null, image: COVER[slug] ? IMG + COVER[slug] : null,
  });
}

// ---------------------------------------------------------------- account before checkout
// Purchases live in the buyer's account (downloads anytime, every future update), so checkout asks
// them to create an account or sign in first, then comes back here with the cart open.
function gateHTML() {
  const back = location.pathname + (location.search ? location.search + "&" : "?") + "cart=1";
  const to = (mode) => `/account/?${mode ? "mode=signup&" : ""}next=${encodeURIComponent(back)}`;
  return `<div class="cart-gate">
    <span class="gate-ic">${SVG.user}</span>
    <h3>${T("Create your account first", "קודם יוצרים חשבון")}</h3>
    <p>${T("Everything you buy lives in your MWP account. Sign in anytime to download it again, on any computer, and get every future update free.", "כל מה שאתם קונים נשמר בחשבון ה-MWP שלכם. מתחברים בכל זמן כדי להוריד שוב, בכל מחשב, ולקבל כל עדכון עתידי בחינם.")}</p>
    <a class="cart-go" href="${to(true)}">${T("Create account", "יצירת חשבון")}</a>
    <a class="gate-alt" href="${to(false)}">${T("I have an account: sign in", "יש לי חשבון: התחברות")}</a>
    <button type="button" class="gate-back" data-gate-back>${T("Back to cart", "חזרה לעגלה")}</button>
  </div>`;
}
function showGate() {
  const body = document.querySelector(".cart-body"), foot = document.querySelector(".cart-foot");
  if (!body) return;
  if (!document.documentElement.classList.contains("cart-open")) openCart();
  body.innerHTML = gateHTML();
  foot.hidden = true;
}
async function goToCheckout(link) {
  const { user } = await accountUser();
  if (!user) { showGate(); return; }
  // Checkout uses the account's email, and carries the account's id: the purchase lands in this account even if
  // they type another email at checkout (checkout-webhook). The visit's utm_source goes along for the reports.
  const url = new URL(link.href, location.href);
  // only ever hand the buyer's email and id to a Lemon Squeezy checkout page (or the store's own checkout domain
  // there), whatever the price list says
  if (url.protocol !== "https:" || !(/(^|\.)lemonsqueezy\.com$/.test(url.hostname) || url.hostname === "checkout.mw.photography")) { alert(T("Checkout isn't available right now. Please contact support.", "התשלום לא זמין כרגע. אפשר לפנות לתמיכה.")); return; }
  url.searchParams.set("checkout[email]", user.email);
  url.searchParams.set("checkout[custom][user_id]", user.id);
  let utm = null;
  try { utm = sessionStorage.getItem("utm_source") || new URLSearchParams(location.search).get("utm_source"); } catch { /* blocked */ }
  if (utm) url.searchParams.set("checkout[custom][source]", utm.slice(0, 64));
  try { sessionStorage.setItem("mwp_checkout_at", String(Date.now())); } catch { /* blocked */ }   // My downloads waits for what's new
  if (window.LemonSqueezy?.Url?.Open) window.LemonSqueezy.Url.Open(url.toString());
  else location.href = url.toString();
}

function refresh() {
  const n = items().length;
  document.querySelectorAll(".nav-ico .count").forEach((c) => { c.textContent = n; c.hidden = !n; });
  const btn = document.querySelector(".nav-ico[data-cart]");
  if (btn) btn.setAttribute("aria-label", n ? T(`Cart, ${n} items`, `עגלה, ${n} פריטים`) : T("Cart", "עגלה"));
  render();
}

let lastFocus = null;
export function openCart() {
  lastFocus = document.activeElement;
  document.documentElement.classList.add("cart-open");
  document.querySelector(".cart-panel")?.removeAttribute("inert");
  render();
  refreshCart();
  document.querySelector(".cart-x")?.focus();
}
function closeCart() {
  document.documentElement.classList.remove("cart-open");
  document.querySelector(".cart-panel")?.setAttribute("inert", "");
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

// Pages live at the root or one folder down (presets/, panel/...); links need the right prefix.
function base() { return document.querySelector("base") ? "" : (/\/(presets|panel|field-guides|beta)\//.test(location.pathname) ? "../" : ""); }

function showTip(el) {
  el.classList.add("show-tip");
  clearTimeout(el.__tip);
  el.__tip = setTimeout(() => el.classList.remove("show-tip"), 1600);
}

export function navIconsInner() {
  return `<button class="nav-ico" type="button" data-cart aria-label="${T("Cart", "עגלה")}" aria-haspopup="dialog">${SVG.cart}<span class="count" hidden>0</span><span class="tip">${T("Cart", "עגלה")}</span></button>`;
}

// ---------------------------------------------------------------- account menu
// Opens from the person icon: who's signed in, My downloads, My details (signed in), Help, and sign in / sign out.
// The sign-in check loads only when the menu is first opened, so pages stay light.
let menu = null;
async function accountUser() {
  try { const api = await import("./api.js"); return { api, user: await api.currentUser() }; }
  catch { return { api: null, user: null }; }
}
function menuHTML(user) {
  const b = base();
  const who = user
    ? `<div class="who"><span class="av">${(user.email || "?")[0]}</span><div><small>${T("Signed in as", "מחוברים בתור")}</small><b>${esc(user.email)}</b></div></div>`
    : `<div class="who"><span class="av out">${SVG.user}</span><div><small>${T("Not signed in", "לא מחוברים")}</small><b>${T("Your MWP account", "החשבון שלכם ב-MWP")}</b></div></div>`;
  return `${who}
    <a href="/account/" role="menuitem">${SVG.dl}<span>${T("My downloads", "ההורדות שלי")}</span></a>
    ${user ? `<a href="/account/#orders" role="menuitem">${SVG.receipt}<span>${T("Order history", "היסטוריית הזמנות")}</span></a>` : ""}
    ${user ? `<a href="/account/#details" role="menuitem">${SVG.edit}<span>${T("My details", "הפרטים שלי")}</span></a>` : ""}
    <a href="/support/" role="menuitem">${SVG.help}<span>${T("Help", "עזרה")}</span></a>
    <div class="sep"></div>
    ${user ? `<button class="item out" type="button" role="menuitem" data-signout>${T("Sign out", "התנתקות")}</button>`
           : `<a href="/account/" role="menuitem"><span>${T("Sign in", "התחברות")}</span></a>`}`;
}
function placeMenu(btn) {
  const r = btn.getBoundingClientRect();
  const w = 260, rtl = document.documentElement.dir === "rtl";
  let left = rtl ? r.left : r.right - w;
  left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
  menu.style.top = `${r.bottom + 10}px`;
  menu.style.left = `${left}px`;
}
function closeMenu() {
  if (!menu) return;
  menu.classList.remove("open");
  document.querySelectorAll("[data-account]").forEach((b) => b.setAttribute("aria-expanded", "false"));
}
async function toggleMenu(btn) {
  if (!menu) {
    menu = document.createElement("div");
    menu.className = "acct-menu"; menu.setAttribute("role", "menu"); menu.setAttribute("data-no-i18n", "");
    document.body.appendChild(menu);
    menu.addEventListener("click", async (e) => {
      if (!e.target.closest("[data-signout]")) return;
      const { api } = await accountUser();
      if (api) await api.signOut();
      closeMenu();
      location.href = "/account/";
    });
  }
  if (menu.classList.contains("open")) return closeMenu();
  menu.innerHTML = menuHTML(null);
  placeMenu(btn);
  menu.classList.add("open");
  btn.setAttribute("aria-expanded", "true");
  const { user } = await accountUser();
  if (menu.classList.contains("open")) menu.innerHTML = menuHTML(user);
}

export function initCart() {
  if (document.querySelector(".cart-panel")) return;
  // Pages can ship the icons in their own markup (the sales pages do); otherwise they are added to the header.
  let wrap = document.querySelector(".nav-icons");
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  if (!wrap) {
    const host = document.querySelector(".site-header .container") || document.querySelector(".site-header");
    if (!host) return;
    wrap = document.createElement("div");
    wrap.className = "nav-icons";
    wrap.innerHTML = navIconsInner();
    wrap.setAttribute("data-no-i18n", "");
    // Sit with the other right-hand links when the page has a group for them (home), else just before the language switch.
    const group = host.querySelector(".navr");
    if (group) group.appendChild(wrap);
    else host.insertBefore(wrap, host.querySelector(".lang-toggle"));
  } else {
    // Sales pages re-render their markup in place; put the cart count back if a re-render resets it.
    new MutationObserver(() => {
      const n = items().length, c = wrap.querySelector(".count");
      if (c && (c.textContent !== String(n) || c.hidden !== !n)) { c.textContent = n; c.hidden = !n; }
    }).observe(wrap, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["hidden"] });
  }

  document.body.insertAdjacentHTML("beforeend", `
    <div class="cart-scrim" data-close></div>
    <aside class="cart-panel" role="dialog" aria-modal="true" aria-labelledby="cart-title" inert data-no-i18n>
      <div class="cart-head"><h2 id="cart-title">${T("Cart", "עגלה")}</h2><button class="cart-x" type="button" data-close aria-label="${T("Close", "סגירה")}">${SVG.x}</button></div>
      <div class="cart-body"></div>
      <div class="cart-foot" hidden></div>
    </aside>`);

  // The label shows when the icon is tapped or clicked (and on hover / keyboard focus).
  wrap.querySelectorAll(".nav-ico:not([data-account])").forEach((el) => el.addEventListener("pointerdown", () => showTip(el)));
  wrap.querySelector("[data-cart]").addEventListener("click", (e) => { showTip(e.currentTarget); closeMenu(); openCart(); });
  // Delegated, so it keeps working when a sales page re-renders its header.
  document.addEventListener("click", (e) => {
    const acc = e.target.closest("[data-account]");
    if (acc) { e.preventDefault(); toggleMenu(acc); return; }
    if (menu && menu.classList.contains("open") && !e.target.closest(".acct-menu")) closeMenu();
  });
  window.addEventListener("resize", closeMenu);
  window.addEventListener("scroll", closeMenu, { passive: true });
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeCart();
    const rm = e.target.closest("[data-remove]");
    if (rm) removeFromCart(rm.getAttribute("data-remove"));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (document.documentElement.classList.contains("cart-open")) closeCart();
    closeMenu();
  });
  // Checkout links (cart, Pay, Buy now): account first.
  document.addEventListener("click", (e) => {
    const co = e.target.closest("a[data-checkout]");
    if (co && co.getAttribute("aria-disabled") !== "true") {
      e.preventDefault(); e.stopImmediatePropagation();
      goToCheckout(co);
      return;
    }
    if (e.target.closest("[data-gate-back]")) { render(); return; }
    // Buy buttons on the home and sales pages: add to cart (they used to jump to the sales pages).
    const buy = e.target.closest("a[href*='#buy'], .plan a, [data-add-to-cart]");
    if (buy && !buy.closest(".cart-panel, .acct-menu")) {
      const slug = buy.dataset.addToCart || slugFor(buy);
      if (slug && SLUGS.includes(slug)) { e.preventDefault(); e.stopImmediatePropagation(); addSlugToCart(slug); }
    }
  }, true);
  window.addEventListener("storage", (e) => { if (e.key === KEY) { memory = null; refresh(); } });
  // My downloads takes what the buyer now owns out of the saved cart (account.js), then tells the cart here
  window.addEventListener("mwp-cart-changed", () => { memory = null; refresh(); });
  refresh();
  // The ☰ menu's "Your account": who is signed in, and Sign out; else Sign in (the header has no account icon since
  // 25 Oct 2026). Only someone with a saved sign-in loads the account code.
  (async () => {
    let saved = false;
    try { saved = Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k)); } catch { /* blocked */ }
    if (!saved) return;
    const { api, user } = await accountUser();
    if (!user) return;
    document.querySelectorAll("[data-sm-who]").forEach((p) => {
      p.innerHTML = `${T("Signed in as", "מחוברים בתור")} <b data-no-i18n>${esc(user.email)}</b>`; p.hidden = false;
    });
    document.querySelectorAll("[data-sm-signin]").forEach((a) => { a.hidden = true; });
    document.querySelectorAll("[data-sm-signout]").forEach((b) => {
      b.hidden = false;
      b.addEventListener("click", async () => { if (api) await api.signOut(); location.href = "/account/"; });
    });
  })();
  // where the visitor came from (…?utm_source=…), kept for the visit and sent with the checkout
  try { const src = new URLSearchParams(location.search).get("utm_source"); if (src) sessionStorage.setItem("utm_source", src.slice(0, 64)); } catch { /* blocked */ }
  // Back from signing in for checkout (…?cart=1): open the cart where they left off.
  const q = new URLSearchParams(location.search);
  if (q.get("cart") === "1") {
    q.delete("cart");
    history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
    openCart();
  }
}
