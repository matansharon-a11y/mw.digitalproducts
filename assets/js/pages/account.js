// My downloads: magic-link sign-in, then the customer's library with secure download buttons.
import { initChrome, toast } from "../lib/ui.js";
import { supabase, currentUser, sendMagicLink, signOut, signInWithPassword, signUpWithPassword, sendPasswordReset, updatePassword, myProfile, saveMyProfile, myLibrary, myExtras, requestDownload, signedTerms, sendFeedback, panelDevices, removePanelDevice, mediaUrl, esc, shortDate } from "../lib/api.js";
import { EMAIL_RE, setBusy, setStatus } from "./shared-forms.js";
import { countLabel } from "../lib/catalog.js";

initChrome();

const signedOut = document.getElementById("signed-out");
const signedIn = document.getElementById("signed-in");
const library = document.getElementById("library");
const who = document.getElementById("who");

// Cover photos for the MWP products (used when a product has no cover uploaded in the admin).
// Each with its focus point, so the crop always keeps the animal's head and body in frame.
const COVERS = {
  "mwp-presets": ["assets/pages/img/c88e041b857fb964607aaec43ad1753d.jpg", "45% 6%"],   // eagle: head and chest
  "mwp-lightroom-plugin": ["assets/pages/img/86b95f1970bb30f72735d73708d9c095.jpg", "60% 45%"],   // photographer behind a long lens
  "mwp-panel": ["assets/pages/img/8f730b9bb76b93ca707cae719a309479.jpg", "50% 40%"],     // tiger: face and stride
  "mwp-field-guides": ["assets/pages/img/0cf44582c4078749d18156eec10c90d3.jpg", "62% 30%"], // lioness: face
};
const TAGS = { preset: "Lightroom presets", plugin: "Photoshop plugin panel", guide: "PDF field guides", bundle: "Bundle" };
const SLUG_TAGS = { "mwp-lightroom-plugin": "Lightroom Classic plugin" };   // a plugin that isn't the Photoshop panel
// A product with extra downloads (product_extra_files) shows one button per app: the main zip gets this label.
const MAIN_LABEL = { "mwp-presets": "Presets" };   // beside it: "Lightroom Classic plugin"
const PLAY_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
const APPS = { lightroom: "Lightroom", "lightroom-classic": "Lightroom Classic", photoshop: "Photoshop", other: "" };
const DL_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';

// The Field Guides language the buyer chose ('both': bought before the choice existed)
const LANGS = { en: "English", he: "Hebrew" };
const READ_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/></svg>';

// One card per product. The same product can be on an account more than once (bought, a bundle, the
// Ambassador Program, testing); the card shows the best of them: downloadable before read-only, a chosen
// guide language before none, and the earliest date.
function onePerProduct(items) {
  const rank = (i) => (i.view_only ? 0 : 2) + (i.guide_lang ? 1 : 0);
  const best = new Map();
  for (const i of items) {
    const k = i.products.slug, cur = best.get(k);
    if (!cur || rank(i) > rank(cur) || (rank(i) === rank(cur) && i.granted_at < cur.granted_at)) best.set(k, i);
  }
  return items.filter((i) => best.get(i.products.slug) === i)
    .sort((a, b) => place(a.products.slug) - place(b.products.slug));
}

// Always in this order (Matan, 24 Oct 2026): the Lightroom Classic plugin, MWP Photoshop Plugin Panel, MWP Presets,
// the Field Guides. Anything else after them, newest first (the order myLibrary() returns).
const PRODUCT_ORDER = ["mwp-lightroom-plugin", "mwp-panel", "mwp-presets", "mwp-field-guides"];
const place = (slug) => (PRODUCT_ORDER.includes(slug) ? PRODUCT_ORDER.indexOf(slug) : PRODUCT_ORDER.length);

// The video tutorials of one product: unlisted YouTube links, opened in a new tab.
function tutorialsHTML(videos) {
  if (!videos.length) return "";
  const heb = document.documentElement.lang === "he";
  const links = videos.map((v) => {
    const app = APPS[v.app] ? `<b>${esc(APPS[v.app])}</b>` : "";
    const title = heb && v.title_he ? v.title_he : v.title;
    return `<a class="tut" href="${esc(v.url)}" target="_blank" rel="noopener">${PLAY_ICON}${app}<span data-no-i18n>${esc(title)}</span></a>`;
  }).join("");
  return `<div class="tuts"><p class="tuts-h">Video tutorials</p><div class="tut-list">${links}</div></div>`;
}

function libraryHTML(items, extras = { files: [], videos: [] }) {
  // a product that can't be shown is skipped, not fatal; a bundle shows as the products in it (its own row has no file)
  items = onePerProduct(items.filter((i) => i.products && i.products.category !== "bundle"));
  if (!items.length) {
    return `<div class="glass lib-empty stack">
      <p>Nothing on this email yet.</p>
      <p class="meta">Bought with a different email? Sign out and use that one, or <a class="link" href="/support/">contact support</a> with your order number.</p>
    </div>`;
  }
  return items.map(({ granted_at, view_only: viewOnly, guide_lang: lang, products: p }, i) => {
    const [img, pos] = p.cover_path ? [mediaUrl(p.cover_path, { width: 600 }), "50% 40%"] : (COVERS[p.slug] || []);
    const count = countLabel(p);
    const files = extras.files.filter((x) => x.slug === p.slug);
    const videos = viewOnly ? [] : extras.videos.filter((v) => v.products?.slug === p.slug);
    const tag = SLUG_TAGS[p.slug] || TAGS[p.category];
    return `
    <article class="lib" style="--i:${i}">
      <div class="ph">${img ? `<img src="${esc(img)}" alt="" loading="lazy" style="object-position:${pos}">` : ""}</div>
      <div>
        <p class="tg">${esc(tag || "")}</p>
        <h3 class="nm" data-no-i18n>${esc(p.name)}${p.name_emphasis ? ` <span class="grad">${esc(p.name_emphasis)}</span>` : ""}</h3>
        <div class="chips"><span>Version ${esc(p.version)}</span>${count ? `<span>${esc(count)}</span>` : ""}<span>Added ${shortDate(granted_at)}</span>${LANGS[lang] ? `<span>${LANGS[lang]}</span>` : ""}</div>
      </div>
      ${viewOnly
        ? `<a class="dl" href="/read/">${READ_ICON}<span>Read online</span></a>`
        : p.category === "guide" && !lang
        ? `<div class="lang-pick"><p class="meta">Choose your language. Your copy comes in that language.</p>
            <div class="lang-btns"><button class="dl" type="button" data-download="${esc(p.slug)}" data-guide-lang="en">${DL_ICON}<span>English</span></button>
            <button class="dl" type="button" data-download="${esc(p.slug)}" data-guide-lang="he">${DL_ICON}<span>Hebrew</span></button></div></div>`
        : files.length
        ? `<div class="dl-stack"><button class="dl" type="button" data-download="${esc(p.slug)}">${DL_ICON}<span>${esc(MAIN_LABEL[p.slug] || "Download")}</span></button>
            ${files.map((x) => `<button class="dl" type="button" data-download="${esc(p.slug)}" data-file="${esc(x.file_key)}">${DL_ICON}<span>${esc(x.label)}</span></button>`).join("")}</div>`
        : `<button class="dl" type="button" data-download="${esc(p.slug)}">${DL_ICON}<span>Download</span></button>`}
      ${tutorialsHTML(videos)}
    </article>`;
  }).join("");
}

// MWP Panel works only for the buyer: each computer they sign in on is listed here, and they can
// free one up when they change computers.
const PANEL_SLUGS = ["mwp-panel", "presets-panel", "field-guides-panel", "full-set"];

function devicesHTML({ devices, max }) {
  const rows = devices.map((d) => `
    <li class="device">
      <div><strong>${esc(d.device_name || "Computer")}</strong>
      <p class="meta">Last used ${shortDate(d.last_seen_at)}</p></div>
      <button class="btn btn--ghost btn--sm" type="button" data-remove-device="${esc(d.device_id)}">Remove</button>
    </li>`).join("");
  return `<section class="devices stack" aria-labelledby="devices-h">
    <h2 class="h3" id="devices-h">MWP Photoshop Plugin Panel on your computers</h2>
    <p class="meta">Your licence is personal: Panel works when you sign in to it with this email. You can use it on up to ${max} computers at a time. Changed computer? Remove the old one here.</p>
    ${devices.length ? `<ul class="device-list">${rows}</ul>` : `<p class="meta">No computers yet. Open MWP Photoshop Plugin Panel in Photoshop and sign in with this email.</p>`}
  </section>`;
}

async function showDevices() {
  const box = document.getElementById("devices");
  if (!box) return;
  try { box.innerHTML = devicesHTML(await panelDevices()); box.hidden = false; }
  catch { box.hidden = true; }
}

// thank-you.js notes the time of a checkout; My downloads waits for that order for a few minutes after it
function justBought() {
  try { return Date.now() - Number(sessionStorage.getItem("mwp_just_bought") || 0) < 15 * 60 * 1000; } catch { return false; }
}

// What they own leaves the saved cart, so nobody pays twice for the same thing (cart.js keeps it in mwp_cart)
function forgetOwned(items) {
  const own = new Set(items.filter((i) => !i.view_only && !i.revoked_at).map((i) => i.products?.slug).filter(Boolean));
  try {
    const cart = JSON.parse(localStorage.getItem("mwp_cart") || "[]");
    const left = Array.isArray(cart) ? cart.filter((i) => !own.has(i.slug)) : [];
    if (Array.isArray(cart) && left.length !== cart.length) {
      localStorage.setItem("mwp_cart", JSON.stringify(left));
      window.dispatchEvent(new Event("mwp-cart-changed"));
    }
  } catch { /* storage blocked: nothing saved to tidy */ }
}

async function showLibrary(user) {
  signedOut.hidden = true;
  signedIn.hidden = false;
  if (who) who.textContent = user.email;
  library.innerHTML = `<div class="skeleton" style="height:96px"></div>`;
  try {
    let [items, extras] = await Promise.all([myLibrary(), myExtras().catch(() => undefined)]);
    // Just back from checkout and nothing here yet: the payment's confirmation can take a moment to arrive.
    // Wait for it (every 10 seconds, up to 3 minutes) instead of saying there's nothing.
    // Someone who already owns something (a repeat buyer, a tester) waits for what's new: granted after this
    // tab went to checkout (cart.js), not anything at all.
    let since = 0;
    try { since = Number(sessionStorage.getItem("mwp_checkout_at") || 0); } catch { /* blocked */ }
    const owned = () => items.some((i) => i.products && !i.view_only && i.products.category !== "bundle"
      && (!since || Date.parse(i.granted_at) >= since - 60000));
    if (!owned() && justBought()) {
      library.innerHTML = `<div class="glass lib-empty stack"><p>Adding your order…</p><p class="meta">Your payment went through. Your downloads appear here in a moment.</p></div>`;
      for (let n = 0; n < 18 && !owned(); n++) {
        await new Promise((r) => setTimeout(r, 10000));
        [items, extras] = await Promise.all([myLibrary(), myExtras().catch(() => undefined)]);
      }
    }
    library.innerHTML = libraryHTML(items, extras);
    forgetOwned(items);
    if (items.some((i) => PANEL_SLUGS.includes(i.products?.slug))) showDevices();
    showSignedTerms();
    // ambassadors and testers (their Field Guides are read online) can send feedback to the team
    document.getElementById("feedback").hidden = !items.some((i) => i.view_only);
    // ambassadors and testers didn't pay: no "Instant download after payment" bar for them
    if (items.some((i) => i.view_only)) document.querySelector(".announce")?.remove();
  } catch (err) {
    library.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
  }
}

// ---------------------------------------------------------------- Feedback (ambassadors and testers) → monday Shop Feedback
const feedbackForm = document.getElementById("feedback-form");
feedbackForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = feedbackForm.elements;
  const status = feedbackForm.querySelector(".form-status");
  const he = document.documentElement.lang === "he";
  const message = f.message.value.trim();
  if (message.length < 5) { status.textContent = he ? "נא לכתוב כמה מילים." : "Please write a few words."; status.dataset.state = "error"; return; }
  const btn = feedbackForm.querySelector("button[type=submit]");
  btn.disabled = true;
  status.textContent = he ? "שולחים…" : "Sending…"; status.dataset.state = "";
  try {
    await sendFeedback({ kind: f.kind.value, product: f.product.value, message, setup: navigator.userAgent });
    f.message.value = "";
    status.textContent = he ? "תודה! זה אצלנו." : "Thank you! Our team has it."; status.dataset.state = "ok";
  } catch (err) {
    status.textContent = err.message; status.dataset.state = "error";
  } finally { btn.disabled = false; }
});

// ---------------------------------------------------------------- My details
const detailsForm = document.getElementById("details-form");
const DETAIL_KEYS = ["name", "phone", "country"];
let savedProfile = null;   // the address isn't asked for any more; whatever is stored is sent back unchanged

async function showDetails(user) {
  document.getElementById("d-email").value = user.email;
  const status = detailsForm.querySelector(".form-status");
  try {
    const profile = await myProfile();
    savedProfile = profile;
    for (const k of DETAIL_KEYS) detailsForm.elements[k].value = profile?.[k] ?? "";
  } catch (err) {
    setStatus(status, err.message, "error");
  }
  if (location.hash === "#details") document.getElementById("details").scrollIntoView({ block: "start" });
}

detailsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = detailsForm.querySelector(".form-status");
  const values = Object.fromEntries(DETAIL_KEYS.map((k) => [k, detailsForm.elements[k].value.trim()]));
  const nameInput = detailsForm.elements.name;
  if (!values.name) {
    nameInput.setAttribute("aria-invalid", "true");
    setStatus(status, "Please enter your name.", "error");
    nameInput.focus();
    return;
  }
  nameInput.removeAttribute("aria-invalid");
  const btn = detailsForm.querySelector("button[type=submit]");
  setBusy(btn, true, "Saving…");
  try {
    await saveMyProfile({ ...savedProfile, ...values });
    setStatus(status, "Your details are saved.", "ok");
  } catch (err) {
    setStatus(status, err.message, "error");
  } finally {
    setBusy(btn, false);
  }
});

// The account menu links to /account/#details.
window.addEventListener("hashchange", () => {
  if (location.hash === "#details" && !signedIn.hidden) document.getElementById("details").scrollIntoView({ behavior: "smooth", block: "start" });
});

// Ambassadors: their signed copy of the Ambassador Program terms.
async function showSignedTerms() {
  const box = document.getElementById("terms-box");
  if (!box) return;
  try { await signedTerms(); } catch { box.hidden = true; return; }   // 404: not an ambassador
  box.hidden = false;
}
document.getElementById("terms-dl")?.addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  setBusy(btn, true, he() ? "מכינים…" : "Preparing…");
  try {
    const r = await signedTerms();
    if (r.url) location.href = r.url;
    else toast(he() ? "העותק החתום שלכם עוד בהכנה. נסו שוב בעוד כמה דקות." : "Your signed copy is still being made. Please try again in a few minutes.", { timeout: 8000 });
  } catch (err) { toast(err.message, { type: "error", timeout: 7000 }); }
  finally { setBusy(btn, false); }
});

document.addEventListener("click", async (e) => {
  const rm = e.target.closest("[data-remove-device]");
  if (!rm) return;
  setBusy(rm, true, "Removing…");
  try {
    document.getElementById("devices").innerHTML = devicesHTML(await removePanelDevice(rm.dataset.removeDevice));
    toast("Computer removed. You can now sign in to MWP Photoshop Plugin Panel on another one.");
  } catch (err) {
    toast(err.message, { type: "error", timeout: 7000 });
    setBusy(rm, false);
  }
});

// Presets and Field Guides come as a personal copy made for this buyer. The first time, the server
// answers "preparing" while the copy is made; we keep checking and start the download when it's ready.
const POLL_MS = 30000, POLL_FOR_MS = 12 * 60000;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const he = () => document.documentElement.lang === "he";

library.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-download]");
  if (!btn || btn.disabled) return;
  const label = btn.querySelector("span");
  const was = label ? label.textContent : "";
  const busy = (on, text) => {
    btn.disabled = on; btn.setAttribute("aria-busy", String(on));
    if (label) label.textContent = on ? text : was;
  };
  busy(true, he() ? "מכינים…" : "Preparing…");
  try {
    const started = Date.now();
    const lang = btn.dataset.guideLang;   // the Field Guides language, the first time
    const file = btn.dataset.file;        // an extra download (e.g. the Lightroom Classic version)
    let res = await requestDownload(btn.dataset.download, lang, file);
    if (res.preparing) {
      busy(true, he() ? "מכינים את העותק שלכם…" : "Making your copy…");
      toast(res.message, { timeout: 9000 });
      while (res.preparing && Date.now() - started < POLL_FOR_MS) {
        await wait(POLL_MS);
        res = await requestDownload(btn.dataset.download, lang, file);
      }
      if (res.preparing) {
        toast("Your personal copy is still being made. Please come back in a little while and download it from here.", { timeout: 10000 });
        return;
      }
    }
    // A same-tab navigation to a Content-Disposition: attachment URL downloads without leaving the page.
    location.href = res.url;
    toast("Your download has started. The link is valid for 5 minutes.");
    if (lang) setTimeout(() => currentUser().then((u) => u && showLibrary(u)), 1500);   // the card now shows the chosen language
  } catch (err) {
    toast(err.message, { type: "error", timeout: 7000 });
  } finally {
    setTimeout(() => busy(false), 1200);
  }
});

// ---------------------------------------------------------------- sign in, create account, reset password
const params = new URLSearchParams(location.search);
// Where to go after signing in (e.g. back to checkout). Same-site paths only.
const nextRaw = params.get("next");
const next = safeNext(nextRaw);
// Only addresses on this site. Resolving with URL() catches tricks like "/\\evil.com" or "/%09/evil.com",
// which browsers treat as another website.
function safeNext(raw) {
  if (!raw || !raw.startsWith("/")) return null;
  try {
    const u = new URL(raw, location.origin);
    return u.origin === location.origin ? u.pathname + u.search + u.hash : null;
  } catch { return null; }
}
const resetting = params.has("reset");
const T = (en, hb) => (he() ? hb : en);
const MIN_PW = 8;

const views = [...signedOut.querySelectorAll(".auth-view")];
const tabs = signedOut.querySelector(".auth-tabs");
function show(name) {
  views.forEach((v) => { v.hidden = v.dataset.view !== name; });
  tabs.hidden = !["signin", "signup"].includes(name);
  tabs.querySelectorAll("[data-tab]").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
  const first = signedOut.querySelector(`[data-view="${name}"] input`);
  if (first && !first.value) first.focus({ preventScroll: true });
}
function sent(title, text) {
  document.getElementById("sent-h").textContent = title;
  document.getElementById("sent-text").textContent = text;
  show("sent");
}
tabs.addEventListener("click", (e) => { const t = e.target.closest("[data-tab]"); if (t) show(t.dataset.tab); });
signedOut.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (go) { show(go.dataset.go); return; }
  const eye = e.target.closest("[data-eye]");
  if (eye) {
    const input = eye.parentElement.querySelector("input");
    const on = input.type === "password";
    input.type = on ? "text" : "password";
    eye.setAttribute("aria-pressed", String(on));
    eye.setAttribute("aria-label", on ? "Hide password" : "Show password");
  }
});

// Fill the same email into every form, so switching views keeps it.
const emails = [...signedOut.querySelectorAll('input[type="email"]')];
emails.forEach((i) => i.addEventListener("input", () => emails.forEach((o) => { if (o !== i) o.value = i.value; })));

function check(form, { pw = false } = {}) {
  const status = form.querySelector(".form-status");
  const email = form.elements.email;
  if (email && !EMAIL_RE.test(email.value.trim())) {
    email.setAttribute("aria-invalid", "true"); email.focus();
    setStatus(status, T("Please enter a valid email.", "נא למלא מייל תקין."), "error");
    return false;
  }
  email?.removeAttribute("aria-invalid");
  if (pw && form.elements.password.value.length < MIN_PW) {
    form.elements.password.focus();
    setStatus(status, T(`Your password needs at least ${MIN_PW} characters.`, `הסיסמה צריכה לפחות ${MIN_PW} תווים.`), "error");
    return false;
  }
  return true;
}
async function run(form, fn) {
  const status = form.querySelector(".form-status");
  const btn = form.querySelector("button[type=submit]");
  setStatus(status, "", "");
  setBusy(btn, true);
  try { await fn(status); }
  catch (err) {
    const msg = /invalid login credentials/i.test(err.message) ? T("That email and password don't match. Try again, or reset your password.", "המייל והסיסמה לא תואמים. נסו שוב, או אפסו את הסיסמה.")
      : /email not confirmed/i.test(err.message) ? T("Please confirm your email first: open the link we sent you.", "נא לאשר קודם את המייל: פתחו את הקישור ששלחנו.")
      : err.status === 429 ? T("Too many requests. Please wait a minute and try again.", "יותר מדי בקשות. המתינו דקה ונסו שוב.")
      : err.message;
    setStatus(status, msg, "error");
  } finally { setBusy(btn, false); }
}
// After an emailed link, come back to the same place (checkout, for example).
const backPath = (extra = "") => `/account/${next ? `?next=${encodeURIComponent(next)}` : ""}${extra}`;

document.getElementById("signin-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  if (!check(f, { pw: true })) return;
  run(f, async () => { await signInWithPassword(f.elements.email.value, f.elements.password.value); });
});

document.getElementById("signup-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  if (!check(f, { pw: true })) return;
  run(f, async () => {
    const email = f.elements.email.value.trim().toLowerCase();
    const r = await signUpWithPassword(email, f.elements.password.value, { name: f.elements.name.value.trim(), redirectPath: backPath() });
    if (r === "confirm") sent(T("Confirm your email", "אשרו את המייל"), T(`We've sent a link to ${email}. Open it to finish creating your account.`, `שלחנו קישור אל ${email}. פתחו אותו כדי לסיים את יצירת החשבון.`));
    else if (r === "exists") {
      show("signin");
      setStatus(document.querySelector("#signin-form .form-status"), T("This email already has an account. Sign in, or reset your password if you don't have one yet.", "למייל הזה כבר יש חשבון. התחברו, או אפסו סיסמה אם עדיין אין לכם."), "ok");
    }
  });
});

const linkForm = document.getElementById("login-form");
linkForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!check(linkForm)) return;
  run(linkForm, async () => {
    const email = linkForm.elements.email.value.trim().toLowerCase();
    await sendMagicLink(email, backPath());
    sent(T("Check your inbox", "בדקו את תיבת הדואר"), T(`We've sent a sign-in link to ${email}. Open it on this device.`, `שלחנו קישור כניסה אל ${email}. פתחו אותו במכשיר הזה.`));
  });
});

document.getElementById("forgot-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  if (!check(f)) return;
  run(f, async () => {
    const email = f.elements.email.value.trim().toLowerCase();
    await sendPasswordReset(email, backPath(next ? "&reset=1" : "?reset=1"));
    sent(T("Check your inbox", "בדקו את תיבת הדואר"), T(`If ${email} has an account, we've sent it a link to choose a new password.`, `אם ל־${email} יש חשבון, שלחנו אליו קישור לבחירת סיסמה חדשה.`));
  });
});

document.getElementById("reset-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  if (!check(f, { pw: true })) return;
  run(f, async () => {
    await updatePassword(f.elements.password.value);
    toast(T("Your new password is saved.", "הסיסמה החדשה נשמרה."));
    history.replaceState(null, "", location.pathname + (next ? `?next=${encodeURIComponent(next)}` : ""));
    recovering = false;
    afterSignIn(await currentUser());
  });
});

document.getElementById("sign-out")?.addEventListener("click", async () => {
  await signOut();
  location.reload();
});

// Prefill from the thank-you page or the delivery email (?email=), and open the right tab.
const preset = params.get("email");
if (preset && EMAIL_RE.test(preset)) emails.forEach((i) => { i.value = preset; });
if (next && /checkout|cart=1/.test(next)) document.getElementById("auth-why").hidden = false;
show(params.get("mode") === "signup" ? "signup" : "signin");

let recovering = resetting;
let shownFor = null;   // the browser repeats SIGNED_IN (e.g. on returning to the tab): don't redraw a page in use
function afterSignIn(user) {
  if (!user) return;
  if (recovering) { signedOut.hidden = false; show("reset"); return; }
  if (next) { location.replace(next); return; }
  if (shownFor === user.id) return;
  shownFor = user.id;
  showLibrary(user);
  showDetails(user);
}

// Emailed links come in three forms, depending on the email template: ?code= (handled by the client itself),
// ?token_hash=&type= and #access_token=&refresh_token= (handled here). Each signs the person in; a recovery link
// then opens "Choose a new password". The codes are taken out of the address bar right away.
if (supabase) {
  const th = params.get("token_hash"), type = params.get("type");
  const h = new URLSearchParams(location.hash.slice(1));
  let used = false;
  if (th && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: th, type });
    used = true;
    if (!error && type === "recovery") recovering = true;
  } else if (h.get("access_token") && h.get("refresh_token")) {
    const { error } = await supabase.auth.setSession({ access_token: h.get("access_token"), refresh_token: h.get("refresh_token") });
    used = true;
    if (!error && h.get("type") === "recovery") recovering = true;
  }
  if (used) history.replaceState(null, "", location.pathname + (recovering ? "?reset=1" : ""));
}

const user = await currentUser();
if (user) afterSignIn(user);
// A reset link that signed no one in (used already, over an hour old, or opened in another browser than the one that
// asked for it): say so and offer a new link, instead of an unexplained sign-in form.
else if (resetting || params.has("error_description") || /error=/.test(location.hash)) {
  show("forgot");
  setStatus(document.querySelector("#forgot-form .form-status"), T(
    "That link didn't work here. A link works once, for an hour, in the browser where you asked for it. Enter your email for a new one.",
    "הקישור לא עבד כאן. קישור עובד פעם אחת, למשך שעה, בדפדפן שבו ביקשתם אותו. הזינו את המייל לקבלת קישור חדש."), "error");
}
document.documentElement.classList.remove("acct-wait");   // the session is known: show the form if it's needed
supabase?.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") { recovering = true; signedOut.hidden = false; show("reset"); return; }
  if (event === "SIGNED_IN" && session?.user) afterSignIn(session.user);
});
