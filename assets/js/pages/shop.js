// Shop: every live product, with category chips. The chosen category lives in the URL (?cat=plugin),
// so a filtered view can be shared. A short list: no search box or sort menu, featured first.
import { initChrome, productCardHTML, skeletonCards } from "../lib/ui.js";
import { listProducts, esc } from "../lib/api.js";
import { CATEGORIES, categoryOf } from "../lib/catalog.js";

initChrome();

const grid = document.getElementById("shop-grid");
const chips = document.getElementById("shop-cats");
const title = document.getElementById("shop-title");

const params = new URLSearchParams(location.search);
const state = { cat: CATEGORIES[params.get("cat")] ? params.get("cat") : "all" };

let all = [];

function syncUrl() {
  const p = new URLSearchParams();
  if (state.cat !== "all") p.set("cat", state.cat);
  history.replaceState(null, "", `${location.pathname}${p.toString() ? "?" + p : ""}`);
}

function renderChips() {
  const present = new Set(all.map(categoryOf));
  const keys = ["all", ...Object.keys(CATEGORIES).filter((k) => present.has(k))];
  chips.closest(".shop-toolbar").hidden = keys.length < 3;   // one kind of product (or none yet): nothing to filter
  chips.innerHTML = keys.map((k) => `
    <button type="button" class="chip" data-cat="${k}" aria-pressed="${state.cat === k}">
      ${k === "all" ? "All products" : esc(CATEGORIES[k].label)}
    </button>`).join("");
}

function render() {
  const list = all.filter((p) => state.cat === "all" || categoryOf(p) === state.cat)
    .sort((a, b) => (b.is_featured - a.is_featured) || (a.sort_order - b.sort_order));
  title.textContent = state.cat === "all" ? "All products" : CATEGORIES[state.cat].label;
  grid.innerHTML = list.length
    ? list.map(productCardHTML).join("")
    : `<div class="empty">${all.length
        ? `Nothing here yet. <button type="button" class="link" data-reset style="background:none;border:0;padding:0">Show all products</button>`
        : "The first products are being prepared. Check back soon."}</div>`;
  chips.querySelectorAll("[data-cat]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === state.cat)));
  syncUrl();
}

chips.addEventListener("click", (e) => {
  const b = e.target.closest("[data-cat]");
  if (!b) return;
  state.cat = b.dataset.cat;
  render();
});
grid.addEventListener("click", (e) => {
  if (!e.target.closest("[data-reset]")) return;
  state.cat = "all";
  render();
});

async function load() {
  grid.innerHTML = skeletonCards(6);
  try {
    all = await listProducts();
    renderChips();
    render();
  } catch (err) {
    grid.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
  }
}

load();
