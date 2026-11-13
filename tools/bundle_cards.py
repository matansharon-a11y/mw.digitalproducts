"""The bundles section's cards (Oct 2026 redesign), the same on the home page and the shop.

Each card opens with a stage that shows every product in the bundle together, drawn as the real thing on its device:
- the Lightroom Classic plugin: its window (tabs and looks from tools/lrc_preview.py) on a laptop
- MWP Photoshop Plugin Panel: the Edit tab docked in Photoshop with the young red fox, as on the panel page
- MWP Presets: a phone (the presets work in Lightroom mobile), with the presets' collections under the photo
- MWP Field Guides: a real page spread on a tablet (the English or the Hebrew guide, by the page's language)
The full set leads as a wide card; the three pairs follow. Under the stage: name, one line, what's inside (each
product with its one fact), price with the struck sum of parts and the saving (prices.js), and the buy button
(data-add-to-cart, cart.js; the card keeps the class "plan" that cart.js and prices.js look for).
The devices' screens stay in English like the apps (ui-en, data-no-i18n). Styles: assets/css/bundles.css.
"""
import hashlib, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS_V = hashlib.sha1(open(os.path.join(ROOT, "assets/css/bundles.css"), "rb").read()).hexdigest()[:8]
CSS_LINK = f'<link rel="stylesheet" href="/assets/css/bundles.css?v={CSS_V}">'
IMG = "/assets/pages/img/bundles/"

# the products, in the shop's order (Lightroom Classic plugin, Photoshop panel, presets, guides)
ITEMS = {
    "lr": ("Lightroom Classic plugin", "Lightroom Classic 13+",
           '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M3 9h18M7 13h4M7 16h7"/>'),
    "ps": ("MWP Photoshop Plugin Panel", "Photoshop 2023+",
           '<path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8z"/><path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5"/>'),
    "pr": ("MWP Presets", "50 presets and 33 LUTs",
           '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v8.5l7.4 4.2M12 12l-7.4 4.2"/>'),
    "fg": ("MWP Field Guides", "4 PDF guides, 137 lessons",
           '<path d="M12 6.5c-2-1.6-5-2-8.5-1.6v13c3.5-.4 6.5 0 8.5 1.6 2-1.6 5-2 8.5-1.6v-13C17 4.5 14 4.9 12 6.5Z"/><path d="M12 6.5v13"/>'),
}
ALT = {"lr": "Lightroom Classic plugin window on a laptop", "ps": "MWP Photoshop Plugin Panel in Photoshop",
       "pr": "MWP Presets on a phone", "fg": "A page of MWP Field Guides on a tablet"}

# (name, line, slug, products, button, featured, where the devices stand)
BUNDLES = [
    ("The full set", "From the shot to the share", "full-set", ["lr", "ps", "pr", "fg"], "Get the full set", True,
     {"ps": (13, 27, 56, 1), "lr": (42, 6, 54, 2), "fg": (1, 6, 40, 3), "pr": (84, 6, 14.5, 4)}),
    ("Lightroom Plugin + Field Guides", "Shoot it, then edit it", "presets-field-guides", ["lr", "pr", "fg"], "Get the bundle", False,
     {"lr": (20, 22, 70, 1), "fg": (1, 6, 50, 2), "pr": (77, 6, 20, 3)}),
    ("Lightroom Plugin + Photoshop Plugin Panel", "The same look in Lightroom and Photoshop", "presets-panel", ["lr", "ps", "pr"], "Get the bundle", False,
     {"ps": (2, 24, 64, 1), "lr": (33, 6, 58, 2), "pr": (79, 6, 18, 3)}),
    ("Field Guides + Photoshop Plugin Panel", "Learn the shot, then finish it in Photoshop", "field-guides-panel", ["ps", "fg"], "Get the bundle", False,
     {"ps": (3, 20, 68, 1), "fg": (47, 6, 51, 2)}),
]

LOOKS = [("bw", "B&amp;W"), ("moody", "Moody"), ("golden", "Golden"), ("bluehour", "Blue hour")]


def _device(key, pos):
    x, y, w, z = pos
    st = f'style="--x:{x}%;--y:{y}%;--w:{w}%;--z:{z}"'
    if key == "lr":
        looks = "".join(f'<figure{" class=on" if i == 2 else ""}><img src="/assets/pages/img/lrc/look_{k}.png" alt="" width="80" height="50" loading="lazy"><figcaption>{t}</figcaption></figure>'
                        for i, (k, t) in enumerate(LOOKS))
        tabs = "".join(f'<span{" class=on" if t == "Looks" else ""}>{t}</span>' for t in ("Cull", "Organize", "Looks", "Edit", "Color", "Export"))
        return (f'<div class="dv dv-lap" {st}><div class="lap-lid"><div class="lap-scr">'
                f'<img class="dv-bg" src="{IMG}lr.webp" alt="" width="900" height="563" loading="lazy">'
                f'<div class="lp-win"><p class="lp-bar"><i></i><i></i><i></i><span>MWP · Lightroom Classic</span></p>'
                f'<p class="lp-tabs">{tabs}</p><div class="lp-looks">{looks}</div><p class="lp-sl"><i></i></p></div>'
                f'</div></div><div class="lap-base"></div></div>')
    if key == "ps":
        chips = "".join(f'<span{" class=on" if t == "Subject" else ""}>{t}</span>' for t in ("Subject", "Eye", "Sky", "Background", "Lights", "Darks"))
        fx = "".join(f"<span>{t}</span>" for t in ("Pop", "Brighten", "Darken", "Warm", "Cool", "Glow"))
        tabs = "".join(f'<span{" class=on" if t == "Edit" else ""}>{t}</span>' for t in ("Prepare", "Edit", "Style", "Export"))
        return (f'<div class="dv dv-mon" {st}><div class="mon-frame"><div class="mon-scr">'
                f'<p class="ps-bar"><i></i><i></i><i></i><span>Photoshop</span></p>'
                f'<div class="ps-body"><div class="ps-canvas"><img src="{IMG}fox.webp" alt="" width="520" height="650" loading="lazy"></div>'
                f'<div class="ps-panel"><p class="ps-brand"><i></i>MW PHOTO TOURS</p><p class="ps-tabs">{tabs}</p>'
                f'<p class="ps-h">1 · What to edit</p><p class="ps-chips">{chips}</p>'
                f'<p class="ps-h">2 · Effect</p><p class="ps-fx">{fx}</p><p class="ps-sl"><i></i></p></div></div>'
                f'</div></div><div class="mon-neck"></div><div class="mon-foot"></div></div>')
    if key == "pr":
        cols = "".join(f'<span{" class=on" if t == "Signature" else ""}>{t}</span>' for t in ("Signature", "Light &amp; Scene", "Mono", "Adaptive"))
        return (f'<div class="dv dv-ph" {st}><div class="ph-frame"><div class="ph-scr">'
                f'<img src="{IMG}presets.webp" alt="" width="420" height="525" loading="lazy">'
                f'<p class="ph-lbl">Presets</p><p class="ph-strip">{cols}</p><i class="ph-isl"></i></div></div></div>')
    # fg: the guide spread in the page's language
    return (f'<div class="dv dv-tab" {st}><div class="tab-frame"><div class="tab-scr">'
            f'<img class="bx-en" src="{IMG}guide-en.webp" alt="" width="960" height="600" loading="lazy">'
            f'<img class="bx-he" src="{IMG}guide-he.webp" alt="" width="960" height="600" loading="lazy">'
            f'</div></div></div>')


def _card(name, line, slug, items, cta, hi, layout, href):
    stage = "".join(_device(k, layout[k]) for k in sorted(layout, key=lambda k: layout[k][3]))
    inc = "".join(f'<li><span class="bx-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" '
                  f'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">{ITEMS[k][2]}</svg></span>'
                  f'<span class="bx-it"><b>{ITEMS[k][0]}</b><small>{ITEMS[k][1]}</small></span></li>' for k in items)
    label = ", ".join(ALT[k] for k in items)
    badge = '<span class="bx-badge">Everything</span>' if hi else ""
    return (f'<article class="plan bx-card{" bx-hero" if hi else ""}" aria-labelledby="bx-{slug}">'
            f'<div class="bx-stage ui-en" lang="en" dir="ltr" data-no-i18n role="img" aria-label="{label}">'
            f'<div class="bx-scene"><div class="bx-glow"></div>{stage}<div class="bx-floor"></div></div></div>'
            f'<div class="bx-body">{badge}<p class="bx-count">{len(items)} tools</p>'
            f'<h3 class="bx-name" id="bx-{slug}">{name}</h3><p class="bx-line">{line}</p>'
            f'<ul class="bx-inc">{inc}</ul>'
            f'<div class="bx-buy"><div class="bx-price"><span class="bx-now" data-price="{slug}" data-no-i18n>$0.00</span>'
            f'<p class="deal"><s><span data-price="{slug}" data-was data-no-i18n></span></s> <span class="save" data-save="{slug}" data-no-i18n hidden></span></p></div>'
            f'<a class="{"btn" if hi else "bx-out"}" href="{href}" data-add-to-cart="{slug}">{cta}</a></div></div></article>')


def cards(href="#buy"):
    """The four bundle cards in one grid; href is the buttons' fallback without the cart."""
    return f'<div class="bx">{"".join(_card(*b, href) for b in BUNDLES)}</div>'
