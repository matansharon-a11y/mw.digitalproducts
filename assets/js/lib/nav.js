// Premium header behaviour: frosted glass once the page scrolls, and the menu link of the
// section in view gets the gold underline. Works on the home page and the sales pages.
(function () {
  "use strict";
  // An emailed account link (reset password, confirm email, sign in) that lands on another page than My downloads,
  // e.g. the home page when the email's button points at the site's address: forward it there, code and all.
  (function forwardAccountLink() {
    if (/^\/account(\/|\.html)?$/.test(location.pathname)) return;
    const q = new URLSearchParams(location.search), h = new URLSearchParams(location.hash.slice(1));
    if (!(q.has("code") || q.has("token_hash") || h.has("access_token") || q.has("error_description") || h.has("error_description"))) return;
    // a reset link says so in its type, or (a ?code= link) in the marker the browser kept when the reset was asked for
    let asked = false;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (/-code-verifier$/.test(k) && /\/recovery"?$/.test(localStorage.getItem(k) || "")) asked = true;
      }
    } catch (e) { /* storage blocked */ }
    const recovery = ((q.get("type") || h.get("type")) === "recovery" || (q.has("code") && asked)) && !q.has("reset");
    location.replace("/account/" + location.search + (recovery ? (location.search ? "&" : "?") + "reset=1" : "") + location.hash);
  })();
  const root = document.documentElement;
  const onScroll = () => root.classList.toggle("nav-scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  function watch() {
    // "#id", or "/#id" on the home page: the menu link of a section on this page
    const target = (a) => {
      const h = a.getAttribute("href") || "";
      if (h.startsWith("#")) return h.slice(1);
      if (h.startsWith("/#") && location.pathname === "/") return h.slice(2);
      return "";
    };
    const links = Array.from(document.querySelectorAll(".nav .links a")).filter(target);
    const pairs = links.map((a) => [a, document.getElementById(target(a))]).filter((p) => p[1]);
    if (!pairs.length || !("IntersectionObserver" in window)) return false;
    const seen = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target, e.isIntersecting ? e.intersectionRatio : 0));
      let best = null, max = 0;
      pairs.forEach(([a, sec]) => { const r = seen.get(sec) || 0; if (r > max) { max = r; best = a; } });
      // The sales pages re-render their menu; look the links up again each time.
      document.querySelectorAll(".nav .links a").forEach((a) => { if (target(a)) a.classList.toggle("is-active", !!best && a.getAttribute("href") === best.getAttribute("href")); });
    }, { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.01, 0.25, 0.5] });
    pairs.forEach(([, sec]) => io.observe(sec));
    return true;
  }
  // The ☰ menu (25 Oct 2026): a side panel with the shop, the account and the social accounts, on every screen size.
  // The panel and its backdrop move to the end of <body>: the header's blur would trap a fixed panel inside it.
  function menu() {
    const btn = document.querySelector(".nav .nav-menu");
    const panel = document.getElementById("site-menu");
    const scrim = document.querySelector(".sm-scrim");
    if (!btn || !panel) return;
    document.body.append(scrim || "", panel);
    let closing = 0;
    const set = (open) => {
      clearTimeout(closing);
      btn.setAttribute("aria-expanded", String(open));
      if (open) {
        panel.hidden = false; if (scrim) scrim.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("menu-open")));   // after it's shown: slides in
        setTimeout(() => panel.querySelector("a, button")?.focus({ preventScroll: true }), 60);
      } else if (!panel.hidden) {
        root.classList.remove("menu-open");
        closing = setTimeout(() => { panel.hidden = true; if (scrim) scrim.hidden = true; }, 320);   // after it slides out
        btn.focus({ preventScroll: true });
      }
    };
    btn.addEventListener("click", () => set(panel.hidden));
    document.addEventListener("click", (e) => { if (e.target.closest("[data-sm-close]")) set(false); });
    panel.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });   // a link to this page's section
    document.addEventListener("keydown", (e) => {
      if (panel.hidden) return;
      if (e.key === "Escape") { set(false); return; }
      if (e.key !== "Tab") return;   // keep the keyboard inside the open panel
      const f = [...panel.querySelectorAll("a, button")];
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", menu) : menu();

  let tries = 0;
  (function poll() { if (!watch() && tries++ < 40) setTimeout(poll, 150); })();

  // The free Field Guides sample pop-up (assets/js/lib/gift.js). GIFT_ON stays false until Matan approves its words;
  // until then it loads only for ?gift=preview or the #free-guide link. Its code downloads only when it's needed.
  const GIFT_ON = false;
  window.MWP_GIFT = { on: GIFT_ON };
  let giftLoaded = false;
  const loadGift = () => {
    if (giftLoaded) return;
    giftLoaded = true;
    const s = document.createElement("script");
    s.type = "module"; s.src = "/assets/js/lib/gift.js";
    document.head.append(s);
  };
  const wantGift = () => GIFT_ON || location.hash === "#free-guide" || new URLSearchParams(location.search).get("gift") === "preview";
  if (wantGift()) loadGift();
  else window.addEventListener("hashchange", () => { if (location.hash === "#free-guide") loadGift(); });
})();
