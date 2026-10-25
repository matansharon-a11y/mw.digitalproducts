// The free Field Guides sample pop-up (Matan, 25 Oct 2026): full name, email and phone → a sign-in link by email →
// their account opens on My downloads with the sample inside (the database gives it once the email is confirmed:
// grant_free_sample, migration 20261025000001). Loaded by nav.js on the shop's public pages.
//
// When it shows: after 30 seconds, or halfway down the page, or when a desktop visitor heads for the tab bar, never
// in the first 8 seconds. At most once every 14 days, never again after signing up, never to someone signed in, and
// never on My downloads, checkout pages, the ambassador / tester pages, the reader or the admin. #free-guide (the
// footer link) opens it any time.
// It's switched on in nav.js (GIFT_ON, false until Matan approves its words); ?gift=preview shows it anyway.
import { giftSignup } from "./api.js";

const ON = Boolean(window.MWP_GIFT && window.MWP_GIFT.on);
const PREVIEW = new URLSearchParams(location.search).get("gift") === "preview";
const SEEN = "mwp_gift_seen", DONE = "mwp_gift_done", EVERY = 14 * 86400 * 1000;
const he = () => document.documentElement.lang === "he";
const T = (en, hb) => (he() ? hb : en);
const IMG = "/assets/pages/img/5275cc7bcd4fb7560d8f7163592e3122-1200.webp";

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};
const signedIn = () => {
  try { return Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k) && localStorage.getItem(k)); } catch { return false; }
};
const quietPage = () => /^\/(account|thank-you|beta|testers|read|admin|support|legal)(\/|\.html|$)/.test(location.pathname);

let open = false;
function show() {
  if (open) return;
  open = true;
  store.set(SEEN, String(Date.now()));
  if (!document.querySelector('link[href^="/assets/css/gift.css"]')) {
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = "/assets/css/gift.css";
    document.head.append(css);
  }
  const wrap = document.createElement("div");
  wrap.className = "gift";
  wrap.setAttribute("data-no-i18n", "");
  wrap.innerHTML = `
    <div class="gift__back" data-close></div>
    <div class="gift__card" role="dialog" aria-modal="true" aria-labelledby="gift-h" dir="${he() ? "rtl" : "ltr"}" lang="${he() ? "he" : "en"}">
      <button class="gift__x" type="button" data-close aria-label="${T("Close", "סגירה")}">×</button>
      <div class="gift__img" style="background-image:url(${IMG})" aria-hidden="true"></div>
      <div class="gift__body">
        <p class="gift__kick">${T("Free · MWP Field Guides", "חינם · מדריכי השטח של MWP")}</p>
        <h2 class="gift__h" id="gift-h">${T("16 lessons from the Field Guides, free.", "16 שיעורים ממדריכי השטח, בחינם.")}</h2>
        <p class="gift__sub">${T("Composition, light, colour and planning, from Matan Wild's four guides. We'll email you a link: it opens your free account with the guide inside.",
          "קומפוזיציה, אור, צבע ותכנון, מתוך ארבעת המדריכים של מתן וויילד. נשלח לכם קישור במייל: הוא פותח את החשבון החינמי שלכם, והמדריך מחכה בפנים.")}</p>
        <form class="gift__form" novalidate>
          <label><span>${T("Full name", "שם מלא")}</span><input name="name" autocomplete="name" required maxlength="120"></label>
          <label><span>${T("Email", "מייל")}</span><input name="email" type="email" autocomplete="email" inputmode="email" required maxlength="254" dir="ltr"></label>
          <label><span>${T("Phone", "טלפון")}</span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" required maxlength="40" dir="ltr" placeholder="${he() ? "+972 50 123 4567" : "+1 555 123 4567"}"></label>
          <input class="gift__hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <label class="gift__check"><input type="checkbox" name="consent"> <span>${T("Send me tips and offers from MWP by email and WhatsApp. You can stop anytime.",
            "שלחו לי טיפים והצעות מ-MWP במייל ובוואטסאפ. אפשר להפסיק בכל עת.")}</span></label>
          <button class="gift__btn" type="submit">${T("Send me the free guide", "שלחו לי את המדריך")}</button>
          <p class="gift__msg" role="status"></p>
          <p class="gift__fine">${T('By signing up you create a free MWP account. <a href="/legal/#privacy">Privacy</a>',
            'ההרשמה פותחת לכם חשבון MWP חינמי. <a href="/legal/#privacy">פרטיות</a>')}</p>
        </form>
      </div>
    </div>`;
  document.body.append(wrap);
  const card = wrap.querySelector(".gift__card");
  const before = document.activeElement;
  const close = () => {
    wrap.remove(); open = false;
    document.removeEventListener("keydown", onKey);
    if (before && before.focus) before.focus();
    if (location.hash === "#free-guide") history.replaceState(null, "", location.pathname + location.search);
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Tab") {   // keep the keyboard inside the dialog
      const f = [...card.querySelectorAll("button, input:not(.gift__hp), a")];
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  document.addEventListener("keydown", onKey);
  wrap.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
  requestAnimationFrame(() => wrap.classList.add("is-on"));
  setTimeout(() => card.querySelector('input[name="name"]').focus({ preventScroll: true }), 250);

  const form = card.querySelector("form"), msg = card.querySelector(".gift__msg"), btn = card.querySelector(".gift__btn");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    if (d.website) return;   // a bot filled the hidden field
    const bad = (t) => { msg.className = "gift__msg err"; msg.textContent = t; };
    if ((d.name || "").trim().length < 2) return bad(T("Please enter your full name.", "נא למלא שם מלא."));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((d.email || "").trim())) return bad(T("Please enter a valid email.", "נא למלא מייל תקין."));
    if ((d.phone || "").replace(/\D/g, "").length < 7) return bad(T("Please enter a valid phone number.", "נא למלא מספר טלפון תקין."));
    btn.disabled = true;
    msg.className = "gift__msg"; msg.textContent = T("Sending…", "שולחים…");
    try {
      await giftSignup({ name: d.name.trim(), email: d.email, phone: d.phone.trim(), consent: form.consent.checked, lang: he() ? "he" : "en" });
      store.set(DONE, "1");
      card.querySelector(".gift__body").innerHTML = `
        <p class="gift__kick">${T("Almost there", "כמעט שם")}</p>
        <h2 class="gift__h" id="gift-h">${T("Check your inbox.", "בדקו את תיבת המייל.")}</h2>
        <p class="gift__sub">${T("We sent a link to", "שלחנו קישור אל")} <b dir="ltr"></b>. ${T("Click it to open your account: your free guide is waiting in My downloads.",
          "לחצו עליו כדי לפתוח את החשבון: המדריך החינמי מחכה בהורדות שלי.")}</p>
        <p class="gift__fine">${T("Nothing there? Check spam or promotions.", "לא הגיע? בדקו בספאם או בקידומי מכירות.")}</p>
        <button class="gift__btn" type="button" data-close>${T("Close", "סגירה")}</button>`;
      card.querySelector(".gift__body b").textContent = d.email.trim();
      card.querySelector(".gift__body [data-close]").addEventListener("click", close);
    } catch (err) {
      btn.disabled = false;
      bad(err.status === 429 ? T("Too many sign-ups from here. Please try again in an hour.", "יותר מדי הרשמות מכאן. נסו שוב בעוד שעה.")
        : T("Couldn't send it just now. Please try again.", "לא הצלחנו לשלוח כרגע. נסו שוב."));
    }
  });
}

// #free-guide opens it from anywhere (the footer link), even if it was closed before
function fromHash() { if (location.hash === "#free-guide" && (ON || PREVIEW)) show(); }
window.addEventListener("hashchange", fromHash);
fromHash();

if (PREVIEW) show();
else if (ON && !quietPage() && !signedIn() && !store.get(DONE) && Date.now() - Number(store.get(SEEN) || 0) > EVERY) {
  const start = Date.now();
  const go = () => { if (Date.now() - start >= 8000) { cleanup(); show(); } };
  const timer = setTimeout(() => { cleanup(); show(); }, 30000);
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    if (h > 0 && scrollY / h >= 0.5) go();
  };
  const onLeave = (e) => { if (!e.relatedTarget && e.clientY <= 0) go(); };   // desktop: heading for the tab bar
  const cleanup = () => { clearTimeout(timer); removeEventListener("scroll", onScroll); document.removeEventListener("mouseout", onLeave); };
  addEventListener("scroll", onScroll, { passive: true });
  if (matchMedia("(pointer: fine)").matches) document.addEventListener("mouseout", onLeave);
}
