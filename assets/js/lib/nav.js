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
  // Phones and tablets: the menu button opens the links as a panel under the header.
  function menu() {
    const btn = document.querySelector(".nav .nav-menu");
    const links = document.querySelector(".nav .links");
    if (!btn || !links) return;
    links.id = links.id || "site-links";
    const set = (open) => { root.classList.toggle("menu-open", open); btn.setAttribute("aria-expanded", String(open)); };
    btn.addEventListener("click", () => set(!root.classList.contains("menu-open")));
    links.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && root.classList.contains("menu-open")) { set(false); btn.focus(); } });
    document.addEventListener("click", (e) => { if (root.classList.contains("menu-open") && !e.target.closest(".nav")) set(false); });
    matchMedia("(min-width: 1101px)").addEventListener("change", (m) => { if (m.matches) set(false); });
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", menu) : menu();

  let tries = 0;
  (function poll() { if (!watch() && tries++ < 40) setTimeout(poll, 150); })();
})();
