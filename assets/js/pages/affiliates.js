// The MWP Affiliate Program's invitation page (/affiliates/?invite=<token>; tools/build_affiliates.py).
// Shows the person's code and start date, and joins them with one click (supabase/functions/affiliate → accept).
import { affiliateAccept, affiliateInviteInfo } from "../lib/api.js";

const params = new URLSearchParams(location.search);
const token = (params.get("invite") || "").trim();
const he = () => document.documentElement.lang === "he";
const all = (sel) => document.querySelectorAll(sel);
const show = (step) => all("[data-step]").forEach((el) => { el.hidden = el.dataset.step !== step; });
const dateText = (iso, lang) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
let info = null;

function setLang(lang) {
  const d = document.documentElement;
  d.lang = lang; d.dir = lang === "he" ? "rtl" : "ltr";
  try { localStorage.setItem("mwp_lang", lang); } catch { /* blocked */ }
  fill();
}
document.querySelector("[data-lang-switch]")?.addEventListener("click", () => setLang(he() ? "en" : "he"));

function fill() {
  if (!info) return;
  const first = String(info.name || "").split(/\s+/)[0];
  all("[data-name]").forEach((el) => { el.textContent = first; });
  all("[data-code]").forEach((el) => { el.textContent = info.code; });
  all("[data-start]").forEach((el) => { el.textContent = dateText(info.starts_on, he() ? "he" : "en"); });
  all("[data-email]").forEach((el) => { el.textContent = info.email; });
  all("[data-you]").forEach((el) => { el.hidden = false; });
  const q = new URLSearchParams({ mode: "signup", from: "affiliate", email: info.email, name: info.name });
  all("[data-signup]").forEach((a) => { a.href = `/account/?${q}`; });
}

async function start() {
  if (!/^[a-f0-9]{64}$/.test(token)) { show("bad"); return; }
  try {
    info = await affiliateInviteInfo(token);
  } catch (err) {
    all("[data-bad]").forEach((el) => { el.textContent = err.message; });
    show("bad");
    return;
  }
  // the invitation's language, unless they already chose one here
  let chosen = null;
  try { chosen = params.get("lang") || localStorage.getItem("mwp_lang"); } catch { /* blocked */ }
  if (!chosen && info.lang === "he") setLang("he"); else fill();
  show(info.accepted ? "done" : "form");
}

all("[data-accept]").forEach((btn) => btn.addEventListener("click", async () => {
  const box = btn.closest("[data-step]");
  const msg = box.querySelector("[data-msg]");
  msg.textContent = "";
  if (!box.querySelector("[data-agree]").checked) {
    msg.textContent = he() ? "סמנו שקראתם ואתם מסכימים לתוכנית." : "Please tick the box to accept the program.";
    return;
  }
  btn.disabled = true;
  try {
    await affiliateAccept(token, he() ? "he" : "en");
    info.accepted = true;
    show("done");
    document.getElementById("join")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    msg.textContent = err.message;
    btn.disabled = false;
  }
}));

start();
