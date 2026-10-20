"""Builds index.html (the home page) in the look of the MWP sales pages.

The base styles are taken from the Field Guides page and the before/after
styles from the Presets page, so the home matches them exactly.
Run from the repository root:  python3 tools/build_home.py
"""
import re

# The home page's base styles and RAW/final slider styles, kept from Matan's original sales-page designs
# (the product pages are built by build_products.py since Oct 2026, so they no longer carry them)
base_css = open("tools/pages/home_base.css", encoding="utf-8").read()
pr_css = open("tools/pages/home_presets.css", encoding="utf-8").read()
_top = pr_css.split("@media (max-width:1100px)")[0]
ba_css = "\n".join(l for l in _top.split("\n") if re.match(r"\.(ba|recipe|rc|rf|hint)[ .{:,]", l))
ba_css += "\n@media (max-width:600px){.ba{aspect-ratio:4/5;border-radius:18px}.rc,.rf{padding:6px 12px;font-size:13px}}"

IMG = "assets/pages/img/"
import home_fx, home_story
import sys as _s, os as _o; _s.path.insert(0, _o.path.dirname(__file__))
from brand import NAV_CSS, FONTS, SITE_CSS, site_links, menu_button, site_footer, use_webp
from landing_guard import LANDING_GUARD   # no flash before signed-in ambassadors are sent to My downloads
CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F2A541" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>'
EXT = '<svg class="ext" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>'
ARROW = '<svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'

home_css = """
/* ---- home only ---- */
.skip{position:absolute;inset-inline-start:16px;top:-60px;background:#FEFBF1;color:#0A0908;padding:10px 16px;border-radius:64px;font-weight:700;z-index:50}
.skip:focus{top:12px}
.nav .wrap{justify-content:flex-start}.nav .links{margin-inline:auto}.navr{margin-inline-start:auto}.nav .links + .navr{margin-inline-start:0}.navr + .lang-toggle{margin-inline-start:-6px}
.lang-toggle{display:inline-flex;align-items:center;flex:none;height:34px;padding:3px;border-radius:64px;border:1px solid rgba(156,177,194,.35);direction:ltr}
.lang-toggle span,.lang-toggle button{display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:26px;padding:0 10px;border:0;border-radius:64px;background:none;font:600 12px/1 Montserrat,Heebo,sans-serif;letter-spacing:.06em;color:#9CB1C2;cursor:pointer}
.lang-toggle button:hover{color:#FEFBF1}
.lang-toggle .on{background:#FEFBF1;color:#0A0908;cursor:default}
.navr a.nl{color:#CDD7DD;text-decoration:none;font-weight:600;font-size:15px}
.navr a.nl:hover{color:#FEFBF1}
.fly4 a.pos{text-decoration:none;color:inherit}
.fly4 a.pos:focus-visible{outline:3px solid #F2A541;outline-offset:8px}

/* the collection: three cards, every row lines up */
.shop{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:64px}
.card{display:grid;grid-template-columns:minmax(0,1fr);grid-row:span 6;grid-template-rows:subgrid;row-gap:0;border-radius:24px;overflow:hidden;background:#141210;border:1px solid rgba(156,177,194,.14);transition:transform .35s cubic-bezier(.16,1,.3,1),border-color .35s}
.card:hover{transform:translateY(-6px);border-color:rgba(242,165,65,.45)}
.card .ph{position:relative;display:block;aspect-ratio:4/3;overflow:hidden}
.card .ph img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .8s cubic-bezier(.16,1,.3,1)}
.card:hover .ph img{transform:scale(1.04)}
.card .cb{display:contents}.shop .card>.cb>*{margin-left:28px;margin-right:28px}.card .tg{padding-top:28px}.card .nm,.card .ln{padding-top:12px}.card .act{margin-bottom:30px}.card ul{align-self:start}
.card .tg{margin:0;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#9CB1C2}
.card .nm{margin:0;font-size:30px;line-height:1.1;font-weight:800;letter-spacing:-.02em}
.card .ln{margin:0;font-size:16px;line-height:1.6;color:#CDD7DD}
.card ul{list-style:none;margin:6px 0 0;padding:16px 0 0;border-top:1px solid rgba(156,177,194,.15);display:flex;flex-direction:column;gap:9px}
.card li{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.45;color:#CDD7DD}
.card li svg{flex:none;margin-top:3px}
.card .act{display:flex;flex-direction:column;gap:10px;margin-top:12px;align-self:end}
.card .act .btn,.card .act .ghost{width:100%;white-space:nowrap;min-height:46px;padding:0 16px;font-size:15px}
[dir="rtl"] .arrow{transform:scaleX(-1)}
[dir="rtl"] .kick,[dir="rtl"] .card .tg,[dir="rtl"] .stat .t{letter-spacing:normal}
[dir="rtl"] .pg{font-family:Heebo,Montserrat,system-ui,sans-serif}

.band{position:relative;overflow:hidden;border:0;background:radial-gradient(50% 80% at 50% 0%,rgba(242,165,65,.11),rgba(242,165,65,0) 70%),radial-gradient(60% 110% at 0% 100%,rgba(16,66,58,.6),rgba(12,41,37,0) 70%),radial-gradient(60% 110% at 100% 100%,rgba(16,66,58,.6),rgba(12,41,37,0) 70%),#0A0908}
.band::before,.band::after{content:"";position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,rgba(242,165,65,0),rgba(242,165,65,.45),rgba(242,165,65,0));pointer-events:none}
.band::before{top:0}.band::after{bottom:0;opacity:.5}
.trust{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;padding-top:96px;padding-bottom:96px}
.trust > div{position:relative;display:flex;flex-direction:column;gap:10px;padding:32px 28px 30px;border-radius:22px;overflow:hidden;background:linear-gradient(180deg,rgba(254,251,241,.05),rgba(254,251,241,.012));border:1px solid rgba(254,251,241,.08);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:transform .45s cubic-bezier(.2,.8,.2,1),border-color .45s,background .45s}
.trust > div::before{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(280px circle at var(--mx,50%) var(--my,0),rgba(242,165,65,.13),rgba(242,165,65,0) 70%);opacity:0;transition:opacity .5s;pointer-events:none}
.trust > div::after{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;background:radial-gradient(220px circle at var(--mx,50%) var(--my,0),rgba(242,165,65,.85),rgba(242,165,65,0) 70%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0;transition:opacity .5s;pointer-events:none}
.trust:hover > div::before,.trust:hover > div::after{opacity:1}
.trust > div > *{position:relative;z-index:1}
.trust .ti svg{transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.trust > div:nth-child(1):hover .ti svg{animation:ti-drop .9s ease-in-out}
.trust > div:nth-child(2):hover .ti svg{animation:ti-pulse .9s ease-in-out}
.trust > div:nth-child(3):hover .ti svg{transform:rotate(180deg)}
.trust > div:nth-child(4):hover .ti svg{animation:ti-wiggle .8s ease-in-out}
@keyframes ti-drop{0%,100%{transform:translateY(0)}40%{transform:translateY(4px)}70%{transform:translateY(-1px)}}
@keyframes ti-pulse{0%,100%{transform:scale(1)}45%{transform:scale(1.18)}}
@keyframes ti-wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-12deg)}55%{transform:rotate(9deg)}80%{transform:rotate(-4deg)}}
.trust > div:hover{transform:translateY(-4px);background:linear-gradient(180deg,rgba(242,165,65,.08),rgba(254,251,241,.015))}
.trust .ti{display:flex;align-items:center;justify-content:center;width:56px;height:56px;margin-bottom:14px;border-radius:18px;color:#F2A541;background:linear-gradient(160deg,rgba(242,165,65,.2),rgba(242,165,65,.03));box-shadow:inset 0 0 0 1px rgba(242,165,65,.32),0 14px 34px -12px rgba(242,165,65,.5);transition:transform .45s cubic-bezier(.2,.8,.2,1),box-shadow .45s}
.trust > div:hover .ti{transform:scale(1.06);box-shadow:inset 0 0 0 1px rgba(242,165,65,.6),0 18px 44px -12px rgba(242,165,65,.7)}
.trust strong{font-size:18px;font-weight:700;letter-spacing:-.01em;color:#FEFBF1}
.trust > div > span:not(.ti){font-size:14.5px;line-height:1.6;color:#AEB9C1}

.faq details{border-bottom:1px solid rgba(156,177,194,.2)}
.faq summary{display:flex;justify-content:space-between;align-items:center;gap:24px;min-height:64px;padding:20px 0;font-weight:600;font-size:17px;cursor:pointer;list-style:none}
.faq summary:hover{color:#FFD08A}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";flex:none;width:36px;height:36px;border-radius:50%;border:1.5px solid rgba(242,165,65,.6);display:flex;align-items:center;justify-content:center;color:#F2A541;font-size:18px;font-weight:500}
.faq details[open] summary::after{content:"\\2212"}
.faq details div{padding:0 0 26px;color:#CDD7DD;font-size:17px;line-height:1.7;max-width:680px}

#faq.sec{padding-bottom:56px}
.about.sec{padding-top:40px}
@media (max-width:600px){#faq.sec{padding-bottom:40px}.about.sec{padding-top:24px}}
.about-card{position:relative;display:flex;flex-direction:column;min-height:640px;border-radius:28px;overflow:hidden;background:radial-gradient(90% 120% at 0% 0%,#1A1612 0%,#0F0D0B 60%);border:1px solid rgba(254,251,241,.08);box-shadow:0 40px 120px -40px rgba(0,0,0,.8)}
.about-ph{position:absolute;inset-block:0;inset-inline-end:0;width:56%;margin:0}
.about-ph img{display:block;width:100%;height:100%;object-fit:cover;object-position:45% 30%;-webkit-mask-image:linear-gradient(to right,transparent 0,rgba(0,0,0,.55) 22%,#000 48%);mask-image:linear-gradient(to right,transparent 0,rgba(0,0,0,.55) 22%,#000 48%)}
[dir="rtl"] .about-ph img{-webkit-mask-image:linear-gradient(to left,transparent 0,rgba(0,0,0,.55) 22%,#000 48%);mask-image:linear-gradient(to left,transparent 0,rgba(0,0,0,.55) 22%,#000 48%)}
.about-body{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;justify-content:center;width:min(580px,49%);padding:72px 0 64px;padding-inline-start:72px}
.about-body .h2{margin-top:18px;font-size:clamp(34px,3.6vw,54px)}
.about-intro{margin:28px 0 0;font-size:clamp(18px,1.45vw,21px);line-height:1.55;color:#FEFBF1;text-wrap:pretty}
.about-more{margin:16px 0 0;font-size:16px;line-height:1.7;color:#9CB1C2;text-wrap:pretty}
.about-go{display:inline-flex;align-self:flex-start;align-items:center;gap:10px;margin-top:36px;text-decoration:none}
[dir="rtl"] .about-go .ext{transform:scaleX(-1)}
.roles{position:relative;z-index:1;list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid rgba(254,251,241,.1);background:rgba(10,9,8,.62);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}
.roles li{display:flex;flex-direction:column;gap:8px;padding:28px 40px}
.roles li:first-child{padding-inline-start:72px}
.roles li + li{border-inline-start:1px solid rgba(254,251,241,.08)}
.roles span{font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#F2A541}
[dir="rtl"] .roles span{letter-spacing:normal}
.roles strong{font-size:18px;line-height:1.35;font-weight:600;color:#FEFBF1}
@media (max-width:1100px){.about-body{width:52%;padding-inline-start:48px}.about-intro{font-size:17px}.about-more{font-size:15px}.roles li{padding:24px 28px}.roles li:first-child{padding-inline-start:48px}.about-ph{width:52%}}
@media (max-width:900px){
  .about-card{min-height:0;border-radius:22px}
  .about-ph{position:relative;inset:auto;width:100%;aspect-ratio:4/3}
  .about-ph img,[dir="rtl"] .about-ph img{object-position:50% 30%;-webkit-mask-image:linear-gradient(to bottom,#000 55%,transparent 100%);mask-image:linear-gradient(to bottom,#000 55%,transparent 100%)}
  .about-body{width:auto;margin-top:-24px;padding:0 24px 36px}
  .about-body .h2{margin-top:14px}
  .roles{grid-template-columns:minmax(0,1fr)}
  .roles li,.roles li:first-child{padding:20px 24px}
  .roles li + li{border-inline-start:0;border-top:1px solid rgba(254,251,241,.08)}
}
@media (max-width:1100px){.shop{grid-template-columns:minmax(0,1fr);max-width:560px;margin-inline:auto}}
@media (max-width:600px){.navr a.nl.hide-sm{display:none}.card .act{flex-direction:column}}
@media (max-width:1100px){.trust{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding-top:72px;padding-bottom:72px}}
@media (max-width:600px){.trust{grid-template-columns:minmax(0,1fr);gap:12px;padding-top:56px;padding-bottom:56px}.trust > div{display:grid;grid-template-columns:52px 1fr;column-gap:16px;row-gap:4px;padding:20px}.trust .ti{grid-row:span 2;width:52px;height:52px;margin:0}}
@media (prefers-reduced-motion:reduce){.card,.card .ph img,.trust > div,.trust .ti,.trust .ti svg{transition:none;animation:none!important}}
"""

TRUST_JS = """<script>(function(){var g=document.querySelector(".trust");if(!g||!matchMedia("(hover:hover)").matches)return;
g.addEventListener("pointermove",function(e){g.querySelectorAll(":scope > div").forEach(function(c){var r=c.getBoundingClientRect();
c.style.setProperty("--mx",(e.clientX-r.left)+"px");c.style.setProperty("--my",(e.clientY-r.top)+"px")})})})();</script>"""


def box(href, img, gk, ttl, sub, left, top, delay):
    return f'''<a class="pos" href="{href}" style="left: {left}px; top: {top}px"><div class="box" style="animation-delay: {delay}s"><div class="face top"></div><div class="face spine"><span>{gk}</span></div><div class="face front"><img src="{IMG}{img}" alt=""><div class="lab"><div class="bn">MW PHOTO TOURS</div><div><div class="gk">{gk}</div><div class="ttl" data-no-i18n>{ttl}</div><div class="sub">{sub}</div></div></div></div></div><div class="shadow"></div></a>'''

def card(href, img, alt, tag, name, line, points, cta):
    lis = "".join(f"<li>{CHECK}<span>{p}</span></li>" for p in points)
    return f'''<article class="card">
<a class="ph" href="{href}" tabindex="-1" aria-hidden="true"><img src="{IMG}{img}" alt="{alt}" loading="lazy"></a>
<div class="cb">
<p class="tg">{tag}</p>
<h3 class="nm" data-no-i18n>MWP <span class="grad">{name}</span></h3>
<p class="ln">{line}</p>
<ul>{lis}</ul>
<div class="act"><a class="btn" href="{href}">{cta}</a><a class="ghost" href="{href}#buy">$0.00</a></div>
</div>
</article>'''

def plan(title, sub, price, points, cta, href, hi=False):
    lis = "".join(f"<li>{CHECK}<span>{p}</span></li>" for p in points)
    tag = '<span class="tagx">EVERYTHING</span>' if hi else ""
    btn = "btn sm" if hi else "ghost sm"
    return f'<div class="plan{" hi" if hi else ""}">{tag}<div><h3 class="h3">{title}</h3><p class="small" style="margin-top: 6px">{sub}</p></div><div class="price">{price}</div><ul>{lis}</ul><a class="{btn}" href="{href}">{cta}</a></div>'

PAIRS = [
    ("Presets · Blue Hour", "3c14b23dbb00f051684ad60fb205ed10.jpg", "fbaf19aea2af10f26b2949ab31fff094.jpg", "Light and Scene", "Blue Hour", "100%", "FINAL · MWP PRESET"),
    ("Presets · Macro Ground", "7c359a77f23f632596ebda32f1e9a72f.jpg", "84c2340ddf79f1f703f8c905e9b986be.jpg", "Light and Scene", "Macro Ground", "100%", "FINAL · MWP PRESET"),
    ("Panel · Subject Pop", "c339384fe0c6d91e7b1388d0fed7d1ae.jpg", "52e0c3d2c90942f72d31faa689449bd0.jpg", "Subject", "Pop", "60%", "FINAL · MWP PANEL"),
    ("Panel · Background Darken", "af0d1799831d0417d338c0b162975a7b.jpg", "95e0579188ba924ac89563eb21facef6.jpg", "Background", "Darken", "45%", "FINAL · MWP PANEL"),
]

html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
{LANDING_GUARD}
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>MWP · Presets, guides and tools by Matan Wild</title>
<meta name="description" content="Lightroom presets, a Photoshop plugin and editing guides from wildlife photographer Matan Wild. Instant download, secure checkout.">
<meta name="theme-color" content="#0A0908">
<meta property="og:type" content="website">
<meta property="og:site_name" content="MWP">
<meta property="og:title" content="MWP · Presets, guides and tools by Matan Wild">
<meta property="og:description" content="Lightroom presets, a Photoshop plugin and editing guides from wildlife photographer Matan Wild. Instant download, secure checkout.">
<link rel="canonical" href="https://shop.mw.photography/">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta property="og:url" content="https://shop.mw.photography/">
<meta property="og:image" content="https://shop.mw.photography/assets/img/share.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{IMG}2dd3356528167ddf9a64c0c7301c8aa3.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&amp;family=Montserrat:wght@400;500;600;700;800;900&amp;display=swap" rel="stylesheet">
<style>
{base_css}
/* before / after (from the Presets page) */
{ba_css}
{NAV_CSS}
{SITE_CSS}
{home_fx.CSS}
{home_story.CSS}
{home_css}
</style>
{FONTS}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="pg">

<nav class="nav site-header" aria-label="Main">
<div class="wrap container">
<a class="brand" href="./" aria-label="MWP, home"><img src="{IMG}2dd3356528167ddf9a64c0c7301c8aa3.png" alt=""><span>MWP</span></a>
<div class="links">{site_links()}</div>
<div class="navr"></div>
{menu_button()}
</div>
</nav>

<main id="main">
{home_story.HERO}

{home_story.STORY}


<section class="sec" id="bundles">
<div class="wrap">
<div class="head">
<p class="kick">Bundles</p>
<h2 class="h2">Shoot with the guides. <span class="b grad">Finish with the tools.</span></h2>
<p class="lead">MWP Field Guides teach what happens before the click: composition, colour, light and planning, in 4 PDF guides in English or Hebrew. The presets and the Panel carry it on into the edit, in the same look.</p>
</div>
<div class="plans">
{plan("MWP Field Guides", "Learn it in the field", '<span data-price="mwp-field-guides" data-no-i18n>$0.00</span>', ["All 4 PDF guides, 137 lessons", "Composition, colour, light and planning", "English or Hebrew"], "Get the Field Guides", "field-guides/#buy")}
{plan("Presets + Field Guides", "Shoot it, then edit it", '<span data-price="presets-field-guides" data-no-i18n>$0.00</span>', ["MWP Presets: 50 presets and 33 LUTs", "MWP Field Guides: 4 PDF guides, 137 lessons", "Composition, colour, light and planning"], "Get the bundle", "field-guides/#bundles")}
{plan("Presets + Panel", "Lightroom and Photoshop", '<span data-price="presets-panel" data-no-i18n>$0.00</span>', ["MWP Presets: 50 presets and 33 LUTs", "MWP Panel: the Photoshop plugin", "User manual and install guide"], "Get the bundle", "panel/#buy")}
{plan("The full set", "From the shot to the share", '<span data-price="full-set" data-no-i18n>$0.00</span>', ["MWP Presets: 50 presets and 33 LUTs", "MWP Panel: the Photoshop plugin", "MWP Field Guides: 4 PDF guides, 137 lessons"], "Get the full set", "presets/#bundles", hi=True)}
</div>
</div>
</section>

<section class="band" aria-label="Why buy here">
<div class="wrap trust">
<div><span class="ti" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5v11"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 16.5v2A2 2 0 0 0 6.5 20.5h11a2 2 0 0 0 2-2v-2"/></svg></span><strong>Instant download</strong><span>Your files are ready the moment you pay.</span></div>
<div><span class="ti" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v5.5c0 4.3 2.9 8.1 7 9.5 4.1-1.4 7-5.2 7-9.5V6l-7-3Z"/><path d="m9 12 2.2 2.2L15.5 10"/></svg></span><strong>Secure checkout</strong><span>Card payment through Lemon Squeezy. We never see your card.</span></div>
<div><span class="ti" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3.5V8h4.5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20.5V16h-4.5"/></svg></span><strong>Free updates</strong><span>New versions land in your downloads at no cost.</span></div>
<div><span class="ti" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12.5a7.5 7.5 0 0 1-11.2 6.5L4 20l1.1-4.4A7.5 7.5 0 1 1 20 12.5Z"/><path d="M9 11h.01M12.5 11h.01M16 11h.01" stroke-width="2.4"/></svg></span><strong>Real support</strong><span>A person replies within one business day.</span></div>
</div>
</section>
{TRUST_JS}

<section class="sec" id="faq">
<div class="wrap">
<div class="head">
<p class="kick">Before you buy</p>
<h2 class="h2">FAQs</h2>
</div>
<div class="faq">
<details><summary>How do I get my files after paying?</summary><div>You get an email straight away. Open <a href="/account/">My downloads</a>, sign in to your MWP account, and everything you bought is there.</div></details>
<details><summary>Can I download again later?</summary><div>Yes. Sign in to My downloads any time, including for future updates to products you own.</div></details>
<details><summary>Do I need an account?</summary><div>Yes. You create one with your email and a password before you pay, so your files and future updates are always waiting for you.</div></details>
<details><summary>Do they work in Photoshop (Beta)?</summary><div>Yes. MWP Panel installs in both Photoshop and Photoshop (Beta), and one computer counts once even if you use both. The presets live in Camera Raw, which both apps share. The LUTs load in either app from Color Lookup, then Load 3D LUT.</div></details>
<details><summary>What if something doesn't work for me?</summary><div>Write to <a href="/support/">support</a> and we'll help. Our <a href="/legal/#refunds">refund policy</a> has the details.</div></details>
</div>
</div>
</section>

<section class="sec about" id="about">
<div class="wrap">
<div class="about-card">
<figure class="about-ph"><img src="{IMG}matan.jpg" alt="Matan Wild" width="1062" height="1066" loading="lazy" decoding="async"></figure>
<div class="about-body">
<p class="kick">About Matan</p>
<h2 class="h2">Tools from a photographer <span class="b grad">who works in the field.</span></h2>
<p class="about-intro">Matan Wild is the founder of a platform built around a community of photographers, real-world experience and a passion for better images.</p>
<p class="about-more">Drawing on years in the field, Matan shaped an approach around what photographers really need to learn, built to make a real difference in their work.</p>
<a class="ghost about-go" href="https://mw.photography" target="_blank" rel="noopener">Visit mw.photography {EXT}</a>
</div>
<ul class="roles">
<li><span>Owner</span><strong>MW Photo Tours</strong></li>
<li><span>Founder</span><strong>The Wild Side of Photography</strong></li>
<li><span>Educator</span><strong>Mentoring photographers and content creators</strong></li>
</ul>
</div>
</div>
</section>

</main>

{site_footer()}
</div>

{home_fx.JS}
{home_story.JS}
<script src="assets/js/lib/nav.js" defer></script>
<script type="module">
  import {{ initI18n }} from "./assets/js/i18n.js";
  import {{ initCart }} from "./assets/js/lib/cart.js";
  import {{ initPrices }} from "./assets/js/lib/prices.js";
  import {{ ambassadorLanding }} from "./assets/js/lib/landing.js";
  ambassadorLanding();
  initI18n();
  initCart();
  initPrices();
</script>
</body>
</html>
'''
from brand import GOLD
for a, b in GOLD:
    html = html.replace(a, b)
from img_loading import prioritize   # hero photo first, the rest when it's near the screen
html = prioritize(html, '<section class="st-hero"', "st-hero-img")
open("index.html", "w", encoding="utf-8").write(use_webp(html))
print("index.html written", len(html))
