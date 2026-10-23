// Product page: breadcrumbs, gallery with before/after pairs, buy box, structured data for search engines.
import { initChrome, initBeforeAfter, beforeAfterHTML, titleHTML, loadCheckout, checkoutHref, toast, productArtHTML, priceHTML } from "../lib/ui.js";
import { getProduct, splitMedia, mediaUrl, esc, currentUser } from "../lib/api.js";
import { CATEGORIES, ICONS, categoryOf, countLabel } from "../lib/catalog.js";
import { CONFIG } from "../config.js";
import { addToCart } from "../lib/cart.js";

initChrome();

// the page keeps a main heading when there's no product to show (unavailable, or an error)
const H1 = `<h1 class="visually-hidden">Product details</h1>`;
const root = document.getElementById("product-root");
const slug = new URLSearchParams(location.search).get("p");

function paragraphs(text = "") {
  return text.split(/\n{2,}/).map((t) => t.trim()).filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join("");
}

function setMeta(p, image) {
  const title = `${p.name}${p.name_emphasis ? " " + p.name_emphasis : ""} · MWP`;
  document.title = title;
  const desc = p.tagline || (p.description || "").slice(0, 155);
  const set = (sel, attr, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); };
  set('meta[name="description"]', "content", desc);
  set('meta[property="og:title"]', "content", title);
  set('meta[property="og:description"]', "content", desc);
  if (image) set('meta[property="og:image"]', "content", image);
  set('link[rel="canonical"]', "href", `${CONFIG.SITE_URL}/product/?p=${encodeURIComponent(p.slug)}`);

  const ld = document.createElement("script");
  ld.type = "application/ld+json";
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${p.name}${p.name_emphasis ? " " + p.name_emphasis : ""}`,
    description: desc,
    image: image ? [image] : undefined,
    brand: { "@type": "Brand", name: "MWP" },
    offers: {
      "@type": "Offer",
      price: (p.price_cents / 100).toFixed(2),
      priceCurrency: p.currency,
      availability: "https://schema.org/InStock",
      url: `${CONFIG.SITE_URL}/product/?p=${encodeURIComponent(p.slug)}`,
    },
  });
  document.head.append(ld);
}

function buildSlides(pairs, gallery) {
  return [
    ...pairs.map((pair) => ({ type: "pair", pair, thumb: pair.after })),
    ...gallery.map((image) => ({ type: "image", image, thumb: image })),
  ];
}

function slideHTML(s, eager = false) {
  if (s.type === "pair") return beforeAfterHTML(s.pair, { eager });
  return `<figure class="stack">
      <img src="${esc(mediaUrl(s.image.path, { width: 1600 }))}" alt="${esc(s.image.alt)}" style="border-radius:var(--r-md)">
      ${s.image.caption ? `<figcaption class="caption">${esc(s.image.caption)}</figcaption>` : ""}
    </figure>`;
}

function galleryHTML(slides, p) {
  if (!slides.length) {
    const cover = mediaUrl(p.cover_path, { width: 1600 });
    return cover
      ? `<img src="${esc(cover)}" alt="" style="border-radius:var(--r-md)">`
      : `<div class="product-gallery">${productArtHTML(p)}</div>`;
  }
  const thumbs = slides.length > 1
    ? `<div class="product-gallery__thumbs" role="group" aria-label="Choose an example">
        ${slides.map((s, i) => `<button type="button" data-slide="${i}" aria-pressed="${i === 0}" aria-label="Example ${i + 1}">
          <img src="${esc(mediaUrl(s.thumb.path, { width: 240 }))}" alt="" loading="lazy"></button>`).join("")}
      </div>` : "";
  return `<div class="product-gallery" data-gallery>
      <div data-stage>${slideHTML(slides[0], true)}</div>
      ${thumbs}
    </div>`;
}

function bindGallery(slides) {
  const el = root.querySelector("[data-gallery]");
  if (!el) return;
  const stage = el.querySelector("[data-stage]");
  el.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-slide]");
    if (!btn) return;
    stage.innerHTML = slideHTML(slides[Number(btn.dataset.slide)], true);
    el.querySelectorAll("[data-slide]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    initBeforeAfter(stage);
  });
  initBeforeAfter(el);
}

async function load() {
  if (!slug) { location.replace("/shop/"); return; }
  // The four MWP products have their own pages; bundles are on the shop page.
  const HOME = { "mwp-presets": "/presets/", "mwp-lightroom-plugin": "/lightroom-classic/", "mwp-panel": "/panel/", "mwp-field-guides": "/field-guides/",
    "presets-field-guides": "/shop/#bundles", "presets-panel": "/shop/#bundles", "field-guides-panel": "/shop/#bundles", "full-set": "/shop/#bundles" };
  if (HOME[slug]) { location.replace(HOME[slug]); return; }
  try {
    const p = await getProduct(slug);
    if (!p) {
      root.innerHTML = `${H1}<div class="empty">This product isn't available. <a class="link" href="/shop/">See all products</a></div>`;
      return;
    }
    const { pairs, gallery } = splitMedia(p.product_media);
    const slides = buildSlides(pairs, gallery);
    setMeta(p, mediaUrl(p.cover_path, { width: 1200 }));
    const user = await currentUser();
    const cat = categoryOf(p);
    const crumbs = document.getElementById("crumbs");
    if (crumbs) {
      crumbs.innerHTML = `<a href="/shop/">Shop</a><span aria-hidden="true">/</span>
        <a href="/shop/?cat=${cat}">${esc(CATEGORIES[cat].label)}</a><span aria-hidden="true">/</span>
        <span aria-current="page">${esc(p.name)}${p.name_emphasis ? " " + esc(p.name_emphasis) : ""}</span>`;
    }

    root.innerHTML = `
      <div class="product-layout">
        ${galleryHTML(slides, p)}
        <aside class="buy-box">
          <div class="stack">
            <div class="row"><span class="product-card__cat">${esc(CATEGORIES[cat].one)}</span>${p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ""}</div>
            <h1 class="h2">${titleHTML(p)}</h1>
            ${p.tagline ? `<p class="lead" data-no-i18n>${esc(p.tagline)}</p>` : ""}
          </div>
          <div class="buy-box__price"><span class="price">${priceHTML(p)}</span><span class="meta">${esc(p.currency)}, one-time payment</span></div>
          ${p.checkout_url
            ? `<a class="btn btn--accent btn--block lemonsqueezy-button" id="buy" data-checkout href="${esc(checkoutHref(p.checkout_url, { email: user?.email }))}">Buy now</a>`
            : `<button class="btn btn--block" disabled>Available soon</button>`}
          <button class="btn btn--ghost btn--block" type="button" id="add-to-cart">Add to cart</button>
          <ul class="assure">
            <li>${ICONS.download}Download right after payment</li>
            <li>${ICONS.lock}Secure card checkout by Lemon Squeezy</li>
            <li>${ICONS.refresh}Free updates to this product</li>
          </ul>
          ${p.includes.length ? `<ul class="checklist" data-no-i18n>${p.includes.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}
          <dl class="spec">
            ${countLabel(p) ? `<dt>Contents</dt><dd>${esc(countLabel(p))}</dd>` : ""}
            ${p.compatibility.length ? `<dt>Works with</dt><dd data-no-i18n>${p.compatibility.map(esc).join(", ")}</dd>` : ""}
            <dt>Version</dt><dd>${esc(p.version)}</dd>
            <dt>Licence</dt><dd>Personal and client work (<a class="link" href="/legal/#licence">details</a>)</dd>
          </dl>
        </aside>
      </div>
      ${p.description ? `<section class="section prose" aria-labelledby="about-title"><h2 id="about-title" style="margin-top:0">About this product</h2><div data-no-i18n>${paragraphs(p.description)}</div></section>` : ""}`;

    bindGallery(slides);
    root.querySelector("#add-to-cart").addEventListener("click", () => {
      addToCart({ slug: p.slug, name: `${p.name}${p.name_emphasis ? " " + p.name_emphasis : ""}`, price_cents: p.price_cents, currency: p.currency, checkout_url: p.checkout_url ? checkoutHref(p.checkout_url, { email: user?.email }) : null, image: p.cover_path ? mediaUrl(p.cover_path, { width: 200 }) : null });
    });
    if (p.checkout_url) {
      loadCheckout();
      root.querySelector("#buy").addEventListener("click", () => {
        // Overlay opens via the checkout script; if it failed to load, the link opens the hosted page.
        try { sessionStorage.setItem("last_product", p.slug); } catch { /* optional */ }
      });
    }
  } catch (err) {
    root.innerHTML = `${H1}<div class="empty">${esc(err.message)}</div>`;
    toast(err.message, { type: "error" });
  }
}

load();
