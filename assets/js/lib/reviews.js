// Customer reviews: fills every [data-reviews] section from /assets/reviews/reviews.json (screenshots of real
// reviews; how to add them: assets/reviews/README.md). The section (tools/reviews_section.py) stays hidden while
// it has nothing to show. ?reviews=preview shows labelled placeholder cards, to check the design.
// Screenshots keep their own shape: a masonry of whole images; very tall ones are shown to a set height with a
// "Read it all" fade, and every one opens full size in a viewer (arrows, swipe, Esc).

const he = document.documentElement.lang === "he";
const L = he
  ? { open: "הגדלת הביקורת", read: "לקריאה במלואה", close: "סגירה", prev: "הקודמת", next: "הבאה", of: "מתוך",
      ph: "דוגמה לעיצוב", phs: "כאן יופיע צילום מסך של ביקורת אמיתית", dialog: "ביקורת של לקוח" }
  : { open: "Enlarge this review", read: "Read it all", close: "Close", prev: "Previous", next: "Next", of: "of",
      ph: "Design placeholder", phs: "A real review screenshot goes here", dialog: "Customer review" };
const NAME = {
  presets: ["MWP Presets", "הפריסטים של MWP"], plugin: ["Lightroom Classic Plugin", "התוסף ללייטרום קלאסיק"],
  panel: ["MWP Panel", "הפאנל של MWP"], guides: ["MWP Field Guides", "מדריכי השטח של MWP"],
};
const name = (k) => (NAME[k] || [k, k])[he ? 1 : 0];
const TALL = 1.7;   // taller than this (height / width) shows to a set height, with "Read it all"
const BASE = "/assets/reviews/";

// placeholder shapes: a phone screenshot, an email, a square post, a short message, a long thread
const PREVIEW = [[9, 19.5, "presets"], [4, 3, "panel"], [1, 1, "guides"], [16, 9, "presets"], [9, 16, "plugin"],
  [3, 4, "panel"], [5, 4, "presets"], [9, 21, "guides"]].map(([w, h, p], i) => ({ width: w * 100, height: h * 100, products: [p], placeholder: true, n: i + 1 }));

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function card(r, i) {
  const ratio = r.height / r.width;
  const tall = ratio > TALL;
  const prods = (r.products || []).map((p) => `<span class="rv-prod">${esc(name(p))}</span>`).join("");
  const src = he ? r.source_he || r.source : r.source;
  const shot = r.placeholder
    ? `<span class="rv-ph" style="aspect-ratio:${r.width}/${r.height}"><b>${L.ph} ${r.n}</b><span>${L.phs}</span><span class="rv-ph-dim">${r.width / 100}:${r.height / 100}</span></span>`
    : `<img src="${BASE}${esc(r.image)}" alt="${esc(r.alt)}" width="${r.width}" height="${r.height}" loading="lazy" decoding="async">`;
  return `<figure class="rv-card${tall ? " tall" : ""}${r.placeholder ? " is-ph" : ""}" role="listitem" data-products="${esc((r.products || []).join(" "))}" style="--i:${i % 6}">
<button type="button" class="rv-shot" data-rv-open="${i}" aria-label="${L.open}${r.alt ? ": " + esc(r.alt) : ""}">${shot}${tall ? `<span class="rv-more">${L.read}</span>` : ""}</button>
<figcaption>${prods}${src ? `<span class="rv-src">${esc(src)}</span>` : ""}</figcaption></figure>`;
}

// ---------------------------------------------------------------- the viewer (one for the page)
let box, list = [], at = 0, back = null;
function viewer() {
  if (box) return box;
  box = document.createElement("dialog");
  box.className = "rv-box";
  box.setAttribute("aria-label", L.dialog);
  box.innerHTML = `<div class="rv-box-in"><button type="button" class="rv-x" data-rv-close aria-label="${L.close}">×</button>
<div class="rv-stage"></div><div class="rv-bar"><button type="button" class="rv-nav" data-rv-step="-1" aria-label="${L.prev}">‹</button>
<p class="rv-count" aria-live="polite"></p><button type="button" class="rv-nav" data-rv-step="1" aria-label="${L.next}">›</button></div></div>`;
  document.body.append(box);
  box.addEventListener("click", (e) => {
    if (e.target === box || e.target.closest("[data-rv-close]")) box.close();
    const s = e.target.closest("[data-rv-step]");
    if (s) show(at + Number(s.dataset.rvStep));
  });
  box.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") show(at + (he ? -1 : 1));
    if (e.key === "ArrowLeft") show(at + (he ? 1 : -1));
  });
  let x0 = null;
  box.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) show(at + ((dx < 0) !== he ? 1 : -1));
  });
  box.addEventListener("close", () => { document.documentElement.classList.remove("rv-open"); back?.focus(); });
  return box;
}
function show(i) {
  at = (i + list.length) % list.length;
  const r = list[at];
  const src = he ? r.source_he || r.source : r.source;
  const stage = box.querySelector(".rv-stage");
  stage.classList.toggle("fit", r.height / r.width <= TALL);   // a normal shape fits the screen; a long one scrolls
  stage.scrollTop = 0;
  stage.innerHTML = r.placeholder
    ? `<span class="rv-ph big" style="aspect-ratio:${r.width}/${r.height}"><b>${L.ph} ${r.n}</b><span>${L.phs}</span></span>`
    : `<img src="${BASE}${esc(r.image)}" alt="${esc(r.alt)}" width="${r.width}" height="${r.height}">`;
  box.querySelector(".rv-count").textContent = `${at + 1} ${L.of} ${list.length}` + ((r.products || []).length ? ` · ${(r.products || []).map(name).join(", ")}` : "") + (src ? ` · ${src}` : "");
  box.querySelectorAll(".rv-nav").forEach((b) => { b.hidden = list.length < 2; });
}

// ---------------------------------------------------------------- the sections
function fill(sec, all) {
  const product = sec.dataset.product;
  const want = product ? product.split(" ") : null;   // a page can show several products' reviews (the Lightroom page: presets, plugin)
  let items = want ? all.filter((r) => (r.products || []).some((x) => want.includes(x))) : all.slice();
  // each language's own reviews first, keeping the list order inside each
  const lang = he ? "he" : "en";
  items = items.filter((r) => (r.lang || "en") === lang).concat(items.filter((r) => (r.lang || "en") !== lang));
  if ("featured" in sec.dataset) {
    const top = items.filter((r) => r.featured);
    items = (top.length ? top : items).slice(0, 6);
  }
  if (!items.length) return;
  const grid = sec.querySelector(".rv-grid");
  grid.innerHTML = items.map(card).join("");
  sec.hidden = false;
  if (items.length < 3) sec.classList.add("few");
  grid.addEventListener("click", (e) => {
    const b = e.target.closest("[data-rv-open]");
    if (!b) return;
    const shown = Array.from(grid.querySelectorAll(".rv-card:not([hidden]) [data-rv-open]"));
    list = shown.map((x) => items[Number(x.dataset.rvOpen)]);
    back = b;
    viewer();
    show(shown.indexOf(b));
    document.documentElement.classList.add("rv-open");
    box.showModal();
  });
  // the shop's chips: one per product that has reviews
  const f = sec.querySelector(".rv-filter");
  if (f) {
    const have = new Set(items.flatMap((r) => r.products || []));
    let n = 0;
    f.querySelectorAll("[data-rv-filter]").forEach((b) => { if (b.dataset.rvFilter !== "all" && have.has(b.dataset.rvFilter)) { b.hidden = false; n++; } });
    f.hidden = n < 2;
    f.addEventListener("click", (e) => {
      const b = e.target.closest("[data-rv-filter]");
      if (!b) return;
      const k = b.dataset.rvFilter;
      f.querySelectorAll("[data-rv-filter]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      grid.querySelectorAll(".rv-card").forEach((c) => { c.hidden = k !== "all" && !c.dataset.products.split(" ").includes(k); });
    });
  }
}

export async function initReviews() {
  const secs = document.querySelectorAll("[data-reviews]");
  if (!secs.length) return;
  let all = [];
  if (new URLSearchParams(location.search).get("reviews") === "preview") all = PREVIEW;
  else {
    try {
      const res = await fetch(BASE + "reviews.json", { cache: "no-cache" });
      if (res.ok) all = ((await res.json()).reviews || []).filter((r) => r.image && r.width && r.height);
    } catch { /* no reviews: the sections stay hidden */ }
  }
  if (all.length) secs.forEach((s) => fill(s, all));
}

initReviews();
