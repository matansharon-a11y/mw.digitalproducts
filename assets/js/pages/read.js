// Read online: the MWP Field Guides, page by page (shop.mw.photography/read/).
// Ambassadors can only read the guides here; buyers can too. The pages come from the guide-view function
// as private links that last 10 minutes, drawn on a canvas. No download, no print.
// The full-screen reader (openReader) shows a sharper copy of each page, with zoom.
import { initChrome } from "../lib/ui.js";
import { currentUser, guideView, esc } from "../lib/api.js";

initChrome();

const body = document.getElementById("rd-body");
const he = () => document.documentElement.lang === "he";
const T = (en, hb) => (he() ? hb : en);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const LINKS_GOOD_FOR = 9 * 60000;   // the server's links last 10 minutes; ask again a little before

function message(html) { body.innerHTML = `<div class="rd-msg">${html}</div>`; }

let data = null, fetchedAt = 0, current = 0, refreshing = null;

async function load() {
  const started = Date.now();
  message(`<p class="rd-loading">${esc(T("Loading your guides…", "טוענים את המדריכים…"))}</p>`);
  let r = await guideView();
  while (r.preparing && Date.now() - started < 15 * 60000) {
    message(`<p>${esc(T("We're getting the guides ready to read online. This page will open them as soon as they're ready (usually a few minutes).",
      "אנחנו מכינים את המדריכים לקריאה אונליין. הדף יפתח אותם ברגע שיהיו מוכנים (בדרך כלל כמה דקות)."))}</p>`);
    await wait(15000);
    r = await guideView();
  }
  if (r.preparing) throw new Error(T("The guides are still being prepared. Please come back in a little while.", "המדריכים עדיין בהכנה. חזרו בעוד קצת."));
  data = r; fetchedAt = Date.now();
}

// Fresh links when the current ones are about to run out.
async function fresh() {
  if (Date.now() - fetchedAt < LINKS_GOOD_FOR) return;
  refreshing ??= guideView().then((r) => { if (!r.preparing) { data = r; fetchedAt = Date.now(); } }).finally(() => { refreshing = null; });
  await refreshing;
}

async function draw(el) {
  if (el.dataset.drawn) return;
  el.dataset.drawn = "1";
  const [g, p] = el.dataset.page.split(":").map(Number);
  try {
    const img = await loadImg(g, p, false);
    const c = el.querySelector("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    el.classList.add("ok");   // hides its "Loading…"
  } catch { delete el.dataset.drawn; }
}

// ---------------------------------------------------------------- the page
// A guide picker, the pages one under another, and "Read full screen". Clicking a page opens the
// full-screen reader on it. English pages show the English guides, Hebrew pages the Hebrew ones.
const ICONS = {
  prev: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  next: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  full: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  minus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
  plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
};
let page = 0, list = [];   // list: indexes into data.guides for this language

const nearby = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) draw(e.target); }), { rootMargin: "1200px 0px" })
  : null;
const pagesEl = () => document.getElementById("rd-pages");
const allPages = () => [...pagesEl().querySelectorAll(".rd-page")];

// the current page is the one at the top of the screen, just under the toolbar
function trackScroll() {
  const bar = document.getElementById("rd-bar");
  if (!bar || rx.el) return;
  const line = bar.getBoundingClientRect().bottom + 60;
  let k = 0;
  allPages().forEach((el, n) => { if (el.getBoundingClientRect().top <= line) k = n; });
  if (k !== page) { page = k; counter(); }
}
let ticking = false;
window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; trackScroll(); }); } }, { passive: true });

function counter() {
  const c = document.getElementById("rd-count");
  if (c) c.textContent = `${page + 1} / ${allPages().length}`;
}

function show(g) {
  current = g;
  const guide = data.guides[g];
  pagesEl().innerHTML = guide.pages.map((p, i) => `
    <div class="rd-page" data-page="${g}:${i}" role="button" tabindex="0" style="aspect-ratio:${p.w}/${p.h}"
      aria-label="${esc(T(`Page ${i + 1}: read full screen`, `עמוד ${i + 1}: קריאה במסך מלא`))}"><canvas></canvas></div>`).join("");
  allPages().forEach((el) => { nearby ? nearby.observe(el) : draw(el); });
  page = 0;
  window.scrollTo({ top: Math.min(window.scrollY, body.offsetTop - 80) });
  counter();
}

function render() {
  const all = data.guides || [];
  const lang = he() ? "he" : "en";
  list = all.map((g, i) => i).filter((i) => all[i].lang === lang);
  if (!list.length) list = all.map((g, i) => i);   // languages not marked yet: show them all
  // Matan, 25 Oct 2026: Planning, Composition, Light, Colour (unknown titles keep their place after these)
  const ORDER = [/plan|תכנון/i, /compos|קומפוזיצ/i, /light|אור/i, /colou?r|צבע/i];
  const rank = (i) => { const k = ORDER.findIndex((re) => re.test(all[i].title || "")); return k < 0 ? ORDER.length : k; };
  list = list.map((i, n) => [i, n]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([i]) => i);
  if (!list.length) { message(`<p>${esc(T("The guides aren't ready to read online yet.", "המדריכים עוד לא מוכנים לקריאה אונליין."))}</p>`); return; }
  body.innerHTML = `
    <div class="rd-bar" id="rd-bar">
      <label class="rd-pick"><span class="visually-hidden">${esc(T("Guide", "מדריך"))}</span>
        <select id="rd-guide" data-no-i18n>${list.map((i) => `<option value="${i}">${esc(all[i].title)}</option>`).join("")}</select>
      </label>
      <span class="rd-count" id="rd-count" dir="ltr">1 / 1</span>
      <button type="button" class="btn rd-open" id="rd-open">${ICONS.full}<span>${esc(T("Read full screen", "קריאה במסך מלא"))}</span></button>
    </div>
    <div class="rd-pages" id="rd-pages"></div>
    <p class="rd-note">${esc(T("For your eyes only: please don't share screenshots of the guides.", "לשימושכם בלבד: נא לא לשתף צילומי מסך של המדריכים."))}</p>`;
  document.getElementById("rd-guide").addEventListener("change", (e) => show(Number(e.target.value)));
  document.getElementById("rd-open").addEventListener("click", () => openReader(current, page));
  pagesEl().addEventListener("click", (e) => {
    const el = e.target.closest(".rd-page");
    if (el) openReader(current, Number(el.dataset.page.split(":")[1]));
  });
  pagesEl().addEventListener("keydown", (e) => {
    const el = e.target.closest(".rd-page");
    if (el && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openReader(current, Number(el.dataset.page.split(":")[1])); }
  });
  show(list[0]);
}

// ---------------------------------------------------------------- the full-screen reader
// Only the page, on black. A small floating control (close, zoom, page number) and the side arrows show
// when the mouse moves or the screen is tapped, and fade after a moment. Zoom: + / −, pinch, ctrl + wheel
// or trackpad pinch, double-click or double-tap; drag to move around a zoomed page. Pages turn with the
// arrows, the arrow keys, swiping, tapping the page's sides, or the wheel when the page fits.
const imgs = new Map();   // "g:p:hd" → Promise<Image>, so a page loads once
function loadImg(g, p, hd) {
  const key = `${g}:${p}:${hd ? 1 : 0}`;
  if (!imgs.has(key)) {
    imgs.set(key, (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        await fresh();
        const pg = data.guides[g]?.pages[p];
        const src = hd ? (pg?.hd || pg?.url) : pg?.url;
        if (!src) throw new Error("no page");
        try { const img = new Image(); img.decoding = "async"; img.src = src; await img.decode(); return img; }
        catch { fetchedAt = 0; }
      }
      throw new Error("page didn't load");
    })().catch((e) => { imgs.delete(key); throw e; }));
  }
  return imgs.get(key);
}

const MAX_ZOOM = 5;
const STEPS = [1, 1.5, 2, 3, 4, 5];   // the + and − buttons and keys
const stepUp = () => STEPS.find((z) => z > rx.s + 0.01) ?? MAX_ZOOM;
const stepDown = () => [...STEPS].reverse().find((z) => z < rx.s - 0.01) ?? 1;
const rx = { el: null, g: 0, p: 0, s: 1, x: 0, y: 0, idle: 0, back: null, native: false };
const $ = (sel) => rx.el.querySelector(sel);
const pageCount = () => data.guides[rx.g].pages.length;
const dims = () => { const pg = data.guides[rx.g].pages[rx.p]; return { w: pg.hw || pg.w, h: pg.hh || pg.h }; };

function openReader(g, p) {
  if (rx.el) return;
  rx.g = g; rx.back = document.activeElement;
  const el = document.createElement("div");
  el.className = "rx";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", data.guides[g].title);
  el.dir = he() ? "rtl" : "ltr";
  el.innerHTML = `
    <div class="rx-stage"><div class="rx-sheet"><canvas></canvas></div><div class="rx-wait" hidden></div></div>
    <button type="button" class="rx-edge rx-prev" aria-label="${esc(T("Previous page", "העמוד הקודם"))}">${ICONS.prev}</button>
    <button type="button" class="rx-edge rx-next" aria-label="${esc(T("Next page", "העמוד הבא"))}">${ICONS.next}</button>
    <div class="rx-dock" role="toolbar" aria-label="${esc(T("Reader", "קורא"))}">
      <button type="button" class="rx-b" data-a="close" aria-label="${esc(T("Close full screen", "יציאה ממסך מלא"))}">${ICONS.close}</button>
      <span class="rx-sep"></span>
      <button type="button" class="rx-b" data-a="out" aria-label="${esc(T("Zoom out", "הקטנה"))}">${ICONS.minus}</button>
      <button type="button" class="rx-b rx-z" data-a="fit" dir="ltr" aria-label="${esc(T("Fit to screen", "התאמה למסך"))}">100%</button>
      <button type="button" class="rx-b" data-a="in" aria-label="${esc(T("Zoom in", "הגדלה"))}">${ICONS.plus}</button>
      <span class="rx-sep"></span>
      <span class="rx-n" dir="ltr" aria-live="polite"></span>
    </div>
    <div class="rx-progress"><i></i></div>
    <p class="rx-hint" hidden>${esc(T("Turn your phone sideways to read the page larger", "סובבו את הטלפון לרוחב כדי לקרוא בגדול"))}</p>`;
  document.body.appendChild(el);
  rx.el = el;
  document.documentElement.classList.add("rx-on");
  bindReader();
  // real full screen where the browser has it (not on iPhone: there the reader fills the window)
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  let entered = null;
  if (req) { try { entered = req.call(el); rx.native = true; entered?.catch?.(() => { rx.native = false; }); } catch { rx.native = false; } }
  turn(p, true);
  wake();
  el.tabIndex = -1;
  el.focus({ preventScroll: true });
  sideways(entered);
}

// Wide pages on a phone held upright: turn the screen sideways where the phone allows it (Android, in full
// screen), or say once that turning the phone shows the page larger.
async function sideways(entered) {
  const { w, h } = dims();
  if (w <= h || !matchMedia("(hover:none) and (orientation:portrait)").matches) return;
  try { await Promise.race([entered, wait(800)]); await Promise.race([screen.orientation.lock("landscape"), wait(1200).then(() => { throw new Error("no answer"); })]); return; } catch { /* not here: show the hint */ }
  const hint = rx.el && $(".rx-hint");
  if (!hint) return;
  hint.hidden = false;
  setTimeout(() => hint.classList.add("gone"), 4500);
  addEventListener("orientationchange", () => hint.classList.add("gone"), { once: true });
}

function closeReader() {
  if (!rx.el) return;
  try { screen.orientation?.unlock?.(); } catch { /* fine */ }
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl) (document.exitFullscreen || document.webkitExitFullscreen).call(document)?.catch?.(() => {});
  rx.el.remove(); rx.el = null; rx.native = false;
  document.documentElement.classList.remove("rx-on");
  // back on the page where the reader was
  const els = allPages();
  if (rx.g === current && els[rx.p]) { page = rx.p; els[rx.p].scrollIntoView({ block: "center" }); counter(); }
  rx.back?.focus?.({ preventScroll: true });
}
const onFs = () => { if (rx.el && rx.native && !(document.fullscreenElement || document.webkitFullscreenElement)) closeReader(); };
document.addEventListener("fullscreenchange", onFs);
document.addEventListener("webkitfullscreenchange", onFs);

// the page's size when it fits the screen (scale 1), and where it sits
function fit() {
  const st = $(".rx-stage"), W = st.clientWidth, H = st.clientHeight;
  const m = W < 700 ? 0 : 20;
  const { w, h } = dims();
  const k = Math.min((W - 2 * m) / w, (H - 2 * m) / h);
  return { W, H, bw: w * k, bh: h * k };
}
function clamp() {
  const { W, H, bw, bh } = fit();
  const sw = bw * rx.s, sh = bh * rx.s, left = (W - bw) / 2, top = (H - bh) / 2;
  rx.x = sw <= W ? W / 2 - left - sw / 2 : Math.min(-left, Math.max(W - left - sw, rx.x));
  rx.y = sh <= H ? H / 2 - top - sh / 2 : Math.min(-top, Math.max(H - top - sh, rx.y));
}
function layout(animate = false) {
  if (!rx.el) return;
  const { W, H, bw, bh } = fit();
  clamp();
  const sheet = $(".rx-sheet");
  sheet.classList.toggle("anim", animate);
  Object.assign(sheet.style, { width: `${bw}px`, height: `${bh}px`, left: `${(W - bw) / 2}px`, top: `${(H - bh) / 2}px`,
    transform: `translate(${rx.x}px,${rx.y}px) scale(${rx.s})` });
  rx.el.classList.toggle("zoomed", rx.s > 1.001);
  $(".rx-z").textContent = `${Math.round(rx.s * 100)}%`;
  $('[data-a="out"]').disabled = rx.s <= 1.001;
  $('[data-a="in"]').disabled = rx.s >= MAX_ZOOM - 0.001;
}
// zoom to s, keeping the point (cx, cy) on the screen where it is
function zoomTo(s, cx, cy, animate = false) {
  const { W, H, bw, bh } = fit();
  s = Math.max(1, Math.min(MAX_ZOOM, s));
  if (cx === undefined) { cx = W / 2; cy = H / 2; }
  const left = (W - bw) / 2, top = (H - bh) / 2;
  const lx = (cx - left - rx.x) / rx.s, ly = (cy - top - rx.y) / rx.s;
  rx.x = cx - left - lx * s; rx.y = cy - top - ly * s; rx.s = s;
  layout(animate);
}

let turnId = 0;
async function turn(p, first = false) {
  const n = pageCount();
  if (p < 0 || p >= n || (!first && p === rx.p)) return;
  rx.p = p; rx.s = 1; rx.x = 0; rx.y = 0;
  const id = ++turnId;
  const { w, h } = dims();
  const c = $(".rx-sheet canvas"), wait = $(".rx-wait");
  layout();
  $(".rx-n").textContent = `${p + 1} / ${n}`;
  $(".rx-progress i").style.width = `${((p + 1) / n) * 100}%`;
  $(".rx-prev").disabled = p <= 0;
  $(".rx-next").disabled = p >= n - 1;
  const paint = (img) => {
    if (id !== turnId || !rx.el) return;
    c.width = w; c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    c.classList.add("ok"); wait.hidden = true;
  };
  c.classList.remove("ok");
  const showWait = setTimeout(() => { if (id === turnId) wait.hidden = false; }, 250);
  // the lighter page first if it's here already, then the sharp one
  loadImg(rx.g, p, false).then(paint, () => {});
  await loadImg(rx.g, p, true).then(paint, () => {});
  clearTimeout(showWait);
  // the next pages ready before they're needed
  [p + 1, p + 2, p - 1].forEach((k) => { if (k >= 0 && k < n) loadImg(rx.g, k, true).catch(() => {}); });
}
const forward = () => turn(rx.p + 1), backward = () => turn(rx.p - 1);

// the controls show on movement and fade while reading
function wake() {
  if (!rx.el) return;
  rx.el.classList.remove("idle");
  clearTimeout(rx.idle);
  rx.idle = setTimeout(() => { if (rx.el && !rx.el.querySelector(".rx-dock:hover, .rx-edge:hover, .rx-dock :focus-visible")) rx.el.classList.add("idle"); }, 2200);
}

function bindReader() {
  const el = rx.el, stage = $(".rx-stage");
  el.addEventListener("click", (e) => {
    const a = e.target.closest("[data-a]")?.dataset.a;
    if (a === "close") closeReader();
    else if (a === "in") zoomTo(stepUp(), undefined, undefined, true);
    else if (a === "out") zoomTo(stepDown(), undefined, undefined, true);
    else if (a === "fit") { rx.s = 1; layout(true); }
  });
  $(".rx-prev").addEventListener("click", backward);
  $(".rx-next").addEventListener("click", forward);
  el.addEventListener("mousemove", wake);
  el.addEventListener("contextmenu", (e) => e.preventDefault());
  addEventListener("resize", () => layout());

  // wheel: ctrl + wheel and trackpad pinch zoom; otherwise it moves a zoomed page, or turns pages when the page fits
  let acc = 0, lock = 0;
  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) { zoomTo(rx.s * Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top); return; }
    if (rx.s > 1.001) { rx.x -= e.deltaX; rx.y -= e.deltaY; layout(); return; }
    if (Date.now() < lock) return;
    acc += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : (he() ? -e.deltaX : e.deltaX);
    if (Math.abs(acc) > 60) { acc > 0 ? forward() : backward(); acc = 0; lock = Date.now() + 450; }
  }, { passive: false });

  // pointers: drag to move, pinch to zoom, swipe to turn, tap the sides to turn, tap to show the controls,
  // double-tap / double-click to zoom in and back
  const pts = new Map();
  let start = null, pinch = null, lastTap = 0, tapTimer = 0;
  const local = (e) => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  stage.addEventListener("pointerdown", (e) => {
    stage.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, local(e));
    if (pts.size === 1) start = { ...local(e), x0: rx.x, y0: rx.y, t: Date.now(), moved: false };
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: rx.s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      start = null;
    }
  });
  stage.addEventListener("pointermove", (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, local(e));
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      rx.x += mx - pinch.mx; rx.y += my - pinch.my; pinch.mx = mx; pinch.my = my;
      zoomTo(pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, mx, my);
      return;
    }
    if (!start) return;
    const p = local(e), dx = p.x - start.x, dy = p.y - start.y;
    if (Math.hypot(dx, dy) > 8) start.moved = true;
    if (rx.s > 1.001 && start.moved) { rx.x = start.x0 + dx; rx.y = start.y0 + dy; layout(); el.classList.add("dragging"); }
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    el.classList.remove("dragging");
    if (pinch) { if (pts.size < 2) pinch = null; start = null; return; }
    if (!start) return;
    const p = local(e), dx = p.x - start.x, dy = p.y - start.y, s0 = start;
    start = null;
    if (rx.s <= 1.001 && s0.moved && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) {   // swipe
      const fwd = he() ? dx > 0 : dx < 0;
      fwd ? forward() : backward();
      return;
    }
    if (s0.moved || Date.now() - s0.t > 400) return;
    // a tap
    if (Date.now() - lastTap < 300) {   // double: zoom in there, or back to the whole page
      clearTimeout(tapTimer); lastTap = 0;
      rx.s > 1.001 ? (rx.s = 1, layout(true)) : zoomTo(2.5, p.x, p.y, true);
      return;
    }
    lastTap = Date.now();
    if (e.pointerType === "mouse") { wake(); return; }
    tapTimer = setTimeout(() => {   // touch: the sides turn pages, the middle shows or hides the controls
      const W = stage.clientWidth;
      if (rx.s <= 1.001 && p.x < W * 0.22) (he() ? forward : backward)();
      else if (rx.s <= 1.001 && p.x > W * 0.78) (he() ? backward : forward)();
      else if (el.classList.contains("idle")) wake();
      else { clearTimeout(rx.idle); el.classList.add("idle"); }
    }, 280);
  };
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
}

document.addEventListener("keydown", (e) => {
  if (rx.el) {
    const fwd = he() ? "ArrowLeft" : "ArrowRight", back = he() ? "ArrowRight" : "ArrowLeft";
    const k = e.key;
    if (k === "Escape") { e.preventDefault(); closeReader(); }
    else if ([fwd, "PageDown", " "].includes(k) || (k === "ArrowDown" && rx.s <= 1.001)) { e.preventDefault(); forward(); }
    else if ([back, "PageUp"].includes(k) || (k === "ArrowUp" && rx.s <= 1.001)) { e.preventDefault(); backward(); }
    else if (k === "ArrowDown" || k === "ArrowUp") { e.preventDefault(); rx.y += k === "ArrowDown" ? -80 : 80; layout(); }
    else if (k === "Home") { e.preventDefault(); turn(0); }
    else if (k === "End") { e.preventDefault(); turn(pageCount() - 1); }
    else if (k === "+" || k === "=") { e.preventDefault(); zoomTo(stepUp(), undefined, undefined, true); }
    else if (k === "-") { e.preventDefault(); zoomTo(stepDown(), undefined, undefined, true); }
    else if (k === "0") { e.preventDefault(); rx.s = 1; layout(true); }
    else return;
    wake();
    return;
  }
  if (!document.getElementById("rd-pages") || e.target.closest("input, select, textarea")) return;
  if (e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey) openReader(current, page);
});

// No saving, dragging or printing the pages from here.
document.addEventListener("contextmenu", (e) => { if (e.target.closest(".rd-pages, .rx")) e.preventDefault(); });
document.addEventListener("dragstart", (e) => { if (e.target.closest(".rd-pages, .rx")) e.preventDefault(); });
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && ["s", "p"].includes(e.key.toLowerCase())) e.preventDefault();
});

(async () => {
  const user = await currentUser().catch(() => null);
  if (!user) {
    message(`<p>${esc(T("Sign in to read your Field Guides.", "התחברו כדי לקרוא את המדריכים שלכם."))}</p>
      <a class="btn" href="/account/?next=${encodeURIComponent("/read/")}">${esc(T("Sign in", "התחברות"))}</a>`);
    return;
  }
  try {
    await load();
    render();
  } catch (err) {
    message(`<p>${esc(err.message)}</p><a class="btn" href="/account/">${esc(T("Go to My downloads", "להורדות שלי"))}</a>`);
  }
})();
