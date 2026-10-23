// Testers page (shop.mw.photography/testers/), shared by link only. People with the tester code (set in the
// admin) join on the spot; testers (at most 10) sign in with a one-time email link and download MWP Presets,
// MWP Panel and the Field Guides.
// Same protection as buyers: get-download gives stamped personal copies on 5-minute links, with a daily limit.
import { initChrome, toast } from "../lib/ui.js";
import { currentUser, signOut, requestDownload, testerJoin, testerMe, esc } from "../lib/api.js";
import { EMAIL_RE, setBusy, setStatus } from "./shared-forms.js";

// a sign-in link sent from the Hebrew page brings them back in Hebrew
try { if (new URLSearchParams(location.search).get("lang") === "he") localStorage.setItem("mwp_lang", "he"); } catch { /* fine */ }
initChrome();

const he = () => document.documentElement.lang === "he";
const T = (en, hb) => (he() ? hb : en);
const $ = (id) => document.getElementById(id);
const COVERS = {
  "mwp-presets": ["assets/pages/img/c88e041b857fb964607aaec43ad1753d.jpg", "45% 6%"],
  "mwp-lightroom-plugin": ["assets/pages/img/86b95f1970bb30f72735d73708d9c095.jpg", "60% 45%"],   // photographer behind a long lens
  "mwp-panel": ["assets/pages/img/8f730b9bb76b93ca707cae719a309479.jpg", "50% 40%"],
  "mwp-field-guides": ["assets/pages/img/0cf44582c4078749d18156eec10c90d3.jpg", "62% 30%"],
};
const TAGS = { preset: "Lightroom presets", plugin: "Photoshop plugin", guide: "PDF field guides" };
const DL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';

function show(id) { ["t-out", "t-no", "t-in"].forEach((x) => { $(x).hidden = x !== id; }); }

async function start() {
  const user = await currentUser().catch(() => null);
  if (!user) { show("t-out"); return; }
  let me;
  try { me = await testerMe(); } catch (err) { show("t-out"); toast(err.message, { type: "error" }); return; }
  if (!me.tester) { show("t-no"); return; }
  // Testers use My downloads exactly like ambassadors: Presets and Panel to download, Field Guides to read online.
  location.replace("/account/");
}

// the sign-in link
$("t-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const email = form.elements.email.value.trim().toLowerCase();
  const name = form.elements.name.value.trim();
  const code = form.elements.code.value.trim();
  const status = form.querySelector(".form-status");
  if (!EMAIL_RE.test(email)) { setStatus(status, T("Please enter a valid email.", "נא למלא מייל תקין."), "error"); return; }
  if (!name) { setStatus(status, T("Please enter your name.", "נא למלא שם."), "error"); return; }
  if (!code) { setStatus(status, T("Please enter your tester code.", "נא למלא את קוד הבודקים."), "error"); return; }
  const btn = form.querySelector("button[type=submit]");
  setBusy(btn, true, T("Checking…", "בודקים…"));
  setStatus(status, T("Checking your code…", "בודקים את הקוד…"), "");
  try {
    const lang = he() ? "he" : "en";
    // the code makes them a tester; the emailed link proves the email is theirs and signs them in
    const r = await testerJoin({ name, email, code, lang });
    if (!r.emailed) throw new Error(T("Something went wrong. Please try again.", "משהו השתבש. נסו שוב."));
    $("t-sent-text").textContent = T("You're in. We've emailed you a sign-in link: open it on this device to get your downloads.",
      "נכנסתם. שלחנו לכם במייל קישור כניסה: פתחו אותו במכשיר הזה כדי להגיע להורדות.");
    form.hidden = true; $("t-sent").hidden = false;
  } catch (err) {
    setStatus(status, err.message, "error");
  } finally { setBusy(btn, false); }
});

document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-signout]")) { await signOut(); location.reload(); }
});

// downloads: the stamped copy is made when they're approved; if it's still being made, wait and start it
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
$("t-lib").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-download]");
  if (!btn || btn.disabled) return;
  const label = btn.querySelector("span"); const was = label.textContent;
  const busy = (on, text) => { btn.disabled = on; label.textContent = on ? text : was; };
  busy(true, T("Preparing…", "מכינים…"));
  try {
    const started = Date.now();
    let res = await requestDownload(btn.dataset.download);
    while (res.preparing && Date.now() - started < 12 * 60000) {
      busy(true, T("Making your copy…", "מכינים את העותק שלכם…"));
      await wait(15000);
      res = await requestDownload(btn.dataset.download);
    }
    if (res.preparing) { toast(T("Your copy is still being made. Please try again in a few minutes.", "העותק שלכם עוד בהכנה. נסו שוב בעוד כמה דקות.")); return; }
    location.href = res.url;
    toast(T("Your download has started.", "ההורדה התחילה."));
  } catch (err) {
    toast(err.message, { type: "error", timeout: 7000 });
  } finally { setTimeout(() => busy(false), 1200); }
});

start();
