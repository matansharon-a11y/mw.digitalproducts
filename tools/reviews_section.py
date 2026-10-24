"""The customer reviews section, the same on the home page, the shop and the product pages.

The section is a frame; assets/js/lib/reviews.js fills it from assets/reviews/reviews.json (screenshots of real
reviews, see assets/reviews/README.md) and stays hidden while there's nothing to show. ?reviews=preview shows
labelled placeholder cards instead, to check the design. Styles in assets/css/reviews.css.

section(...) options:
  product   only the reviews about these products (presets, plugin, panel, guides; several with spaces); None = all
  featured  the home page: the featured reviews (up to 6) and a link to all of them in the shop
  filters   the shop: one chip per product that has reviews
  lang      "en" for pages build_he.py translates (home, shop); "he" for the Hebrew product pages
  cls       the host page's class names, so the heading looks like its other sections
"""

T = {
    "en": dict(kick="From our customers", h=("Real photographers.", "Real words."),
               lead="Messages and reviews from photographers who use MWP tools, shown as screenshots of what they sent us.",
               lead_p="What photographers who use {name} told us, shown as screenshots of what they sent us.",
               all="See all reviews", send="Bought from us? Send us your review", tap="Tap a review to read it in full.",
               filt="Show reviews for", every="All"),
    "he": dict(kick="מהלקוחות שלנו", h=("מה אומרים", "הצלמים"),
               lead="צילומי מסך של הודעות וביקורות שצלמים שלחו לנו אחרי שעבדו עם הכלים.",
               lead_p="צילומי מסך של מה שצלמים שעובדים עם {name} שלחו לנו.",
               all="לכל הביקורות", send="קניתם אצלנו? שלחו לנו ביקורת", tap="לחצו על ביקורת כדי לקרוא את כולה.",
               filt="הצגת ביקורות על", every="הכול"),
}
NAMES = {"presets": ("MWP Presets", "הפריסטים של MWP"), "plugin": ("the Lightroom Classic plugin", "התוסף ללייטרום קלאסיק"),
         "panel": ("MWP Photoshop Plugin Panel", "התוסף לפוטושופ של MWP"), "guides": ("MWP Field Guides", "מדריכי השטח של MWP")}
CHIPS = [("plugin", "Lightroom Classic Plugin", "התוסף ללייטרום קלאסיק"), ("panel", "Photoshop Plugin Panel", "התוסף לפוטושופ"),
         ("presets", "Presets", "פריסטים"), ("guides", "Field Guides", "מדריכי השטח")]


def section(lang="en", product=None, featured=False, filters=False, cls=None):
    c = dict(sec="sec", wrap="wrap", head="head", kick="kick", h2="h2", grad="grad", lead="lead") | (cls or {})
    t = T[lang]
    he = lang == "he"
    lead = t["lead_p"].format(name=NAMES[product.split()[0]][1 if he else 0]) if product else t["lead"]
    chips = ""
    if filters:
        chips = (f'<div class="rv-filter" role="group" aria-label="{t["filt"]}" hidden><button type="button" data-rv-filter="all" aria-pressed="true">{t["every"]}</button>'
                 + "".join(f'<button type="button" data-rv-filter="{k}" aria-pressed="false" hidden>{h if he else e}</button>' for k, e, h in CHIPS) + "</div>")
    more = (f'<a class="rv-all" href="{"/shop/he/" if he else "/shop/"}#reviews">{t["all"]}</a>' if featured else "")
    attrs = f' data-product="{product}"' if product else ""
    attrs += ' data-featured' if featured else ""
    return f'''<section class="{c["sec"]} reviews" id="reviews" data-reviews{attrs} aria-labelledby="reviews-h" hidden>
<div class="{c["wrap"]}">
<div class="{c["head"]} rv-head"><p class="{c["kick"]}">{t["kick"]}</p><h2 class="{c["h2"]}" id="reviews-h">{t["h"][0]} <span class="{c["grad"]}">{t["h"][1]}</span></h2><p class="{c["lead"]}">{lead}</p></div>
{chips}<div class="rv-grid" role="list"></div>
<p class="rv-tap">{t["tap"]}</p>
<div class="rv-foot">{more}<a class="rv-send" href="/support/">{t["send"]}</a></div>
</div>
</section>'''
