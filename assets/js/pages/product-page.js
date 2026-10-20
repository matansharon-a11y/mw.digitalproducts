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

// ---------------------------------------------------------------- RAW / final slider
document.querySelectorAll("[data-ba]").forEach((box) => {
  const ba = box.querySelector(".ba");
  const range = ba.querySelector("input");
  const [before, after] = ba.querySelectorAll("img");
  const set = (v) => ba.style.setProperty("--p", v + "%");
  range.addEventListener("input", () => set(range.value));
  range.addEventListener("pointerdown", () => ba.classList.add("drag"));
  addEventListener("pointerup", () => ba.classList.remove("drag"));
  // a gentle hint the first time it comes into view
  if (!reduce && "IntersectionObserver" in window) {
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
  // the handle pulses until it has been moved once
  const touched = () => { range.dataset.touched = 1; ba.classList.add("touched"); };
  range.addEventListener("pointerdown", touched, { once: true });
  range.addEventListener("keydown", touched, { once: true });
  box.querySelectorAll("[data-pair]").forEach((chip) => chip.addEventListener("click", () => {
    box.querySelectorAll("[data-pair]").forEach((c) => c.setAttribute("aria-selected", String(c === chip)));
    before.src = chip.dataset.before; after.src = chip.dataset.after;
    before.alt = chip.dataset.alt0; after.alt = chip.dataset.alt1;
    set(50); range.value = 50;
  }));
  // "Next example" on the photo: the next tab, round and round
  const tabs = [...box.querySelectorAll("[data-pair]")];
  const nx = box.querySelector("[data-next]");
  if (nx) {
    if (tabs.length < 2) nx.hidden = true;
    nx.addEventListener("click", () => {
      const k = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
      tabs[(k + 1) % tabs.length].click();
    });
  }
});

// ---------------------------------------------------------------- guide page viewer
document.querySelectorAll("[data-viewer]").forEach((v) => {
  const imgs = [...v.querySelectorAll(".pg img")];
  const dots = [...v.querySelectorAll(".dots button")];
  let i = 0;
  const go = (n) => {
    i = (n + imgs.length) % imgs.length;
    imgs.forEach((im, k) => im.classList.toggle("on", k === i));
    dots.forEach((d, k) => d.setAttribute("aria-current", String(k === i)));
    const num = v.querySelector(".count b"); if (num) num.textContent = i + 1;
  };
  const rtl = root.dir === "rtl";
  v.querySelector(".prev").addEventListener("click", () => go(i - 1));
  v.querySelector(".next").addEventListener("click", () => go(i + 1));
  v.querySelector("[data-nextpage]")?.addEventListener("click", () => go(i + 1));
  dots.forEach((d, k) => d.addEventListener("click", () => go(k)));
  v.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go(rtl ? i - 1 : i + 1);
    if (e.key === "ArrowLeft") go(rtl ? i + 1 : i - 1);
  });
  let x0 = null;
  v.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  v.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) go(i + ((dx < 0) !== rtl ? 1 : -1));
  });
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

// ---------------------------------------------------------------- FAQ: one open at a time
const faqs = [...document.querySelectorAll(".faq details")];
faqs.forEach((d) => d.addEventListener("toggle", () => { if (d.open) faqs.forEach((o) => { if (o !== d) o.open = false; }); }));
