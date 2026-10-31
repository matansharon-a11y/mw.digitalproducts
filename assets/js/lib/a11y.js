// The accessibility menu (Jeinna, 31 Oct 2026): our own code, with the same features and look as the menu on
// mw-phototours.com (Nagishna): a round blue button with the standard accessibility figure on the side of every page,
// and a full-height panel with profiles, text, font and alignment, colours, highlights, navigation and reading, and
// media. It helps people adjust the site; it doesn't make a site accessible by itself (the site's own markup, under
// IS 5568 / WCAG 2.0 AA, does), so nothing here claims compliance.
// Ways in: the button, "Accessibility" in the ☰ menu (#a11y), "Accessibility settings" on the first Tab, and
// Alt+Shift+A. Esc closes. Settings stay on this device (localStorage, mwp_a11y). Loaded by nav.js on every page.
// The menu lives outside <body>, so "Zoom" (body zoom) and the colour modes for the page don't change the menu itself.
(function () {
  "use strict";
  if (window.MWP_A11Y) return;
  window.MWP_A11Y = true;
  const KEY = "mwp_a11y";
  const doc = document, root = doc.documentElement;
  const BLUE = "#0B5ED7";
  const pageHe = () => /^he/.test(root.lang);

  // ---------------------------------------------------------------- words (the menu has its own language switch)
  const W = {
    en: {
      open: "Open the accessibility menu", title: "Accessibility menu", hint: "Open and close: Alt+Shift+A · Close: Esc", close: "Close the menu", lang: "עברית",
      profiles: "Accessibility profiles", p_vision: "Low vision", p_blind: "Screen reader", p_dyslexia: "Dyslexia", p_adhd: "Attention (ADHD)", p_epilepsy: "Motion sensitivity", p_senior: "Easier reading",
      text: "Text", fontSize: "Text size", zoom: "Page zoom", lineHeight: "Line spacing", letterSpacing: "Letter spacing", wordSpacing: "Word spacing", dec: "Less", inc: "More",
      fontStyle: "Font and alignment", readableFont: "Readable font", alignRight: "Align right", alignLeft: "Align left", alignCenter: "Align centre", alignJustify: "Justify",
      colors: "Colours", invert: "Invert colours", dark: "Dark contrast", light: "Light contrast", blackYellow: "Black and yellow", contrastHigh: "High contrast", contrastLow: "Low contrast", sepia: "Blue-light filter", mono: "Greyscale", saturate: "Vivid colours",
      highlight: "Highlights", links: "Highlight links", headings: "Highlight headings", alt: "Show image descriptions",
      nav: "Navigation and reading", cursorBig: "Big white cursor", cursorBlack: "Big black cursor", guide: "Reading guide", mask: "Reading mask", stopAnim: "Stop animations", keyboard: "Keyboard focus", speak: "Read aloud on click", srMode: "Screen reader support", regions: "Show page regions",
      quick: "Jump to", qTop: "Top of page", qHeading: "Main heading", qMain: "Main content", qNav: "Menu", qBottom: "Bottom of page", qMissing: "This page has no such part.",
      media: "Media and display", mute: "Mute media", hideImages: "Hide images", readView: "Reading view", vkb: "On-screen keyboard",
      reset: "Reset all settings", statement: "Accessibility statement", report: "Report a problem",
      noVoice: "This device has no voice for this language.", muted: "All sounds on the page are muted.", regionsFound: "{n} regions marked: use Tab to move between them.", regionsNone: "No regions found on this page.",
      vkbHint: "Click a text field on the page, then type here.", vkbNoField: "First click a text field on the page.", vkbClose: "Close the keyboard", vkbSpace: "Space", vkbBack: "Delete", vkbEnter: "Enter",
      rvTitle: "Reading view", rvPrint: "Print", rvBack: "Close", rvEmpty: "No readable text found on this page.",
      settingsLink: "Accessibility settings", image: "Image", labels: { banner: "Header", navigation: "Menu", main: "Main content", contentinfo: "Footer", complementary: "Related content", search: "Search", form: "Form" },
    },
    he: {
      open: "פתיחת תפריט הנגישות", title: "תפריט נגישות", hint: "פתיחה וסגירה: Alt+Shift+A · סגירה: Esc", close: "סגירת התפריט", lang: "English",
      profiles: "פרופילי נגישות", p_vision: "לקויי ראייה", p_blind: "קורא מסך", p_dyslexia: "דיסלקציה", p_adhd: "קשב וריכוז", p_epilepsy: "רגישות לתנועה", p_senior: "קריאה מוגדלת",
      text: "התאמות טקסט", fontSize: "גודל הטקסט", zoom: "הגדלת התצוגה", lineHeight: "ריווח בין שורות", letterSpacing: "ריווח בין אותיות", wordSpacing: "ריווח בין מילים", dec: "הקטנה", inc: "הגדלה",
      fontStyle: "גופן ויישור", readableFont: "גופן קריא", alignRight: "יישור לימין", alignLeft: "יישור לשמאל", alignCenter: "יישור למרכז", alignJustify: "יישור לצדדים",
      colors: "התאמות צבע", invert: "היפוך צבעים", dark: "ניגודיות כהה", light: "ניגודיות בהירה", blackYellow: "שחור־צהוב", contrastHigh: "ניגודיות גבוהה", contrastLow: "ניגודיות נמוכה", sepia: "מסנן אור כחול", mono: "גווני אפור", saturate: "צבעים עזים",
      highlight: "הדגשות", links: "הדגשת קישורים", headings: "הדגשת כותרות", alt: "תיאורי תמונות",
      nav: "ניווט וקריאה", cursorBig: "סמן לבן גדול", cursorBlack: "סמן שחור גדול", guide: "קו הנחיה", mask: "מסכת קריאה", stopAnim: "עצירת הנפשות", keyboard: "ניווט מקלדת", speak: "הקראה בלחיצה", srMode: "התאמה לקורא מסך", regions: "ניווט אזורים",
      quick: "ניווט מהיר בדף", qTop: "ראש הדף", qHeading: "כותרת ראשית", qMain: "תוכן מרכזי", qNav: "תפריט", qBottom: "תחתית הדף", qMissing: "לא נמצא אזור מתאים בדף הזה.",
      media: "מדיה ותצוגה", mute: "השתקת מדיה", hideImages: "הסתרת תמונות", readView: "תצוגה קריאה", vkb: "מקלדת וירטואלית",
      reset: "איפוס כל ההגדרות", statement: "הצהרת נגישות", report: "דיווח על בעיה",
      noVoice: "לא נמצא במכשיר הזה קול בשפה הזאת.", muted: "כל הצלילים בעמוד הושתקו.", regionsFound: "סומנו {n} אזורים: מעבר ביניהם במקש Tab.", regionsNone: "לא נמצאו אזורים מוגדרים בדף.",
      vkbHint: "לחצו על שדה טקסט בדף, ואז הקלידו כאן.", vkbNoField: "לחצו קודם על שדה טקסט בדף.", vkbClose: "סגירת המקלדת", vkbSpace: "רווח", vkbBack: "מחיקה", vkbEnter: "אישור",
      rvTitle: "תצוגה קריאה", rvPrint: "הדפסה", rvBack: "סגירה", rvEmpty: "לא נמצא תוכן קריא בדף הזה.",
      settingsLink: "הגדרות נגישות", image: "תמונה", labels: { banner: "כותרת עליונה", navigation: "ניווט", main: "תוכן ראשי", contentinfo: "כותרת תחתונה", complementary: "תוכן משלים", search: "חיפוש", form: "טופס" },
    },
  };
  let uiLang = pageHe() ? "he" : "en";
  const t = (k) => W[uiLang][k];

  // ---------------------------------------------------------------- settings
  const FONT = [70, 80, 90, 100, 110, 120, 130, 140, 150, 160];   // index 3 = 100%
  const ZOOM = [100, 110, 120, 130, 140, 150, 160];
  const LINE = [0, 1.5, 1.8, 2.1, 2.4];                         // line-height for steps 1..4
  const LETTER = [0, 0.05, 0.1, 0.15, 0.2];                     // em
  const WORD = [0, 0.1, 0.2, 0.3, 0.4];                         // em
  const DEF = { font: 3, zoom: 0, line: 0, letter: 0, word: 0, readableFont: false, align: "", color: "", links: false, headings: false, alt: false,
    cursorBig: false, cursorBlack: false, guide: false, mask: false, stopAnim: false, keyboard: false, speak: false, srMode: false, regions: false,
    mute: false, hideImages: false, profile: "" };
  const PROFILES = {
    vision: { icon: "eye", set: { font: 6, line: 2, color: "contrastHigh", readableFont: true, links: true, cursorBig: true, zoom: 1 } },
    blind: { icon: "speak", set: { keyboard: true, links: true, headings: true, alt: true, readableFont: true, srMode: true } },
    dyslexia: { icon: "book", set: { readableFont: true, letter: 2, word: 2, line: 2, guide: true } },
    adhd: { icon: "brain", set: { mask: true, stopAnim: true, links: true } },
    epilepsy: { icon: "bolt", set: { stopAnim: true, color: "contrastLow" } },
    senior: { icon: "senior", set: { font: 6, line: 1, zoom: 1, cursorBig: true, readableFont: true, links: true } },
  };
  let s = { ...DEF };
  try { s = Object.assign(s, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { /* storage blocked */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ } };

  // ---------------------------------------------------------------- icons (24px, stroke)
  const P = (d, extra = "") => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;
  const I = {
    access: '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" fill="currentColor"><circle cx="12" cy="3.6" r="2.1"/><path d="M4.2 7.1c-.6-.2-1.2.2-1.3.8-.1.6.2 1.1.8 1.3l4.6 1.3c.4.1.7.5.7.9v2.4c0 .3 0 .6-.1.9l-2 6.6c-.2.6.2 1.2.8 1.4.6.2 1.2-.2 1.4-.8l1.8-5.9c.1-.4.6-.4.8 0l1.8 5.9c.2.6.8.9 1.4.8.6-.2 1-.8.8-1.4l-2-6.6c-.1-.3-.1-.6-.1-.9v-2.4c0-.4.3-.8.7-.9l4.6-1.3c.6-.2.9-.7.8-1.3-.1-.6-.7-1-1.3-.8-2.4.7-4.8 1.1-7.3 1.1s-4.9-.4-7.3-1.1z"/></svg>',
    eye: P('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    speak: P('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>'),
    book: P('<path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/>'),
    brain: P('<path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3z"/><path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h0a3 3 0 0 1-3-3"/>'),
    bolt: P('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
    senior: P('<circle cx="11" cy="4" r="2"/><path d="M9 22l2-7 3 3v4"/><path d="M8 10l3-3 3 2 3 1"/><path d="M17 10v12"/>'),
    text: P('<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>'),
    zoom: P('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/>'),
    lines: P('<path d="M21 6H9M21 12H9M21 18H9"/><path d="M4 4v16M2 6l2-2 2 2M2 18l2 2 2-2"/>'),
    letter: P('<path d="M3 18 7 6l4 12M4.5 14h5"/><path d="M14 9h7M19 7l2 2-2 2M16 7l-2 2 2 2"/>'),
    word: P('<rect x="2" y="6" width="6" height="12" rx="1"/><rect x="16" y="6" width="6" height="12" rx="1"/><path d="M10 12h4"/>'),
    font: P('<path d="M4 20 10 4h1l6 16"/><path d="M6.5 14h8"/>'),
    alignR: P('<path d="M21 6H3M21 12H9M21 18H7"/>'), alignL: P('<path d="M3 6h18M3 12h12M3 18h14"/>'), alignC: P('<path d="M3 6h18M7 12h10M5 18h14"/>'), alignJ: P('<path d="M3 6h18M3 12h18M3 18h18"/>'),
    invert: P('<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'),
    moon: P('<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>'), sun: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    by: P('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8l4 5 4-5M12 13v4"/>'), contrast: P('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'),
    low: P('<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/><path d="M12 3a9 9 0 0 1 0 18" />'), sepia: P('<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/>'),
    mono: P('<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>'), sat: P('<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 3a9 9 0 0 1 9 9h-9z" fill="currentColor"/>'),
    link: P('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
    heading: P('<path d="M6 4v16M18 4v16M6 12h12"/>'), image: P('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>'),
    cursor: P('<path d="m4 3 7 17 2.5-7.5L21 10z"/>'), cursorB: P('<path d="m4 3 7 17 2.5-7.5L21 10z" fill="currentColor"/>'),
    guide: P('<path d="M3 12h18"/><path d="M3 8h18M3 16h18" stroke-dasharray="2 3"/>'), mask: P('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 10h18M3 14h18"/>'),
    pause: P('<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'), kb: P('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'),
    sr: P('<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/>'), regions: P('<rect x="3" y="3" width="18" height="5" rx="1"/><rect x="3" y="10" width="11" height="11" rx="1"/><rect x="16" y="10" width="5" height="11" rx="1"/>'),
    mute: P('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>'), noimg: P('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 3 18 18"/>'),
    read: P('<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/>'), reset: P('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'), x: P('<path d="M18 6 6 18M6 6l12 12"/>'),
    up: P('<path d="M12 19V5M5 12l7-7 7 7"/>'), down: P('<path d="M12 5v14M19 12l-7 7-7-7"/>'), h1: P('<path d="M4 6v12M12 6v12M4 12h8M17 10l3-2v10"/>'), main: P('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6"/>'), menu: P('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    minus: P('<path d="M5 12h14"/>'), plus: P('<path d="M12 5v14M5 12h14"/>'),
  };

  // ---------------------------------------------------------------- styles (the menu: its own box, never the page's)
  const css = `
#mwp-a11y{all:initial}
#mwp-a11y *{box-sizing:border-box}
.a11y-fab{position:fixed;z-index:2147483000;top:50%;right:20px;transform:translateY(-50%);width:54px;height:54px;display:flex;align-items:center;justify-content:center;padding:0;border-radius:50%;border:3px solid #FFFFFF;background:${BLUE};color:#FFFFFF;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.15);transition:transform .2s,box-shadow .2s}
.a11y-fab:hover{transform:translateY(-50%) scale(1.06);box-shadow:0 8px 26px rgba(0,0,0,.45),0 0 0 1px rgba(0,0,0,.15)}
.a11y-fab:focus-visible{outline:3px solid #FFD400;outline-offset:3px}
@media (max-width:700px){.a11y-fab{width:46px;height:46px;right:auto;inset-inline-end:14px}.a11y-fab svg{width:26px;height:26px}}
html.a11y-open .a11y-fab{display:none}
.a11y-hdr{position:relative;flex:none;display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;padding:0;border:0;border-radius:50%;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
.a11y-hdr .a11y-dot{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:${BLUE};color:#FFFFFF;box-shadow:0 0 0 1.5px rgba(255,255,255,.85);transition:transform .2s,box-shadow .2s}
.a11y-hdr .a11y-dot svg{width:20px;height:20px}
.a11y-hdr:hover .a11y-dot{transform:scale(1.08);box-shadow:0 0 0 2px #FFFFFF}
.a11y-hdr:focus-visible{outline:3px solid #FFD400;outline-offset:2px}
@media (max-width:600px){.a11y-hdr{width:38px;height:38px}.a11y-hdr .a11y-dot{width:28px;height:28px}.a11y-hdr .a11y-dot svg{width:18px;height:18px}}
@media print{.a11y-hdr{display:none!important}}
.a11y-skip{position:fixed;z-index:2147483001;top:8px;inset-inline-start:8px;padding:10px 16px;border-radius:999px;background:#FFFFFF;color:#0A0A0A;font:600 15px/1.2 Arial,"Heebo",sans-serif;border:2px solid ${BLUE};cursor:pointer;transform:translateY(-220%);transition:transform .15s}
.a11y-skip:focus{transform:none;outline:3px solid #FFD400;outline-offset:2px}
.a11y-scrim{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.35)}
.a11y-panel{position:fixed;z-index:2147483002;top:0;right:0;bottom:0;width:430px;max-width:100vw;display:flex;flex-direction:column;background:#F4F7FA;color:#14212B;font:400 14px/1.45 Arial,"Heebo",sans-serif;box-shadow:-10px 0 40px rgba(0,0,0,.3);direction:var(--a11y-dir)}
.a11y-head{display:flex;align-items:center;gap:12px;padding:16px 18px;background:linear-gradient(135deg,#0A3E8C,${BLUE});color:#FFFFFF}
.a11y-head .a11y-logo{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:10px;background:rgba(255,255,255,.18)}
.a11y-head .a11y-logo svg{width:26px;height:26px}
.a11y-head h2{margin:0;font:700 19px/1.2 Arial,"Heebo",sans-serif;color:#FFFFFF}
.a11y-head p{margin:2px 0 0;font-size:12px;color:#DCE8FF}
.a11y-head .a11y-tools{margin-inline-start:auto;display:flex;gap:8px}
.a11y-head button{display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:38px;padding:0 10px;border-radius:10px;border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.12);color:#FFFFFF;font:600 13px Arial,"Heebo",sans-serif;cursor:pointer}
.a11y-head button:hover{background:rgba(255,255,255,.25)}
.a11y-body{flex:1;overflow:auto;padding:14px 14px 8px}
.a11y-sec{margin:0 0 12px;padding:12px;border-radius:14px;background:#FFFFFF;border:1px solid #DCE4EC}
.a11y-sec h3{display:flex;align-items:center;gap:10px;margin:0 0 10px;font:700 12.5px Arial,"Heebo",sans-serif;color:#4A6072;letter-spacing:.02em}
.a11y-sec h3::after{content:"";flex:1;height:1px;background:#DCE4EC}
.a11y-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.a11y-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:74px;padding:10px 6px;border-radius:12px;border:1.5px solid #DCE4EC;background:#FFFFFF;color:#14212B;font:600 12.5px/1.25 Arial,"Heebo",sans-serif;text-align:center;cursor:pointer;transition:border-color .15s,background .15s}
.a11y-card:hover{border-color:${BLUE}}
.a11y-card[aria-pressed="true"]{border-color:${BLUE};background:#E7F0FF;color:#0A3E8C}
.a11y-card svg{color:${BLUE}}
.a11y-slider{padding:8px 0;border-top:1px solid #EEF2F6}
.a11y-slider:first-of-type{border-top:0}
.a11y-slider .a11y-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.a11y-slider label{display:flex;align-items:center;gap:8px;font-weight:600}
.a11y-slider label svg{color:#4A6072}
.a11y-slider output{min-width:52px;padding:2px 8px;border-radius:999px;background:#E7F0FF;color:#0A3E8C;font:700 12px Arial,sans-serif;text-align:center}
.a11y-slider .a11y-ctl{display:flex;align-items:center;gap:8px}
.a11y-slider .a11y-ctl button{flex:none;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:1.5px solid #C9D5E0;background:#FFFFFF;color:#14212B;cursor:pointer}
.a11y-slider .a11y-ctl button:disabled{opacity:.35;cursor:default}
.a11y-slider input[type=range]{flex:1;accent-color:${BLUE};height:28px;cursor:pointer}
.a11y-quick{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.a11y-quick .a11y-card{min-height:60px;font-size:11.5px}
.a11y-foot{padding:12px 14px 14px;border-top:1px solid #DCE4EC;background:#FFFFFF;display:grid;gap:8px}
.a11y-reset{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:44px;border-radius:12px;border:2px solid #C62828;background:#FFFFFF;color:#C62828;font:700 15px Arial,"Heebo",sans-serif;cursor:pointer}
.a11y-reset:hover{background:#FDECEC}
.a11y-links{display:flex;justify-content:center;gap:18px;font-size:13.5px}
.a11y-links a{color:#0A3E8C;text-decoration:underline;text-underline-offset:3px}
.a11y-panel :focus-visible,.a11y-rv :focus-visible,.a11y-vkb :focus-visible{outline:3px solid #FFB000;outline-offset:2px}
.a11y-toast{position:fixed;z-index:2147483003;left:50%;bottom:24px;transform:translateX(-50%);max-width:min(480px,calc(100vw - 32px));padding:12px 18px;border-radius:12px;background:#14212B;color:#FFFFFF;font:600 14px/1.4 Arial,"Heebo",sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.a11y-guide{position:fixed;z-index:2147482999;left:0;right:0;height:12px;margin-top:-6px;background:rgba(255,213,0,.45);border-top:2px solid #14212B;border-bottom:2px solid #14212B;pointer-events:none}
.a11y-maskt,.a11y-maskb{position:fixed;z-index:2147482999;left:0;right:0;background:rgba(0,0,0,.6);pointer-events:none}
.a11y-maskt{top:0}.a11y-maskb{bottom:0}
.a11y-rv{position:fixed;inset:0;z-index:2147483004;overflow:auto;background:#FFFFFF;color:#111111;font:400 20px/1.9 Arial,"Heebo",sans-serif}
.a11y-rv .a11y-rvbar{position:sticky;top:0;display:flex;gap:10px;justify-content:flex-end;padding:12px 18px;background:#F4F7FA;border-bottom:1px solid #DCE4EC}
.a11y-rv .a11y-rvbar button{min-height:40px;padding:0 16px;border-radius:10px;border:1.5px solid ${BLUE};background:#FFFFFF;color:#0A3E8C;font:700 15px Arial,"Heebo",sans-serif;cursor:pointer}
.a11y-rv article{max-width:760px;margin:0 auto;padding:24px 20px 80px}
.a11y-rv h1,.a11y-rv h2,.a11y-rv h3{line-height:1.3;margin:1.2em 0 .4em}
.a11y-vkb{position:fixed;z-index:2147483000;left:50%;bottom:12px;transform:translateX(-50%);width:min(760px,calc(100vw - 16px));padding:10px;border-radius:14px;background:#E3E9EF;border:1px solid #C9D5E0;box-shadow:0 10px 30px rgba(0,0,0,.3);font:600 16px Arial,"Heebo",sans-serif;color:#14212B}
.a11y-vkb p{margin:0 0 8px;font-size:13px;font-weight:400}
.a11y-vkb .a11y-krow{display:flex;gap:5px;justify-content:center;margin-bottom:5px}
.a11y-vkb button{flex:1;min-width:0;height:42px;border-radius:8px;border:1px solid #B6C3CF;background:#FFFFFF;color:#14212B;font:600 17px Arial,"Heebo",sans-serif;cursor:pointer}
.a11y-vkb button.w{flex:2.5}
@media (max-width:700px){.a11y-panel{width:100vw}.a11y-grid{grid-template-columns:repeat(3,1fr)}.a11y-quick{grid-template-columns:repeat(3,1fr)}}
@media print{#mwp-a11y{display:none!important}}
/* ---- the settings, on the page (body) only */
html.a11y-readable body,html.a11y-readable body *:not(svg):not(svg *){font-family:Arial,Helvetica,"Heebo",sans-serif!important}
html.a11y-al-right body :is(p,li,h1,h2,h3,h4,h5,h6,dd,dt,td,th,blockquote,figcaption,label,div){text-align:right!important}
html.a11y-al-left body :is(p,li,h1,h2,h3,h4,h5,h6,dd,dt,td,th,blockquote,figcaption,label,div){text-align:left!important}
html.a11y-al-center body :is(p,li,h1,h2,h3,h4,h5,h6,dd,dt,td,th,blockquote,figcaption,label,div){text-align:center!important}
html.a11y-al-justify body :is(p,li,dd,blockquote){text-align:justify!important}
html.a11y-f-invert{filter:invert(1) hue-rotate(180deg)}
html.a11y-f-contrastHigh{filter:contrast(1.45) saturate(1.15)}
html.a11y-f-contrastLow{filter:contrast(.7) saturate(.8)}
html.a11y-f-sepia{filter:sepia(.55) saturate(.9)}
html.a11y-f-mono{filter:grayscale(1)}
html.a11y-f-saturate{filter:saturate(2)}
html.a11y-c-dark body,html.a11y-c-dark body *:not(img):not(video):not(picture):not(svg):not(svg *):not(.a11y-hdr):not(.a11y-hdr *){background-color:#000000!important;background-image:none!important;color:#FFFFFF!important;-webkit-text-fill-color:#FFFFFF!important;border-color:#FFFFFF!important;text-shadow:none!important}
html.a11y-c-dark body :is(a,a *){color:#FFE600!important;-webkit-text-fill-color:#FFE600!important}
html.a11y-c-light body,html.a11y-c-light body *:not(img):not(video):not(picture):not(svg):not(svg *):not(.a11y-hdr):not(.a11y-hdr *){background-color:#FFFFFF!important;background-image:none!important;color:#000000!important;-webkit-text-fill-color:#000000!important;border-color:#000000!important;text-shadow:none!important}
html.a11y-c-light body :is(a,a *){color:#0B2A8C!important;-webkit-text-fill-color:#0B2A8C!important}
html.a11y-c-light body svg{color:#000000!important}
html.a11y-c-blackYellow body,html.a11y-c-blackYellow body *:not(img):not(video):not(picture):not(svg):not(svg *):not(.a11y-hdr):not(.a11y-hdr *){background-color:#000000!important;background-image:none!important;color:#FFE600!important;-webkit-text-fill-color:#FFE600!important;border-color:#FFE600!important;text-shadow:none!important}
html.a11y-c-blackYellow body :is(a,a *){color:#FFFFFF!important;-webkit-text-fill-color:#FFFFFF!important}
html.a11y-links body a{text-decoration:underline!important;text-underline-offset:3px!important;text-decoration-thickness:2px!important;outline:2px solid #FFB000!important;outline-offset:2px!important}
html.a11y-headings body :is(h1,h2,h3,h4,h5,h6){outline:3px solid ${BLUE}!important;outline-offset:4px!important;background-color:rgba(11,94,215,.12)!important}
.a11y-alttag{position:absolute;z-index:5;top:6px;inset-inline-start:6px;max-width:calc(100% - 12px);padding:4px 8px;border-radius:6px;background:#14212B;color:#FFFFFF;font:600 12.5px/1.35 Arial,"Heebo",sans-serif;pointer-events:none}
html.a11y-cur-white,html.a11y-cur-white *{cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24'%3E%3Cpath d='M4 2l7 19 2.6-7.4L21 11z' fill='%23fff' stroke='%23000' stroke-width='1.4' stroke-linejoin='round'/%3E%3C/svg%3E") 4 2,auto!important}
html.a11y-cur-black,html.a11y-cur-black *{cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24'%3E%3Cpath d='M4 2l7 19 2.6-7.4L21 11z' fill='%23000' stroke='%23fff' stroke-width='1.4' stroke-linejoin='round'/%3E%3C/svg%3E") 4 2,auto!important}
html.a11y-still body *,html.a11y-still body *::before,html.a11y-still body *::after{animation-duration:.001ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:.001ms!important;transition-delay:0s!important;scroll-behavior:auto!important}
html.a11y-kbd body :focus,html.a11y-sr body :focus{outline:4px solid #FFB000!important;outline-offset:3px!important;box-shadow:0 0 0 7px #14212B!important}
html.a11y-noimg body :is(img,picture,video,canvas){visibility:hidden!important}
html.a11y-noimg body *{background-image:none!important}
.a11y-region{outline:3px dashed ${BLUE}!important;outline-offset:-3px!important}
.a11y-regtag{position:absolute;z-index:6;inset-inline-start:8px;padding:3px 9px;border-radius:6px;background:${BLUE};color:#FFFFFF;font:700 12px/1.4 Arial,"Heebo",sans-serif;pointer-events:none}
html.a11y-speak body :is(p,li,h1,h2,h3,h4,h5,h6,a,button,span,td,th,label,dd,dt,blockquote,figcaption){cursor:help}
`;

  // ---------------------------------------------------------------- the menu's own container (outside <body>)
  const host = doc.createElement("div");
  host.id = "mwp-a11y";
  host.setAttribute("data-no-i18n", "");
  const style = doc.createElement("style");
  style.id = "mwp-a11y-css";
  style.textContent = css;
  (doc.head || root).append(style);

  // ---------------------------------------------------------------- applying the settings
  const SKIPSCALE = "#mwp-a11y, .a11y-hdr, .site-header, nav.nav, .skip, .skip-link, .a11y-skip, .ui-en, svg, script, style, .a11y-alttag, .a11y-regtag";   // the top bar keeps its size: it holds the accessibility button
  function textEls(scope) {
    const out = [];
    const all = scope.nodeType === 1 ? [scope, ...scope.querySelectorAll("*")] : [...scope.querySelectorAll("*")];
    for (const el of all) {
      if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(el.tagName)) out.push(el);
    }
    return out;
  }
  function scaleEl(el) {
    if (el.closest(SKIPSCALE)) return;
    const f = FONT[s.font] / 100;
    if (!el.dataset.a11yFs) {
      if (f === 1) return;
      const cs = getComputedStyle(el);
      el.dataset.a11yFs = String(parseFloat(cs.fontSize) || 0);
      el.dataset.a11yLh = cs.lineHeight === "normal" ? "" : String(parseFloat(cs.lineHeight));
    }
    const fs = parseFloat(el.dataset.a11yFs);
    if (!fs) return;
    if (f === 1) { el.style.removeProperty("font-size"); el.style.removeProperty("line-height"); return; }
    el.style.setProperty("font-size", `${(fs * f).toFixed(2)}px`, "important");
    const lh = parseFloat(el.dataset.a11yLh);
    if (lh && !s.line) el.style.setProperty("line-height", `${(lh * f).toFixed(2)}px`, "important");
    else el.style.removeProperty("line-height");
  }
  function applyText(scope = doc.body) {
    if (!scope) return;
    if (FONT[s.font] === 100 && !doc.querySelector("[data-a11y-fs]")) return;
    textEls(scope).forEach(scaleEl);
  }
  let spacingStyle = null;
  function applySpacing() {
    const rules = [];
    const sel = "body :is(p,li,h1,h2,h3,h4,h5,h6,dd,dt,td,th,label,a,span,blockquote,figcaption,button,div,summary):not(.site-header *):not(nav.nav *)";
    if (s.line) rules.push(`line-height:${LINE[s.line]}!important`);
    if (s.letter) rules.push(`letter-spacing:${LETTER[s.letter]}em!important`);
    if (s.word) rules.push(`word-spacing:${WORD[s.word]}em!important`);
    if (!spacingStyle) { spacingStyle = doc.createElement("style"); spacingStyle.id = "mwp-a11y-spacing"; (doc.head || root).append(spacingStyle); }
    spacingStyle.textContent = rules.length ? `${sel}{${rules.join(";")}}` : "";
  }
  const FILTERS = ["invert", "contrastHigh", "contrastLow", "sepia", "mono", "saturate"];
  const MODES = ["dark", "light", "blackYellow"];
  function applyClasses() {
    const c = root.classList;
    c.toggle("a11y-readable", !!s.readableFont);
    ["right", "left", "center", "justify"].forEach((a) => c.toggle(`a11y-al-${a}`, s.align === a));
    FILTERS.forEach((f) => c.toggle(`a11y-f-${f}`, s.color === f));
    MODES.forEach((m) => c.toggle(`a11y-c-${m}`, s.color === m));
    c.toggle("a11y-links", !!s.links);
    c.toggle("a11y-headings", !!s.headings);
    c.toggle("a11y-cur-white", !!s.cursorBig);
    c.toggle("a11y-cur-black", !!s.cursorBlack);
    c.toggle("a11y-still", !!(s.stopAnim || s.srMode));
    c.toggle("a11y-kbd", !!s.keyboard);
    c.toggle("a11y-sr", !!s.srMode);
    c.toggle("a11y-noimg", !!s.hideImages);
    c.toggle("a11y-speak", !!s.speak);
  }
  // Page zoom: everything but the top bar, which holds the accessibility button and must stay on screen at any zoom
  let zoomStyle = null;
  function applyZoom() {
    const z = ZOOM[s.zoom] / 100;
    if (!zoomStyle) { zoomStyle = doc.createElement("style"); zoomStyle.id = "mwp-a11y-zoom"; (doc.head || root).append(zoomStyle); }
    zoomStyle.textContent = z === 1 ? "" : `body > :not(.site-header):not(.nav):not(header):not(.a11y-skip):not(.skip):not(.skip-link):not(script):not(style){zoom:${z}}`;
  }
  function applyMedia() {
    doc.querySelectorAll("video, audio").forEach((m) => {
      try {
        if (s.mute) { if (!m.hasAttribute("data-a11y-muted")) { m.setAttribute("data-a11y-muted", m.muted ? "1" : "0"); } m.muted = true; }
        else if (m.hasAttribute("data-a11y-muted")) { m.muted = m.getAttribute("data-a11y-muted") === "1"; m.removeAttribute("data-a11y-muted"); }
        if (s.stopAnim || s.srMode) { m.pause(); m.removeAttribute("autoplay"); }
      } catch { /* not playable */ }
    });
  }
  function applyAlt() {
    doc.querySelectorAll(".a11y-alttag").forEach((n) => n.remove());
    if (!s.alt || !doc.body) return;
    doc.body.querySelectorAll("img").forEach((img) => {
      const alt = (img.getAttribute("alt") || "").trim();
      if (!alt || !img.offsetParent) return;
      const box = img.parentElement;
      if (!box) return;
      if (getComputedStyle(box).position === "static") box.style.position = "relative";
      const tag = doc.createElement("span");
      tag.className = "a11y-alttag";
      tag.setAttribute("aria-hidden", "true");
      tag.textContent = `${t("image")}: ${alt}`;
      box.append(tag);
    });
  }
  const LANDMARKS = [["header, [role=banner]", "banner"], ["nav, [role=navigation]", "navigation"], ["main, [role=main]", "main"], ["footer, [role=contentinfo]", "contentinfo"],
    ["aside, [role=complementary]", "complementary"], ["[role=search]", "search"], ["form", "form"]];
  function applyRegions(announce) {
    doc.querySelectorAll(".a11y-regtag").forEach((n) => n.remove());
    doc.querySelectorAll(".a11y-region").forEach((el) => {
      el.classList.remove("a11y-region");
      if (el.dataset.a11yTab === "added") { el.removeAttribute("tabindex"); delete el.dataset.a11yTab; }
    });
    if (!(s.regions || s.srMode) || !doc.body) return;
    let n = 0;
    for (const [sel, kind] of LANDMARKS) {
      doc.body.querySelectorAll(sel).forEach((el) => {
        if (el.closest("#mwp-a11y") || !el.offsetParent && getComputedStyle(el).position !== "fixed") return;
        if (!el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby")) el.setAttribute("aria-label", W[pageHe() ? "he" : "en"].labels[kind]);
        if (!s.regions) return;   // screen reader support: names only, no visible marks
        n++;
        el.classList.add("a11y-region");
        if (!el.hasAttribute("tabindex")) { el.setAttribute("tabindex", "0"); el.dataset.a11yTab = "added"; }
        if (getComputedStyle(el).position === "static") el.style.position = "relative";
        const tag = doc.createElement("span");
        tag.className = "a11y-regtag";
        tag.setAttribute("aria-hidden", "true");
        tag.style.top = "6px";
        tag.textContent = W[uiLang].labels[kind];
        el.prepend(tag);
      });
    }
    if (announce && s.regions) toast(n ? t("regionsFound").replace("{n}", n) : t("regionsNone"));
  }
  // the reading guide and mask follow the pointer
  let guideEl = null, maskT = null, maskB = null;
  function applyPointerAids() {
    if (s.guide && !guideEl) { guideEl = doc.createElement("div"); guideEl.className = "a11y-guide"; guideEl.style.top = "50%"; host.append(guideEl); }
    if (!s.guide && guideEl) { guideEl.remove(); guideEl = null; }
    if (s.mask && !maskT) {
      maskT = doc.createElement("div"); maskT.className = "a11y-maskt";
      maskB = doc.createElement("div"); maskB.className = "a11y-maskb";
      host.append(maskT, maskB); placeMask(innerHeight / 2);
    }
    if (!s.mask && maskT) { maskT.remove(); maskB.remove(); maskT = maskB = null; }
  }
  function placeMask(y) {
    if (!maskT) return;
    const band = 110;
    maskT.style.height = `${Math.max(0, y - band / 2)}px`;
    maskB.style.height = `${Math.max(0, innerHeight - y - band / 2)}px`;
  }
  doc.addEventListener("pointermove", (e) => {
    if (guideEl) guideEl.style.top = `${e.clientY}px`;
    if (maskT) placeMask(e.clientY);
  }, { passive: true });
  function apply(opts = {}) {
    applyClasses();
    applyZoom();
    applySpacing();
    applyText();
    applyMedia();
    applyAlt();
    applyRegions(opts.announceRegions);
    applyPointerAids();
    if (!s.speak && window.speechSynthesis) speechSynthesis.cancel();
  }
  applyClasses();   // at once, before the page paints where possible
  applySpacing();

  // ---------------------------------------------------------------- read aloud on click
  doc.addEventListener("click", (e) => {
    if (!s.speak || e.target.closest("#mwp-a11y")) return;
    const el = e.target.closest("p,li,h1,h2,h3,h4,h5,h6,a,button,span,td,th,label,dd,dt,blockquote,figcaption,div");
    const text = el && (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 1200);
    if (!text || !window.speechSynthesis) return;
    const lang = pageHe() ? "he" : "en";
    const voice = speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith(lang === "he" ? "he" : "en"));
    if (lang === "he" && !voice) { toast(t("noVoice")); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "he" ? "he-IL" : "en-US";
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }, true);

  // ---------------------------------------------------------------- toast
  let toastTimer = 0;
  function toast(msg) {
    let el = host.querySelector(".a11y-toast");
    if (!el) { el = doc.createElement("div"); el.className = "a11y-toast"; el.setAttribute("role", "status"); host.append(el); }
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
  }

  // ---------------------------------------------------------------- the panel
  let panel = null, back = null;
  const pressed = (on) => `aria-pressed="${on ? "true" : "false"}"`;
  const card = (attr, on, icon, label) => `<button type="button" class="a11y-card" ${attr} ${pressed(on)}>${I[icon]}<span>${label}</span></button>`;
  function slider(key, label, icon, steps, fmt) {
    const v = s[key], max = steps.length - 1;
    return `<div class="a11y-slider"><div class="a11y-top"><label for="a11y-r-${key}">${I[icon]}${label}</label><output id="a11y-o-${key}">${fmt(v)}</output></div>
<div class="a11y-ctl"><button type="button" data-step="${key}" data-d="-1" aria-label="${t("dec")}: ${label}"${v <= 0 ? " disabled" : ""}>${I.minus}</button>
<input type="range" id="a11y-r-${key}" data-range="${key}" min="0" max="${max}" step="1" value="${v}" aria-valuetext="${fmt(v)}">
<button type="button" data-step="${key}" data-d="1" aria-label="${t("inc")}: ${label}"${v >= max ? " disabled" : ""}>${I.plus}</button></div></div>`;
  }
  function panelHTML() {
    const he = uiLang === "he";
    return `<div class="a11y-scrim" data-a11y-close></div>
<div class="a11y-panel" role="dialog" aria-modal="true" aria-labelledby="a11y-h" lang="${uiLang}" dir="${he ? "rtl" : "ltr"}" style="--a11y-dir:${he ? "rtl" : "ltr"}">
<div class="a11y-head"><span class="a11y-logo">${I.access}</span><div><h2 id="a11y-h">${t("title")}</h2><p>${t("hint")}</p></div>
<div class="a11y-tools"><button type="button" data-lang lang="${he ? "en" : "he"}">${he ? "EN" : "עב"}<span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">${t("lang")}</span></button><button type="button" data-a11y-close aria-label="${t("close")}">${I.x}</button></div></div>
<div class="a11y-body">
<section class="a11y-sec" aria-labelledby="a11y-s1"><h3 id="a11y-s1">${t("profiles")}</h3><div class="a11y-grid">
${Object.entries(PROFILES).map(([k, p]) => card(`data-profile="${k}"`, s.profile === k, p.icon, t(`p_${k}`))).join("")}</div></section>
<section class="a11y-sec" aria-labelledby="a11y-s2"><h3 id="a11y-s2">${t("text")}</h3>
${slider("font", t("fontSize"), "text", FONT, (i) => `${FONT[i]}%`)}
${slider("zoom", t("zoom"), "zoom", ZOOM, (i) => `${ZOOM[i]}%`)}
${slider("line", t("lineHeight"), "lines", LINE, (i) => String(i))}
${slider("letter", t("letterSpacing"), "letter", LETTER, (i) => String(i))}
${slider("word", t("wordSpacing"), "word", WORD, (i) => String(i))}</section>
<section class="a11y-sec" aria-labelledby="a11y-s3"><h3 id="a11y-s3">${t("fontStyle")}</h3><div class="a11y-grid">
${card('data-flag="readableFont"', s.readableFont, "font", t("readableFont"))}
${card('data-align="right"', s.align === "right", "alignR", t("alignRight"))}
${card('data-align="left"', s.align === "left", "alignL", t("alignLeft"))}
${card('data-align="center"', s.align === "center", "alignC", t("alignCenter"))}
${card('data-align="justify"', s.align === "justify", "alignJ", t("alignJustify"))}</div></section>
<section class="a11y-sec" aria-labelledby="a11y-s4"><h3 id="a11y-s4">${t("colors")}</h3><div class="a11y-grid">
${[["invert", "invert"], ["dark", "moon"], ["light", "sun"], ["blackYellow", "by"], ["contrastHigh", "contrast"], ["contrastLow", "low"], ["sepia", "sepia"], ["mono", "mono"], ["saturate", "sat"]]
  .map(([k, ic]) => card(`data-color="${k}"`, s.color === k, ic, t(k))).join("")}</div></section>
<section class="a11y-sec" aria-labelledby="a11y-s5"><h3 id="a11y-s5">${t("highlight")}</h3><div class="a11y-grid">
${card('data-flag="links"', s.links, "link", t("links"))}${card('data-flag="headings"', s.headings, "heading", t("headings"))}${card('data-flag="alt"', s.alt, "image", t("alt"))}</div></section>
<section class="a11y-sec" aria-labelledby="a11y-s6"><h3 id="a11y-s6">${t("nav")}</h3><div class="a11y-grid">
${card('data-flag="cursorBig"', s.cursorBig, "cursor", t("cursorBig"))}${card('data-flag="cursorBlack"', s.cursorBlack, "cursorB", t("cursorBlack"))}
${card('data-flag="guide"', s.guide, "guide", t("guide"))}${card('data-flag="mask"', s.mask, "mask", t("mask"))}
${card('data-flag="stopAnim"', s.stopAnim, "pause", t("stopAnim"))}${card('data-flag="keyboard"', s.keyboard, "kb", t("keyboard"))}
${card('data-flag="speak"', s.speak, "speak", t("speak"))}${card('data-flag="srMode"', s.srMode, "sr", t("srMode"))}${card('data-flag="regions"', s.regions, "regions", t("regions"))}</div>
<h3 style="margin-top:14px">${t("quick")}</h3><div class="a11y-quick">
${card('data-jump="top"', false, "up", t("qTop"))}${card('data-jump="heading"', false, "h1", t("qHeading"))}${card('data-jump="main"', false, "main", t("qMain"))}${card('data-jump="nav"', false, "menu", t("qNav"))}${card('data-jump="bottom"', false, "down", t("qBottom"))}</div></section>
<section class="a11y-sec" aria-labelledby="a11y-s7"><h3 id="a11y-s7">${t("media")}</h3><div class="a11y-grid">
${card('data-flag="mute"', s.mute, "mute", t("mute"))}${card('data-flag="hideImages"', s.hideImages, "noimg", t("hideImages"))}
${card("data-readview", false, "read", t("readView"))}${card("data-vkb", !!host.querySelector(".a11y-vkb"), "kb", t("vkb"))}</div></section>
</div>
<div class="a11y-foot"><button type="button" class="a11y-reset" data-reset>${I.reset}${t("reset")}</button>
<div class="a11y-links"><a href="/accessibility/">${t("statement")}</a><a href="mailto:contact@matanwildphotography.com?subject=${encodeURIComponent(t("report") + " · " + location.hostname + location.pathname)}">${t("report")}</a></div></div>
</div>`;
  }
  function open(from) {
    back = from && from.focus ? from : doc.activeElement;
    uiLang = pageHe() ? "he" : "en";
    if (!panel) { panel = doc.createElement("div"); host.append(panel); }
    panel.innerHTML = panelHTML();
    root.classList.add("a11y-open");
    panel.querySelector(".a11y-head button[data-a11y-close]").focus({ preventScroll: true });
  }
  function close() {
    if (!panel) return;
    panel.remove(); panel = null;
    root.classList.remove("a11y-open");
    if (back && back.focus && back.isConnected) back.focus({ preventScroll: true });
  }
  function redraw() {
    if (!panel) return;
    const a = doc.activeElement;
    const key = a && a.closest && a.closest("#mwp-a11y") ? [...a.attributes].filter((x) => x.name.startsWith("data-") && x.name !== "data-d").map((x) => `[${x.name}="${x.value}"]`).join("") + (a.dataset.d ? `[data-d="${a.dataset.d}"]` : "") : "";
    const scroll = panel.querySelector(".a11y-body")?.scrollTop || 0;
    panel.innerHTML = panelHTML();
    panel.querySelector(".a11y-body").scrollTop = scroll;
    const again = key && (panel.querySelector(`${key}:not([disabled])`) || panel.querySelector(key.split("][")[0] + (key.includes("][") ? "]" : "")));
    (again || panel.querySelector(".a11y-head button[data-a11y-close]")).focus({ preventScroll: true });
  }
  function change() { save(); apply(); redraw(); }

  function setProfile(k) {
    const was = s.profile === k;
    s = { ...DEF };
    if (!was) { Object.assign(s, PROFILES[k].set); s.profile = k; }
  }
  function jump(where) {
    let el = null;
    if (where === "top") { scrollTo({ top: 0 }); el = doc.querySelector("header a, header button, a, button"); }
    else if (where === "bottom") { scrollTo({ top: doc.documentElement.scrollHeight }); el = doc.querySelector("footer"); }
    else el = where === "heading" ? doc.querySelector("main h1, h1") : where === "main" ? doc.querySelector("main, [role=main], #main") : doc.querySelector("nav, [role=navigation]");
    if (!el) { toast(t("qMissing")); return; }
    close();
    if (!el.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute("tabindex", "-1");
    el.scrollIntoView({ block: "start" });
    el.focus({ preventScroll: true });
  }

  // reading view: the page's text, large, plain, printable
  function readView() {
    const src = doc.querySelector("main, [role=main], #main") || doc.body;
    const parts = [];
    src.querySelectorAll("h1,h2,h3,p,li,blockquote,figcaption,summary").forEach((el) => {
      if (el.closest("#mwp-a11y, nav, .cart-panel, script, style, [hidden], .ui-en") || !el.offsetParent) return;
      const txt = (el.innerText || "").replace(/\s+/g, " ").trim();
      if (!txt || txt.length < 2) return;
      const tag = /^H[123]$/.test(el.tagName) ? el.tagName.toLowerCase() : el.tagName === "LI" ? "li" : "p";
      parts.push([tag, txt]);
    });
    const esc = (v) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const he = pageHe();
    const box = doc.createElement("div");
    box.className = "a11y-rv";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", t("rvTitle"));
    box.innerHTML = `<div class="a11y-rvbar" dir="${uiLang === "he" ? "rtl" : "ltr"}"><button type="button" data-rv-print>${t("rvPrint")}</button><button type="button" data-rv-close>${t("rvBack")}</button></div>
<article dir="${he ? "rtl" : "ltr"}" lang="${he ? "he" : "en"}">${parts.length ? parts.map(([tag, txt]) => tag === "li" ? `<p>• ${esc(txt)}</p>` : `<${tag}>${esc(txt)}</${tag}>`).join("") : `<p>${t("rvEmpty")}</p>`}</article>`;
    close();
    host.append(box);
    box.querySelector("[data-rv-close]").focus();
    box.addEventListener("click", (e) => {
      if (e.target.closest("[data-rv-close]")) { box.remove(); }
      if (e.target.closest("[data-rv-print]")) {
        const w = window.open("", "_blank");
        if (!w) return;
        w.document.write(`<!doctype html><html lang="${he ? "he" : "en"}" dir="${he ? "rtl" : "ltr"}"><meta charset="utf-8"><title>${esc(doc.title)}</title><body style="font:18px/1.8 Arial,sans-serif;max-width:760px;margin:24px auto">${box.querySelector("article").innerHTML}</body></html>`);
        w.document.close(); w.focus(); w.print();
      }
    });
    box.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); box.remove(); } });
  }

  // on-screen keyboard (Hebrew and English), typing into the last text field used on the page
  let lastField = null;
  doc.addEventListener("focusin", (e) => { if (e.target.closest && !e.target.closest("#mwp-a11y") && e.target.matches("input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]), textarea")) lastField = e.target; });
  const KB = {
    he: [["/", "'", "ק", "ר", "א", "ט", "ו", "ן", "ם", "פ"], ["ש", "ד", "ג", "כ", "ע", "י", "ח", "ל", "ך", "ף"], ["ז", "ס", "ב", "ה", "נ", "מ", "צ", "ת", "ץ", "."]],
    en: [["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"], ["a", "s", "d", "f", "g", "h", "j", "k", "l", "@"], ["z", "x", "c", "v", "b", "n", "m", ".", "-", "_"]],
  };
  let kbLang = pageHe() ? "he" : "en";
  function vkb(toggle = true) {
    let box = host.querySelector(".a11y-vkb");
    if (box && toggle) { box.remove(); return; }
    if (!box) { box = doc.createElement("div"); box.className = "a11y-vkb"; box.setAttribute("role", "group"); host.append(box); }
    box.setAttribute("aria-label", t("vkb"));
    box.setAttribute("dir", "ltr");
    box.innerHTML = `<p dir="${uiLang === "he" ? "rtl" : "ltr"}">${t("vkbHint")}</p>`
      + KB[kbLang].map((r) => `<div class="a11y-krow" dir="${kbLang === "he" ? "rtl" : "ltr"}">${r.map((k) => `<button type="button" data-key="${k}">${k}</button>`).join("")}</div>`).join("")
      + `<div class="a11y-krow"><button type="button" data-kbl>${kbLang === "he" ? "EN" : "עב"}</button><button type="button" class="w" data-key=" ">${t("vkbSpace")}</button><button type="button" data-kback>${t("vkbBack")}</button><button type="button" data-kenter>${t("vkbEnter")}</button><button type="button" data-kclose aria-label="${t("vkbClose")}">✕</button></div>`;
  }
  function typeKey(fn) {
    const f = lastField;
    if (!f || !f.isConnected) { toast(t("vkbNoField")); return; }
    f.focus({ preventScroll: true });
    fn(f);
    f.dispatchEvent(new Event("input", { bubbles: true }));
  }
  host.addEventListener("mousedown", (e) => { if (e.target.closest(".a11y-vkb button")) e.preventDefault(); });   // keep the field focused

  host.addEventListener("click", (e) => {
    const k = e.target.closest(".a11y-vkb [data-key]");
    if (k) { typeKey((f) => { const a = f.selectionStart ?? f.value.length, b = f.selectionEnd ?? f.value.length; f.value = f.value.slice(0, a) + k.dataset.key + f.value.slice(b); try { f.setSelectionRange(a + 1, a + 1); } catch { /* email fields */ } }); return; }
    if (e.target.closest(".a11y-vkb [data-kback]")) { typeKey((f) => { const a = f.selectionStart ?? f.value.length, b = f.selectionEnd ?? f.value.length; const from = a === b ? Math.max(0, a - 1) : a; f.value = f.value.slice(0, from) + f.value.slice(b); try { f.setSelectionRange(from, from); } catch { /* email fields */ } }); return; }
    if (e.target.closest(".a11y-vkb [data-kenter]")) { const f = lastField; if (f && f.form) f.form.requestSubmit ? f.form.requestSubmit() : f.form.submit(); return; }
    if (e.target.closest(".a11y-vkb [data-kbl]")) { kbLang = kbLang === "he" ? "en" : "he"; vkb(false); return; }
    if (e.target.closest(".a11y-vkb [data-kclose]")) { host.querySelector(".a11y-vkb")?.remove(); return; }
    if (!panel || !e.target.closest(".a11y-panel, .a11y-scrim")) return;
    if (e.target.closest("[data-a11y-close]")) { close(); return; }
    if (e.target.closest("[data-lang]")) { uiLang = uiLang === "he" ? "en" : "he"; redraw(); return; }
    const pr = e.target.closest("[data-profile]");
    if (pr) { setProfile(pr.dataset.profile); change(); return; }
    const st = e.target.closest("[data-step]");
    if (st) {
      const key = st.dataset.step, max = { font: FONT, zoom: ZOOM, line: LINE, letter: LETTER, word: WORD }[key].length - 1;
      s[key] = Math.min(max, Math.max(0, s[key] + Number(st.dataset.d))); s.profile = ""; change(); return;
    }
    const fl = e.target.closest("[data-flag]");
    if (fl) {
      const k = fl.dataset.flag; s[k] = !s[k]; s.profile = "";
      if (k === "cursorBig" && s[k]) s.cursorBlack = false;
      if (k === "cursorBlack" && s[k]) s.cursorBig = false;
      save(); apply({ announceRegions: k === "regions" }); if (k === "mute" && s.mute) toast(t("muted")); redraw(); return;
    }
    const al = e.target.closest("[data-align]");
    if (al) { s.align = s.align === al.dataset.align ? "" : al.dataset.align; s.profile = ""; change(); return; }
    const co = e.target.closest("[data-color]");
    if (co) { s.color = s.color === co.dataset.color ? "" : co.dataset.color; s.profile = ""; change(); return; }
    const j = e.target.closest("[data-jump]");
    if (j) { jump(j.dataset.jump); return; }
    if (e.target.closest("[data-readview]")) { readView(); return; }
    if (e.target.closest("[data-vkb]")) { const on = !host.querySelector(".a11y-vkb"); vkb(true); if (on) close(); else redraw(); return; }   // the keyboard is for typing into the page: the panel steps aside
    if (e.target.closest("[data-reset]")) { s = { ...DEF }; host.querySelector(".a11y-vkb")?.remove(); change(); }
  });
  host.addEventListener("input", (e) => {
    const r = e.target.closest("[data-range]");
    if (!r) return;
    s[r.dataset.range] = Number(r.value); s.profile = ""; save(); apply();
    const fmt = { font: (i) => `${FONT[i]}%`, zoom: (i) => `${ZOOM[i]}%` }[r.dataset.range] || String;
    const out = panel?.querySelector(`#a11y-o-${r.dataset.range}`);
    if (out) out.textContent = fmt(s[r.dataset.range]);
    r.setAttribute("aria-valuetext", fmt(s[r.dataset.range]));
  });
  host.addEventListener("change", (e) => { if (e.target.closest("[data-range]")) redraw(); });

  // openers anywhere on the page: the button, the ☰ menu item (#a11y), the first-Tab link
  doc.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-a11y-open], a[href$='#a11y']");
    if (opener) { e.preventDefault(); panel ? close() : open(opener); }
  });
  doc.addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && (e.code === "KeyA" || /^a$/i.test(e.key))) { e.preventDefault(); panel ? close() : open(doc.activeElement); return; }
    if (!panel) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;   // keep the keyboard inside the panel
    const f = [...panel.querySelectorAll("a, button:not([disabled]), input")].filter((x) => x.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  // Where it sits (Jeinna, 31 Oct 2026, after looking at well-known Israeli sites): in the top bar, beside the cart and
  // the language switch, as El Al and Leumi do: always in the same place, easy to find, covering nothing, on computers
  // and phones alike. A page without our top bar (the Ambassador page) gets the round button on the side instead.
  let hdr = null, fab = null;
  function placeInHeader() {
    const icons = doc.querySelector(".nav .nav-icons, .site-header .nav-icons, .nav-icons");
    if (!icons) return false;
    if (!hdr) {
      hdr = doc.createElement("button");
      hdr.type = "button";
      hdr.className = "a11y-hdr";
      hdr.setAttribute("data-a11y-open", "");
      hdr.setAttribute("data-no-i18n", "");
      hdr.setAttribute("aria-haspopup", "dialog");
      hdr.innerHTML = `<span class="a11y-dot">${I.access}</span>`;
    }
    hdr.setAttribute("aria-label", W[pageHe() ? "he" : "en"].open);
    hdr.title = W[pageHe() ? "he" : "en"].title;
    if (hdr.parentNode !== icons || icons.firstChild !== hdr) icons.prepend(hdr);
    if (fab) { fab.remove(); fab = null; }
    return true;
  }
  function floating() {
    if (fab || (hdr && hdr.isConnected)) return;
    fab = doc.createElement("button");
    fab.type = "button";
    fab.className = "a11y-fab";
    fab.setAttribute("data-a11y-open", "");
    fab.setAttribute("aria-haspopup", "dialog");
    fab.setAttribute("aria-label", W[pageHe() ? "he" : "en"].open);
    fab.innerHTML = I.access;
    host.append(fab);
  }
  function start() {
    root.append(host);
    if (!placeInHeader()) setTimeout(() => { if (!placeInHeader()) floating(); }, 2500);   // the cart script draws some top bars a moment later
    // some pages redraw their top bar: put the button back if it's gone
    new MutationObserver(() => { if (hdr && !hdr.isConnected) placeInHeader(); else if (!hdr && fab && doc.querySelector(".nav-icons")) placeInHeader(); }).observe(doc.body, { childList: true, subtree: true });
    const skip = doc.createElement("button");
    skip.type = "button";
    skip.className = "a11y-skip";
    skip.setAttribute("data-a11y-open", "");
    skip.setAttribute("data-no-i18n", "");
    skip.textContent = W[pageHe() ? "he" : "en"].settingsLink;
    const first = doc.querySelector("a.skip, a.skip-link, .skip-link, a[href$='#main']");
    if (first && first.parentNode) first.after(skip); else doc.body.prepend(skip);
    new MutationObserver(() => {   // the page's language toggle
      if (hdr) { hdr.setAttribute("aria-label", W[pageHe() ? "he" : "en"].open); hdr.title = W[pageHe() ? "he" : "en"].title; }
      if (fab) fab.setAttribute("aria-label", W[pageHe() ? "he" : "en"].open);
      skip.textContent = W[pageHe() ? "he" : "en"].settingsLink;
    }).observe(root, { attributes: true, attributeFilter: ["lang"] });
    apply();
    // content added later (the cart, pop-ups) gets the same text size and media settings
    new MutationObserver((list) => {
      if (FONT[s.font] !== 100) for (const m of list) m.addedNodes.forEach((n) => { if (n.nodeType === 1 && !n.closest(SKIPSCALE)) applyText(n); });
      if (s.mute || s.stopAnim) applyMedia();
    }).observe(doc.body, { childList: true, subtree: true });
  }
  doc.readyState === "loading" ? doc.addEventListener("DOMContentLoaded", start) : start();
})();
