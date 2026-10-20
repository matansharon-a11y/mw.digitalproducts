// Support form → support Edge Function → Supabase + monday.com (via Make.com) + auto-reply.
import { initChrome, toast } from "../lib/ui.js";
import { sendSupport, currentUser } from "../lib/api.js";
import { EMAIL_RE, setBusy, setStatus } from "./shared-forms.js";

initChrome();

const form = document.getElementById("support-form");
const status = form.querySelector(".form-status");

const user = await currentUser();
if (user?.email) form.elements.email.value = user.email;
const topic = new URLSearchParams(location.search).get("topic");
if (topic && form.elements.category.querySelector(`option[value="${CSS.escape(topic)}"]`)) form.elements.category.value = topic;
// The topic tiles above the form choose its topic and move on to the subject
const tiles = [...document.querySelectorAll("[data-topic]")];
const markTile = () => tiles.forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.topic === form.elements.category.value)));
tiles.forEach((t) => t.addEventListener("click", () => {
  form.elements.category.value = t.dataset.topic;
  markTile();
  form.elements.subject.focus({ preventScroll: true });
  form.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}));
form.elements.category.addEventListener("change", markTile);
markTile();

function fieldError(name, message) {
  const input = form.elements[name];
  const err = form.querySelector(`[data-error-for="${name}"]`);
  input.setAttribute("aria-invalid", message ? "true" : "false");
  if (err) err.textContent = message || "";
  return !message;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  if (d.website) return; // honeypot

  const ok = [
    fieldError("name", d.name.trim() ? "" : "Please add your name."),
    fieldError("email", EMAIL_RE.test(d.email.trim()) ? "" : "Please enter a valid email."),
    fieldError("subject", d.subject.trim().length >= 3 ? "" : "A few words, please."),
    fieldError("message", d.message.trim().length >= 10 ? "" : "Tell us a little more (10 characters or more)."),
  ].every(Boolean);
  if (!ok) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }

  const btn = form.querySelector("button[type=submit]");
  setBusy(btn, true);
  try {
    await sendSupport({
      name: d.name.trim(), email: d.email.trim().toLowerCase(), category: d.category,
      subject: d.subject.trim(), message: d.message.trim(), order_number: d.order_number.trim(), website: d.website,
    });
    form.reset();
    if (user?.email) form.elements.email.value = user.email;
    setStatus(status, "Thanks, we've got it. You'll hear back within one business day.", "ok");
  } catch (err) {
    setStatus(status, err.message, "error");
    toast(err.message, { type: "error" });
  } finally {
    setBusy(btn, false);
  }
});
