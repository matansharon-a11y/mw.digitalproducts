// Shop: the four products, the comparison and the bundles. The page is static (tools/build_pages.py);
// here the header, the prices set in the admin, the cart and the filter by app.
import { initChrome } from "../lib/ui.js";
import { initPrices } from "../lib/prices.js";

initChrome();
initPrices();

// Filter by app: each card lists its apps in data-apps; "all" shows the four
const cards = Array.from(document.querySelectorAll(".sp-card"));
const none = document.querySelector(".sp-none");
function show(key) {
  let n = 0;
  for (const c of cards) {
    const on = key === "all" || c.dataset.apps.split(" ").includes(key);
    c.hidden = !on;
    if (on) n++;
  }
  if (none) none.hidden = n > 0;
  document.querySelectorAll(".sp-filter [data-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === key)));
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-filter]");
  if (b) show(b.dataset.filter);
});
