"""Shared brand values. mw.photography's gold (--gold #F4AF56, --goldsoft #E4AA7C) replaces the designs' orange everywhere."""
GOLD = [
    ("linear-gradient(90deg,#C4471C 0%,#E8832F 45%,#FFD08A 100%)", "linear-gradient(90deg,#E4AA7C 0%,#F4AF56 55%,#F8D29C 100%)"),
    ("linear-gradient(90deg,#D9581F,#F2A541)", "linear-gradient(90deg,#E4AA7C,#F4AF56)"),
    ("linear-gradient(90deg,#DA5A22,#F2A541)", "linear-gradient(90deg,#E4AA7C,#F4AF56)"),
    ("#F2A541", "#F4AF56"), ("#FFD08A", "#F8D29C"), ("#E8832F", "#F4AF56"), ("#D9581F", "#E4AA7C"), ("#C4471C", "#E4AA7C"), ("#DA5A22", "#E4AA7C"),
    ("rgba(242,165,65,", "rgba(244,175,86,"), ("rgba(232,131,47,", "rgba(244,175,86,"),
]

def gold(html):
    for a, b in GOLD:
        html = html.replace(a, b)
    return html

# Premium header, shared by the home page and the sales pages (selectors start with "html" so they win
# over each page's own styles). Transparent at the top, frosted glass once you scroll, quiet links with a
# gold underline, a hairline before the language switch, compact gold call to action.
NAV_CSS = """
html .nav{position:sticky;top:0;z-index:40;background:rgba(10,9,8,0);border-bottom:1px solid rgba(254,251,241,0);backdrop-filter:none;-webkit-backdrop-filter:none;transition:background .35s ease,border-color .35s ease,backdrop-filter .35s ease}
html.nav-scrolled .nav{background:rgba(10,9,8,.66);border-bottom-color:rgba(254,251,241,.08);backdrop-filter:saturate(160%) blur(18px);-webkit-backdrop-filter:saturate(160%) blur(18px)}
html .nav .wrap{display:flex;align-items:center;justify-content:flex-start;gap:28px;height:64px}
html [id]{scroll-margin-top:72px}

html .nav .brand{display:flex;align-items:center;gap:12px;color:#FEFBF1;text-decoration:none;direction:ltr;flex:none}
html .nav .brand img{width:auto;height:38px;object-fit:contain;opacity:.95;transition:opacity .25s,transform .45s cubic-bezier(.2,.7,.2,1)}
html .nav .brand:hover img{opacity:1;transform:scale(1.04)}

html .nav .links{display:flex;align-items:center;gap:34px;margin-inline:auto}
html .nav .links a{position:relative;padding:8px 0;color:rgba(254,251,241,.66);text-decoration:none;white-space:nowrap;font:500 13px/1 "Google Sans",Heebo,sans-serif;letter-spacing:.06em;transition:color .25s ease}
html .nav .links a::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,#E4AA7C,#F4AF56);transform:scaleX(0);transform-origin:center;transition:transform .35s cubic-bezier(.2,.7,.2,1)}
html .nav .links a:hover,html .nav .links a.is-active{color:#FEFBF1}
html .nav .links a:hover::after,html .nav .links a.is-active::after{transform:scaleX(1)}
html .nav .navr{display:flex;align-items:center;gap:6px;margin-inline-start:0;flex:none}
html .nav .navr .nl{display:none}
html .nav .nav-icons{display:flex;align-items:center;gap:0}
html .nav .nav-ico{width:40px;height:40px;color:rgba(254,251,241,.78);transition:color .2s ease,background .2s ease}
html .nav .nav-ico:hover{color:#F4AF56;background:rgba(254,251,241,.05)}
html .nav .nav-ico svg{width:20px;height:20px;stroke-width:1.6}
html .nav .lang-toggle{display:inline-flex;align-items:center;gap:2px;height:28px;margin-inline-start:6px;padding:0 0 0 14px;border:0;border-left:1px solid rgba(254,251,241,.14);border-radius:0;background:none;direction:ltr}
html .nav .lang-toggle span,html .nav .lang-toggle a,html .nav .lang-toggle button{display:inline-flex;align-items:center;justify-content:center;min-width:0;height:28px;padding:0 7px;border:0;border-radius:0;background:none;font:600 12px/1 "Google Sans",Heebo,sans-serif;letter-spacing:.12em;color:rgba(254,251,241,.42);text-decoration:none;cursor:pointer;transition:color .2s ease}
/* show only the language you can switch to */
html .lang-toggle .on{display:none !important}
html .nav .lang-toggle a,html .nav .lang-toggle button{color:rgba(254,251,241,.82)}
html .nav .lang-toggle a:hover,html .nav .lang-toggle button:hover{color:#F2A541}
html[lang=he] .nav .lang-toggle{border-left:0;border-right:1px solid rgba(254,251,241,.14);padding:0 14px 0 0}
html .nav .lang-toggle a:hover,html .nav .lang-toggle button:hover{color:#FEFBF1}
html .nav .lang-toggle .on{color:#FEFBF1;background:none;cursor:default}
html .nav .navr .btn.sm{display:inline-flex;align-items:center;min-height:38px;margin-inline-start:14px;padding:0 20px;border-radius:999px;background:linear-gradient(90deg,#E4AA7C,#F4AF56);color:#0A0908;font:700 13px/1 "Google Sans",Heebo,sans-serif;letter-spacing:.02em;white-space:nowrap;box-shadow:0 6px 20px rgba(244,175,86,.18);transition:transform .25s ease,box-shadow .25s ease,filter .25s ease}
html .nav .navr .btn.sm:hover{transform:translateY(-1px);filter:brightness(1.06);box-shadow:0 10px 28px rgba(244,175,86,.28)}
@media (max-width:1280px){html .nav .links{gap:24px}html .nav .links a{font-size:12px}}
html .nav .links + .navr{margin-inline-start:0}
@media (max-width:1100px){html .nav .links{display:none}html .nav .navr,html .nav .links + .navr{margin-inline-start:auto}}
@media (max-width:600px){html .nav .wrap{height:64px;gap:10px}html .nav .navr .btn.sm{display:none}html .nav .nav-ico{width:38px;height:38px}html .nav .lang-toggle{padding-left:10px;margin-inline-start:2px}html[lang=he] .nav .lang-toggle{padding:0 10px 0 0}}
"""

# One typeface per language across the whole site: Google Sans for English, Heebo for Hebrew.
# The rule is broad on purpose (the sales-page designs set fonts inline), so it uses !important.
FONT_LINK = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
             '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700&family=Heebo:wght@300..900&display=swap">')
FONT_CSS = """<style id="mwp-fonts">
html body,html body *:not(svg):not(svg *){font-family:"Google Sans","Heebo",system-ui,-apple-system,"Segoe UI",sans-serif!important}
html[lang=he] body,html[lang=he] body *:not(svg):not(svg *),html body [lang=he],html body [lang=he] *{font-family:"Heebo","Google Sans",system-ui,sans-serif!important}
</style>"""
FONTS = FONT_LINK + "\n" + FONT_CSS


# Bundle / pricing cards, the same on the home page and every sales page. Subgrid lines up the
# titles, prices, lists and buttons across a row ("html " prefix so it wins over the pages' own styles).
BUNDLE_CSS = """
html .plans{gap:20px}
html .plans > .plan{display:grid;grid-row:span 4;grid-template-rows:subgrid;row-gap:0;align-content:start;padding:36px 30px 30px;border-radius:26px;background:linear-gradient(180deg,rgba(254,251,241,.055),rgba(254,251,241,.015) 55%,rgba(254,251,241,.03));border:1px solid rgba(254,251,241,.08);box-shadow:inset 0 1px 0 rgba(254,251,241,.06),0 30px 60px -40px rgba(0,0,0,.8);backdrop-filter:none;-webkit-backdrop-filter:none;text-align:start;transition:opacity 1s cubic-bezier(.16,1,.3,1) var(--rd,0s),transform .6s cubic-bezier(.2,.8,.2,1),border-color .4s,box-shadow .5s}
html .plans.p3 > .plan{grid-row:span 5}
html .plans > .plan:hover{transform:translateY(-6px);border-color:rgba(254,251,241,.16);box-shadow:inset 0 1px 0 rgba(254,251,241,.08),0 40px 80px -40px rgba(0,0,0,.9)}
html .plans .plan .h3{margin:0;font-size:21px;font-weight:600;letter-spacing:-.015em;line-height:1.25;color:#FEFBF1;text-wrap:balance}
html .plans .plan .h3 + .small,html .plans .plan .small{margin-top:8px !important;font-size:11.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#8C979F}
html .plans .plan .price{margin-top:26px;padding:22px 0;border-top:1px solid rgba(254,251,241,.08);border-bottom:1px solid rgba(254,251,241,.08);font-size:clamp(30px,2.6vw,38px);font-weight:300;letter-spacing:-.03em;line-height:1;color:#FEFBF1;font-variant-numeric:tabular-nums;white-space:normal}
html .plans .plan .price .was,html .plans .plan .price s{font-size:.5em;color:#7E8A93;margin-inline-start:10px}
html .plans .plan ul{list-style:none;margin:0;padding:24px 0 30px;display:flex;flex-direction:column;gap:14px}
html .plans .plan li{display:flex;gap:12px;align-items:flex-start;font-size:14.5px;line-height:1.5;color:#AEB9C1}
html .plans .plan li svg{flex:none;width:18px;height:18px;padding:4px;margin-top:1px;border-radius:50%;background:rgba(242,165,65,.12);box-shadow:inset 0 0 0 1px rgba(242,165,65,.3)}
html .plans .plan .ghost,html .plans .plan .out{display:flex;align-items:center;justify-content:center;width:100%;border-radius:14px;min-height:48px;border:1px solid rgba(254,251,241,.16);background:none;color:#FEFBF1;font-weight:700;text-decoration:none;transition:border-color .3s,color .3s,background .3s}
html .plans .plan .ghost:hover,html .plans .plan .out:hover{border-color:#F2A541;color:#F2A541;background:rgba(242,165,65,.06)}
html .plans .plan .btn{display:flex;align-items:center;justify-content:center;width:100%;border-radius:14px;min-height:48px;box-shadow:0 14px 34px -12px rgba(242,165,65,.6)}
html .plans .plan.hi{border:1px solid transparent;background:linear-gradient(180deg,#1a1510,#0f0d0b) padding-box,linear-gradient(180deg,rgba(242,165,65,.85),rgba(242,165,65,.15) 60%,rgba(242,165,65,.45)) border-box;box-shadow:0 40px 90px -40px rgba(242,165,65,.35),0 30px 60px -40px rgba(0,0,0,.8)}
html .plans .plan.hi .price{color:#F2C27F}
html .plans .plan .tagx,html .plans .plan .lbl{position:absolute;top:-12px;left:auto;right:auto;inset-inline-start:30px;padding:6px 14px;border-radius:64px;background:linear-gradient(90deg,#E4AA7C,#F4AF56);color:#0A0908;font-size:10.5px;font-weight:800;letter-spacing:.18em;box-shadow:0 8px 20px -6px rgba(242,165,65,.6)}
/* Field Guides' featured "everything" bundle: same gold edge, price and checks as the cards */
html .allin{border:1px solid transparent;border-radius:26px;background:radial-gradient(ellipse at 20% 50%,rgba(242,165,65,.14),rgba(10,9,8,0) 60%) padding-box,linear-gradient(180deg,#1a1510,#0f0d0b) padding-box,linear-gradient(180deg,rgba(242,165,65,.85),rgba(242,165,65,.15) 60%,rgba(242,165,65,.45)) border-box;box-shadow:0 40px 90px -40px rgba(242,165,65,.35)}
html .aprice{padding:18px 0;border-top:1px solid rgba(254,251,241,.08);border-bottom:1px solid rgba(254,251,241,.08);align-self:stretch}
html .aprice .now{font-size:clamp(34px,3vw,44px);font-weight:300;letter-spacing:-.03em;color:#F2C27F}
html .ac li svg{width:18px;height:18px;padding:4px;margin-top:2px;border-radius:50%;background:rgba(242,165,65,.12);box-shadow:inset 0 0 0 1px rgba(242,165,65,.3)}
html .ac .tagx2{padding:6px 14px;font-size:10.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;box-shadow:0 8px 20px -6px rgba(242,165,65,.6)}
/* secondary buttons next to the main "Get ..." button: the same outlined pill on every page */
html .ctas > .ghost,html .frow > .ghost{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 28px;border:1px solid rgba(254,251,241,.32);border-radius:64px;background:rgba(10,9,8,.25);color:#FEFBF1;font-weight:700;text-decoration:none;white-space:nowrap;transition:border-color .3s,color .3s,background .3s}
html .ctas > .btn{min-height:52px}
html .ctas > .ghost:hover,html .frow > .ghost:hover{border-color:#F2A541;color:#F2A541;background:rgba(242,165,65,.06)}
html[lang=he] .plans .plan .small,html[lang=he] .plans .plan .tagx,html[lang=he] .plans .plan .lbl{letter-spacing:.03em}
@media (prefers-reduced-motion:reduce){html .plans > .plan{transition:none}html .plans > .plan:hover{transform:none}}
"""


# ---------------------------------------------------------------- one header and footer for the whole site
# The same menu on every page (home, sales pages, shop pages), in the home page's look. Absolute links, so
# they work from any folder; the English sales pages send Hebrew visitors to their Hebrew page by themselves.
# the products in the order you work: shoot, sort, edit, finish (Matan, 24 Oct 2026: one naming pattern in the menu)
SITE_LINKS = [("/field-guides/", "Photography Guides", "מדריכי צילום"), ("/presets/#plugin", "Lightroom Plugin", "תוסף ללייטרום"),
              ("/presets/#presets", "Presets", "פריסטים"), ("/panel/", "Photoshop Plugin", "תוסף לפוטושופ"),
              ("/shop/", "Compare", "השוואה"), ("/#bundles", "Bundles", "חבילות"), ("/#about", "About Matan", "על מתן")]
MENU_ICON = ('<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" '
             'stroke-linecap="round" aria-hidden="true"><path class="m1" d="M4 8h16"/><path class="m2" d="M4 16h16"/></svg>')


def he_href(href):
    """The Hebrew address of a page: Hebrew visitors go straight there, never through the English page and its
    redirect (a second page load that shows as a flicker)."""
    if href.startswith("/#") or href == "/":
        return "/he" + href
    path, _, anchor = href.partition("#")   # a link to a section keeps it
    if path in ("/shop/", "/presets/", "/panel/", "/field-guides/"):
        return path + "he/" + (f"#{anchor}" if anchor else "")
    return href


def site_links(lang="en", current=""):
    he = lang == "he"
    return "".join(f'<a href="{he_href(href) if he else href}"{" aria-current=\"page\" class=\"is-active\"" if current and href == current else ""}>{h if he else e}</a>'
                   for href, e, h in SITE_LINKS)


def menu_button(lang="en"):
    label = "תפריט" if lang == "he" else "Menu"
    return f'<button class="nav-menu" type="button" aria-label="{label}" aria-expanded="false" aria-controls="site-links">{MENU_ICON}</button>'


FOOTER_LINKS = [("/field-guides/", "Photography guides", "מדריכי צילום"), ("/presets/#plugin", "Lightroom plugin", "תוסף ללייטרום"),
                ("/presets/#presets", "Presets", "פריסטים"), ("/panel/", "Photoshop plugin", "תוסף לפוטושופ"), ("/shop/", "All products", "כל המוצרים"), ("/account/", "My downloads", "ההורדות שלי"),
                ("/support/", "Contact support", "פנייה לתמיכה"), ("/legal/#refunds", "Refunds", "החזרים"),
                ("/legal/#terms", "Terms", "תנאים"), ("/legal/#privacy", "Privacy", "פרטיות")]


def site_footer(lang="en"):
    he = lang == "he"
    links = "".join(f'<a href="{he_href(href) if he else href}">{h if he else e}</a>' for href, e, h in FOOTER_LINKS)
    credit = "כל הצילומים: מתן שרון · contact@matanwildphotography.com" if he else "All photos: Matan Wild · contact@matanwildphotography.com"
    return (f'<footer class="site-foot">\n<div class="wrap container">\n<div class="sf-brand">{"MW - Photo Tours" if he else "MW PHOTO TOURS"}</div>\n'
            f'<nav class="sf-links" aria-label="{"קישורים" if he else "Footer"}">{links}</nav>\n<div class="sf-credit">{credit}</div>\n</div>\n</footer>')


SITE_CSS = """
html:not(.prices-on) [data-price]{visibility:hidden}
html:not(.prices-on) .btn .pr{display:none}   /* a buy button reads "Get …" until its price is in, never "Get … ·" */
.btn .pr:has([data-price]:empty){display:none}   /* …and stays so for a product whose price isn't set yet */
html .site-foot{padding:40px 0;border-top:1px solid rgba(156,177,194,.15);background:#0A0908}
html .site-foot .wrap{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px 32px;color:#9CB1C2;font:400 13px/1.5 "Google Sans","Heebo",sans-serif}
html .site-foot .sf-brand{font-weight:800;letter-spacing:.3em;color:#FEFBF1}
html[lang=he] .site-foot .sf-brand{letter-spacing:.3em;direction:ltr}
html .site-foot .sf-links{display:flex;flex-wrap:wrap;gap:8px 22px}
html .site-foot a{color:#9CB1C2;text-decoration:none;transition:color .2s}
html .site-foot a:hover{color:#FEFBF1}
html .nav .nav-menu{display:none;align-items:center;justify-content:center;width:42px;height:42px;margin-inline-start:4px;padding:0;border:0;border-radius:50%;background:transparent;color:#FEFBF1;cursor:pointer}
html .nav .nav-menu svg path{transition:transform .35s cubic-bezier(.2,.7,.2,1);transform-origin:12px 12px}
html.menu-open .nav .nav-menu .m1{transform:translateY(4px) rotate(45deg)}
html.menu-open .nav .nav-menu .m2{transform:translateY(-4px) rotate(-45deg)}
@media (max-width:1100px){
  html .nav .nav-menu{display:inline-flex}
  html .nav .links{display:flex!important;position:fixed;inset:64px 0 auto 0;z-index:39;flex-direction:column;align-items:stretch;gap:0;margin:0;padding:8px 24px 28px;background:rgba(10,9,8,.96);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid rgba(254,251,241,.08);opacity:0;transform:translateY(-8px);pointer-events:none;visibility:hidden;transition:opacity .3s ease,transform .3s ease,visibility 0s .3s}
  html.menu-open .nav .links{opacity:1;transform:none;pointer-events:auto;visibility:visible;transition:opacity .3s ease,transform .3s ease}
  html .nav .links a{padding:18px 0;font-size:17px;letter-spacing:.02em;border-bottom:1px solid rgba(254,251,241,.07)}
  html .nav .links a::after{display:none}
  html.menu-open{overflow:hidden}
  html.menu-open .nav{background:rgba(10,9,8,.96)}
}
@media (max-width:600px){html .site-foot .wrap{flex-direction:column;align-items:flex-start}}
@media (prefers-reduced-motion:reduce){html .nav .links,html .nav .nav-menu svg path{transition:none!important}}
"""


# Header icons (cart and account), shared by the sales-page tools
USER = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5"/></svg>'
CART = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.8a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17.5" cy="20" r="1.3"/></svg>'

# Photos with a smaller WebP copy next to the JPEG (same name, .webp): the home and sales pages use the WebP.
WEBP = ["1a2e3ed3f44db1f671babb09a599b29f", "8cb56471dbe5940badc7a93cad5c8bf1", "5275cc7bcd4fb7560d8f7163592e3122",
        "d5f6d2a7c84cc3346ef45e4922528351", "ce73f34a054f9959d99fd850c1df9ce5", "6d84bcea4206fe4c622103d7d3aea920"]


def use_webp(html):
    for h in WEBP:
        html = html.replace(f"{h}.jpg", f"{h}.webp")
    return html


# The logo on its own (the ibex mark, no words around it) and the site icons made from it (Oct 2026)
LOGO_MARK = "/assets/img/logo-mark.png"
BRAND = f'<a class="brand" href="/" aria-label="MWP, home"><img src="{LOGO_MARK}" alt="MWP" width="36" height="38"></a>'
ICONS = ('<link rel="icon" href="/favicon.ico" sizes="any">'
         '<link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png">'
         '<link rel="icon" type="image/png" sizes="192x192" href="/assets/img/favicon-192.png">'
         '<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">')


# Pages translated in the browser (home, shop, account, help …): with Hebrew chosen, the English text would paint
# first and then switch. This sets right-to-left at once and keeps the page invisible until i18n.js has put the
# Hebrew in (it removes he-wait), 1.5 s at most.
LANG_GUARD = ('<script>try{if(localStorage.getItem("mwp_lang")==="he"){var d=document.documentElement;d.lang="he";d.dir="rtl";'
              'd.classList.add("he-wait");setTimeout(function(){d.classList.remove("he-wait")},1500)}}catch(e){}</script>'
              '<style>html.he-wait body{visibility:hidden}</style>')


# ---------------------------------------------------------------- launch offer (Matan, 24 Oct 2026)
# The bundles sell at launch prices until this moment (Israel time). The block shows a live countdown and hides
# itself when the time is up; after that, change the prices (new migration or the admin) and Lemon Squeezy.
LAUNCH_END = "2026-11-15T23:59:00+02:00"
LAUNCH_TEXT = {
    "en": ("Launch offer", "Bundles at launch prices until 15 November. After that, prices go up and some bundles leave the shop.",
           ("days", "hrs", "min", "sec")),
    "he": ("מבצע השקה", "החבילות במחירי השקה עד 15 בנובמבר. אחרי זה המחירים עולים, וחלק מהחבילות יורדות מהחנות.",
           ("ימים", "שעות", "דקות", "שניות")),
}
LAUNCH_CSS = """
.launch{margin:28px auto 0;max-width:720px;padding:18px 22px 20px;border:1px solid rgba(244,175,86,.45);border-radius:14px;background:rgba(244,175,86,.06);text-align:center}
.launch[hidden]{display:none}
.launch-kick{margin:0;font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#F4AF56}
html[lang=he] .launch-kick{letter-spacing:normal;font-size:14px}
.launch-line{margin:8px auto 0;max-width:560px;color:#CDD7DD;font-size:15px;line-height:1.5}
.launch-count{display:flex;justify-content:center;gap:10px;margin-top:14px}
.launch-count span{display:flex;flex-direction:column;align-items:center;min-width:58px;padding:8px 6px;border-radius:10px;background:rgba(254,251,241,.06)}
.launch-count b{font-size:24px;line-height:1.1;font-weight:600;color:#FEFBF1;font-variant-numeric:tabular-nums}
.launch-count i{margin-top:3px;font-style:normal;font-size:11px;color:#9CB1C2}
"""
LAUNCH_JS = ('<script>(function(){document.querySelectorAll(".launch[data-launch-end]").forEach(function(el){'
             'var end=Date.parse(el.getAttribute("data-launch-end"));'
             'function tick(){var s=Math.floor((end-Date.now())/1000);if(!(s>0)){el.hidden=true;return false}el.hidden=false;'
             'var v={d:Math.floor(s/86400),h:Math.floor(s%86400/3600),m:Math.floor(s%3600/60),s:s%60};'
             'el.querySelectorAll("[data-u]").forEach(function(b){var n=v[b.getAttribute("data-u")];b.textContent=(n<10?"0":"")+n});return true}'
             'if(tick())setInterval(tick,1000)})})();</script>')


def launch_block(lang="en"):
    """The launch-offer notice with its countdown (hidden until the script runs, and after the offer ends)."""
    kick, line, units = LAUNCH_TEXT["he" if lang == "he" else "en"]
    cells = "".join(f'<span><b data-u="{k}">00</b><i>{u}</i></span>' for k, u in zip("dhms", units))
    return (f'<div class="launch" data-launch-end="{LAUNCH_END}" hidden><p class="launch-kick">{kick}</p>'
            f'<p class="launch-line">{line}</p><div class="launch-count" aria-hidden="true">{cells}</div></div>{LAUNCH_JS}')
