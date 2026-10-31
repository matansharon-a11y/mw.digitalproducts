// Our own accessibility menu (Jeinna, 31 Oct 2026), in place of a third-party widget. It doesn't claim to make the site
// accessible (that's the site's own markup, per IS 5568 / WCAG); it offers a few settings that genuinely help, and is
// easy to find without getting in the way: a small button in the bottom corner (left in English, right in Hebrew),
// "Accessibility" in the ☰ menu, and an "Accessibility settings" link on the first Tab. Settings stay on this device
// (localStorage, mwp_a11y). Loaded by nav.js on every page; a classic script, no imports.
(function () {
  "use strict";
  if (window.MWP_A11Y) return;
  window.MWP_A11Y = true;
  const KEY = "mwp_a11y";
  const root = document.documentElement;
  const he = () => /^he/.test(root.lang);
  const T = (en, hb) => (he() ? hb : en);
  const SIZES = [100, 115, 130];
  const FLAGS = ["contrast", "links", "spacing", "still"];

  let s = { size: 100 };
  try { s = Object.assign(s, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { /* storage blocked */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ } };

  // ---------------------------------------------------------------- styles
  const css = `
.a11y-fab{position:fixed;z-index:180;bottom:16px;inset-inline-start:16px;width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;padding:0;border-radius:50%;border:1px solid rgba(254,251,241,.16);background:rgba(16,14,12,.72);color:#F4AF56;cursor:pointer;opacity:.82;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 6px 18px rgba(0,0,0,.35);transition:opacity .2s,transform .2s,border-color .2s}
.a11y-fab:hover,.a11y-fab:focus-visible{opacity:1;border-color:rgba(244,175,86,.7);transform:translateY(-1px)}
.a11y-fab:focus-visible{outline:3px solid #F4AF56;outline-offset:3px}
.a11y-fab svg{width:24px;height:24px}
.a11y-fab .a11y-tip{position:absolute;inset-inline-start:52px;white-space:nowrap;padding:6px 10px;border-radius:8px;background:#16130F;color:#FEFBF1;font:500 13px/1 "Google Sans","Heebo",sans-serif;opacity:0;pointer-events:none;transition:opacity .2s}
.a11y-fab:hover .a11y-tip,.a11y-fab:focus-visible .a11y-tip{opacity:1}
html.menu-open .a11y-fab,html.cart-open .a11y-fab,html.a11y-open .a11y-fab{opacity:0;pointer-events:none}
@media print{.a11y-fab,.a11y-skip{display:none!important}}
.a11y-skip{position:fixed;z-index:400;top:8px;inset-inline-start:8px;padding:10px 16px;border-radius:999px;background:#FEFBF1;color:#0A0908;font:600 15px/1.2 "Google Sans","Heebo",sans-serif;border:0;cursor:pointer;transform:translateY(-200%);transition:transform .15s}
.a11y-skip:focus{transform:none;outline:3px solid #F4AF56;outline-offset:2px}
.a11y-scrim{position:fixed;inset:0;z-index:300;background:rgba(10,9,8,.5)}
.a11y-box{position:fixed;z-index:301;bottom:16px;inset-inline-start:16px;width:min(340px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;padding:20px 20px 16px;border-radius:18px;border:1px solid rgba(254,251,241,.14);background:#16130F;color:#FEFBF1;font:400 15px/1.5 "Google Sans","Heebo",sans-serif;box-shadow:0 30px 80px rgba(0,0,0,.6)}
.a11y-box h2{margin:0 0 14px;font-size:18px;font-weight:600}
.a11y-box .a11y-x{position:absolute;top:12px;inset-inline-end:12px;width:36px;height:36px;border:0;border-radius:50%;background:transparent;color:#CDD7DD;font-size:22px;line-height:1;cursor:pointer}
.a11y-box .a11y-x:hover{background:rgba(254,251,241,.08);color:#FEFBF1}
.a11y-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid rgba(254,251,241,.08)}
.a11y-size{display:flex;align-items:center;gap:8px}
.a11y-size button{width:38px;height:38px;border-radius:50%;border:1px solid rgba(254,251,241,.2);background:transparent;color:#FEFBF1;font:600 18px/1 "Google Sans","Heebo",sans-serif;cursor:pointer}
.a11y-size button:disabled{opacity:.35;cursor:default}
.a11y-size output{min-width:46px;text-align:center;font-variant-numeric:tabular-nums}
.a11y-tog{position:relative;flex:none;width:46px;height:26px;border-radius:999px;border:1px solid rgba(254,251,241,.25);background:rgba(254,251,241,.08);cursor:pointer;transition:background .2s,border-color .2s}
.a11y-tog::after{content:"";position:absolute;top:3px;inset-inline-start:3px;width:18px;height:18px;border-radius:50%;background:#CDD7DD;transition:inset-inline-start .2s,background .2s}
.a11y-tog[aria-pressed="true"]{background:#F4AF56;border-color:#F4AF56}
.a11y-tog[aria-pressed="true"]::after{inset-inline-start:23px;background:#1A1208}
.a11y-box :focus-visible{outline:3px solid #F4AF56;outline-offset:2px}
.a11y-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;padding-top:12px;border-top:1px solid rgba(254,251,241,.08)}
.a11y-foot a{color:#F4AF56;font-size:14px}
.a11y-reset{padding:8px 14px;border-radius:999px;border:1px solid rgba(254,251,241,.2);background:transparent;color:#FEFBF1;font:600 14px "Google Sans","Heebo",sans-serif;cursor:pointer}
.a11y-tipline{margin:10px 0 0;color:#9CB1C2;font-size:13px}
/* the settings */
html.a11y-contrast body :is(p,li,span,small,dd,dt,td,th,label,figcaption,blockquote,h1,h2,h3,h4,h5,h6,a,i,b,strong,em,div,summary,output):not(.btn,.btn *,.cart-go,.cart-go *,.badge,.badge *,.save,.ck-close,.single-btn:hover,.single-btn:hover *,.a11y-tog,.a11y-skip){color:#FFFFFF!important;-webkit-text-fill-color:#FFFFFF}
html.a11y-contrast body .grad{background:none!important}
html.a11y-contrast body :is(input,select,textarea){border-color:#FEFBF1!important;color:#FFFFFF!important}
html.a11y-links body a:not(.btn,.cart-go,.single-btn,.nav-ico){text-decoration:underline!important;text-underline-offset:3px!important;text-decoration-thickness:2px!important}
html.a11y-links body :focus{outline:3px solid #F4AF56!important;outline-offset:2px!important}
html.a11y-spacing body :is(p,li,dd,dt,label,td,th,figcaption,blockquote,summary){line-height:1.75!important;word-spacing:.16em!important}
html.a11y-spacing:not([lang=he]) body :is(p,li,dd,dt,label,td,th,figcaption,blockquote,summary){letter-spacing:.05em!important}
html.a11y-spacing body p{margin-bottom:1.2em}
html.a11y-still *,html.a11y-still *::before,html.a11y-still *::after{animation-duration:.001ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:.001ms!important;transition-delay:0s!important;scroll-behavior:auto!important}
`;
  const style = document.createElement("style");
  style.id = "mwp-a11y";
  style.textContent = css;
  (document.head || root).append(style);

  // ---------------------------------------------------------------- applying the settings
  // Larger text: the site's sizes are in px, so each piece of body text (under 24px; headings are big already) is
  // scaled from its own size, line height with it. New content (the cart, pop-ups) is scaled as it appears.
  const SKIP = ".a11y-box, .a11y-fab, .a11y-skip, .ui-en, svg, script, style";
  function scaleEl(el, f) {
    if (el.closest(SKIP)) return;
    if (!el.dataset.a11yFs) {
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      if (!fs || fs >= 24) { el.dataset.a11yFs = "0"; return; }
      el.dataset.a11yFs = String(fs);
      el.dataset.a11yLh = cs.lineHeight === "normal" ? "" : String(parseFloat(cs.lineHeight));
    }
    const fs = parseFloat(el.dataset.a11yFs);
    if (!fs) return;
    if (f === 1) { el.style.removeProperty("font-size"); el.style.removeProperty("line-height"); return; }
    el.style.setProperty("font-size", `${(fs * f).toFixed(2)}px`, "important");
    const lh = parseFloat(el.dataset.a11yLh);
    if (lh) el.style.setProperty("line-height", `${(lh * f).toFixed(2)}px`, "important");
  }
  function textEls(scope) {
    const out = [];
    const all = scope.nodeType === 1 ? [scope, ...scope.querySelectorAll("*")] : [...scope.querySelectorAll("*")];
    for (const el of all) {
      if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(el.tagName)) out.push(el);
    }
    return out;
  }
  function applySize(scope = document.body) {
    if (!scope) return;
    const f = s.size / 100;
    if (f === 1 && !document.querySelector("[data-a11y-fs]")) return;
    textEls(scope).forEach((el) => scaleEl(el, f));
  }
  function stillMedia() {
    if (!s.still) return;
    document.querySelectorAll("video").forEach((v) => { try { v.pause(); v.removeAttribute("autoplay"); } catch { /* not a video */ } });
  }
  function apply() {
    FLAGS.forEach((k) => root.classList.toggle(`a11y-${k}`, !!s[k]));
    applySize();
    stillMedia();
  }
  FLAGS.forEach((k) => root.classList.toggle(`a11y-${k}`, !!s[k]));   // at once, before the page paints where possible

  // ---------------------------------------------------------------- the panel
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="1.8" fill="currentColor" stroke="none"/><path d="M5 8.5c2.3.7 4.6 1 7 1s4.7-.3 7-1"/><path d="M12 9.5v5"/><path d="M12 14.5l-3 6"/><path d="M12 14.5l3 6"/></svg>';
  let box = null, back = null;
  function row(label, control) { return `<div class="a11y-row"><span id="${control.id}-l">${label}</span>${control.html}</div>`; }
  function toggle(k, label) {
    return row(label, { id: `a11y-${k}`, html: `<button class="a11y-tog" type="button" id="a11y-${k}" data-a11y="${k}" aria-pressed="${!!s[k]}" aria-labelledby="a11y-${k}-l"></button>` });
  }
  function panelHTML() {
    const i = SIZES.indexOf(s.size);
    return `<div class="a11y-scrim" data-a11y-close></div>
<div class="a11y-box" role="dialog" aria-modal="true" aria-labelledby="a11y-h" dir="${he() ? "rtl" : "ltr"}" lang="${he() ? "he" : "en"}" data-no-i18n>
<button class="a11y-x" type="button" data-a11y-close aria-label="${T("Close", "סגירה")}">×</button>
<h2 id="a11y-h">${T("Accessibility", "נגישות")}</h2>
${row(T("Text size", "גודל טקסט"), { id: "a11y-size", html: `<div class="a11y-size" role="group" aria-labelledby="a11y-size-l"><button type="button" data-a11y-size="-1" aria-label="${T("Smaller text", "טקסט קטן יותר")}"${i <= 0 ? " disabled" : ""}>−</button><output aria-live="polite">${s.size}%</output><button type="button" data-a11y-size="1" aria-label="${T("Larger text", "טקסט גדול יותר")}"${i >= SIZES.length - 1 ? " disabled" : ""}>+</button></div>` })}
${toggle("contrast", T("High contrast", "ניגודיות גבוהה"))}
${toggle("links", T("Underline links", "הדגשת קישורים"))}
${toggle("spacing", T("More text spacing", "ריווח טקסט"))}
${toggle("still", T("Stop animations", "עצירת אנימציות"))}
<div class="a11y-foot"><a href="/accessibility/">${T("Accessibility statement", "הצהרת נגישות")}</a><button class="a11y-reset" type="button" data-a11y-reset>${T("Reset", "איפוס")}</button></div>
<p class="a11y-tipline">${T("You can also zoom the whole page: Ctrl and + (⌘ and + on a Mac), or pinch on a phone.", "אפשר גם להגדיל את כל העמוד: Ctrl ו-+ (במק: ⌘ ו-+), או בצביטה בטלפון.")}</p>
</div>`;
  }
  function open(from) {
    back = from || document.activeElement;
    close(true);
    box = document.createElement("div");
    box.innerHTML = panelHTML();
    document.body.append(box);
    root.classList.add("a11y-open");
    box.querySelector(".a11y-box button:not([disabled])").focus({ preventScroll: true });
  }
  function close(quiet) {
    if (!box) return;
    box.remove(); box = null;
    root.classList.remove("a11y-open");
    if (!quiet && back && back.focus) back.focus({ preventScroll: true });
  }
  function rerender() {
    if (!box) return;
    const focusKey = document.activeElement?.dataset?.a11y || (document.activeElement?.dataset?.a11ySize ? `size${document.activeElement.dataset.a11ySize}` : document.activeElement?.hasAttribute?.("data-a11y-reset") ? "reset" : "");
    box.innerHTML = panelHTML();
    const again = focusKey.startsWith("size") ? box.querySelector(`[data-a11y-size="${focusKey.slice(4)}"]:not([disabled])`) || box.querySelector("[data-a11y-size]:not([disabled])")
      : focusKey === "reset" ? box.querySelector("[data-a11y-reset]") : focusKey ? box.querySelector(`[data-a11y="${focusKey}"]`) : null;
    (again || box.querySelector(".a11y-box button")).focus({ preventScroll: true });
  }

  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-a11y-open], a[href$='#a11y']");
    if (opener) { e.preventDefault(); open(opener); return; }
    if (!box) return;
    if (e.target.closest("[data-a11y-close]")) { close(); return; }
    const t = e.target.closest("[data-a11y]");
    if (t) { s[t.dataset.a11y] = !s[t.dataset.a11y]; save(); apply(); rerender(); return; }
    const z = e.target.closest("[data-a11y-size]");
    if (z) {
      const i = Math.min(SIZES.length - 1, Math.max(0, SIZES.indexOf(s.size) + Number(z.dataset.a11ySize)));
      s.size = SIZES[i]; save(); apply(); rerender(); return;
    }
    if (e.target.closest("[data-a11y-reset]")) { s = { size: 100 }; save(); apply(); rerender(); }
  });
  document.addEventListener("keydown", (e) => {
    if (!box) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key !== "Tab") return;   // keep the keyboard inside the panel
    const f = [...box.querySelectorAll("a, button:not([disabled])")];
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  function start() {
    // the corner button
    const fab = document.createElement("button");
    fab.type = "button";
    fab.className = "a11y-fab";
    fab.setAttribute("data-a11y-open", "");
    fab.setAttribute("data-no-i18n", "");
    fab.setAttribute("aria-label", T("Accessibility settings", "הגדרות נגישות"));
    fab.innerHTML = ICON + `<span class="a11y-tip" aria-hidden="true">${T("Accessibility", "נגישות")}</span>`;
    document.body.append(fab);
    // "Accessibility settings" on the first Tab, right after "Skip to content"
    const skip = document.createElement("button");
    skip.type = "button";
    skip.className = "a11y-skip";
    skip.setAttribute("data-a11y-open", "");
    skip.setAttribute("data-no-i18n", "");
    skip.textContent = T("Accessibility settings", "הגדרות נגישות");
    const first = document.querySelector("a.skip, a.skip-link, .skip-link, a[href$='#main']");
    if (first && first.parentNode) first.after(skip); else document.body.prepend(skip);
    // the page may switch language after load (the language toggle): keep the labels in step
    new MutationObserver(() => {
      fab.setAttribute("aria-label", T("Accessibility settings", "הגדרות נגישות"));
      fab.querySelector(".a11y-tip").textContent = T("Accessibility", "נגישות");
      skip.textContent = T("Accessibility settings", "הגדרות נגישות");
    }).observe(root, { attributes: true, attributeFilter: ["lang"] });
    apply();
    // content added later (the cart, pop-ups, translated text) gets the same text size
    new MutationObserver((list) => {
      if (s.size === 100) return;
      for (const m of list) m.addedNodes.forEach((n) => { if (n.nodeType === 1 && !n.closest(SKIP)) applySize(n); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start) : start();
})();
