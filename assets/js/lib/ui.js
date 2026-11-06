// ============================================================================
// Shared interface behaviour: header, mobile nav, scroll reveal, toasts,
// before/after slider, product cards, checkout loader.
// ============================================================================
import { initCart } from "./cart.js";
import { CONFIG } from "../config.js";
import { esc, mediaUrl, money } from "./api.js";
import { CATEGORIES, ICONS, categoryOf, countLabel } from "./catalog.js";
import { initI18n } from "../i18n.js";

document.documentElement.classList.remove("no-js");

// ---------------------------------------------------------------- header + nav
export function initChrome() {
  initI18n();
  initCart();
  const header = document.querySelector(".site-header");
  if (header && !header.classList.contains("site-header--solid")) {
    const onScroll = () => header.classList.toggle("is-solid", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    const close = () => { nav.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    });
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  // Mark the current page in the nav
  const here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a").forEach((a) => {
    if (a.getAttribute("href") === here) a.setAttribute("aria-current", "page");
  });

  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
  const hero = document.querySelector(".hero");
  if (hero) requestAnimationFrame(() => hero.classList.add("is-loaded"));

  initReveal();
}

// ---------------------------------------------------------------- reveal on scroll
let revealObserver;
export function initReveal(root = document) {
  const items = root.querySelectorAll(".reveal:not(.is-in)");
  if (!("IntersectionObserver" in window)) { items.forEach((el) => el.classList.add("is-in")); return; }
  revealObserver ??= new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-in"); revealObserver.unobserve(entry.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  items.forEach((el, i) => { el.style.transitionDelay = `${Math.min(i % 4, 3) * 80}ms`; revealObserver.observe(el); });
}

// ---------------------------------------------------------------- toasts
export function toast(message, { type = "info", timeout = 4200 } = {}) {
  let region = document.querySelector(".toast-region");
  if (!region) {
    region = document.createElement("div");
    region.className = "toast-region";
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    document.body.append(region);
  }
  const el = document.createElement("div");
  el.className = `toast${type === "error" ? " toast--error" : ""}`;
  el.textContent = message;
  region.append(el);
  setTimeout(() => el.remove(), timeout);
}

// ---------------------------------------------------------------- before / after
/** Markup for a before/after slider. `pair` = { before, after } media rows. */
export function beforeAfterHTML(pair, { eager = false } = {}) {
  const load = eager ? "eager" : "lazy";
  const label = pair.after.caption || pair.after.alt || "Preset comparison";
  return `
    <figure class="stack">
      <div class="ba" data-ba>
        <img src="${esc(mediaUrl(pair.before.path, { width: 1600 }))}" alt="${esc(pair.before.alt || "Before")}" loading="${load}" decoding="async">
        <img class="ba__after" src="${esc(mediaUrl(pair.after.path, { width: 1600 }))}" alt="${esc(pair.after.alt || "After")}" loading="${load}" decoding="async">
        <span class="ba__label ba__label--before">Before</span>
        <span class="ba__label ba__label--after">After</span>
        <span class="ba__handle" aria-hidden="true"></span>
        <input type="range" min="0" max="100" value="50" aria-label="Compare before and after: ${esc(label)}">
      </div>
      ${pair.after.caption ? `<figcaption class="caption">${esc(pair.after.caption)}</figcaption>` : ""}
    </figure>`;
}

/** Wires every [data-ba] slider inside root: drag, touch, keyboard (via the range input). */
export function initBeforeAfter(root = document) {
  root.querySelectorAll("[data-ba]:not([data-ba-ready])").forEach((el) => {
    el.dataset.baReady = "1";
    const range = el.querySelector("input[type=range]");
    const rtl = getComputedStyle(el).direction === "rtl";
    const set = (pct) => {
      const v = Math.max(0, Math.min(100, pct));
      el.style.setProperty("--pos", `${v}%`);
      range.value = String(Math.round(v));
    };
    range.addEventListener("input", () => set(Number(range.value)));
    el.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse" && e.buttons === 0 && !el.matches(":hover")) return;
      const r = el.getBoundingClientRect();
      const pct = ((e.clientX - r.left) / r.width) * 100;
      set(rtl ? 100 - pct : pct);
    });
    // A gentle hint the first time the slider scrolls into view
    if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const frames = [50, 38, 62, 50];
        frames.forEach((v, i) => setTimeout(() => set(v), 300 + i * 360));
      }, { threshold: 0.6 });
      io.observe(el);
    }
  });
}

// ---------------------------------------------------------------- product card
export function titleHTML(p) {
  return p.name_emphasis
    ? `<span data-no-i18n>${esc(p.name)} <strong>${esc(p.name_emphasis)}</strong></span>`
    : `<strong data-no-i18n>${esc(p.name)}</strong>`;
}

/** Designed tile shown in place of a product image until one is uploaded. */
export function productArtHTML(p) {
  const cat = categoryOf(p);
  return `<div class="art art--${cat}" aria-hidden="true">${ICONS[cat]}<span class="art__name" data-no-i18n>${esc(p.name)}${p.name_emphasis ? " " + esc(p.name_emphasis) : ""}</span></div>`;
}

export function priceHTML(p) {
  return p.compare_at_cents
    ? `<s>${money(p.compare_at_cents, p.currency)}</s>${money(p.price_cents, p.currency)}`
    : money(p.price_cents, p.currency);
}

export function productCardHTML(p) {
  const cat = categoryOf(p);
  const cover = p.cover_path ? mediaUrl(p.cover_path, { width: 900 }) : "";
  const hover = p.hover_path ? mediaUrl(p.hover_path, { width: 900 }) : "";
  const count = countLabel(p);
  return `
    <a class="product-card" href="/product/?p=${encodeURIComponent(p.slug)}">
      <div class="product-card__media">
        ${cover ? `<img src="${esc(cover)}" alt="" loading="lazy" decoding="async">` : productArtHTML(p)}
        ${cover && hover ? `<img src="${esc(hover)}" alt="" loading="lazy" decoding="async">` : ""}
        ${p.badge ? `<span class="product-card__badge"><span class="tag" data-no-i18n>${esc(p.badge)}</span></span>` : ""}
      </div>
      <div class="product-card__body">
        <span class="product-card__cat">${esc(CATEGORIES[cat].one)}</span>
        <h3 class="product-card__title">${titleHTML(p)}</h3>
        <span class="price">${priceHTML(p)}</span>
        ${count || p.tagline ? `<p class="meta">${count ? `<span>${esc(count)}</span>` : ""}${count && p.tagline ? ". " : ""}${p.tagline ? `<span data-no-i18n>${esc(p.tagline)}</span>` : ""}</p>` : ""}
      </div>
    </a>`;
}

export function skeletonCards(n = 3) {
  return Array.from({ length: n }, () => `
    <div aria-hidden="true">
      <div class="skeleton" style="aspect-ratio:4/5"></div>
      <div class="skeleton" style="height:20px;margin-top:16px;width:60%"></div>
    </div>`).join("");
}

// ---------------------------------------------------------------- checkout
let checkoutLoading;
/** Loads the overlay checkout script once; Buy links with class lemonsqueezy-button open in an overlay. */
export function loadCheckout() {
  checkoutLoading ??= new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = CONFIG.CHECKOUT_SCRIPT;
    s.defer = true;
    s.onload = () => { window.createLemonSqueezy?.(); resolve(true); };
    s.onerror = () => resolve(false);   // the plain link still works without the overlay
    document.head.append(s);
  });
  return checkoutLoading;
}

/** Adds the buyer's email and UTM source to a checkout link so orders are attributed. */
export function checkoutHref(baseUrl, { email } = {}) {
  const url = new URL(baseUrl);
  if (email) url.searchParams.set("checkout[email]", email);
  const utm = new URLSearchParams(location.search).get("utm_source") || sessionStorage.getItem("utm_source");
  if (utm) url.searchParams.set("checkout[custom][source]", utm);
  url.searchParams.set("embed", "1");
  return url.toString();
}

// Remember where the visitor came from for the length of the visit
try {
  const src = new URLSearchParams(location.search).get("utm_source");
  if (src) sessionStorage.setItem("utm_source", src.slice(0, 64));
} catch { /* storage blocked: attribution is optional */ }
