// Premium header behaviour: frosted glass once the page scrolls, and the menu link of the
// section in view gets the gold underline. Works on the home page and the sales pages.
(function () {
  "use strict";
  // The accessibility menu (a11y.js, 31 Oct 2026): loaded at once, so a visitor's saved settings apply as the page opens.
  if (!document.getElementById("mwp-a11y-js")) {
    const a = document.createElement("script");
    a.id = "mwp-a11y-js"; a.src = "/assets/js/lib/a11y.js"; a.async = true;
    (document.head || document.documentElement).append(a);
  }
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

  // Footer year, and the cookie notice (Jeinna, 31 Oct 2026; laid out like the one on mw-phototours.com, in the shop's
  // colours). The shop keeps only what it needs to work and has no analytics or advertising cookies, so the first-visit
  // card says so plainly ("Got it" / "Cookie settings") instead of offering choices that would change nothing, and the
  // settings window lists the categories with Analytics and Advertising marked "Not used". If a tracker is ever added,
  // it must stay off until its category is switched on here, and Accept all / Reject all come back.
  const CK_KEY = "mwp_cookie_ok";
  const CK = {
    en: { title: "We value your privacy", text: "This shop uses only the cookies it needs to work: keeping you signed in, your cart and your language. No analytics or advertising cookies.",
          ok: "Got it", settings: "Cookie settings", mTitle: "Cookie settings", intro: "This is everything the shop keeps in your browser. You can delete it at any time in your browser's settings.",
          nec: "Necessary", always: "Always active", necText: "Keep you signed in, remember your cart, your language, the last prices you saw, and your accessibility and cookie choices. The shop can't work without them.",
          ana: "Analytics", anaText: "Counting visits or tracking how you use the site.", ads: "Advertising", adsText: "Advertising or social media pixels and tracking for ads.", none: "Not used",
          lemon: "Payment happens on the checkout of Lemon Squeezy, our payment provider, which has its own cookie notice.", privacy: "Privacy policy", done: "Done", close: "Close" },
    he: { title: "הפרטיות שלכם חשובה לנו", text: "בחנות הזאת יש רק את העוגיות שהיא צריכה כדי לעבוד: החיבור לחשבון, העגלה והשפה. אין עוגיות מדידה או פרסום.",
          ok: "הבנתי", settings: "הגדרות עוגיות", mTitle: "הגדרות עוגיות", intro: "כאן כל מה שהחנות שומרת בדפדפן שלכם. אפשר למחוק אותו בכל רגע בהגדרות הדפדפן.",
          nec: "הכרחיות", always: "פעילות תמיד", necText: "שומרות את החיבור לחשבון, את העגלה, את השפה, את המחירים האחרונים שראיתם ואת הבחירות שלכם בנגישות ובעוגיות. החנות לא יכולה לעבוד בלעדיהן.",
          ana: "אנליטיקה", anaText: "ספירת ביקורים או מעקב אחרי השימוש שלכם באתר.", ads: "פרסום", adsText: "פיקסלים של פרסום או של רשתות חברתיות, ומעקב לצורכי פרסומות.", none: "לא בשימוש",
          lemon: "התשלום מתבצע בקופה של למון סקוויזי, ספקית התשלומים שלנו, ולה הודעת עוגיות משלה.", privacy: "מדיניות הפרטיות", done: "סגירה", close: "סגירה" },
  };
  const CK_CSS = `
.ck-card{position:fixed;z-index:110;right:88px;bottom:20px;width:min(400px,calc(100vw - 112px));padding:20px 20px 18px;border-radius:18px;border:1px solid rgba(244,175,86,.3);background:#16130F;color:#FEFBF1;font:400 14.5px/1.55 "Google Sans","Heebo",sans-serif;box-shadow:0 24px 60px rgba(0,0,0,.55);opacity:0;transform:translateY(12px);transition:opacity .35s ease,transform .35s ease}
.ck-card.on{opacity:1;transform:none}
.ck-card h2,.ck-box h2{margin:0 0 6px;font-size:17px;font-weight:600;color:#FEFBF1}
.ck-card p{margin:0 0 14px;color:#CDD7DD}
.ck-row{display:flex;flex-wrap:wrap;gap:10px}
.ck-btn{min-height:44px;padding:0 20px;border-radius:999px;font:700 14.5px "Google Sans","Heebo",sans-serif;cursor:pointer}
.ck-btn.gold{border:0;background:linear-gradient(90deg,#E4AA7C,#F4AF56);color:#1A1208}
.ck-btn.line{border:1.5px solid rgba(254,251,241,.28);background:transparent;color:#FEFBF1}
.ck-btn.line:hover{border-color:#F4AF56;color:#F4AF56}
.ck-btn:focus-visible,.ck-box a:focus-visible,.ck-x:focus-visible{outline:3px solid #FEFBF1;outline-offset:2px}
.ck-scrim{position:fixed;inset:0;z-index:300;background:rgba(10,9,8,.6)}
.ck-box{position:fixed;z-index:301;top:50%;left:50%;transform:translate(-50%,-50%);width:min(620px,calc(100vw - 24px));max-height:calc(100vh - 32px);overflow:auto;padding:22px 24px 20px;border-radius:20px;border:1px solid rgba(244,175,86,.3);background:#16130F;color:#FEFBF1;font:400 14.5px/1.6 "Google Sans","Heebo",sans-serif;box-shadow:0 30px 80px rgba(0,0,0,.6)}
.ck-box .ck-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
.ck-x{width:36px;height:36px;border:0;border-radius:50%;background:transparent;color:#CDD7DD;font-size:22px;line-height:1;cursor:pointer}
.ck-x:hover{background:rgba(254,251,241,.08);color:#FEFBF1}
.ck-box .ck-intro{margin:0 0 6px;color:#CDD7DD}
.ck-cat{padding:14px 0;border-top:1px solid rgba(254,251,241,.08)}
.ck-cat .ck-ct{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:4px}
.ck-cat h3{margin:0;font-size:15px;font-weight:600;color:#FEFBF1}
.ck-cat p{margin:0;color:#AEB9C1;font-size:14px}
.ck-tag{flex:none;padding:3px 10px;border-radius:999px;font-size:12.5px;font-weight:700}
.ck-tag.on{background:rgba(244,175,86,.16);color:#F8D29C}
.ck-tag.off{background:rgba(254,251,241,.06);color:#9CB1C2}
.ck-lemon{margin:4px 0 14px;padding-top:12px;border-top:1px solid rgba(254,251,241,.08);color:#9CB1C2;font-size:13.5px}
.ck-box .ck-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.ck-box a{color:#F4AF56}
@media (max-width:700px){.ck-card{right:16px;left:16px;width:auto;bottom:76px}}
@media print{.ck-card{display:none!important}}`;
  function footer() {
    document.querySelectorAll(".site-foot [data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
    const st = document.createElement("style");
    st.id = "mwp-cookies";
    st.textContent = CK_CSS;
    document.head.append(st);
    const he = () => /^he/.test(document.documentElement.lang);
    const T = () => CK[he() ? "he" : "en"];
    let seen = false;
    try { seen = !!localStorage.getItem(CK_KEY); } catch { /* storage blocked: show the card */ }
    let card = null, box = null, back = null;
    const agree = () => { try { localStorage.setItem(CK_KEY, new Date().toISOString().slice(0, 10)); } catch { /* storage blocked */ } };
    function hideCard() { if (!card) return; card.classList.remove("on"); const c = card; card = null; setTimeout(() => c.remove(), 350); }
    function showCard() {
      const t = T();
      card = document.createElement("section");
      card.className = "ck-card";
      card.setAttribute("aria-labelledby", "ck-card-h");
      card.setAttribute("data-no-i18n", "");
      card.dir = he() ? "rtl" : "ltr";
      card.lang = he() ? "he" : "en";
      card.innerHTML = `<h2 id="ck-card-h">${t.title}</h2><p>${t.text}</p><div class="ck-row"><button type="button" class="ck-btn gold" data-ck-ok>${t.ok}</button><button type="button" class="ck-btn line" data-cookie-settings>${t.settings}</button></div>`;
      document.body.append(card);
      requestAnimationFrame(() => requestAnimationFrame(() => card && card.classList.add("on")));
    }
    function closeBox() {
      if (!box) return;
      box.remove(); box = null;
      if (back && back.isConnected) back.focus({ preventScroll: true });
    }
    function openBox(from) {
      back = from;
      closeBox();
      const t = T();
      box = document.createElement("div");
      box.setAttribute("data-no-i18n", "");
      const cat = (h, tag, on, p) => `<div class="ck-cat"><div class="ck-ct"><h3>${h}</h3><span class="ck-tag ${on ? "on" : "off"}">${tag}</span></div><p>${p}</p></div>`;
      box.innerHTML = `<div class="ck-scrim" data-ck-close></div><div class="ck-box" role="dialog" aria-modal="true" aria-labelledby="ck-h" dir="${he() ? "rtl" : "ltr"}" lang="${he() ? "he" : "en"}">
<div class="ck-head"><h2 id="ck-h">${t.mTitle}</h2><button type="button" class="ck-x" data-ck-close aria-label="${t.close}">×</button></div>
<p class="ck-intro">${t.intro}</p>
${cat(t.nec, t.always, true, t.necText)}${cat(t.ana, t.none, false, t.anaText)}${cat(t.ads, t.none, false, t.adsText)}
<p class="ck-lemon">${t.lemon}</p>
<div class="ck-foot"><a href="/legal/#privacy">${t.privacy}</a><button type="button" class="ck-btn gold" data-ck-done>${t.done}</button></div></div>`;
      document.body.append(box);
      box.querySelector("[data-ck-done]").focus({ preventScroll: true });
    }
    document.addEventListener("click", (e) => {
      const set = e.target.closest("[data-cookie-settings]");
      if (set) { e.preventDefault(); openBox(set); return; }
      if (e.target.closest("[data-ck-ok]")) { agree(); hideCard(); return; }
      if (box && e.target.closest("[data-ck-done]")) { agree(); hideCard(); closeBox(); return; }
      if (box && e.target.closest("[data-ck-close]")) closeBox();
    });
    document.addEventListener("keydown", (e) => {
      if (!box) return;
      if (e.key === "Escape") { closeBox(); return; }
      if (e.key !== "Tab") return;   // keep the keyboard inside the window
      const f = [...box.querySelectorAll("a, button")];
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    if (!seen && !/^\/admin/.test(location.pathname)) setTimeout(showCard, 600);
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", footer) : footer();

  let tries = 0;
  (function poll() { if (!watch() && tries++ < 40) setTimeout(poll, 150); })();

  // The free Field Guides sample pop-up (assets/js/lib/gift.js). GIFT_ON stays false until Matan approves its words;
  // until then it loads only for ?gift=preview or the #free-guide link. Its code downloads only when it's needed.
  const GIFT_ON = true;   // switched on 25 Oct 2026 (Matan approved the words and the sample)
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
