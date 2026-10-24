// MWP Ambassador Program page: open to anyone with the link (no password).
// Apply: a short questionnaire; the application goes to the team in monday.com (beta function → Make).
// Approved people get an email with a personal link (?accept=<token>): the page then shows the terms, and
// accepting them makes them an ambassador and unlocks their tools (beta → accept).
import { initI18n } from "../i18n.js";
import { initCart } from "../lib/cart.js";
import { betaAccept, betaAcceptInfo, betaApply, betaStatus } from "../lib/api.js";
import { ambassadorLanding } from "../lib/landing.js";

// a link from a Hebrew email opens the page in Hebrew
try { const l = new URLSearchParams(location.search).get("lang"); if (l === "he" || l === "en") localStorage.setItem("mwp_lang", l); } catch { /* fine */ }
ambassadorLanding();   // already an ambassador and signed in: straight to My downloads
initI18n();
initCart();

const he = () => document.documentElement.lang === "he";
const T = (en, hebrew) => (he() ? hebrew : en);

// ---------------------------------------------------------------- reveal on scroll
const els = document.querySelectorAll(".reveal");
if (!("IntersectionObserver" in window)) {
  els.forEach((e) => e.classList.add("on"));
} else {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  els.forEach((e) => io.observe(e));
}

// ---------------------------------------------------------------- terms: one document to read through
// The contents list and the key facts jump to their chapter (handled with the pop-ups below).

// ---------------------------------------------------------------- tap to copy the handle and hashtags
const copied = document.createElement("div");
copied.className = "copied"; copied.setAttribute("role", "status");
document.body.append(copied);
let copiedTimer;
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button.cp[data-copy]");
  if (!b) return;
  const text = b.dataset.copy;
  try { await navigator.clipboard.writeText(text); } catch {
    const t = document.createElement("textarea"); t.value = text; document.body.append(t); t.select();
    try { document.execCommand("copy"); } catch { /* nothing else to try */ } t.remove();
  }
  b.classList.add("done"); setTimeout(() => b.classList.remove("done"), 900);
  copied.textContent = T(`Copied ${text}`, `הועתק: ${text}`);
  copied.classList.add("show"); clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => copied.classList.remove("show"), 1600);
});


// ---------------------------------------------------------------- pop-ups: the questionnaire, and (after approval) the terms
const termsModal = document.getElementById("terms-modal");
const joinModal = document.getElementById("join-modal");
let lastFocus = null;
function openModal(m, focusEl) {
  if (!document.querySelector(".modal:not([hidden])")) lastFocus = document.activeElement;
  document.querySelectorAll(".modal").forEach((x) => { if (x !== m) x.hidden = true; });
  m.hidden = false;
  m.scrollTop = 0;
  document.documentElement.classList.add("modal-on");
  setTimeout(() => (focusEl || m.querySelector(".modal-x")).focus({ preventScroll: true }), 60);
}
function closeModal(m) {
  m.hidden = true;
  if (!document.querySelector(".modal:not([hidden])")) {
    document.documentElement.classList.remove("modal-on");
    lastFocus?.focus?.({ preventScroll: true });
  }
}
document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) closeModal(m);
}));
document.addEventListener("keydown", (e) => {
  const open = document.querySelector(".modal:not([hidden])");
  if (e.key === "Escape" && open) closeModal(open);
});
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-terms]")) { e.preventDefault(); openModal(termsModal); }
  if (e.target.closest("[data-apply]")) { e.preventDefault(); openModal(joinModal, document.getElementById("join-done").hidden ? document.getElementById("j-name") : null); }
});
// a key fact or a contents line jumps to its chapter inside the terms
document.querySelectorAll("[data-open]").forEach((a) => a.addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById(`${he() ? "h" : "t"}${a.dataset.open}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}));
// ---------------------------------------------------------------- after approval: accept the terms (?accept=<token>)
const acceptToken = new URLSearchParams(location.search).get("accept") || "";
const heroH = document.getElementById("hero-h");
const heroLead = document.getElementById("hero-lead");
function heroCta(which) {
  for (const id of ["apply-cta", "accept-cta", "downloads-cta"]) document.getElementById(id).hidden = id !== which;
}
if (acceptToken) {
  heroCta(null);
  betaAcceptInfo(acceptToken).then((r) => {
    const first = (r.name || "").trim().split(/\s+/)[0];
    if (r.accepted) return showAccepted(r.email);
    heroH.innerHTML = T(`Welcome${first ? `, ${esc(first)}` : ""}.<br><span class="grad">One last step.</span>`,
      `ברוכים הבאים${first ? `, ${esc(first)}` : ""}.<br><span class="grad">עוד צעד אחד.</span>`);
    heroLead.textContent = T("You're approved for the MWP Ambassador Program. Read and accept the terms, and your tools are ready.",
      "התקבלתם לתוכנית השגרירים של MWP. קראו ואשרו את התנאים, והכלים שלכם מוכנים.");
    heroCta("accept-cta");
  }).catch((err) => {
    heroLead.textContent = err.message || T("This link isn't valid any more. Please contact us.", "הקישור הזה כבר לא בתוקף. צרו איתנו קשר.");
  });
}
function showAccepted(email) {
  heroH.innerHTML = T(`You're <span class="grad">in.</span>`, `אתם <span class="grad">בפנים.</span>`);
  heroLead.textContent = email
    ? T(`Your tools are waiting in My downloads. Sign in, or create your account, with ${email}.`,
        `הכלים שלכם מחכים בהורדות שלי. התחברו, או פתחו חשבון, עם ${email}.`)
    : T("Your tools are waiting in My downloads.", "הכלים שלכם מחכים בהורדות שלי.");
  heroCta("downloads-cta");
}
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
document.getElementById("agree-btn").addEventListener("click", async () => {
  if (!acceptToken) { closeModal(termsModal); return; }   // reading the terms without a link: nothing to accept
  const btn = document.getElementById("agree-btn");
  btn.disabled = true;
  try {
    const r = await betaAccept(acceptToken, he() ? "he" : "en");
    closeModal(termsModal);
    showAccepted(r.email);
  } catch (err) {
    alert(err.message);
  } finally { btn.disabled = false; }
});
// a refresh always starts at the top ("Create with MWP"), never inside the terms
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
if (location.hash) history.replaceState(null, "", location.pathname + location.search);
window.scrollTo(0, 0);

// ---------------------------------------------------------------- full? (26 ambassadors at most; the server enforces it)
function showFull() {
  if (acceptToken) return;   // approved before it filled up: they can still accept
  document.querySelectorAll(".hero-cta").forEach((el) => { el.hidden = true; });
  const note = document.getElementById("full-note");
  if (note) { note.hidden = false; note.classList.add("on"); }
  document.querySelectorAll(".modal").forEach((m) => { if (!m.hidden) closeModal(m); });
}
betaStatus().then((r) => { if (r && r.open === false) showFull(); }).catch(() => { /* can't tell: leave it open, the server still checks */ });

// ---------------------------------------------------------------- step 2: the questionnaire, then "Thank you"
// Nothing is given on the spot: the application goes to the team in monday.com, and the shop emails the
// answer (welcome with the tools, or a kind no) once they decide.
const form = document.getElementById("join-form");
const msg = document.getElementById("join-msg");
// "I have a question" opens a box for it
form.addEventListener("change", (e) => {
  if (e.target.name !== "sounds_good") return;
  const asking = e.target.value === "I have a question";
  document.getElementById("question-field").hidden = !asking;
  if (asking) document.getElementById("j-question").focus();
});
const REQUIRED = ["shoot", "years", "role", "work", "software", "apps", "devices", "used_before", "why", "values", "sounds_good", "feedback"];
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = form.elements;
  const val = (n) => {
    const el = f[n];
    if (!el) return "";
    if (el instanceof RadioNodeList || el.length > 1) {
      const picked = [...form.querySelectorAll(`input[name="${n}"]:checked`)].map((x) => x.value);
      return picked.join(", ");
    }
    return (el.value || "").trim();
  };
  const answers = {};
  for (const n of [...REQUIRED, "platforms", "question"]) answers[n] = val(n);
  if (answers.sounds_good !== "I have a question") answers.question = "";
  const data = {
    name: val("name"),
    email: val("email").toLowerCase(),
    instagram: val("instagram"),
    facebook: val("facebook"),
    answers,
    lang: he() ? "he" : "en",   // the language they apply in: their emails and terms come in it
  };
  msg.className = "msg err";
  if (!data.name) { f.name.focus(); msg.textContent = T("Please enter your name.", "נא למלא שם."); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) { f.email.focus(); msg.textContent = T("Please enter a valid email.", "נא למלא מייל תקין."); return; }
  if (!data.instagram.replace(/^@+/, "")) { f.instagram.focus(); msg.textContent = T("Please enter your Instagram handle.", "נא למלא את שם המשתמש באינסטגרם."); return; }
  const missing = REQUIRED.find((n) => !answers[n]) || (answers.sounds_good === "I have a question" && !answers.question ? "question" : null);
  if (missing) {
    const el = form.querySelector(`[name="${missing}"]`);
    el?.closest(".field")?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el && el.type !== "radio" && el.type !== "checkbox") el.focus({ preventScroll: true });
    msg.textContent = T("Please answer every question.", "נא לענות על כל השאלות.");
    return;
  }

  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  msg.className = "msg"; msg.textContent = T("Sending your application…", "שולחים את הבקשה…");
  try {
    await betaApply(data);   // the same answer whether or not this email already applied (nothing to look up here)
    document.getElementById("step-details").hidden = true;
    document.getElementById("join-done").hidden = false;
    msg.textContent = "";
  } catch (err) {
    msg.className = "msg err";
    msg.textContent = err.status === 429 ? T("Too many requests. Please wait a minute and try again.", "יותר מדי בקשות. המתינו דקה ונסו שוב.") : err.message;
    if (err.status === 409) setTimeout(showFull, 2500);   // filled up while they were filling in the form
  } finally {
    btn.disabled = false;
  }
});
