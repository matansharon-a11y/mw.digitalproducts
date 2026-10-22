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
// The window's tabs switch the tab (and the line under the window); the Looks category menu changes the tiles;
// the sliders show their number. Nothing here edits a photo: it's a preview of the plugin (tools/lrc_preview.py).
document.querySelectorAll("[data-lrc]").forEach((box) => {
  const tabs = [...box.querySelectorAll("[data-lrc-tab]")];
  const panes = [...box.querySelectorAll("[data-lrc-pane]")];
  const show = (id) => {
    tabs.forEach((b) => { const on = b.dataset.lrcTab === id; b.classList.toggle("on", on); if (b.getAttribute("role") === "tab") b.setAttribute("aria-selected", String(on)); });
    panes.forEach((pn) => { pn.hidden = pn.dataset.lrcPane !== id; });
    box.querySelectorAll("[data-lrc-desc]").forEach((d) => { d.hidden = d.dataset.lrcDesc !== id; });
  };
  tabs.forEach((b) => b.addEventListener("click", () => {
    show(b.dataset.lrcTab);
    b.scrollIntoView({ block: "nearest", inline: "center", behavior: reduce ? "auto" : "smooth" });   // phones: the tab bar scrolls
  }));
  box.querySelector("[data-lrc-cat]")?.addEventListener("change", (e) => {
    box.querySelectorAll(".lw-look").forEach((t) => { t.hidden = t.dataset.cat !== e.target.value; });
  });
  box.querySelectorAll(".lw-range").forEach((r) => {
    const out = r.nextElementSibling;
    r.addEventListener("input", () => { out.textContent = r.dataset.fmt === "s" ? (+r.value).toFixed(1) + "s" : r.value; });
  });
});

// ---------------------------------------------------------------- MWP Panel in Photoshop: the live preview
// Like the real panel: one chip picks what to edit, an effect adds an edit to it (the card shows it, the slider sets its
// strength, "Your edits" counts it), undo takes back the last one, reset clears them, Before / After shows the RAW on the canvas.
// The photo shows each edit as a layer limited to a drawn area (PW_AREA): a simulation, as the photo says. (tools/ps_preview.py)
// What each target covers on the example photo (a herd on a plain, mountains, a bright sky) and what each effect does.
// A web page can't build Photoshop's AI masks, so these are drawn areas: the photo says it's simulated.
const PW_AREA = {
  Subject: "radial-gradient(ellipse 34% 5.5% at 52% 70%, #000 60%, transparent 100%)",
  Eye: "radial-gradient(ellipse 20% 3% at 52% 68%, #000 50%, transparent 100%)",
  Sky: "linear-gradient(180deg, #000 0 26%, transparent 42%)",
  Background: "linear-gradient(180deg, #000 0 58%, transparent 63% 77%, #000 83%)",
  Lights: "linear-gradient(180deg, #000 0 34%, transparent 56%)",
  Darks: "linear-gradient(180deg, transparent 0 70%, #000 84%)",
};
const PW_EFFECT = {
  Pop: { filter: "contrast(1.3) saturate(1.45)" },
  Brighten: { filter: "brightness(1.45)" },
  Darken: { filter: "brightness(.55)" },
  Warm: { tint: "#ff8a2a", blend: "soft-light" },
  Cool: { tint: "#2f6bff", blend: "soft-light" },
  Glow: { filter: "blur(10px) brightness(1.35)", blend: "screen" },
  Blur: { filter: "blur(5px)" },
  Sharpen: { filter: "contrast(1.25) brightness(1.04)" },
};

// an area is a CSS gradient or a mask image (url(…), the photo's own cut-out, stretched over the photo)
const setMask = (el, area) => {
  el.style.maskImage = area; el.style.webkitMaskImage = area;
  el.style.maskSize = el.style.webkitMaskSize = "100% 100%";
  el.style.maskRepeat = el.style.webkitMaskRepeat = "no-repeat";
};

document.querySelectorAll(".pw[data-pw]").forEach((pw) => {
  const now = pw.querySelector("[data-pw-now]"), range = pw.querySelector(".pw-range"), count = pw.querySelector("[data-pw-count]");
  const edits = [], undone = [];
  // the photo of the window around the panel: each edit is a layer over it, limited to its area
  const box = pw.closest("[data-pws]");
  // the photo's own areas (data-areas on the canvas, fitted to it in build_products.py), else the defaults
  const areas = () => { try { return { ...PW_AREA, ...JSON.parse(box?.querySelector(".psw-canvas")?.dataset.areas || "{}") }; } catch { return PW_AREA; } };
  const pic = box?.querySelector(".psw-pic"), layers = box?.querySelector(".psw-layers"), maskEl = box?.querySelector(".psw-mask");
  const layerFor = (e) => {
    const im = pic?.querySelector(".psw-after"), src = im?.currentSrc || im?.src;
    const fx = PW_EFFECT[e.effect] || {}, el = document.createElement("div");
    if (fx.tint) el.style.background = fx.tint; else el.style.backgroundImage = `url("${src}")`;
    if (fx.filter) el.style.filter = fx.filter;
    if (fx.blend) el.style.mixBlendMode = fx.blend;
    const area = areas()[e.target];   // colours, Pick: the whole photo
    if (area) setMask(el, area);
    el.style.opacity = String(e.strength / 100);
    return el;
  };
  const drawLayers = () => { if (layers) layers.replaceChildren(...edits.map((e) => (e.el ??= layerFor(e)))); };
  const target = () => pw.querySelector(".pw-chip.on")?.dataset.pwTarget || "Subject";
  const paint = () => {
    const last = edits[edits.length - 1];
    now.textContent = last ? `${last.target} · ${last.effect}` : "No edit yet";
    range.disabled = !last; range.value = last ? last.strength : 0;
    count.textContent = edits.length; count.classList.remove("bump"); void count.offsetWidth; count.classList.add("bump");
    drawLayers();
    pw.querySelectorAll("[data-pw-effect]").forEach((b) => b.classList.toggle("on", !!last && b.dataset.pwEffect === last.effect));
  };
  pw.querySelectorAll(".pw-chip").forEach((c) => c.addEventListener("click", () => {
    pw.querySelectorAll(".pw-chip").forEach((o) => o.classList.toggle("on", o === c));
  }));
  pw.querySelectorAll("[data-pw-effect]").forEach((b) => b.addEventListener("click", () => {
    edits.push({ target: target(), effect: b.dataset.pwEffect, strength: 60 }); undone.length = 0; paint();
    // bring the strength card into view inside the panel (not the page)
    const sc = pw.querySelector(".pw-scroll"), card = pw.querySelector(".pw-card");
    const below = card.offsetTop + card.offsetHeight - (sc.scrollTop + sc.clientHeight);
    if (below > 0) sc.scrollTo({ top: sc.scrollTop + below + 12, behavior: reduce ? "auto" : "smooth" });
  }));
  range.addEventListener("input", () => {
    const last = edits[edits.length - 1];
    if (last) { last.strength = +range.value; if (last.el) last.el.style.opacity = String(last.strength / 100); }
  });
  // hold a chip: its area shows in red on the photo, as in the real panel
  pw.querySelectorAll(".pw-chip").forEach((c) => {
    let t = null;
    const hide = () => { clearTimeout(t); maskEl?.classList.remove("on"); };
    c.addEventListener("pointerdown", () => {
      t = setTimeout(() => {
        if (!maskEl) return;
        setMask(maskEl, areas()[c.dataset.pwTarget] || "none"); maskEl.classList.add("on");
      }, 250);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => c.addEventListener(ev, hide));
  });
  pw.querySelector('[data-pw="undo"]').addEventListener("click", () => { if (edits.length) { undone.push(edits.pop()); paint(); } });
  pw.querySelector('[data-pw="redo"]').addEventListener("click", () => { if (undone.length) { edits.push(undone.pop()); paint(); } });
  pw.querySelector('[data-pw="reset"]').addEventListener("click", () => { if (edits.length) { edits.length = 0; undone.length = 0; paint(); } });
  // Before / After: the RAW on the canvas of the window around the panel
  const host = pw.closest("[data-pws]"), win = host?.querySelector(".psw");
  const ba = pw.querySelector('[data-pw="ba"]');
  ba.addEventListener("click", () => { ba.classList.toggle("on"); win?.classList.toggle("before", ba.classList.contains("on")); });
  pw.querySelectorAll("[data-pw-tab]").forEach((t) => t.addEventListener("click", () => {
    pw.querySelectorAll("[data-pw-tab]").forEach((o) => { const on = o === t; o.classList.toggle("on", on); o.setAttribute("aria-selected", String(on)); });
    pw.querySelectorAll("[data-pw-pane]").forEach((pn) => { pn.hidden = pn.dataset.pwPane !== t.dataset.pwTab; });
    host?.querySelectorAll("[data-pw-desc]").forEach((d) => { d.hidden = d.dataset.pwDesc !== t.dataset.pwTab; });   // the line under the window
  }));
});

// ---------------------------------------------------------------- FAQ: one open at a time
const faqs = [...document.querySelectorAll(".faq details")];
faqs.forEach((d) => d.addEventListener("toggle", () => { if (d.open) faqs.forEach((o) => { if (o !== d) o.open = false; }); }));
