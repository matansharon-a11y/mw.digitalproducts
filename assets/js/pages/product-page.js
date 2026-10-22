// Product pages (Presets, Panel, Field Guides): reveal on scroll, the product bar, the RAW / final
// slider, the guide page viewer and the card rail. Built by tools/build_products.py.
import { initCart } from "../lib/cart.js";
import { initPrices } from "../lib/prices.js";

initCart();
initPrices();

const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------- reveal on scroll
if ("IntersectionObserver" in window && !reduce) {
  root.classList.add("js");
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll("[data-r]").forEach((el) => io.observe(el));
}

// ---------------------------------------------------------------- product bar: shows once the hero is gone
const bar = document.querySelector(".pbar");
const hero = document.querySelector(".hero");
if (bar && hero) {
  const onScroll = () => bar.classList.toggle("on", hero.getBoundingClientRect().bottom < 80);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  // the section in view is marked in the bar
  const links = [...bar.querySelectorAll("nav a")];
  const secs = links.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const seen = new Map();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => seen.set(e.target.id, e.isIntersecting));
      links.forEach((a) => a.classList.toggle("on", !!seen.get(a.hash.slice(1)) && links.find((l) => seen.get(l.hash.slice(1))) === a));
    }, { rootMargin: "-40% 0px -50% 0px" });
    secs.forEach((s) => io.observe(s));
  }
}

// ---------------------------------------------------------------- RAW / final slider (one per slide)
document.querySelectorAll(".ba").forEach((ba) => {
  const range = ba.querySelector("input");
  const set = (v) => ba.style.setProperty("--p", v + "%");
  range.addEventListener("input", () => set(range.value));
  range.addEventListener("pointerdown", () => ba.classList.add("drag"));
  addEventListener("pointerup", () => ba.classList.remove("drag"));
  const touched = () => { range.dataset.touched = 1; ba.classList.add("touched"); };
  range.addEventListener("pointerdown", touched, { once: true });
  range.addEventListener("keydown", touched, { once: true });
  // a gentle hint the first time the first slider comes into view
  if (!reduce && "IntersectionObserver" in window && ba.closest(".slide.on")) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      let t0 = null;
      const step = (t) => {
        if (range.dataset.touched) return;
        t0 ??= t; const k = Math.min(1, (t - t0) / 1600);
        const v = 50 + Math.sin(k * Math.PI * 2) * 14 * (1 - k);
        set(v); range.value = v;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
    io.observe(ba);
  }
});

// ---------------------------------------------------------------- galleries: the next slide peeks in
document.querySelectorAll("[data-gal]").forEach((gal) => {
  const track = gal.querySelector(".gal-track");
  const slides = [...gal.querySelectorAll(".slide")];
  const caps = JSON.parse(gal.dataset.caps || "[]");
  const cap = gal.querySelector(".cap"), num = gal.querySelector(".count b");
  const prev = gal.querySelector("[data-prev]"), next = gal.querySelector("[data-nextg]");
  let i = 0;
  const go = (n) => {
    i = Math.max(0, Math.min(slides.length - 1, n));
    track.style.transform = `translateX(${slides[0].offsetLeft - slides[i].offsetLeft}px)`;
    slides.forEach((sl, k) => { sl.classList.toggle("on", k === i); sl.querySelectorAll("input,button,a").forEach((el) => { el.tabIndex = k === i ? 0 : -1; }); sl.setAttribute("aria-hidden", String(k !== i)); });
    if (cap) cap.textContent = caps[i] || "";
    if (num) num.textContent = String(i + 1).padStart(2, "0");
    if (prev) { prev.disabled = i === 0; next.disabled = i === slides.length - 1; }
  };
  prev?.addEventListener("click", () => go(i - 1));
  next?.addEventListener("click", () => go(i + 1));
  // the peeking slide is a way forward too (its own slider is switched off, so the click reaches the figure)
  slides.forEach((sl, k) => sl.addEventListener("click", () => { if (k !== i) go(k); }));
  gal.addEventListener("keydown", (e) => {
    const rtl = root.dir === "rtl";
    if (e.target.matches("input")) return;
    if (e.key === "ArrowRight") go(rtl ? i - 1 : i + 1);
    if (e.key === "ArrowLeft") go(rtl ? i + 1 : i - 1);
  });
  addEventListener("resize", () => go(i));
  go(0);
});

// ---------------------------------------------------------------- card rail arrows
document.querySelectorAll("[data-rail]").forEach((wrap) => {
  const rail = wrap.querySelector(".rail");
  const [prev, next] = wrap.querySelectorAll(".rail-nav button");
  if (!rail || !prev) return;
  const rtl = root.dir === "rtl";
  const pos = () => Math.abs(rail.scrollLeft);
  const sync = () => {
    const max = rail.scrollWidth - rail.clientWidth - 2;
    prev.disabled = pos() <= 2; next.disabled = pos() >= max;
    wrap.querySelector(".rail-nav").hidden = max <= 0;
    // a soft fade on the side where more cards are waiting
    rail.classList.toggle("more-end", pos() < max); rail.classList.toggle("more-start", pos() > 2);
  };
  const by = (dir) => rail.scrollBy({ left: dir * (rtl ? -1 : 1) * rail.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  prev.addEventListener("click", () => by(-1));
  next.addEventListener("click", () => by(1));
  rail.addEventListener("scroll", sync, { passive: true });
  addEventListener("resize", sync);
  sync();
});

// ---------------------------------------------------------------- MWP Panel in Lightroom Classic: the window preview
// The tab list beside it and the window's own tabs both switch the tab; the Looks category menu changes the tiles;
// the sliders show their number. Nothing here edits a photo: it's a preview of the plugin (tools/lrc_preview.py).
document.querySelectorAll("[data-lrc]").forEach((box) => {
  const tabs = [...box.querySelectorAll("[data-lrc-tab]")];
  const panes = [...box.querySelectorAll("[data-lrc-pane]")];
  const show = (id) => {
    tabs.forEach((b) => { const on = b.dataset.lrcTab === id; b.classList.toggle("on", on); if (b.getAttribute("role") === "tab") b.setAttribute("aria-selected", String(on)); });
    panes.forEach((pn) => { pn.hidden = pn.dataset.lrcPane !== id; });
  };
  const win = box.querySelector(".lw");
  tabs.forEach((b) => b.addEventListener("click", () => {
    show(b.dataset.lrcTab);
    // phones: the window sits above the list, so a tap on the list brings it into view
    if (!b.closest(".lw") && win && win.getBoundingClientRect().bottom < 80) win.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }));
  box.querySelector("[data-lrc-cat]")?.addEventListener("change", (e) => {
    box.querySelectorAll(".lw-look").forEach((t) => { t.hidden = t.dataset.cat !== e.target.value; });
  });
  box.querySelectorAll(".lw-range").forEach((r) => {
    const out = r.nextElementSibling;
    r.addEventListener("input", () => { out.textContent = r.dataset.fmt === "s" ? (+r.value).toFixed(1) + "s" : r.value; });
  });
});

// ---------------------------------------------------------------- FAQ: one open at a time
const faqs = [...document.querySelectorAll(".faq details")];
faqs.forEach((d) => d.addEventListener("toggle", () => { if (d.open) faqs.forEach((o) => { if (o !== d) o.open = false; }); }));
