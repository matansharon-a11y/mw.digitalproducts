"""Generates the MWP's static pages with one shared head, header and footer."""
import json, re, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from reviews_section import section as reviews_section
from brand import FONTS, NAV_CSS, SITE_CSS, site_links, menu_button, site_footer, BRAND, ICONS, LANG_GUARD, launch_block, SINGLE_GUIDES_LIVE, NAGISHNA_SRC
ROOT = sys.argv[1]
SITE = "https://shop.mw.photography"

ICON = {
 "download": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
 "lock": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
 "refresh": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/></svg>',
 "chat": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 18l-1 3 4-2h8a4 4 0 0 0 4-4V9a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v6a4 4 0 0 0 1 3z"/></svg>',
 "search": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
 "user": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
}

def head(title, desc, path, extra="", early=""):
    url = f"{SITE}/{path[:-5] + '/' if path.endswith('.html') else path}"
    return f"""<!doctype html>
<html lang="en" dir="ltr" class="no-js">
<head>
  <meta charset="utf-8">{early}
  {LANG_GUARD}
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="theme-color" content="#0A0908">
  <link rel="canonical" href="{url}">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="MWP">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{SITE}/assets/img/share.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  {ICONS}
  <link rel="stylesheet" href="assets/css/tokens.css">
  <link rel="stylesheet" href="assets/css/styles.css">
  <link rel="stylesheet" href="assets/css/reviews.css">
  {SITE_HEAD}{extra}
{FONTS}
</head>"""

# The home page's header on every page: logo, the site's one menu, cart and account icons (added by cart.js),
# language toggle (i18n.js) and a menu button for phones. No announcement bar: the pages say it where it matters.
HEADER = f"""<body>
<a class="skip-link" href="#main">Skip to content</a>
<nav class="nav site-header" aria-label="Main">
<div class="wrap container">
{BRAND}
<div class="links">{site_links()}</div>
<div class="navr"></div>
{menu_button()}
</div>
</nav>"""
NO_ANNOUNCE_HEADER = HEADER
SITE_HEAD = f"""<style id="site-nav">{NAV_CSS}{SITE_CSS}</style>
  <script src="assets/js/lib/nav.js" defer></script>"""


FOOTER = site_footer()

def ver(script):
    """Short fingerprint of a page script, so browsers fetch the new one after every change."""
    import hashlib
    h = hashlib.sha1()
    for f in [os.path.join(ROOT, "assets/js/pages", script)] + sorted(
            os.path.join(ROOT, "assets/js/lib", n) for n in os.listdir(os.path.join(ROOT, "assets/js/lib"))):
        h.update(open(f, "rb").read())
    return h.hexdigest()[:8]

def page(name, title, desc, body, script, extra_head="", announce=True, early=""):
    if name == "index.html":
        return  # the home page is hand-built in the sales-page look (index.html)
    html = f"""{head(title, desc, name if name != 'index.html' else '', extra_head, early)}
{HEADER if announce else NO_ANNOUNCE_HEADER}
<main id="main">
{body}
</main>
{FOOTER}
<script type="module" src="assets/js/pages/{script}?v={ver(script)}"></script>
</body>
</html>
"""
    open(os.path.join(ROOT, name), "w").write(html)
    # The same page at a clean address (shop.mw.photography/account/ …). The .html address keeps working
    # for links already sent. <base href="/"> makes its relative links resolve from the site root.
    if name not in ("index.html", "404.html"):
        folder = os.path.join(ROOT, name[:-5])
        os.makedirs(folder, exist_ok=True)
        clean = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <base href="/">', 1)
        clean = clean.replace('href="#', f'href="/{name[:-5]}/#')   # in-page links stay on this page
        open(os.path.join(folder, "index.html"), "w").write(clean)

SAMPLER_FORM = """<form class="stack" id="sampler-form" data-source="free-sampler" novalidate>
            <label class="visually-hidden" for="sampler-email">Email address</label>
            <div class="inline-form">
              <input class="input" id="sampler-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required>
              <button class="btn" type="submit">Send me the presets</button>
            </div>
            <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
            <label class="check"><input type="checkbox" name="consent" value="1"> Email me the free presets and occasional news. Unsubscribe anytime.</label>
            <p class="form-status" role="status"></p>
          </form>"""

page("index.html",
 "MWP · Presets, guides and tools by Matan Wild",
 "Lightroom presets, a Photoshop plugin and editing guides from wildlife photographer Matan Wild. Instant download, secure checkout.",
 f"""  <section class="hero-shop" aria-labelledby="hero-title">
    <div class="container hero-shop__inner">
      <div>
        <h1 class="display" id="hero-title">Editing tools from the field.</h1>
        <p class="lead">Presets, guides and an editing plugin made by wildlife photographer Matan Wild, for photographers who edit what they shoot outdoors.</p>
      </div>
      <div class="hero-shop__aside">
        <form class="search" id="hero-search" role="search">
          {ICON['search']}
          <label class="visually-hidden" for="hero-q">Search the shop</label>
          <input id="hero-q" name="q" type="search" placeholder="Search presets, guides and more" autocomplete="off">
          <button class="btn btn--sm btn--dark" type="submit">Search</button>
        </form>
        <div class="quick-cats" aria-label="Popular searches">
          <a class="chip" href="/shop/?q=snow">Snow</a>
          <a class="chip" href="/shop/?q=forest">Forest light</a>
          <a class="chip" href="/shop/?q=birds">Birds</a>
          <a class="chip" href="/shop/?q=safari">Safari</a>
          <a class="chip" href="/shop/?q=black%20and%20white">Black and white</a>
        </div>
      </div>
    </div>
  </section>

  <section aria-labelledby="shelf-title">
    <div class="container">
      <h2 class="visually-hidden" id="shelf-title">Shop by category</h2>
      <div class="shelf" id="shelf"></div>
    </div>
  </section>

  <section class="section" aria-labelledby="featured-title">
    <div class="container">
      <div class="section-head">
        <div><h2 class="h2" id="featured-title">New and featured</h2></div>
        <a class="btn btn--ghost btn--sm" href="/shop/">View all products</a>
      </div>
      <div class="grid grid--3" id="featured-grid" aria-live="polite"></div>
    </div>
  </section>

  <section aria-label="Why buy here">
    <div class="container">
      <div class="trust">
        <div class="trust__item">{ICON['download']}<p><b>Instant download</b><span>Your files are ready the moment you pay.</span></p></div>
        <div class="trust__item">{ICON['lock']}<p><b>Secure checkout</b><span>Card payment through Lemon Squeezy. We never see your card.</span></p></div>
        <div class="trust__item">{ICON['refresh']}<p><b>Free updates</b><span>New versions land in your downloads at no cost.</span></p></div>
        <div class="trust__item">{ICON['chat']}<p><b>Real support</b><span>A person replies within one business day.</span></p></div>
      </div>
    </div>
  </section>

  <section class="section" id="how" aria-labelledby="how-title">
    <div class="container">
      <div class="section-head"><div><h2 class="h2" id="how-title">How buying works</h2></div></div>
      <ol class="steps">
        <li class="step"><span class="step__num">1</span><p class="step__title">Choose</p><p class="muted">Pick a product and check what it works with.</p></li>
        <li class="step"><span class="step__num">2</span><p class="step__title">Pay</p><p class="muted">Card checkout opens on this page. A receipt arrives by email.</p></li>
        <li class="step"><span class="step__num">3</span><p class="step__title">Download</p><p class="muted">Sign in with the link we email you and download any time.</p></li>
        <li class="step"><span class="step__num">4</span><p class="step__title">Install</p><p class="muted">Every download includes a short install guide.</p></li>
      </ol>
    </div>
  </section>

  <section id="sampler" aria-labelledby="sampler-title">
    <div class="container">
      <div class="sampler">
        <div class="stack">
          <h2 class="h2" id="sampler-title">Try two presets free</h2>
          <p class="lead">See how they work on your own photos before you buy. They arrive by email in a minute.</p>
        </div>
        {SAMPLER_FORM}
      </div>
    </div>
  </section>

  <section class="section" id="faq" aria-labelledby="faq-title">
    <div class="container container--text">
      <h2 class="h2" id="faq-title" style="margin-bottom:var(--s-5)">FAQs</h2>
      <div class="faq">
        <details><summary>Which programs do the products work with?</summary><div>Every product page lists what it works with under "Works with". Presets work in Lightroom Classic, Lightroom and Photoshop's Camera Raw; the plugin and the guides state their own requirements.</div></details>
        <details><summary>How do I get my files after paying?</summary><div>You get an email straight away. Open <a class="link" href="/account/">My downloads</a>, enter the email you paid with, and click the sign-in link we send. Everything you bought is there.</div></details>
        <details><summary>Can I download again later?</summary><div>Yes. Sign in to My downloads any time, including for future updates to products you own.</div></details>
        <details><summary>Do I need an account?</summary><div>No password to create. Your purchases are tied to your email, and you sign in with a one-time link.</div></details>
        <details><summary>What if something doesn't work for me?</summary><div>Write to <a class="link" href="/support/">support</a> and we'll help. Our <a class="link" href="/legal/#refunds">refund policy</a> has the details.</div></details>
      </div>
    </div>
  </section>""", "home.js")

CHECK_G = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4AF56" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
GO = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
# The bundles (the home page's bundle cards)
BUNDLES = [("Lightroom Plugin + Field Guides", "Shoot it, then edit it", "presets-field-guides", ["The Lightroom Classic plugin", "MWP Presets: 50 presets and 33 LUTs", "MWP Field Guides: 4 PDF guides, 137 lessons"], "Get the bundle", False),
           ("Lightroom Plugin + Photoshop Plugin Panel", "The same look in Lightroom and Photoshop", "presets-panel", ["The Lightroom Classic plugin", "MWP Photoshop Plugin Panel", "MWP Presets: 50 presets and 33 LUTs"], "Get the bundle", False),
           ("Field Guides + Photoshop Plugin Panel", "Learn the shot, then finish it in Photoshop", "field-guides-panel", ["MWP Photoshop Plugin Panel", "MWP Field Guides: 4 PDF guides, 137 lessons"], "Get the bundle", False),
           ("The full set", "From the shot to the share", "full-set", ["The Lightroom Classic plugin", "MWP Photoshop Plugin Panel", "MWP Presets: 50 presets and 33 LUTs", "MWP Field Guides: 4 PDF guides, 137 lessons"], "Get the full set", True)]


def _img(prefix):
    import glob
    return "assets/pages/img/" + os.path.basename(sorted(glob.glob(os.path.join(ROOT, "assets/pages/img", prefix[:8] + "*")))[0])


# The four products (Oct 2026 makeover), always in this order (Matan, 24 Oct 2026): the Lightroom Classic plugin,
# MWP Photoshop Plugin Panel, MWP Presets, MWP Field Guides. The plugin comes with MWP Presets included, and the presets
# are also sold alone (Jeinna, 25 Oct 2026): each column has its own price and Add to cart (with_ would mark a product
# sold only with another). The shop is the comparison table and the bundles; the product cards
# came off on 23 Oct 2026 (Jeinna). The products themselves are presented on their pages.
PRODUCTS = [
    dict(key="plugin", href="presets/#plugin", slug="mwp-lightroom-plugin", type="Plugin · Lightroom Classic 13 or newer", name="Lightroom Classic Plugin",
         line="Sort, keyword, edit and export a whole shoot in one window.",
         works="Lightroom Classic 13+ · Mac and Windows",
         alone="No presets needed.", cta="Add to cart", more="Details"),   # MWP Presets included (Jeinna, 25 Oct 2026)
    dict(key="panel", href="panel/", slug="mwp-panel", type="Photoshop plugin", name="Photoshop Plugin Panel",
         line="Pick the animal, the sky or the background. The panel does the masks.",
         works="Photoshop 2023+ · Mac and Windows",
         cta="Add to cart", more="See the panel"),
    dict(key="presets", href="presets/", slug="mwp-presets", type="Preset pack · Lightroom and Camera Raw", name="Presets",
         line="50 presets from Matan Wild's own edits, for desktop and phone.",
         works="Lightroom · Lightroom Classic · Mobile · Camera Raw",
         alone="No plugin needed.", cta="Add MWP Presets to cart", more="Details"),
    dict(key="guides", href="field-guides/", slug="mwp-field-guides", type="PDF field guides", name="Field Guides",
         line="Know what to aim for before you press the shutter.",
         works="4 PDF guides · English or Hebrew",
         cta="Add to cart", more="See the guides"),
]
# The comparison: one row per question a buyer asks, one column per product (in PRODUCTS' order)
COMPARE = [
    ("What it is", ["A plugin: a window of tools inside Lightroom Classic", "A plugin: a window of tools inside Photoshop", "Presets and LUTs: a finished look in one click", "PDF guides: lessons for the shoot itself"]),
    ("Works in", ["Lightroom Classic 13 or newer", "Photoshop 2023 or newer", "Lightroom, Lightroom Classic, Lightroom Mobile, Camera Raw; LUTs in Photoshop and video editors", "Any PDF reader: computer, tablet or phone"]),
    ("What you get", ["The plugin, with MWP Presets included; built-in help, video tutorials", "The plugin, a 21-page User Manual, an Installation Guide", "50 presets, 50 mobile files, 33 LUTs", "4 guides, 137 lessons, in English or Hebrew"]),
    ("How you buy it", ["On its own, with MWP Presets included, or in a bundle", "On its own, or in a bundle", "On its own, or included with the plugin and in bundles", "All four, one guide at a time, or in a bundle" if SINGLE_GUIDES_LIVE else "On its own, or in a bundle"]),
]


def _compare():
    cols = "".join(f'<th scope="col"><a href="{d["href"]}">{("MWP " + d["name"]) if d["key"] != "plugin" else "Lightroom Plugin + Presets"}</a><span>{d["type"]}</span></th>' for d in PRODUCTS)
    rows = "".join(f'<tr><th scope="row">{q}</th>{"".join(f"<td>{a}</td>" for a in ans)}</tr>' for q, ans in COMPARE)
    def price(d):
        if d.get("with_"):
            return '<td><b class="sp-with">With MWP Presets</b><span>One purchase, one price</span></td>'
        both = '<span>MWP Presets included</span>' if d["slug"] == "mwp-lightroom-plugin" else ""
        if d["slug"] == "mwp-field-guides" and SINGLE_GUIDES_LIVE:   # single guides (Matan, 25 Oct 2026): all four cost the same
            both = '<span>Or one guide: <span data-price="field-guide-planning" data-no-i18n>$0.00</span></span>'

        return f'<td><b><span data-price="{d["slug"]}" data-no-i18n>$0.00</span></b>{both}</td>'
    def buy(d):
        if d.get("with_"):
            return f'<td><a class="sp-more" href="{d["href"]}">Details</a></td>'
        return f'<td><a class="btn sp-buy" href="#buy" data-add-to-cart="{d["slug"]}">Add to cart</a><a class="sp-more" href="{d["href"]}">Details</a></td>'
    prices = ('<tr class="prices"><th scope="row">Price</th>' + "".join(price(d) for d in PRODUCTS) + "</tr>"
              + '<tr class="buy"><td></td>' + "".join(buy(d) for d in PRODUCTS) + "</tr>")
    return (f'<div class="sp-table" tabindex="0" role="region" aria-label="Compare the four products"><table><thead>'
            f'<tr><td></td>{cols}</tr></thead><tbody>{rows}{prices}</tbody></table></div>')


def _itemlist():
    """schema.org ItemList of the four product pages, for search engines."""
    data = {"@context": "https://schema.org", "@type": "ItemList", "itemListElement": [
        {"@type": "ListItem", "position": n + 1, "url": f"https://shop.mw.photography/{d['href']}",
         "name": ("MWP " + d["name"]) if d["key"] != "plugin" else "MWP Lightroom Plugin + Presets"} for n, d in enumerate(PRODUCTS)]}
    return '<script type="application/ld+json">' + json.dumps(data) + "</script>"


def _bundle(name, sub, slug, pts, cta, hi):
    li = "".join(f"<li>{CHECK_G}<span>{x}</span></li>" for x in pts)
    return (f'<div class="bundle{" hi" if hi else ""}">{"<span class=badge>Everything</span>" if hi else ""}<h3>{name}</h3><p class="sub">{sub}</p>'
            f'<div class="amt"><span data-price="{slug}" data-no-i18n>$0.00</span></div>'
            f'<p class="deal"><s><span data-price="{slug}" data-was data-no-i18n></span></s> <span class="save" data-save="{slug}" data-no-i18n hidden></span></p><ul>{li}</ul>'
            f'<a class="btn" href="#buy" data-add-to-cart="{slug}">{cta}</a></div>')


page("shop.html", "Compare Lightroom Presets, Plugins &amp; Guides · MWP Shop",
 "Compare four tools by photographer Matan Wild: a Lightroom Classic plugin, a Photoshop plugin panel, Lightroom presets and PDF photography guides.",
 f"""  <section class="page-hero sp-hero">
    <div class="container">
      <p class="kick">The MWP shop</p>
      <h1 class="display" id="shop-title">Four tools. <span class="grad">Pick yours.</span></h1>
      <p class="lead">The Lightroom plugin comes with the presets included. Save more with a bundle.</p>
    </div>
  </section>
  <section class="section--tight sp-top" id="compare" aria-labelledby="shop-title">
    <div class="container">
      <p class="sp-swipe">Swipe the table to see all four.</p>
      {_compare()}
      <ul class="sp-trust"><li>Instant download</li><li>Secure checkout</li><li>Free updates</li><li>Help or a refund within 14 days</li></ul>
    </div>
  </section>
  {reviews_section(filters=True, cls=dict(sec="section", wrap="container", head="", h2="display sp-h2"))}
  <section class="section" id="bundles" aria-labelledby="bundles-h">
    <div class="container">
      <p class="kick">Bundles</p>
      <h2 class="display sp-h2" id="bundles-h">Buy together. <span class="grad">Pay less.</span></h2>
      <p class="lead">Every bundle with MWP Presets includes the Lightroom Classic plugin.</p>
      {launch_block()}
      <div class="bundles">{"".join(_bundle(*b) for b in BUNDLES)}</div>
    </div>
  </section>
  {_itemlist()}""", "shop.js",
 extra_head='\n  <link rel="alternate" hreflang="en" href="https://shop.mw.photography/shop/"><link rel="alternate" hreflang="he" href="https://shop.mw.photography/shop/he/"><link rel="alternate" hreflang="x-default" href="https://shop.mw.photography/shop/">',
 early='\n  <script>try{if(localStorage.getItem("mwp_lang")==="he")location.replace("/shop/he/"+location.search+location.hash)}catch(e){}</script>')

page("product.html", "Product details · Editing tools from the field · MWP",
 "A digital product by Matan Wild for Lightroom and Photoshop.",
 """  <div class="container"><nav class="crumbs" id="crumbs" aria-label="Breadcrumb"><a href="/shop/">Shop</a></nav></div>
  <section class="section--tight" style="padding-top:var(--s-5)">
    <div class="container" id="product-root" aria-live="polite">
      <h1 class="visually-hidden">Product details</h1>
      <div class="product-layout" aria-hidden="true">
        <div class="skeleton" style="aspect-ratio:3/2"></div>
        <div class="skeleton" style="height:420px"></div>
      </div>
    </div>
  </section>""", "product.js",
 # no product in the address: go to the shop before fonts and styles start loading (a later redirect cancels them)
 early='\n  <script>if(!new URLSearchParams(location.search).get("p"))location.replace("/shop/")</script>')

ACCOUNT_CSS = """
<style id="orders-css">
.orders{display:grid;gap:2px;margin-top:4px}
.order-row{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 0;border-top:1px solid rgba(254,251,241,.08)}
.order-items{margin:0;font-weight:600;color:#FEFBF1}
.order-row .meta{margin:4px 0 0}
.order-sum{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:none}
.order-st{font-size:12px;font-weight:700;letter-spacing:.04em;color:#9CB1C2}
.order-st--paid{color:#8FD18F}
#orders{scroll-margin-top:96px}
</style>
<style id="acct">
.acct-hero{position:relative;overflow:hidden;padding:clamp(80px,9vw,128px) 0 clamp(70px,8vw,110px)}
.acct-hero .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.5;transform:scale(1.05);animation:acbg 2.4s cubic-bezier(.2,.7,.1,1) both}
@keyframes acbg{to{transform:none}}
.acct-hero .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,9,8,.55),rgba(10,9,8,.7) 50%,#0A0908)}
.acct-hero .container{position:relative}
.acct-kick{margin:0;font-size:12px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:#9CB1C2}
.acct-h1{margin:16px 0 0;font-size:clamp(48px,7vw,104px);line-height:.98;font-weight:400;letter-spacing:-.04em}
.grad{background:linear-gradient(90deg,#E4AA7C 0%,#F4AF56 55%,#F8D29C 100%);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:600}
.acct-lead{margin:20px 0 0;max-width:520px;font-size:18px;line-height:1.6;color:#CDD7DD}
.acct{padding-bottom:110px}
.glass{position:relative;border-radius:24px;background:linear-gradient(180deg,rgba(254,251,241,.06),rgba(254,251,241,.015));border:1px solid rgba(254,251,241,.1);box-shadow:0 50px 100px -50px rgba(0,0,0,.9),inset 0 1px 0 rgba(254,251,241,.07)}
.glass::before{content:"";position:absolute;top:0;left:12%;right:12%;height:1px;background:linear-gradient(90deg,transparent,rgba(244,175,86,.55),transparent)}
#signed-out.glass{padding:40px;max-width:560px}
.auth{display:flex;flex-direction:column;gap:22px}
.auth-tabs{display:grid;grid-template-columns:1fr 1fr;padding:5px;border-radius:64px;background:rgba(10,9,8,.5);border:1px solid rgba(254,251,241,.1)}
.auth-tabs button{min-height:44px;border:0;border-radius:64px;background:none;color:#9CB1C2;font:inherit;font-weight:700;font-size:15px;cursor:pointer;transition:background .3s,color .3s}
.auth-tabs button[aria-selected=true]{background:linear-gradient(90deg,#E4AA7C,#F4AF56);color:#0A0908;box-shadow:0 10px 26px -12px rgba(244,175,86,.7)}
.auth-view{display:flex;flex-direction:column;gap:16px;animation:authin .45s cubic-bezier(.16,1,.3,1) both}
@keyframes authin{from{opacity:0;transform:translateY(8px)}}
.auth-view .btn{width:100%}
.pw{position:relative}
.pw .input{padding-inline-end:52px}
.pw-eye{position:absolute;top:50%;inset-inline-end:8px;transform:translateY(-50%);display:grid;place-items:center;width:38px;height:38px;border:0;border-radius:50%;background:none;color:#9CB1C2;cursor:pointer}
.pw-eye:hover,.pw-eye[aria-pressed=true]{color:#F4AF56;background:rgba(254,251,241,.06)}
.auth-row{display:flex;justify-content:flex-end;margin-top:-6px}
.auth-link{align-self:center;border:0;background:none;padding:4px 0;color:#F4AF56;font:inherit;font-size:14px;font-weight:600;cursor:pointer;text-decoration:underline;text-decoration-color:rgba(244,175,86,.4);text-underline-offset:3px}
.auth-link:hover{text-decoration-color:#F4AF56}
.auth-or{display:flex;align-items:center;gap:14px;color:#7E8A93;font-size:13px}
.auth-or::before,.auth-or::after{content:"";flex:1;height:1px;background:rgba(254,251,241,.1)}
.auth-note,.auth-why{margin:0;padding:14px 16px;border-radius:14px;background:rgba(244,175,86,.07);border:1px solid rgba(244,175,86,.25);color:#E9DCC6;font-size:14.5px;line-height:1.55}
.auth-hint{margin:-8px 0 0;font-size:13px;color:#7E8A93}
.auth-sent{align-items:center;text-align:center;padding:10px 0}
.auth-sent .seal{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;color:#F4AF56;background:rgba(244,175,86,.1);box-shadow:inset 0 0 0 1px rgba(244,175,86,.35)}
.btn--ghost.auth-alt{background:rgba(10,9,8,.25);border:1px solid rgba(254,251,241,.32);color:#FEFBF1;box-shadow:none}
.who{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 22px}
.who-l{display:flex;align-items:center;gap:14px;min-width:0}
.avatar{flex:none;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#E4AA7C,#F4AF56);color:#0A0908;font-weight:700;font-size:18px;text-transform:uppercase}
.who p{margin:0;font-size:13px;color:#9CB1C2}.who b{display:block;font-size:16px;color:#FEFBF1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.library{display:flex;flex-direction:column;gap:18px}
.lib{position:relative;display:grid;grid-template-columns:240px minmax(0,1fr) auto;align-items:center;gap:30px;padding:16px 26px 16px 16px;border-radius:24px;background:linear-gradient(180deg,rgba(254,251,241,.05),rgba(254,251,241,.015));border:1px solid rgba(254,251,241,.08);transition:transform .5s cubic-bezier(.2,.8,.2,1),border-color .4s,box-shadow .5s;opacity:0;transform:translateY(20px);animation:libin .9s cubic-bezier(.16,1,.3,1) forwards;animation-delay:calc(var(--i,0) * .1s)}
@keyframes libin{to{opacity:1;transform:none}}
.lib:hover{transform:translateY(-4px);border-color:rgba(244,175,86,.35);box-shadow:0 40px 80px -40px rgba(244,175,86,.25)}
.lib .ph{aspect-ratio:3/2;border-radius:16px;overflow:hidden;background:#1b1916}
.lib .ph img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s cubic-bezier(.2,.7,.1,1)}
.lib:hover .ph img{transform:scale(1.06)}
.lib .tg{margin:0;font-size:11.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#9CB1C2}
.lib .nm{margin:8px 0 0;font-size:clamp(24px,2.4vw,32px);font-weight:400;letter-spacing:-.02em;line-height:1.1}
.acct .container--text,.acct-hero .container--text{max-width:980px}
.lib .chips{display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;gap:8px;margin-top:14px}
.lib .chips span{display:inline-block;width:auto;padding:5px 11px;border-radius:64px;border:1px solid rgba(254,251,241,.12);font-size:12.5px;color:#AEB9C1}
.dl{display:inline-flex;align-items:center;gap:10px;min-height:52px;padding:0 26px;border:0;border-radius:64px;background:linear-gradient(90deg,#E4AA7C,#F4AF56);color:#0A0908;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 14px 34px -12px rgba(244,175,86,.6);transition:transform .25s,box-shadow .25s}
.dl:hover{transform:translateY(-1px);box-shadow:0 18px 44px -12px rgba(244,175,86,.75)}
.dl svg{transition:transform .3s}.dl:hover svg{transform:translateY(2px)}
.lib-empty{padding:48px 32px;text-align:center}
.devices-box{margin-top:26px}
.devices-box .devices{padding:28px 30px;border-radius:24px;background:linear-gradient(180deg,rgba(254,251,241,.05),rgba(254,251,241,.015));border:1px solid rgba(254,251,241,.08)}
.devices-box .h3{font-size:22px;font-weight:500}
.acct-note{margin-top:26px;font-size:13px;color:#7E8A93}
a.dl{text-decoration:none}
.dl-stack{display:grid;gap:10px}.dl-stack .dl{justify-content:flex-start}
.tuts{grid-column:1/-1;margin:2px 0 4px 0;padding:16px 0 0;border-top:1px solid rgba(254,251,241,.08)}
.tuts-h{margin:0 0 10px;font-size:11.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#9CB1C2}
html[lang=he] .tuts-h{letter-spacing:.04em}
.tut-list{display:flex;flex-wrap:wrap;gap:8px}
.lib-more{grid-column:1/-1;margin:0;padding:14px 0 0;border-top:1px solid rgba(254,251,241,.08);display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline}
.tut{display:inline-flex;align-items:center;gap:8px;padding:9px 15px;border-radius:64px;border:1px solid rgba(254,251,241,.14);color:#FEFBF1;font-size:14px;text-decoration:none;transition:border-color .25s,background .25s}
.tut:hover{border-color:rgba(244,175,86,.6);background:rgba(244,175,86,.08)}
.tut svg{color:#F4AF56;flex:none}.tut b{font-weight:700;white-space:nowrap}
.lang-pick{display:grid;gap:10px;justify-items:start;max-width:320px}.lang-pick .meta{margin:0}.lang-btns{display:flex;flex-wrap:wrap;gap:10px}.lang-btns .dl{padding:0 20px}
.details-box{margin-top:26px;padding:28px 30px;border-radius:24px;background:linear-gradient(180deg,rgba(254,251,241,.05),rgba(254,251,241,.015));border:1px solid rgba(254,251,241,.08);scroll-margin-top:96px}
.details-box .h3{margin:0;font-size:22px;font-weight:500}.details-box .meta{margin:6px 0 22px}
.details-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.details-grid .field--full{grid-column:1/-1}
.details-box .input[readonly]{color:#9CB1C2;background:transparent}
#feedback textarea.input{height:auto;min-height:130px;padding:14px 16px;line-height:1.5;resize:vertical}
.details-actions{display:flex;align-items:center;flex-wrap:wrap;gap:12px 18px}
.details-actions .form-status{margin:0}
@media (max-width:820px){.details-box{padding:22px}.details-grid{grid-template-columns:minmax(0,1fr)}}
.terms-box{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:26px;padding:24px 30px;border-radius:24px;background:linear-gradient(180deg,rgba(254,251,241,.05),rgba(254,251,241,.015));border:1px solid rgba(254,251,241,.08)}
.terms-box .h3{margin:0;font-size:22px;font-weight:500}.terms-box .meta{margin:6px 0 0}
@media (max-width:820px){.terms-box{flex-direction:column;align-items:flex-start;padding:22px}}
html[lang=he] .acct-kick,html[lang=he] .lib .tg{letter-spacing:.04em}
@media (max-width:820px){.lang-pick{margin:0 10px;max-width:none}.lang-btns .dl{flex:1;margin:0}}
@media (max-width:820px){.dl-stack{margin:0 10px}.dl-stack .dl{margin:0;justify-content:center}.tuts{margin:0 10px}}
@media (max-width:820px){.lib{grid-template-columns:minmax(0,1fr);gap:18px;padding:14px 14px 22px}.lib .ph{aspect-ratio:16/9}.lib > div:nth-child(2),.lib .dl{margin:0 10px}.dl{justify-content:center}.who{flex-wrap:wrap}#signed-out.glass{padding:28px 22px}}
@media (prefers-reduced-motion:reduce){.lib,.acct-hero .bg{animation:none;opacity:1;transform:none}}
</style>"""

READ_CSS = """
<style id="read">
.rd-hero{padding:clamp(70px,9vw,110px) 0 26px}
.rd-kick{margin:0;font-size:12px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:#9CB1C2}
.rd-h1{margin:14px 0 0;font-size:clamp(40px,6vw,76px);line-height:1;font-weight:400;letter-spacing:-.04em}
.grad{background:linear-gradient(90deg,#E4AA7C 0%,#F4AF56 55%,#F8D29C 100%);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:600}
.rd-lead{margin:16px 0 0;max-width:620px;font-size:17px;line-height:1.6;color:#CDD7DD}
.rd .container{max-width:1000px}
.rd-pages{display:flex;flex-direction:column;gap:18px;padding-bottom:110px;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.rd-page{position:relative;width:100%;border-radius:10px;overflow:hidden;background:#15130f;box-shadow:0 30px 60px -40px rgba(0,0,0,.9)}
.rd-page canvas{display:block;width:100%;height:100%;pointer-events:none}
.rd-page:not(.ok)::after{content:"Loading…";position:absolute;inset:0;display:grid;place-items:center;color:#9CB1C2;font-size:15px;letter-spacing:.02em;background:linear-gradient(100deg,#15130f 30%,#1d1a15 50%,#15130f 70%) 0 0/300% 100%;animation:rdload 1.4s linear infinite}
html[lang=he] .rd-page:not(.ok)::after{content:"טוען…"}
@keyframes rdload{to{background-position:-150% 0}}
.rd-loading{display:flex;align-items:center;gap:12px;justify-content:center}
.rd-loading::before{content:"";width:18px;height:18px;border-radius:50%;border:2px solid rgba(244,175,86,.25);border-top-color:#F4AF56;animation:rdspin .8s linear infinite}
@keyframes rdspin{to{transform:rotate(360deg)}}
.rd-msg{padding:40px 32px;text-align:center;border-radius:24px;background:linear-gradient(180deg,rgba(254,251,241,.05),rgba(254,251,241,.015));border:1px solid rgba(254,251,241,.08);color:#CDD7DD}
.rd-msg .btn{margin-top:18px}
.rd-note{font-size:13px;color:#7E8A93}
.rd-bar{position:sticky;top:64px;z-index:5;display:flex;align-items:center;gap:12px;padding:12px 0 16px;margin-bottom:6px;background:linear-gradient(180deg,#0A0908 78%,rgba(10,9,8,0))}
.rd-pick{position:relative;flex:1 1 auto;min-width:0;max-width:520px}
.rd-pick::after{content:"";position:absolute;top:50%;inset-inline-end:18px;width:8px;height:8px;border-right:2px solid #F4AF56;border-bottom:2px solid #F4AF56;transform:translateY(-70%) rotate(45deg);pointer-events:none}
.rd-pick select{width:100%;min-height:46px;padding:0 44px 0 18px;border-radius:64px;border:1px solid rgba(254,251,241,.16);background:rgba(254,251,241,.04);color:#FEFBF1;font:inherit;font-size:15px;font-weight:600;appearance:none;-webkit-appearance:none;cursor:pointer;text-overflow:ellipsis}
html[dir=rtl] .rd-pick select{padding:0 18px 0 44px}
.rd-pick select{color-scheme:light}.rd-pick select option{background:#fff;color:#15130f}   /* the open list is the system's (light on a Mac): dark text */
.rd-count{margin-inline-start:auto;font-size:14px;font-variant-numeric:tabular-nums;color:#9CB1C2;white-space:nowrap}
.rd-open{display:inline-flex;align-items:center;gap:9px;min-height:46px;white-space:nowrap}
.rd-pages .rd-page{cursor:zoom-in;transition:transform .25s,box-shadow .25s}
.rd-pages .rd-page:hover{transform:translateY(-2px);box-shadow:0 30px 60px -30px rgba(0,0,0,.95),0 0 0 1px rgba(244,175,86,.35)}
.rd-pages .rd-page:focus-visible{outline:2px solid #F4AF56;outline-offset:3px}
.rd-note{margin:-80px 0 110px;text-align:center}
@media (max-width:820px){.rd-bar{top:56px}}
@media (max-width:560px){.rd-bar{flex-wrap:wrap;gap:10px}.rd-pick{flex-basis:100%;max-width:none}.rd-count{margin-inline-start:0}.rd-open{margin-inline-start:auto;min-height:42px;padding-inline:16px}}
/* the full-screen reader: only the page, on black */
html.rx-on,html.rx-on body{overflow:hidden}
.rx{position:fixed;inset:0;z-index:2147483000;background:#050504;color:#FEFBF1;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.rx-stage{position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:default}
.rx.zoomed .rx-stage{cursor:grab}.rx.dragging .rx-stage{cursor:grabbing}
.rx-sheet{position:absolute;transform-origin:0 0;will-change:transform;box-shadow:0 40px 90px -40px rgba(0,0,0,.9)}
.rx-sheet.anim{transition:transform .22s cubic-bezier(.2,.7,.2,1)}
.rx-sheet canvas{display:block;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity .18s}
.rx-sheet canvas.ok{opacity:1}
.rx-wait{position:absolute;top:50%;left:50%;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;border:2px solid rgba(244,175,86,.2);border-top-color:#F4AF56;animation:rdspin .8s linear infinite}
.rx-edge,.rx-dock{transition:opacity .35s,transform .35s}
.rx.idle .rx-edge,.rx.idle .rx-dock{opacity:0;pointer-events:none}
.rx.idle .rx-dock{transform:translate(-50%,12px)}
.rx.idle .rx-stage{cursor:none}.rx.idle.zoomed .rx-stage{cursor:grab}
.rx-edge{position:absolute;top:50%;margin-top:-28px;display:grid;place-items:center;width:56px;height:56px;border:0;border-radius:50%;background:rgba(20,18,16,.6);color:#FEFBF1;cursor:pointer;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.rx-edge:hover:not(:disabled){background:rgba(244,175,86,.9);color:#0A0908}
.rx-edge:disabled{opacity:0!important;pointer-events:none}
.rx-prev{inset-inline-start:18px}.rx-next{inset-inline-end:18px}
.rx[dir=rtl] .rx-edge svg{transform:scaleX(-1)}
.rx-dock{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);display:flex;align-items:center;gap:2px;padding:5px;border-radius:64px;background:rgba(20,18,16,.72);border:1px solid rgba(254,251,241,.08);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 16px 40px -16px rgba(0,0,0,.9)}
.rx-b{display:grid;place-items:center;min-width:40px;height:40px;padding:0 8px;border:0;border-radius:64px;background:none;color:#FEFBF1;font:inherit;font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;cursor:pointer}
.rx-b:hover:not(:disabled){background:rgba(254,251,241,.1)}
.rx-b:disabled{opacity:.3;cursor:default}
.rx-b:focus-visible,.rx-edge:focus-visible{outline:2px solid #F4AF56;outline-offset:2px}
.rx-z{min-width:58px}
.rx-sep{width:1px;height:20px;margin:0 4px;background:rgba(254,251,241,.14)}
.rx-n{padding:0 12px 0 6px;font-size:13px;font-variant-numeric:tabular-nums;color:#CDD7DD;white-space:nowrap}
.rx-progress{position:absolute;left:0;right:0;bottom:0;height:2px;background:rgba(254,251,241,.06)}
.rx-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#E4AA7C,#F4AF56);transition:width .25s}
.rx[dir=rtl] .rx-progress i{margin-inline-start:0;float:right}
.rx-hint{position:absolute;left:50%;top:max(18px,env(safe-area-inset-top));transform:translateX(-50%);margin:0;padding:9px 16px;border-radius:64px;background:rgba(20,18,16,.8);color:#CDD7DD;font-size:13px;white-space:nowrap;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);transition:opacity .5s}
.rx-hint.gone{opacity:0;pointer-events:none}
@media (hover:none){.rx-edge{display:none}}
@media (max-width:560px){.rx-dock{bottom:max(14px,env(safe-area-inset-bottom))}.rx-b{min-width:38px;height:38px}}
@media (prefers-reduced-motion:reduce){.rx-sheet.anim,.rx-sheet canvas,.rx-edge,.rx-dock,.rd-pages .rd-page{transition:none}}
@media print{body{display:none!important}}
</style>"""

page("account.html", "My downloads · MWP",
 "Sign in with your email to download what you've bought.",
 """  <section class="acct-hero">
    <img class="bg" src="assets/pages/img/5275cc7bcd4fb7560d8f7163592e3122.jpg" srcset="assets/pages/img/5275cc7bcd4fb7560d8f7163592e3122-1200.webp 1200w, assets/pages/img/5275cc7bcd4fb7560d8f7163592e3122.jpg 2000w" sizes="100vw" fetchpriority="high" alt="">
    <div class="shade"></div>
    <div class="container container--text">
      <p class="acct-kick">Your library</p>
      <h1 class="acct-h1">My <span class="grad">downloads</span></h1>
      <p class="acct-lead">Everything you own, ready to download. New versions appear here at no cost.</p>
    </div>
  </section>
  <section class="acct">
    <div class="container container--text">
      <div id="signed-out" class="glass auth">
        <p class="auth-why" id="auth-why" hidden>Create your MWP account (or sign in) to check out. Everything you buy lives in your account: download it anytime, and get every future update free.</p>
        <div class="auth-tabs" role="tablist" aria-label="Account">
          <button type="button" role="tab" data-tab="signin" aria-selected="true">Sign in</button>
          <button type="button" role="tab" data-tab="signup" aria-selected="false">Create account</button>
        </div>
        <form class="form auth-view" data-view="signin" id="signin-form" novalidate>
          <div class="field"><label for="si-email">Email</label><input class="input" id="si-email" name="email" type="email" dir="ltr" autocomplete="email" required></div>
          <div class="field"><label for="si-pw">Password</label><div class="pw"><input class="input" id="si-pw" name="password" type="password" autocomplete="current-password" minlength="8" required><button class="pw-eye" type="button" data-eye aria-label="Show password"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div></div>
          <div class="auth-row"><button class="auth-link" type="button" data-go="forgot">Forgot password?</button></div>
          <button class="btn" type="submit">Sign in</button>
          <p class="form-status" role="status"></p>
          <div class="auth-or"><span>or</span></div>
          <button class="btn btn--ghost auth-alt" type="button" data-go="link">Email me a sign-in link</button>
        </form>
        <form class="form auth-view" data-view="signup" id="signup-form" novalidate hidden>
          <p class="auth-note">Your account keeps everything you buy: download it anytime, on any computer, and get every future update free.</p>
          <div class="field"><label for="su-name">Name</label><input class="input" id="su-name" name="name" autocomplete="name"></div>
          <div class="field"><label for="su-email">Email</label><input class="input" id="su-email" name="email" type="email" dir="ltr" autocomplete="email" required></div>
          <div class="field"><label for="su-pw">Password</label><div class="pw"><input class="input" id="su-pw" name="password" type="password" autocomplete="new-password" minlength="8" required><button class="pw-eye" type="button" data-eye aria-label="Show password"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div></div>
          <p class="auth-hint">At least 8 characters.</p>
          <button class="btn" type="submit">Create account</button>
          <p class="form-status" role="status"></p>
        </form>
        <form class="form auth-view" data-view="link" id="login-form" novalidate hidden>
          <h2 class="h3">Email me a sign-in link</h2>
          <p class="muted">We'll send a one-time link to your email. No password needed.</p>
          <div class="field"><label for="login-email">Email</label><input class="input" id="login-email" name="email" type="email" dir="ltr" autocomplete="email" required></div>
          <button class="btn" type="submit">Send the link</button>
          <p class="form-status" role="status"></p>
          <button class="auth-link" type="button" data-go="signin">Back to sign in</button>
        </form>
        <form class="form auth-view" data-view="forgot" id="forgot-form" novalidate hidden>
          <h2 class="h3">Reset your password</h2>
          <p class="muted">We'll email you a link to choose a new password.</p>
          <div class="field"><label for="fp-email">Email</label><input class="input" id="fp-email" name="email" type="email" dir="ltr" autocomplete="email" required></div>
          <button class="btn" type="submit">Email me a reset link</button>
          <p class="form-status" role="status"></p>
          <button class="auth-link" type="button" data-go="signin">Back to sign in</button>
        </form>
        <form class="form auth-view" data-view="reset" id="reset-form" novalidate hidden>
          <h2 class="h3">Choose a new password</h2>
          <div class="field"><label for="rp-pw">New password</label><div class="pw"><input class="input" id="rp-pw" name="password" type="password" autocomplete="new-password" minlength="8" required><button class="pw-eye" type="button" data-eye aria-label="Show password"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div></div>
          <p class="auth-hint">At least 8 characters.</p>
          <button class="btn" type="submit">Save password</button>
          <p class="form-status" role="status"></p>
        </form>
        <div class="auth-view auth-sent" data-view="sent" hidden>
          <span class="seal"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg></span>
          <h2 class="h3" id="sent-h">Check your inbox</h2>
          <p class="muted" id="sent-text"></p>
          <button class="auth-link" type="button" data-go="signin">Back to sign in</button>
        </div>
      </div>
      <div id="signed-in" class="stack-lg" hidden>
        <div class="library" id="library" aria-live="polite"></div>
        <div class="devices-box" id="devices" hidden></div>
        <section class="terms-box" id="terms-box" hidden>
          <div><h2 class="h3">Your Ambassador Program terms</h2>
          <p class="meta">The signed copy of the terms you accepted, as a PDF.</p></div>
          <button class="btn btn--ghost btn--sm" type="button" id="terms-dl">Download PDF</button>
        </section>
        <section class="details-box" id="feedback" aria-labelledby="fb-h" hidden>
          <div><h2 class="h3" id="fb-h">Send us feedback</h2>
          <p class="meta">Found a bug, have an idea, or something to report? It goes straight to our team.</p></div>
          <form class="form" id="feedback-form" novalidate>
            <div class="details-grid">
            <div class="field"><label for="fb-kind">Type</label><select class="input" id="fb-kind" name="kind"><option value="Bug">Bug</option><option value="Recommendation">Recommendation</option><option value="Report">Report</option><option value="Other">Other</option></select></div>
            <div class="field"><label for="fb-product">About</label><select class="input" id="fb-product" name="product"><option value="MWP Presets">MWP Presets</option><option value="MWP Panel">MWP Photoshop Plugin Panel</option><option value="MWP Field Guides">MWP Field Guides</option><option value="General">General</option></select></div>
            <div class="field field--full"><label for="fb-message">Your message</label><textarea class="input" id="fb-message" name="message" rows="5" placeholder="What happened, and what did you expect? Steps to reproduce help a lot."></textarea></div>
            </div>
            <div class="details-actions"><button class="btn" type="submit">Send feedback</button><p class="form-status" role="status"></p></div>
          </form>
        </section>
        <section class="details-box" id="orders" aria-labelledby="orders-h" hidden>
          <div><h2 class="h3" id="orders-h">Order history</h2>
          <p class="meta">Everything you've bought with this account. Your receipts come by email from Lemon Squeezy.</p></div>
          <div class="orders" id="orders-list"></div>
        </section>
        <section class="details-box" id="details" aria-labelledby="details-h">
          <div><h2 class="h3" id="details-h">My details</h2>
          <p class="meta">Used on your receipts and when we help you with an order.</p></div>
          <form class="form" id="details-form" novalidate>
            <div class="field"><label for="d-email">Email</label><input class="input" id="d-email" type="email" dir="ltr" readonly aria-describedby="d-email-hint">
            <p class="auth-hint" id="d-email-hint">Your purchases are tied to this email. To change it, <a class="link" href="/support/">contact support</a>.</p></div>
            <div class="details-grid">
            <div class="field field--full"><label for="d-name">Full name</label><input class="input" id="d-name" name="name" type="text" autocomplete="name"></div>
            <div class="field"><label for="d-phone">Phone (optional)</label><input class="input" id="d-phone" name="phone" type="tel" autocomplete="tel" dir="ltr"></div>
            <div class="field"><label for="d-country">Country</label><input class="input" id="d-country" name="country" type="text" autocomplete="country-name"></div>
            </div>
            <div class="details-actions"><button class="btn" type="submit">Save details</button><p class="form-status" role="status"></p></div>
          </form>
        </section>
        <p class="acct-note">Download links are created when you click and expire after 5 minutes. Trouble? <a class="link" href="/support/?topic=download">Contact support</a>.</p>
      </div>
    </div>
  </section>""", "account.js", extra_head='\n  <meta name="robots" content="noindex">' + ACCOUNT_CSS,
 # Signed in already (a saved session in this browser): keep the sign-in form hidden while the session is
 # checked, so it doesn't flash before the library. account.js removes acct-wait once it knows; 5 s at most.
 early='\n  <script>try{for(var k in localStorage)if(/^sb-.+-auth-token$/.test(k)){document.documentElement.classList.add("acct-wait");'
       'setTimeout(function(){document.documentElement.classList.remove("acct-wait")},5000);break}}catch(e){}</script>'
       '\n  <style>html.acct-wait #signed-out{display:none}</style>')

page("read.html", "Field Guides · Read online · MWP",
 "Read the MWP Field Guides online.",
 """  <section class="rd-hero">
    <div class="container container--text">
      <p class="rd-kick">Read online</p>
      <h1 class="rd-h1"><span data-no-i18n>MWP</span> <span class="grad" data-no-i18n>Field Guides</span></h1>
      <p class="rd-lead">Your guides, page by page. They're for your eyes only.</p>
    </div>
  </section>
  <section class="rd">
    <div class="container">
      <div id="rd-body" aria-live="polite"><div class="skeleton" style="height:420px;border-radius:10px"></div></div>
    </div>
  </section>""", "read.js", extra_head='\n  <meta name="robots" content="noindex">' + READ_CSS, announce=False)

page("testers.html", "Testers · MWP",
 "For approved MWP testers.",
 """  <section class="acct-hero">
    <img class="bg" src="assets/pages/img/5275cc7bcd4fb7560d8f7163592e3122.jpg" alt="">
    <div class="shade"></div>
    <div class="container container--text">
      <p class="acct-kick">Testers</p>
      <h1 class="acct-h1">Test the <span class="grad">tools</span></h1>
      <p class="acct-lead">Enter your name, email and tester code. We'll email you a link that opens your downloads.</p>
    </div>
  </section>
  <section class="acct">
    <div class="container container--text">
      <div id="t-out" class="glass auth" hidden>
        <form class="form auth-view" id="t-form" novalidate>
          <div class="field"><label for="t-name">Name</label><input class="input" id="t-name" name="name" autocomplete="name" required></div>
          <div class="field"><label for="t-email">Email</label><input class="input" id="t-email" name="email" type="email" dir="ltr" autocomplete="email" required></div>
          <div class="field"><label for="t-code">Tester code</label><input class="input" id="t-code" name="code" dir="ltr" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>
          <button class="btn" type="submit">Email me my link</button>
          <p class="form-status" role="status"></p>
        </form>
        <div class="auth-view auth-sent" id="t-sent" hidden>
          <span class="seal"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg></span>
          <h2 class="h3">Check your inbox</h2>
          <p class="muted" id="t-sent-text">If this email is on the testers list, a sign-in link is on its way. Open it on this device.</p>
        </div>
      </div>
      <div id="t-no" class="glass lib-empty stack" hidden>
        <p>This email isn't on the testers list.</p>
        <p class="meta">Sign out and enter your tester code with this email, or use the email you joined with.</p>
        <button class="btn btn--ghost" type="button" data-signout>Sign out</button>
      </div>
      <div id="t-in" class="stack-lg" hidden>
        <p class="t-hi" id="t-hi"></p>
        <div class="library" id="t-lib" aria-live="polite"></div>
        <div class="terms-box">
          <div><h2 class="h3">MWP Photoshop Plugin Panel</h2>
          <p class="meta">In Photoshop, open MWP Photoshop Plugin Panel and sign in with this email. It works on up to 2 computers.</p></div>
        </div>
        <p class="acct-note">Your copies are made for you and carry your name. Please don't share them. Download links work for 5 minutes. Trouble? <a class="link" href="/support/">Contact support</a>.</p>
      </div>
    </div>
  </section>""", "testers.js", announce=False, extra_head='\n  <meta name="robots" content="noindex">' + ACCOUNT_CSS + "<style>.t-hi{margin:0;font-size:18px;color:#CDD7DD}"
  # testers page: a compact, centered hero and sign-in card (Matan, 13 Oct 2026)
  ".acct-hero{padding:clamp(48px,6vw,80px) 0 clamp(24px,3vw,36px);text-align:center}"
  ".acct-hero .acct-h1{font-size:clamp(40px,5.5vw,76px)}"
  ".acct-hero .acct-lead{margin-left:auto;margin-right:auto}"
  ".acct{padding-bottom:80px}"
  "#t-out.glass{padding:36px 32px;max-width:460px;margin:0 auto}"
  "#t-out .input{border-radius:14px;padding:0 16px;min-height:52px}"
  "#t-no{max-width:460px;margin:0 auto;text-align:center}"
  "@media (max-width:600px){#t-out.glass{padding:28px 20px}}"
  "</style>")

page("support.html", "Help with downloads, installing and refunds · MWP",
 "Help with downloading, installing or using MWP Presets, MWP Photoshop Plugin Panel and the Field Guides. A person replies within one business day.",
 f"""  <section class="page-hero">
    <div class="container container--text stack">
      <p class="kick">Help</p>
      <h1 class="display">How can we help?</h1>
      <p class="lead">A person answers within one business day.</p>
    </div>
  </section>
  <section class="section--tight">
    <div class="container container--text">
      <div class="topics" role="group" aria-label="Topic">
        <button class="topic" type="button" data-topic="download" aria-pressed="false">{ICON['download']}<span>Downloading my files</span></button>
        <button class="topic" type="button" data-topic="install" aria-pressed="false">{ICON['chat']}<span>Installing or using a product</span></button>
        <button class="topic" type="button" data-topic="refund" aria-pressed="false">{ICON['refresh']}<span>Refund request</span></button>
      </div>
      <form class="form panel" id="support-form" novalidate>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
          <div class="field"><label for="s-name">Name</label><input class="input" id="s-name" name="name" autocomplete="name" required><span class="field__error" data-error-for="name"></span></div>
          <div class="field"><label for="s-email">Email</label><input class="input" id="s-email" name="email" type="email" autocomplete="email" required><span class="field__error" data-error-for="email"></span></div>
        </div>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
          <div class="field"><label for="s-category">Topic</label>
            <select class="select" id="s-category" name="category">
              <option value="download">Downloading my files</option>
              <option value="install">Installing or using a product</option>
              <option value="refund">Refund request</option>
              <option value="other" selected>Something else</option>
            </select></div>
          <div class="field"><label for="s-order">Order number (optional)</label><input class="input" id="s-order" name="order_number" inputmode="numeric"></div>
        </div>
        <div class="field"><label for="s-subject">Subject</label><input class="input" id="s-subject" name="subject" maxlength="140" required><span class="field__error" data-error-for="subject"></span></div>
        <div class="field"><label for="s-message">Message</label><textarea class="textarea" id="s-message" name="message" maxlength="5000" required></textarea><span class="field__error" data-error-for="message"></span></div>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button class="btn" type="submit">Send message</button>
        <p class="form-status" role="status"></p>
      </form>
    </div>
  </section>""", "support.js")

page("thank-you.html", "Thank you · MWP", "Your order is confirmed.",
 """  <section class="page-hero">
    <div class="container container--text stack-lg">
      <div class="stack">
        <p class="kick">MWP</p>
        <h1 class="display">Thank you. Your order is confirmed.</h1>
        <p class="lead">Your files and video tutorials are ready in My downloads. We've also emailed you a link<span id="sent-to-wrap" hidden> at <b id="sent-to"></b></span>.</p>
      </div>
      <div class="row">
        <a class="btn" id="to-downloads" href="/account/">Go to my downloads</a>
        <a class="btn btn--ghost" href="/#faq">Installation help</a>
      </div>
      <ol class="steps">
        <li class="step"><span class="step__num">1</span><p class="step__title">Sign in</p><p class="muted">With the email you paid with.</p></li>
        <li class="step"><span class="step__num">2</span><p class="step__title">Download</p><p class="muted">Your files, and the video tutorials beside them.</p></li>
        <li class="step"><span class="step__num">3</span><p class="step__title">Install</p><p class="muted">Follow the guide inside the zip, or watch the tutorial.</p></li>
      </ol>
    </div>
  </section>""", "thank-you.js", extra_head='\n  <meta name="robots" content="noindex">')

page("legal.html", "Terms, licence, refunds and privacy · MWP",
 "Terms of sale, licence, refund policy and privacy notice for MWP.",
 """  <!-- DRAFT FOR APPROVAL: every section below must be approved by Matan (refunds and terms are money terms) before launch. -->
  <section class="page-hero">
    <div class="container stack">
      <p class="kick">MWP</p>
      <h1 class="display">Terms and policies</h1>
      <p class="meta">Last updated <span data-year>2026</span></p>
    </div>
  </section>
  <section class="section--tight">
    <div class="container legal">
      <nav aria-label="Contents"><a href="#licence">Licence</a><a href="#refunds">Refunds</a><a href="#terms">Terms of sale</a><a href="#privacy">Privacy</a></nav>
      <div class="prose">
      <h2 id="licence">Licence</h2>
      <p>When you buy a product you get a personal, non-transferable licence to use it in your own work and in work you do for clients.</p>
      <ul>
        <li>Allowed: personal work, client work, social media, prints and publications you create.</li>
        <li>Not allowed: sharing, reselling, giving away or repackaging the files, alone or bundled with other products.</li>
      </ul>
      <p>Sample photographs in our products and on this site remain the property of Matan Wild Photography and may not be used without written permission.</p>

      <h2 id="refunds">Refunds</h2>
      <p>Our products are digital files delivered instantly. If a product doesn't work for you, write to <a href="/support/?topic=refund">support</a> within 14 days of purchase. We'll help you get it working, and if we can't, we'll refund you. Refunded orders lose access to the files.</p>

      <h2 id="terms">Terms of sale</h2>
      <p>Orders are processed by our online reseller, Lemon Squeezy, which is the merchant of record and handles payment, invoicing and sales tax. Prices are shown in the currency listed on each product page. You'll receive a receipt by email after every purchase.</p>
      <p>Products you buy include free updates to that product. We may add, change or retire products at any time; anything you've already bought stays in your downloads.</p>

      <h2 id="privacy">Privacy</h2>
      <p>We collect only what we need to sell and deliver your products: your name, email, country and what you bought. In My details you can also add a phone number; it's optional. Payment details are handled by the checkout provider and never reach us.</p>
      <p>If you ask for our free Field Guides sample, we also keep your phone number and the language you signed up in. The sample comes with joining our mailing list: you tick the box to get tips and offers by email and WhatsApp (through Mailchimp), and you can unsubscribe anytime.</p>
      <p><strong>Your personal copy.</strong> Presets and field guides are made for you: your name, email and licence number (for example MWP-1A2B3C4D) are added at the foot of each PDF page and in the file's details, as a note inside preset and LUT files, and in a LICENSED-TO.txt file in the pack. It doesn't change how the files work; it lets a shared copy be traced back to its licence.</p>
      <p><strong>Downloads and computers.</strong> Each pack can be downloaded up to 5 times a day. MWP Photoshop Plugin Panel works on up to 3 computers; for each one we keep a computer ID, its name and system (for example "Dana-MacBook (Mac)") and when it was last used. You can see and remove computers in My downloads. For downloads and activations we keep a scrambled form of your IP address, never the address itself.</p>
      <p><strong>Support.</strong> When you contact support we keep your name, email and message so we can answer you.</p>
      <p>We use your email to deliver your files, answer support requests and, if you agreed, send occasional news and new releases. You can unsubscribe from any email. The site uses no advertising or analytics trackers; your browser only remembers your language, your cart and your sign-in.</p>
      <p>Our service providers: Supabase (database, sign-in and file storage), Lemon Squeezy (checkout), Resend (account emails), Mailchimp (newsletters), Make.com and monday.com (order and support handling). To see, correct or delete your data, write to support.</p>
      </div>
    </div>
  </section>""", "static.js")

# Accessibility statement (Jeinna, 30 Oct 2026): adapted from mw-phototours.com's statement. Israeli law (regulation
# 35ה of the Service Accessibility Regulations, 2013) requires one. DRAFT until Matan approves it. It lists only what
# this site really does (checked 30 Oct 2026); the widget line appears only once the Nagishna widget is licensed here.
A11Y_DONE = [("A “Skip to content” link at the top of every page", "קישור „דילוג לתוכן” בראש כל עמוד"),
             ("Full keyboard use of the menu, the cart and every pop-up window; Esc closes them", "שימוש מלא במקלדת בתפריט, בעגלה ובכל חלון קופץ; מקש Esc סוגר אותם"),
             ("Text alternatives for the site's images", "טקסט חלופי לתמונות באתר"),
             ("Labels for every form field", "תוויות לכל שדות הטפסים"),
             ("Motion and animations stop when your device is set to reduce motion", "תנועה ואנימציות נעצרות כשבמכשיר מוגדרת הפחתת תנועה"),
             ("The site in Hebrew (right to left) and English, with each page's language set for screen readers", "האתר בעברית (מימין לשמאל) ובאנגלית, ושפת כל עמוד מוגדרת לקוראי מסך"),
             ("A layout that adapts to phones, tablets and computers", "תצוגה שמתאימה את עצמה לטלפון, לטאבלט ולמחשב")]
A11Y_DONE.append(("An accessibility menu (the blue accessibility button in the bottom-right corner of every page, “Accessibility” in the menu, “Accessibility settings” on the first Tab, or Alt+Shift+A): accessibility profiles; text size, page zoom and line, letter and word spacing; a readable font and text alignment; colour and contrast modes; highlighted links, headings and image descriptions; large cursors, a reading guide and mask, stopping animations, keyboard focus, read aloud, screen reader support and page regions; muting media, hiding images, a reading view and an on-screen keyboard",
                  "תפריט נגישות (כפתור הנגישות הכחול בפינה הימנית התחתונה של כל עמוד, „נגישות” בתפריט, „הגדרות נגישות” בלחיצה הראשונה על Tab, או Alt+Shift+A): פרופילי נגישות; גודל טקסט, הגדלת תצוגה וריווח שורות, אותיות ומילים; גופן קריא ויישור טקסט; מצבי צבע וניגודיות; הדגשת קישורים, כותרות ותיאורי תמונות; סמנים גדולים, קו הנחיה ומסכת קריאה, עצירת הנפשות, ניווט מקלדת, הקראה, התאמה לקורא מסך וניווט אזורים; השתקת מדיה, הסתרת תמונות, תצוגה קריאה ומקלדת וירטואלית"))
A11Y_UPDATED = ("31 October 2026", "31/10/2026")
_en_li = "".join(f"<li>{e}</li>" for e, h in A11Y_DONE)
_he_li = "".join(f"<li>{h}</li>" for e, h in A11Y_DONE)
page("accessibility.html", "Accessibility statement · MWP",
 "How the MWP Shop is made accessible, and who to contact about accessibility.",
 f"""  <!-- DRAFT FOR APPROVAL (Matan): adapted from the statement on mw-phototours.com. -->
  <section class="page-hero">
    <div class="container stack">
      <p class="kick">MWP</p>
      <h1 class="display"><span class="only-en" data-no-i18n>Accessibility statement</span><span class="only-he" data-no-i18n>הצהרת נגישות</span></h1>
      <p class="meta"><span class="only-en" data-no-i18n>Last updated {A11Y_UPDATED[0]}</span><span class="only-he" data-no-i18n>עודכנה בתאריך {A11Y_UPDATED[1]}</span></p>
    </div>
  </section>
  <section class="section--tight">
    <div class="container container--text">
      <div class="prose only-en" data-no-i18n>
      <p>This statement is published as required by regulation 35E of Israel's Equal Rights for Persons with Disabilities (Service Accessibility Adjustments) Regulations, 2013.</p>
      <h2>Our commitment</h2>
      <p>MW Photo Tours believes in equal opportunity for every visitor, including people with disabilities. We work so that everyone can browse this shop, shop.mw.photography, and read everything published on it.</p>
      <h2>What we've done</h2>
      <ul>{_en_li}</ul>
      <p>We keep working to make the site accessible in line with Israeli standard and law. Even so, some parts may not yet be fully accessible. If you come across a problem, please write to us and we'll do our best to fix it within a reasonable time.</p>
      <p>To help us fix it quickly, please tell us what you were trying to do, which page you were on and what went wrong, along with your operating system, your browser and its version, and any assistive technology you use.</p>
      <h2>Physical accessibility</h2>
      <p>The shop operates online only; there is no place that receives the public.</p>
      <h2>Accessibility contact</h2>
      <p>Questions or requests about accessibility: write to <a href="mailto:contact@matanwildphotography.com">contact@matanwildphotography.com</a> or by phone on <a href="tel:+972537432878" dir="ltr">053-743-2878</a>.</p>
      </div>
      <div class="prose only-he" dir="rtl" lang="he" data-no-i18n>
      <p>הצהרה זו מפורסמת על פי החובה הנקובה בתקנה 35ה לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג–2013.</p>
      <h2>מבוא</h2>
      <p>MW Photo Tours מאמינה במתן שוויון הזדמנויות לכל הגולשים, ובהם אנשים עם מוגבלות. אנחנו פועלים כדי שכולם יוכלו לגלוש בחנות שלנו, shop.mw.photography, ולקרוא את כל התכנים שמפורסמים בה.</p>
      <h2>התאמות הנגישות שבוצעו באתר</h2>
      <ul>{_he_li}</ul>
      <p>אנחנו ממשיכים לפעול להנגשת האתר לפי דרישות התקן והדין הישראלי. יחד עם זאת, ייתכן שתמצאו רכיבים שעדיין אינם מונגשים במלואם. אם נתקלתם בבעיה, כתבו לנו ונעשה מאמץ לתקן אותה תוך זמן סביר.</p>
      <p>כדי לזרז את הטיפול, כדאי לפרט מה ניסיתם לעשות, באיזה עמוד ומה הבעיה שנתקלתם בה, וכן את מערכת ההפעלה, סוג הדפדפן וגרסתו, וטכנולוגיה מסייעת שבה השתמשתם, אם רלוונטי.</p>
      <h2>התאמות נגישות פיזיות</h2>
      <p>פעילות האתר מקוונת בלבד, ואין קבלת קהל.</p>
      <h2>פרטי יצירת קשר בנושאי נגישות</h2>
      <p>פניות, שאלות או בקשות בנושאי נגישות: בדואר האלקטרוני <a href="mailto:contact@matanwildphotography.com">contact@matanwildphotography.com</a> או בטלפון <a href="tel:+972537432878" dir="ltr">053-743-2878</a>.</p>
      </div>
    </div>
  </section>""", "static.js")

page("404.html", "Page not found · MWP", "This page doesn't exist.",
 """  <section class="page-hero section">
    <div class="container container--text stack-lg">
      <div class="stack">
        <p class="kick">404</p>
        <h1 class="display">This page doesn't exist.</h1>
        <p class="lead">The link may be old or mistyped. Everything in the shop is one click away.</p>
      </div>
      <div class="row"><a class="btn" href="/shop/">Browse all products</a><a class="btn btn--ghost" href="/">Home</a></div>
      <p class="muted"><a class="link" href="/presets/#plugin">Lightroom Classic plugin</a> · <a class="link" href="/panel/">Photoshop plugin panel</a> · <a class="link" href="/presets/">Lightroom presets</a> · <a class="link" href="/field-guides/">Photography guides</a></p>
    </div>
  </section>""", "static.js")
print("pages written")


# The not-found page is served at any address (e.g. /old/path/), so its links must resolve from the site root.
_p = os.path.join(ROOT, "404.html")
_h = open(_p).read().replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <base href="/">', 1)
# …and it isn't a page of its own: no canonical address (it would point at /404/), never indexed
_h = re.sub(r'\s*<link rel="canonical"[^>]*>', "", _h, count=1)
_h = _h.replace('<base href="/">', '<base href="/">\n  <meta name="robots" content="noindex">', 1)
open(_p, "w").write(_h)
