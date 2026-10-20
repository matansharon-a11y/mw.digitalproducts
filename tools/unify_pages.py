"""(Since Oct 2026 the three product pages are built by tools/build_products.py and this script skips them.
It still applies if Matan's sales-page designs are imported again with import_designs.py.)

Bring the three sales pages (EN + HE) in line with the home page: gold palette, the same header
(MWP logo, Help, My downloads and cart icons, language toggle) and the same RAW / FINAL wording on
the comparison sliders. Page content and layout stay as Matan designed them. Safe to run again."""
import re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from brand import CART, USER, gold, NAV_CSS, FONTS, BUNDLE_CSS, SITE_CSS, site_links, menu_button, site_footer, use_webp, BRAND, ICONS
from sales_he import hebrew
from img_loading import prioritize

PAGES = {
    "presets/index.html": "en", "presets/he.html": "he",
    "panel/index.html": "en", "panel/he.html": "he",
    "field-guides/index.html": "en", "field-guides/he.html": "he",
}
HELP = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/></svg>'
DL = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>'

def navr(lang, btn=""):
    he = lang == "he"
    t = (lambda e, h: h if he else e)
    # the choice is remembered (mwp_lang), so the rest of the site follows it
    toggle = ('<div class="lang-toggle" role="group" aria-label="שפה"><a href="./" hreflang="en" lang="en" onclick="try{localStorage.setItem(\'mwp_lang\',\'en\')}catch(e){}">EN</a><span class="on" aria-current="true" lang="he">עב</span></div>'
              if he else
              '<div class="lang-toggle" role="group" aria-label="Language"><span class="on" aria-current="true">EN</span><a href="he/" hreflang="he" lang="he" onclick="try{localStorage.setItem(\'mwp_lang\',\'he\')}catch(e){}">עב</a></div>')
    return (f'<div class="navr">'
            f'<div class="nav-icons">'
            f'<button class="nav-ico" type="button" data-cart aria-label="{t("Cart", "עגלה")}" aria-haspopup="dialog">{CART}<span class="count" hidden>0</span><span class="tip">{t("Cart", "עגלה")}</span></button>'
            f'<button class="nav-ico" type="button" data-account aria-label="{t("Account", "חשבון")}" aria-haspopup="menu" aria-expanded="false">{USER}<span class="tip">{t("Account", "חשבון")}</span></button>'
            f'</div>{toggle}{btn}</div>')

# Same header look as the home page. "html " prefix so it wins over the page styles the runtime moves into <head>.
CSS = """<style id="mwp-unify">
html .ba{direction:ltr}
html .lrp .hd{color:#a8a8a8}
""" + NAV_CSS + SITE_CSS + BUNDLE_CSS + """</style>"""

SCRIPT = """<script src="../assets/js/lib/nav.js" defer></script>
<script type="module">
import { initCart } from "../assets/js/lib/cart.js";
const go = () => initCart();
document.readyState === "complete" ? go() : addEventListener("load", go);
</script>"""

WORDS = {
    "en": [(">BEFORE<", ">RAW<"), (">AFTER · MWP PRESET<", ">FINAL · MWP PRESET<"), (">AFTER<", ">FINAL · MWP PANEL<"),
           (">Before and after<", ">From RAW to final<"), (">See before and after<", ">Compare RAW and final<"), (">See before and after →<", ">Compare RAW and final →<"), ("'BEFORE'", "'RAW'"), ("'AFTER'", "'FINAL · MWP PANEL'"), ("'AFTER · MWP PRESET'", "'FINAL · MWP PRESET'")],
    "he": [(">לפני<", ">RAW<"), (">אחרי · פריסט MWP<", ">סופי · פריסט MWP<"), (">אחרי<", ">סופי · MWP Panel<"),
           (">לפני ואחרי<", ">מ-RAW לתמונה הסופית<"), (">לראות לפני ואחרי ←<", ">מ-RAW לתמונה הסופית ←<")],
}

def share_tags(s, url):
    """Link previews (og/twitter) from the page's own final title and description, and the referrer policy."""
    s = re.sub(r'<meta (?:property="og:[^"]*"|name="twitter:[^"]*"|name="referrer")[^>]*>\n?', '', s)
    title = re.search(r"<title>([^<]*)</title>", s).group(1)
    desc = re.search(r'<meta name="description" content="([^"]*)">', s).group(1)
    tags = (f'<meta name="referrer" content="strict-origin-when-cross-origin">\n'
            f'<meta property="og:type" content="website">\n<meta property="og:site_name" content="MWP">\n'
            f'<meta property="og:title" content="{title}">\n<meta property="og:description" content="{desc}">\n'
            f'<meta property="og:url" content="{url}">\n'
            f'<meta property="og:image" content="https://shop.mw.photography/assets/img/share.jpg">\n'
            f'<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
            f'<meta name="twitter:card" content="summary_large_image">')
    return s.replace("</title>", "</title>\n" + tags, 1)


# Search descriptions (from each page's own copy). The Hebrew pages get them in Hebrew from EXACT in tools/sales_he.py.
DESC = {
    "presets": "50 Lightroom presets and 33 video LUTs built from the MWP edits of wildlife and landscapes. For Lightroom Classic, Lightroom, Lightroom Mobile and Camera Raw.",
    "panel": "MWP Panel, a Photoshop plugin: the way we edit on our expeditions, built in as simple buttons. Pick the animal or the sky, pick an effect, set how strong.",
    "field-guides": "MWP Field Guides: four visual guides with 137 short lessons on composition, colour, light and planning, each one a real photo from the field.",
}

# Page titles where the design's own title is too short for search results (English pages only).
TITLES = {
    "presets/index.html": "Lightroom presets for wildlife and landscapes · MWP Presets",
}

# Matan's placeholder note under the bundle cards is not shown on the site.
BUNDLE_NOTE = re.compile(r'<p[^>]*>\[(?:Bundle prices and discounts: (?:Matan to decide|for Matan to set)|מחירים והנחות לחבילות: לקביעת מתן)\]</p>\s*')

# Price spots, in page order, so each one shows the price set for that product in the admin
# (assets/js/lib/prices.js). "~was" is the struck-out "before" price. If a redesign adds or moves a
# price, update the list for that page.
PRICE_SLOTS = {
    "presets": ["mwp-presets", "presets-panel", "mwp-presets", "presets-field-guides", "presets-panel", "full-set", "mwp-presets", "full-set"],
    "panel": ["mwp-panel", "mwp-panel", "presets-panel"],
    "field-guides": ["mwp-field-guides", "mwp-field-guides", "full-set", "full-set~was", "mwp-field-guides", "presets-field-guides", "field-guides-panel", "mwp-field-guides"],
}
PLACEHOLDER = re.compile(r'\[(?:YOUR PRICE|BUNDLE PRICE|PRICE BEFORE DISCOUNT|המחיר|מחיר חבילה|מחיר החבילה|מחיר לפני הנחה)\]|<span data-price="[^"]*"(?: data-was)? data-no-i18n>[^<]*</span>')
FRESH = re.compile(r'\[(?:YOUR PRICE|BUNDLE PRICE|PRICE BEFORE DISCOUNT|המחיר|מחיר חבילה|מחיר החבילה|מחיר לפני הנחה)\]')

# A simpler site (Oct 2026): sections each sales page leaves out, by their heading's first words (EN and HE) or
# "band" for the numbers strip under the hero. They repeat the hero, the bundles or the home page (About Matan).
DROP = {
    "presets": ["band", "Edit at the desk", "עורכים ליד השולחן", "The preset sets the look", "הפריסט קובע את המראה",
                "Built in the field", "נבנה בשטח", "How to use them", "איך משתמשים בהם", "What's in the download", "מה יש בהורדה"],
    "panel": ["band", "A panel next to your layers", "פאנל אחד, ליד השכבות", "The questions from our evenings", "השאלות מהערבים",
              "How it works.", "איך זה עובד", "What's in the download", "מה יש בהורדה"],
    "field-guides": ["band", "On your desk, your tablet", "במחשב, בטאבלט", "A wildlife photographer who lives", "צלם טבע שחי בשטח",
                     "137 lessons. All from", "137 שיעורים. כולם"],
}


def drop_sections(s, keys):
    def keep(m):
        cls = re.search(r'class="([^"]*)"', m.group(1))
        if "band" in keys and cls and cls.group(1).split() == ["band"]:
            return ""
        h = re.search(r"<h[12][^>]*>(.*?)</h[12]>", m.group(2), re.S)
        text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h.group(1))).strip() if h else ""
        text = re.sub(r"\s+([.,])", r"\1", text)
        return "" if any(k != "band" and text.startswith(k) for k in keys) else m.group(0)
    return re.sub(r"<section([^>]*)>(.*?)</section>\n?", keep, s, flags=re.S)


ZERO = {"en": "$0.00", "he": "₪0.00"}
PRICE_JS = """<script type="module">
import { initPrices } from "../assets/js/lib/prices.js";
initPrices();
</script>"""

for path, lang in PAGES.items():
    s = open(path, encoding="utf-8").read()
    if "/assets/css/product.css" in s:   # built by tools/build_products.py (Oct 2026): nothing to do here
        print("skipped", path, "(built by build_products.py)"); continue
    s = gold(s)
    # header: home-page brand (logo + MWP, links home), Help + icons + language toggle
    s = re.sub(r'<a class="brand" href="[^"]*"[^>]*><img src="[^"]+" alt="[^"]*"><span>[^<]*</span></a>',
               BRAND, s, count=1)
    # header: icons + language toggle only (no "Get ..." button: every page already has one in its buy section)
    s = re.sub(r'<div class="navr">.*?</div>(?=\s*</div>\s*</nav>)', lambda m: navr(lang), s, count=1, flags=re.S)
    # the site's one menu (the same on every page), with a menu button for phones
    folder = path.split("/")[0]
    s = re.sub(r'<div class="links">.*?</div>', lambda m: f'<div class="links">{site_links(lang, f"/{folder}/")}</div>', s, count=1, flags=re.S)
    if "nav-menu" not in s:
        s = re.sub(r'(<div class="navr">.*?</div></div>)', lambda m: m.group(1) + menu_button(lang), s, count=1, flags=re.S)
    for a, b in WORDS[lang]:
        s = s.replace(a, b)
    # no arrows on the outlined buttons
    s = re.sub(r'(<a class="ghost"[^>]*>[^<]*?)\s*[→←]\s*<', r'\1<', s)
    s = BUNDLE_NOTE.sub("", s)
    # Image addresses filled in by the runtime ({{cur.before}} …): keep them out of src, or the browser asks
    # the server for the literal "{{cur.before}}" (a 404) before dc-lite.js renders the page.
    s = re.sub(r'(<img\b[^>]*?)\ssrc="(\{\{[^"]*\}\})"', r'\1 data-dc-src="\2"', s)
    # the page content (between the header and the footer) is the main landmark, for screen readers
    if "<main" not in s:
        nav = s.index("</nav>", s.index('<nav class="nav"')) + len("</nav>")
        foot = s.index("<footer", nav)
        s = s[:nav] + '\n<main id="main">' + s[nav:foot] + "</main>\n" + s[foot:]
    # hero photo first, everything below the first screen only when it's needed
    s = prioritize(s, '<section class="hero"', "hero-bg")
    slots = iter(PRICE_SLOTS[path.split("/")[0]])
    def slot(m):
        k = next(slots, None)
        if k is None:
            print("  warning: more price spots than PRICE_SLOTS lists in", path); return m.group(0)
        slug, _, was = k.partition("~")
        return f'<span data-price="{slug}"{" data-was" if was else ""} data-no-i18n>{ZERO[lang]}</span>'
    if FRESH.search(s):   # a freshly imported design: give each price spot its product, in page order
        s = PLACEHOLDER.sub(slot, s)
        if next(slots, None) is not None:
            print("  warning: fewer price spots than PRICE_SLOTS lists in", path)
    s = drop_sections(s, DROP[path.split("/")[0]])
    # the site's one footer
    s = re.sub(r"<footer\b.*?</footer>", lambda m: site_footer(lang), s, count=1, flags=re.S)
    if "initPrices" not in s:
        s = s.replace("</body>", PRICE_JS + "\n</body>", 1)
    # Follow the site's language: Hebrew visitors get Matan's Hebrew page, and opening a page sets the language.
    s = re.sub(r'<script id="mwp-lang">.*?</script>\n?', '', s, flags=re.S)
    LANG_JS = ('<script id="mwp-lang">try{if(localStorage.getItem("mwp_lang")==="he")location.replace("he/"+location.search+location.hash)}catch(e){}</script>'
               if lang == "en" else
               '<script id="mwp-lang">try{localStorage.setItem("mwp_lang","he")}catch(e){}</script>')
    s = re.sub(r"(<head[^>]*>)", lambda m: m.group(1) + "\n" + LANG_JS, s, count=1)
    if path in TITLES:
        s = re.sub(r"<title>[^<]*</title>", f"<title>{TITLES[path]}</title>", s, count=1)
    s = re.sub(r'<meta name="description"[^>]*>\n?', '', s)
    s = s.replace("</title>", f'</title>\n<meta name="description" content="{DESC[path.split("/")[0]]}">', 1)
    # the page's own clean address (the Hebrew page's he.html and he/ copies both point to /<folder>/he/)
    folder = path.split("/")[0]
    s = re.sub(r'<link rel="canonical"[^>]*>\n?', '', s)
    s = s.replace("</title>", f'</title>\n<link rel="canonical" href="https://shop.mw.photography/{folder}/{"he/" if lang == "he" else ""}">', 1)
    # set up for phones (the designs already have their phone layouts in @media rules)
    if 'name="viewport"' not in s:
        s = s.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">', 1)
    if 'id="mwp-fonts"' not in s:
        s = s.replace("</head>", FONTS + "\n</head>", 1)
    s = re.sub(r'<style id="mwp-unify">.*?</style>\n?', '', s, flags=re.S)
    s = s.replace("</head>", CSS + "\n</head>", 1)
    if "initCart" not in s:
        s = s.replace("</body>", SCRIPT + "\n</body>", 1)
    if lang == "he":   # every word in Hebrew, names too (tools/he_names.py, tools/sales_he.py)
        s = hebrew(s)
    s = share_tags(s, f"https://shop.mw.photography/{folder}/{'he/' if lang == 'he' else ''}")
    s = use_webp(s)
    open(path, "w", encoding="utf-8").write(s)
    if lang == "he":   # the Hebrew page at a clean address too: /presets/he/ (he.html keeps working)
        folder = path.split("/")[0]
        os.makedirs(f"{folder}/he", exist_ok=True)
        open(f"{folder}/he/index.html", "w", encoding="utf-8").write(
            re.sub(r"(<head[^>]*>)", lambda m: m.group(1) + f'\n<base href="/{folder}/">', s, count=1)
            .replace('href="#', f'href="/{folder}/he/#'))   # in-page links stay on this page
    print("unified", path)
