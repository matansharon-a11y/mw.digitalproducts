// Thank-you page: the checkout redirects here. Passes the buyer's email on to My downloads.
import { initChrome } from "../lib/ui.js";
import { EMAIL_RE } from "./shared-forms.js";

initChrome();

// My downloads waits a few minutes for this order if it hasn't arrived yet (account.js justBought), but only when
// the visitor really comes from checkout: the checkout page sent them here, or this tab went to checkout (cart.js)
// in the last two hours. A visit from a bookmark or a search result shouldn't make My downloads wait.
try {
  const from = document.referrer ? new URL(document.referrer).hostname : "";
  const fromCheckout = /(^|\.)lemonsqueezy\.com$/.test(from) || from === "checkout.mw.photography";
  const wentToCheckout = Date.now() - Number(sessionStorage.getItem("mwp_checkout_at") || 0) < 2 * 3600 * 1000;
  if (fromCheckout || wentToCheckout) sessionStorage.setItem("mwp_just_bought", String(Date.now()));
} catch { /* blocked */ }

const email = new URLSearchParams(location.search).get("email");
const link = document.getElementById("to-downloads");
if (email && EMAIL_RE.test(email)) {
  link.href = `/account/?email=${encodeURIComponent(email)}`;
  document.getElementById("sent-to").textContent = email;
  document.getElementById("sent-to-wrap").hidden = false;
}
