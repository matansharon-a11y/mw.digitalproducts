"""Builds beta/index.html: the MWP Ambassador Program page (shared by link, not indexed, no password).
Photographers read Matan's Ambassador Program terms, accept them and get MWP Presets, MWP Photoshop Plugin Panel and the
Field Guides free. Joining (the `beta` Edge Function) adds them to monday.com (Shop Ambassadors) through
Make and emails them a link to My downloads. Panel works with their own email sign-in on up to 2 computers.
The terms text below is Matan's, word for word: change it only with his OK, and bump TERMS_VERSION in
supabase/functions/beta/index.ts when it changes. Same look as the home page (dark, gold, Google Sans / Heebo).
Run: python3 tools/build_beta.py"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from brand import NAV_CSS, FONTS, BRAND, ICONS

IMG = "../assets/pages/img/"
HERO = "5275cc7bcd4fb7560d8f7163592e3122.jpg"
LOGO = "2dd3356528167ddf9a64c0c7301c8aa3.png"
CHECK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F4AF56" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'



from ambassador_terms import TERMS_VERSION, TERMS_DATE, TERMS_INTRO, TERMS, TERMS_DATE_HE, TERMS_INTRO_HE, TERMS_HE   # Matan's text (shared with the PDF)

import re as _re
from landing_guard import LANDING_GUARD   # no flash before signed-in ambassadors are sent to My downloads

# Small line icons for the eight chapters, in order.
T_ICONS = [
    '<path d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6z"/><path d="M9 12l2 2 4-4"/>',            # licence
    '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',                              # create
    '<path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16"/>',                                                     # tags
    '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="m4 16 5-5 4 4 3-3 4 4"/><circle cx="15.5" cy="9" r="1.4"/>',  # content
    '<path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',                                             # feedback
    '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',                                            # not allowed
    '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/>',                # duration
    '<path d="M12 4v16M5 8h14M7 8l-3 7h6zM17 8l-3 7h6z"/>',                                                # general
]
SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{}</svg>'
TICK = '<svg class="mk" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
CROSS = '<svg class="mk" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
COPY = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>'


INSTAGRAM = "https://www.instagram.com/mw_phototours"
FACEBOOK = "https://www.facebook.com/p/MW-Photo-Tours-61580936126537/"
OUT = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>'


def chips(html, he=False):
    """@mw_phototours and MW Photo Tours link to the Instagram and Facebook pages; the hashtags are tap-to-copy chips.
    (The words themselves stay exactly as written.)"""
    html = html.replace("@mw_phototours", f'<a class="cp" href="{INSTAGRAM}" target="_blank" rel="noopener" dir="ltr">mw_phototours{OUT}</a>')
    html = html.replace("MW Photo Tours on Facebook", f'<a class="cp" href="{FACEBOOK}" target="_blank" rel="noopener">MW Photo Tours{OUT}</a> on Facebook')
    html = html.replace("את אם־דבליו פוטו טורס בפייסבוק", f'את <a class="cp" href="{FACEBOOK}" target="_blank" rel="noopener">אם־דבליו פוטו טורס{OUT}</a> בפייסבוק')
    copy = "העתקה" if he else "Copy"
    return _re.sub(r"(#mwppanel|#mwppresets|#jointhewildsideofphotography)",
                   lambda m: f'<button type="button" class="cp" data-copy="{m.group(1)}" title="{copy}" dir="ltr">{m.group(1)}{COPY}</button>', html)


def terms_block(kind, body, chapter, he=False):
    if kind == "ul":
        cls, mark = {2: ("ok", TICK), 6: ("no", CROSS)}.get(chapter, ("", ""))
        return f'<ul class="{cls}">' + "".join(f"<li>{mark}<span>{chips(i, he)}</span></li>" for i in body) + "</ul>"
    return f"<p>{chips(body, he)}</p>"


PLUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'

# The terms as one document to read through: every chapter shown, with a contents list at the top.
def sections(terms, he=False):
    k = "h" if he else "t"   # each language has its own chapter ids (h1… / t1…)
    return "".join(
        f'<section class="ch doc" id="{k}{i}" data-t="{i}">'
        f'<h3 class="doc-h"><span class="num">{i:02d}</span><span class="ttl">{title}</span></h3>'
        f'<div class="ch-in">{"".join(terms_block(kind, body, i, he) for kind, body in blocks)}</div></section>'
        for i, (title, blocks) in enumerate(terms, 1))


def toc(terms, he=False):
    k = "h" if he else "t"
    return "".join(f'<li><a href="#{k}{i}" data-open="{i}"><span class="num">{i:02d}</span>{title}</a></li>'
                   for i, (title, _) in enumerate(terms, 1))


T_SECTIONS, T_TOC = sections(TERMS), toc(TERMS)
T_SECTIONS_HE, T_TOC_HE = sections(TERMS_HE, True), toc(TERMS_HE, True)

# The terms at a glance (our summary, not part of Matan's text). Each opens the chapter it comes from.
FACTS = [
    ("Lifetime", "licence, with every future update", 1),
    ("2", "devices, for you only", 1),
    ("3", "posts a month, plus an optional reel, first 3 months", 2),
    ("12", "months, renewable", 7),
]
FACTS_HTML = "".join(f'<a class="fact" href="#t{t}" data-open="{t}"><b>{v}</b><span>{label}</span></a>' for v, label, t in FACTS)

CSS = """
*,*::before,*::after{box-sizing:border-box}
[hidden]{display:none!important}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:#0A0908;color:#FEFBF1;-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%}
a{color:inherit}
.wrap{max-width:1200px;margin:0 auto;padding:0 40px}
.kick{margin:0;font-size:12px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:#9CB1C2}
.grad{background:linear-gradient(90deg,#E4AA7C 0%,#F4AF56 55%,#F8D29C 100%);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:600}
.hero-h{font-size:clamp(40px,5.4vw,80px);max-width:1000px;text-wrap:balance}
.h1{margin:18px 0 0;font-size:clamp(44px,6.4vw,96px);line-height:.98;font-weight:400;letter-spacing:-.04em}
.h2{margin:14px 0 0;font-size:clamp(30px,3.6vw,52px);line-height:1.06;font-weight:400;letter-spacing:-.025em;text-wrap:balance}
.lead{margin:22px 0 0;max-width:560px;font-size:clamp(16px,1.3vw,18px);line-height:1.65;color:#CDD7DD;text-wrap:pretty}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 30px;border:0;border-radius:64px;background:linear-gradient(90deg,#E4AA7C,#F4AF56);color:#0A0908;font-weight:700;font-size:16px;cursor:pointer;text-decoration:none;box-shadow:0 14px 34px -12px rgba(244,175,86,.6);transition:transform .25s,box-shadow .25s,opacity .25s}
.btn:hover{transform:translateY(-1px);box-shadow:0 18px 44px -12px rgba(244,175,86,.75)}
.btn[disabled]{opacity:.6;cursor:progress;transform:none}
.field{display:flex;flex-direction:column;gap:8px}
.field label{font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#9CB1C2}
.input{width:100%;height:54px;padding:0 18px;border-radius:14px;border:1px solid rgba(254,251,241,.14);background:rgba(10,9,8,.55);color:#FEFBF1;font-size:16px;outline:none;transition:border-color .25s,box-shadow .25s}
.input::placeholder{color:#6f7a82}
html[dir=rtl] .input[dir=ltr]{text-align:right}
.input:focus{border-color:rgba(244,175,86,.7);box-shadow:0 0 0 4px rgba(244,175,86,.12)}
.msg{min-height:22px;margin:14px 0 0;font-size:14px;color:#F4AF56}
.msg.err{color:#F2A0A0}

.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.06);animation:bgin 2.4s cubic-bezier(.2,.7,.1,1) both}
@keyframes bgin{to{transform:none}}
.shade{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,rgba(10,9,8,.35),rgba(10,9,8,.85) 70%),linear-gradient(180deg,rgba(10,9,8,.6),rgba(10,9,8,.2) 40%,#0A0908)}
.glass{position:relative;width:100%;max-width:520px;padding:44px 40px 36px;border-radius:28px;background:linear-gradient(180deg,rgba(254,251,241,.08),rgba(254,251,241,.02));border:1px solid rgba(254,251,241,.12);backdrop-filter:blur(22px) saturate(140%);-webkit-backdrop-filter:blur(22px) saturate(140%);box-shadow:0 60px 120px -40px rgba(0,0,0,.9),inset 0 1px 0 rgba(254,251,241,.1);text-align:center;animation:rise 1.2s cubic-bezier(.16,1,.3,1) .2s both}
.glass::before{content:"";position:absolute;top:0;left:15%;right:15%;height:1px;background:linear-gradient(90deg,transparent,rgba(244,175,86,.7),transparent)}
@keyframes rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
.seal{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;color:#F4AF56;background:rgba(244,175,86,.1);box-shadow:inset 0 0 0 1px rgba(244,175,86,.35),0 0 40px rgba(244,175,86,.2)}

/* after unlocking */
.reveal{opacity:0;transform:translateY(28px);transition:opacity 1s cubic-bezier(.16,1,.3,1),transform 1.1s cubic-bezier(.16,1,.3,1);transition-delay:var(--d,0s)}
.reveal.on{opacity:1;transform:none}
.top{position:relative;margin-top:-80px;min-height:100svh;display:flex;align-items:center;padding:120px 0 72px;overflow:hidden}
.top .bg{opacity:.9}
.top .shade{background:linear-gradient(180deg,rgba(10,9,8,.55) 0%,rgba(10,9,8,.2) 35%,rgba(10,9,8,.55) 75%,#0A0908 100%),radial-gradient(ellipse at 50% 55%,rgba(10,9,8,.55),transparent 70%)}
.top .wrap{position:relative;width:100%;display:flex;flex-direction:column;align-items:center;text-align:center}
.top .hero-h,.top .lead{margin-left:auto;margin-right:auto}
.badge{display:inline-flex;align-items:center;gap:10px;padding:8px 16px;border-radius:64px;background:rgba(244,175,86,.1);border:1px solid rgba(244,175,86,.4);color:#F4AF56;font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
.badge::before{content:"";width:7px;height:7px;border-radius:50%;background:#F4AF56;box-shadow:0 0 12px #F4AF56}
.sec{padding:88px 0}
.terms{padding-top:24px}
.sec.alt{background:linear-gradient(180deg,#0A0908,#0f1f1c 30%,#0f1f1c 70%,#0A0908)}
.head{max-width:720px}
.join{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:64px;align-items:start}
.join .glass{max-width:none;text-align:start;animation:none;padding:40px}
.join form{display:flex;flex-direction:column;gap:18px}
.check{display:flex;gap:14px;align-items:flex-start;font-size:14.5px;line-height:1.55;color:#CDD7DD;cursor:pointer}
.check input{flex:none;width:20px;height:20px;margin:2px 0 0;accent-color:#F4AF56;cursor:pointer}
.join .btn{width:100%;margin-top:6px}
.steps{list-style:none;margin:30px 0 0;padding:0;display:flex;flex-direction:column;gap:18px}
.steps li{display:grid;grid-template-columns:36px 1fr;gap:14px;font-size:15.5px;line-height:1.55;color:#CDD7DD}
.steps .n{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;border:1px solid rgba(244,175,86,.45);color:#F4AF56;font-size:13px;font-weight:700}
.done{text-align:center;padding:20px 0 6px}
.done .seal{margin:0 auto}
.done h3{margin:22px 0 0;font-size:30px;font-weight:400;letter-spacing:-.02em}
.done p{margin:14px auto 0;max-width:420px;font-size:16px;line-height:1.6;color:#CDD7DD}
.done .btn{margin-top:26px;width:auto}
.copy-row{display:flex;align-items:center;gap:14px;margin:26px auto 0;max-width:440px;padding:14px 16px;border:1px solid rgba(244,175,86,.28);border-radius:14px;background:rgba(244,175,86,.06);text-align:start}
.copy-ic{flex:none;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#F4AF56;border:1px solid rgba(244,175,86,.4)}
.copy-tx{flex:1;display:flex;flex-direction:column;gap:2px;font-size:14.5px;line-height:1.45;color:#CDD7DD}
.copy-tx strong{font-weight:500;color:#FEFBF1}
.copy-btn{flex:none;font:inherit;font-size:13.5px;color:#F4AF56;background:none;border:1px solid rgba(244,175,86,.45);border-radius:999px;padding:7px 14px;cursor:pointer}
.copy-btn:hover{background:rgba(244,175,86,.12)}
@media (max-width:560px){.copy-row{flex-wrap:wrap}.copy-tx{flex-basis:calc(100% - 52px)}.copy-btn{margin-inline-start:52px}}
.sheet{position:relative;max-width:900px;margin:0 auto;border-radius:28px;background:linear-gradient(180deg,rgba(254,251,241,.055),rgba(254,251,241,.015) 55%,rgba(254,251,241,.03)),#0A0908;border:1px solid rgba(254,251,241,.08);box-shadow:0 60px 120px -60px rgba(0,0,0,.95),inset 0 1px 0 rgba(254,251,241,.06);overflow:hidden}
.sheet::before{content:"";position:absolute;top:0;left:20%;right:20%;height:1px;background:linear-gradient(90deg,transparent,rgba(244,175,86,.55),transparent)}
.sh-head{position:relative;padding:56px 64px 0;text-align:center}
.sh-brand{display:inline-flex;align-items:center;gap:12px}
.sh-brand img{width:34px;height:34px;object-fit:contain}
.sh-brand .kick{font-size:13px;letter-spacing:.28em}
.sh-brand .kick{margin:0}
.sh-title{margin:20px 0 0;font-size:clamp(34px,4.2vw,56px);font-weight:400;line-height:1.08;letter-spacing:-.015em}
.sh-title .grad{font-weight:600}
.sh-meta{margin:14px 0 0;font-size:14px;color:#8C979F}
html[lang=he] .only-en,html:not([lang=he]) .only-he{display:none!important}
.only-he.sh-body{font-family:Heebo,"Google Sans",sans-serif}
html[dir=rtl] .doc-h,html[dir=rtl] .toc a{text-align:right}
.only-he .ch.doc .ch-in{padding-left:0;padding-right:52px}
.facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:40px 64px 0;border-top:1px solid rgba(254,251,241,.08);border-bottom:1px solid rgba(254,251,241,.08)}
.fact{display:flex;flex-direction:column;align-items:center;gap:6px;padding:24px 14px;text-align:center;text-decoration:none;transition:background .3s}
.fact+.fact{border-inline-start:1px solid rgba(254,251,241,.08)}
.fact:hover{background:rgba(254,251,241,.03)}
.fact:hover b{color:#F8D29C}
.fact b{font-size:clamp(26px,2.6vw,34px);font-weight:400;letter-spacing:-.03em;line-height:1;color:#FEFBF1;font-variant-numeric:tabular-nums}
.fact span{margin-top:6px;font-size:11px;font-weight:700;line-height:1.5;letter-spacing:.14em;text-transform:uppercase;color:#8C979F;max-width:180px}
html[lang=he] .fact span{letter-spacing:.03em}
.sh-body{position:relative;padding:40px 64px 56px}
.t-intro p{margin:0;font-size:17px;line-height:1.7;color:#CDD7DD;text-wrap:pretty}
.t-intro p.agree{margin-top:18px;font-size:15px;font-weight:600;color:#F4AF56}
.ch-tools{display:flex;align-items:center;justify-content:space-between;margin-top:44px;padding-bottom:14px;border-bottom:1px solid rgba(254,251,241,.08)}
.ch-tools p{margin:0;font-size:12px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:#9CB1C2}
.ch-all{border:0;background:none;padding:6px 0;color:#F4AF56;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.ch-all:hover{color:#F8D29C}
.ch{border-bottom:1px solid rgba(254,251,241,.08);scroll-margin-top:96px}
.toc{margin-top:40px;padding:22px 26px;border-radius:18px;background:rgba(254,251,241,.025);border:1px solid rgba(254,251,241,.07)}
.toc p{margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:#9CB1C2}
.toc ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:6px 28px}
.toc a{display:flex;gap:12px;padding:5px 0;color:#CDD7DD;font-size:15px;text-decoration:none;transition:color .2s}
.toc a:hover{color:#F4AF56}
.toc .num{flex:none;width:22px;font-size:12px;font-weight:700;color:#8C979F;font-variant-numeric:tabular-nums;line-height:1.9}
.ch.doc{border-bottom:0;padding-top:12px}
.doc-h{display:grid;grid-template-columns:52px minmax(0,1fr);align-items:baseline;margin:30px 0 14px;padding-top:26px;border-top:1px solid rgba(254,251,241,.08);font-weight:600}
.doc-h .num{font-size:13px;font-weight:700;color:#F4AF56;font-variant-numeric:tabular-nums;letter-spacing:.06em}
.doc-h .ttl{font-size:21px;letter-spacing:-.015em;color:#FEFBF1}
.ch.doc .ch-in{overflow:visible;opacity:1}
.ch.doc .ch-in>:last-child{margin-bottom:6px}
.ch h3{margin:0}
.ch-b{display:grid;grid-template-columns:52px minmax(0,1fr) 36px;align-items:center;width:100%;padding:24px 0;border:0;background:none;color:#FEFBF1;font:inherit;text-align:left;cursor:pointer}
.ch-b .num{font-size:13px;font-weight:700;color:#8C979F;font-variant-numeric:tabular-nums;letter-spacing:.06em;transition:color .3s}
.ch-b .ttl{font-size:19px;font-weight:600;letter-spacing:-.015em;transition:color .3s}
.ch-b .pm{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;border:1px solid rgba(254,251,241,.14);color:#CDD7DD;transition:transform .45s cubic-bezier(.2,.8,.2,1),border-color .3s,background .3s,color .3s}
.ch-b:hover .ttl{color:#FEFBF1}
.ch-b:hover .num{color:#F4AF56}
.ch-b:hover .pm{border-color:rgba(244,175,86,.6);color:#F4AF56}
.ch-b:focus-visible{outline:2px solid rgba(244,175,86,.6);outline-offset:4px;border-radius:8px}
.ch.open .num{color:#F4AF56}
.ch.open .pm{transform:rotate(45deg);background:#F4AF56;border-color:#F4AF56;color:#0A0908}
.ch-p{display:grid;grid-template-rows:0fr;transition:grid-template-rows .55s cubic-bezier(.2,.8,.2,1)}
.ch.open .ch-p{grid-template-rows:1fr}
.ch-in{min-height:0;overflow:hidden;padding-left:52px;opacity:0;transition:opacity .4s}
.ch.open .ch-in{opacity:1;transition:opacity .5s .1s}
.ch-in>:last-child{margin-bottom:28px}
.ch-in p{margin:0 0 14px;font-size:16px;line-height:1.75;color:#AEB9C1}
.ch-in strong{color:#FEFBF1;font-weight:600}
.ch-in a{color:#F4AF56}
.ch-in ul{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-direction:column;gap:10px}
.ch-in li{display:flex;gap:12px;align-items:flex-start;font-size:16px;line-height:1.65;color:#CDD7DD}
.ch-in ul:not(.ok):not(.no) li::before{content:"";flex:none;width:5px;height:5px;margin:.68em 4px 0 2px;border-radius:50%;background:#F4AF56}
.ch-in li .mk{flex:none;width:20px;height:20px;padding:4px;margin-top:2px;border-radius:50%}
.ch-in ul.ok li .mk{color:#F4AF56;background:rgba(244,175,86,.12)}
.ch-in ul.no li .mk{color:#F2A0A0;background:rgba(242,160,160,.1)}
.sh-foot{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:40px}
.sh-foot p{margin:0;font-size:15px;color:#9CB1C2}
.cp{text-decoration:none;display:inline-flex;align-items:center;gap:6px;margin:2px 1px;padding:2px 10px;border-radius:64px;border:1px solid rgba(244,175,86,.4);background:rgba(244,175,86,.08);color:#F4AF56;font:inherit;font-size:.92em;font-weight:600;cursor:pointer;vertical-align:baseline;transition:background .25s,transform .2s}
.cp:hover{background:rgba(244,175,86,.18)}
.cp:active{transform:scale(.96)}
.cp svg{opacity:.7}
.cp.done{background:#F4AF56;color:#0A0908}
.copied{position:fixed;left:50%;bottom:28px;z-index:60;transform:translate(-50%,20px);opacity:0;padding:10px 18px;border-radius:64px;background:#FEFBF1;color:#0A0908;font-size:14px;font-weight:600;pointer-events:none;transition:all .35s cubic-bezier(.2,.8,.2,1)}
.copied.show{opacity:1;transform:translate(-50%,0)}
.acc-step{animation:stepin .7s cubic-bezier(.16,1,.3,1) both}
@keyframes stepin{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
#step-details .kick{margin-top:0}
#join-form{display:flex;flex-direction:column;gap:18px;margin-top:30px;text-align:start}
#join-form .btn{width:100%;margin-top:4px}
.acc-ok{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#F4AF56}
.acc-ok::before{content:"";width:8px;height:8px;border-radius:50%;background:#F4AF56;box-shadow:0 0 10px #F4AF56}
.modal{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:20px;overflow-y:auto}
.modal-back{position:fixed;inset:0;background:rgba(5,4,4,.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:fadein .35s both}
@keyframes fadein{from{opacity:0}}
.modal-sheet{width:100%;max-width:900px;margin:auto;overflow:clip;animation:modalin .55s cubic-bezier(.16,1,.3,1) both}
.modal.modal-terms{align-items:start;padding:40px 20px 0}
.modal-terms .modal-sheet{border-bottom-left-radius:0;border-bottom-right-radius:0;min-height:calc(100svh - 40px)}
.modal-sheet .modal-x{z-index:3}
.sh-bar{position:sticky;bottom:0;margin-top:auto;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 64px;background:rgba(10,9,8,.96);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-top:1px solid rgba(254,251,241,.08)}
.sh-bar p{margin:0;font-size:14px;color:#9CB1C2}
.sh-bar-b{display:flex;gap:10px}
.btn-ghost{background:rgba(10,9,8,.25);border:1px solid rgba(254,251,241,.32);color:#FEFBF1;box-shadow:none}
.btn-ghost:hover{border-color:rgba(254,251,241,.6);background:rgba(254,251,241,.06);box-shadow:none;transform:none}
.modal-card{position:relative;width:100%;max-width:560px;margin:auto;padding:44px 44px 38px;text-align:center;background:linear-gradient(180deg,rgba(254,251,241,.055),rgba(254,251,241,.015) 55%,rgba(254,251,241,.03)),#0A0908;animation:modalin .55s cubic-bezier(.16,1,.3,1) both}
@keyframes modalin{from{opacity:0;transform:translateY(24px) scale(.97)}}
.modal-card .h2{font-size:clamp(30px,3.4vw,40px)}
.modal-card .lead{margin:14px auto 0;font-size:16px}
.modal-x{position:absolute;top:18px;inset-inline-end:18px;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;border:1px solid rgba(254,251,241,.14);background:rgba(254,251,241,.04);color:#CDD7DD;cursor:pointer;transition:all .25s}
.modal-x:hover{border-color:rgba(244,175,86,.6);color:#F4AF56;transform:rotate(90deg)}
html.modal-on{overflow:hidden}
.pw{position:relative}
.pw .input{padding-inline-end:52px}
.pw-eye{position:absolute;top:50%;inset-inline-end:8px;transform:translateY(-50%);display:grid;place-items:center;width:38px;height:38px;border:0;border-radius:50%;background:none;color:#9CB1C2;cursor:pointer}
.pw-eye:hover,.pw-eye[aria-pressed=true]{color:#F4AF56;background:rgba(254,251,241,.06)}
.pw-hint{margin:2px 0 0;font-size:13px;line-height:1.5;color:#7E8A93}
.q-h{margin:14px 0 -4px;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#F4AF56}
html[lang=he] .q-h{letter-spacing:.04em}
.q-note{margin:0;font-size:14.5px;line-height:1.6;color:#CDD7DD}
fieldset.field{margin:0;padding:0;border:0;min-width:0}
fieldset.field legend{padding:0;margin-bottom:8px;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#9CB1C2}
html[lang=he] fieldset.field legend{letter-spacing:.04em}
.field label,fieldset.field legend{line-height:1.45}
.input.area{height:auto;min-height:96px;padding:14px 18px;line-height:1.5;resize:vertical;font:inherit;font-size:16px}
.opts{display:flex;flex-wrap:wrap;gap:8px}
.field[hidden]{display:none}
.opt{position:relative;display:inline-flex;cursor:pointer;text-transform:none!important;letter-spacing:0!important;font-size:15px!important;font-weight:600!important;color:#FEFBF1!important}
.opt input{position:absolute;opacity:0;pointer-events:none}
.opt span{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:64px;border:1px solid rgba(254,251,241,.18);background:rgba(10,9,8,.45);transition:all .2s}
.opt:hover span{border-color:rgba(244,175,86,.5)}
.opt input:checked+span{background:linear-gradient(90deg,#E4AA7C,#F4AF56);border-color:transparent;color:#0A0908}
.opt input:focus-visible+span{box-shadow:0 0 0 4px rgba(244,175,86,.25)}
.full-note{display:inline-flex;align-items:center;gap:12px;margin:34px 0 0;padding:14px 22px;border-radius:64px;background:rgba(10,9,8,.55);border:1px solid rgba(254,251,241,.18);color:#FEFBF1;font-size:16px;font-weight:600}
.full-note .dot{width:8px;height:8px;border-radius:50%;background:#9CB1C2}
.meta-note{font-size:14.5px!important;color:#9CB1C2!important}
.acc-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:4px}
.acc-head .kick{margin:0}
.acc-date{font-size:13px;color:#9CB1C2}
.sig{position:relative;padding:7px;border-radius:20px;background:linear-gradient(145deg,rgba(244,175,86,.38),rgba(254,251,241,.06) 35%,rgba(254,251,241,.04) 65%,rgba(228,170,124,.3));box-shadow:0 30px 60px -36px rgba(0,0,0,.9);transition:box-shadow .6s}
.sig-in{position:relative;padding:26px 30px 22px;border-radius:14px;background:radial-gradient(120% 90% at 0% 0%,rgba(244,175,86,.10),transparent 60%),linear-gradient(180deg,#141210,#0d0c0b);box-shadow:inset 0 0 0 1px rgba(244,175,86,.16);overflow:hidden}
.sig-in::after{content:"";position:absolute;inset:-40% -60%;background:linear-gradient(105deg,transparent 42%,rgba(254,251,241,.07) 50%,transparent 58%);transform:translateX(-60%);pointer-events:none}
.sig.signed .sig-in::after{animation:sheen 1.6s cubic-bezier(.2,.7,.1,1) .25s both}
@keyframes sheen{to{transform:translateX(60%)}}
.sig-l{margin:0;font-size:10.5px;font-weight:700;letter-spacing:.32em;text-transform:uppercase;color:#9CB1C2}
.sig-name{margin:14px 0 0;min-height:1.15em;font-size:clamp(30px,3vw,38px);font-weight:400;line-height:1.1;letter-spacing:-.025em;color:rgba(254,251,241,.22);transition:color .4s;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sig.typed .sig-name{background:linear-gradient(90deg,#FEFBF1 0%,#F8D29C 60%,#F4AF56 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
html[dir=rtl] .sig.typed .sig-name{background:linear-gradient(270deg,#FEFBF1 0%,#F8D29C 60%,#F4AF56 100%);-webkit-background-clip:text;background-clip:text}
.sig-rule{position:relative;display:block;height:1px;margin-top:12px;background:rgba(254,251,241,.12)}
.sig-rule::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#F4AF56,rgba(244,175,86,.15));transform:scaleX(0);transform-origin:left;transition:transform 1.1s cubic-bezier(.2,.8,.2,1)}
html[dir=rtl] .sig-rule::after{background:linear-gradient(270deg,#F4AF56,rgba(244,175,86,.15));transform-origin:right}
.sig.typed .sig-rule::after{transform:scaleX(1)}
.sig-meta{margin:12px 0 0;min-height:18px;font-size:13px;letter-spacing:.02em;color:#AEB9C1}
.sig-what{margin:4px 0 0;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#6f7a82}
.sig-seal{position:absolute;top:22px;inset-inline-end:24px;display:grid;place-items:center;width:62px;height:62px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#2a2219,#0d0c0b 70%);box-shadow:0 0 0 1px rgba(244,175,86,.55),0 0 0 5px rgba(13,12,11,.9),0 0 0 6px rgba(244,175,86,.25),0 12px 30px -8px rgba(244,175,86,.35);opacity:.25;transform:scale(.85) rotate(-14deg);filter:grayscale(1);transition:all .8s cubic-bezier(.2,.8,.2,1)}
.sig-seal img{width:34px;height:34px;object-fit:contain;opacity:.95}
.sig-seal i{position:absolute;bottom:-2px;inset-inline-end:-2px;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#E4AA7C,#F4AF56);color:#0A0908;box-shadow:0 0 0 3px #0d0c0b;transform:scale(0);transition:transform .5s cubic-bezier(.3,1.6,.5,1) .35s}
.sig.signed .sig-seal{opacity:1;transform:none;filter:none}
.sig.signed .sig-seal i{transform:scale(1)}
.sig.signed{box-shadow:0 30px 70px -30px rgba(244,175,86,.35)}
.sig .sig-in{padding-inline-end:104px}
html[lang=he] .sig-l,html[lang=he] .sig-what{letter-spacing:.06em}
@media (max-width:600px){.sig-in{padding:22px 20px 18px}.sig .sig-in{padding-inline-end:84px}.sig-seal{width:52px;height:52px;top:18px;inset-inline-end:18px}.sig-seal img{width:28px;height:28px}}
@media (max-width:760px){
 .only-he .ch.doc .ch-in{padding-right:0}.toc ol{grid-template-columns:1fr}.toc{padding:18px}.doc-h{grid-template-columns:40px minmax(0,1fr)}.doc-h .ttl{font-size:19px}.ch.doc .ch-in{padding-left:0}
 .modal.modal-terms{padding:10px 10px 0}.modal-terms .modal-sheet{min-height:calc(100svh - 10px)}.sh-bar{padding:14px 16px;flex-direction:column;align-items:stretch;text-align:center;gap:10px}.sh-bar-b{flex-direction:column-reverse}.sh-bar .btn{width:100%;min-height:48px}
 .sh-head{padding:40px 22px 0}.facts{grid-template-columns:repeat(2,minmax(0,1fr));margin:30px 22px 0}
 .fact:nth-child(3){border-inline-start:0}.fact:nth-child(n+3){border-top:1px solid rgba(254,251,241,.08)}
 .sh-body{padding:30px 22px 36px}.t-intro p{font-size:16px}
 .ch-b{grid-template-columns:40px minmax(0,1fr) 34px;padding:20px 0}.ch-b .ttl{font-size:18px}.ch-in{padding-left:0}
 .sh-foot{flex-direction:column;align-items:stretch;text-align:center}.sheet{border-radius:24px}
}
.link-gold{color:#F4AF56;text-decoration:underline;text-decoration-color:rgba(244,175,86,.4);text-underline-offset:3px}
.link-gold:hover{text-decoration-color:#F4AF56}
.foot{padding:56px 0 70px;border-top:1px solid rgba(254,251,241,.06);font-size:13px;color:#7E8A93;text-align:center}
html[lang=he] .kick,html[lang=he] .field label,html[lang=he] .badge{letter-spacing:.04em}
@media (max-width:600px){.wrap{padding:0 20px}.glass{padding:34px 22px 28px;border-radius:22px}.top{margin-top:-64px;padding:96px 0 64px}.sec{padding:80px 0}.modal{padding:12px}.modal-card{padding:56px 20px 28px}}
@media (prefers-reduced-motion:reduce){.bg,.glass{animation:none}.reveal{opacity:1;transform:none;transition:none}}
"""


def ver():
    """Fingerprint of the page script and the code it uses, so browsers fetch the new one after every change."""
    import hashlib
    h = hashlib.sha1()
    for f in ["assets/js/pages/beta.js", "assets/js/i18n.js"] + sorted(
            os.path.join("assets/js/lib", n) for n in os.listdir("assets/js/lib")):
        h.update(open(f, "rb").read())
    return h.hexdigest()[:8]


html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
{LANDING_GUARD}
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>MWP Ambassador Program</title>
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#0A0908">
{ICONS}
<style>
{CSS}
{NAV_CSS}
/* Beta page: one steady header. No height change and no blur when scrolling or hovering (the page is
   short, and a blur over the big photo can flicker in Chrome on Windows). */
html .nav,html.nav-scrolled .nav{{background:linear-gradient(180deg,rgba(10,9,8,.82),rgba(10,9,8,.45));border-bottom:1px solid rgba(254,251,241,.06);backdrop-filter:none!important;-webkit-backdrop-filter:none!important;transition:none}}
html .nav .wrap,html.nav-scrolled .nav .wrap{{height:80px;transition:none}}
@media (max-width:600px){{html .nav .wrap,html.nav-scrolled .nav .wrap{{height:64px}}}}
</style>
{FONTS}
</head>
<body>
<nav class="nav site-header" aria-label="Main">
<div class="wrap container">
{BRAND}
<div class="navr"></div>
</div>
</nav>

<main id="main">
<div class="in">
<section class="top" id="top">
<img class="bg" src="{IMG}{HERO}" alt="">
<div class="shade"></div>
<div class="wrap">
<h1 class="h1 hero-h reveal" id="hero-h" style="--d:.08s">Create with MWP.<br><span class="grad">Join our Ambassador Program.</span></h1>
<p class="lead reveal" id="hero-lead" style="--d:.16s">A small group of selected photographers gets MWP Presets, MWP Photoshop Plugin Panel and the Field Guides free. In return, create with them, share your work and tell us what you think.</p>
<p class="reveal hero-cta" style="--d:.24s;margin-top:34px"><button type="button" class="btn" data-apply id="apply-cta">Apply now</button><button type="button" class="btn" data-terms id="accept-cta" hidden>Read and accept the terms</button><a class="btn" id="downloads-cta" href="/account/" hidden>Go to My downloads</a></p>
<p class="full-note reveal" id="full-note" style="--d:.24s" hidden><span class="dot"></span>The Ambassador Program is full. Thank you for your interest.</p>
</div>
</section>



<div class="modal modal-terms" id="terms-modal" hidden>
<div class="modal-back" data-close></div>
<div class="sheet modal-sheet" role="dialog" aria-modal="true" aria-labelledby="terms-h">
<button type="button" class="modal-x" data-close aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>

<header class="sh-head">
<div class="sh-brand"><img src="/assets/img/logo-mark.png" alt=""><p class="kick">MWP Ambassador Program</p></div>
<h2 class="sh-title" id="terms-h">Terms of <span class="grad">Use.</span></h2>
<p class="sh-meta only-en" data-no-i18n>{TERMS_DATE} · Matan Wild</p>
<p class="sh-meta only-he" lang="he" dir="rtl" data-no-i18n>{TERMS_DATE_HE} · מתן וויילד</p>
</header>
<div class="facts">{FACTS_HTML}</div>
<div class="sh-body only-en" lang="en" dir="ltr" data-no-i18n>
<div class="t-intro"><p>{TERMS_INTRO[0]}</p><p class="agree">{TERMS_INTRO[1]}</p></div>
<nav class="toc" aria-label="Contents"><p>Contents</p><ol>{T_TOC}</ol></nav>
{T_SECTIONS}
</div>
<div class="sh-body only-he" lang="he" dir="rtl" data-no-i18n>
<div class="t-intro"><p>{TERMS_INTRO_HE[0]}</p><p class="agree">{TERMS_INTRO_HE[1]}</p></div>
<nav class="toc" aria-label="תוכן העניינים"><p>תוכן העניינים</p><ol>{T_TOC_HE}</ol></nav>
{T_SECTIONS_HE}
</div>
<div class="sh-bar">
<p>By accepting, you agree to these terms.</p>
<div class="sh-bar-b"><button type="button" class="btn btn-ghost" data-close>Close</button><button type="button" class="btn" id="agree-btn">I've read and accept the terms</button></div>
</div>
</div>
</div>
<div class="modal" id="join-modal" hidden>
<div class="modal-back" data-close></div>
<div class="modal-card glass" role="dialog" aria-modal="true" aria-labelledby="details-h">
<button type="button" class="modal-x" data-close aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
<div class="acc-step" id="step-details">
<p class="kick">Ambassador Program · Application</p>
<h2 class="h2" id="details-h">Let's get to <span class="grad">know you.</span></h2>
<p class="lead">There are no right or wrong answers. We'd just like to get to know you a little and make sure the program works for you. It takes about 5 minutes.</p>
<form id="join-form" novalidate>
<h3 class="q-h">About you</h3>
<div class="field"><label for="j-name">Your name</label><input class="input" id="j-name" name="name" autocomplete="name" required></div>
<div class="field"><label for="j-email">Email</label><input class="input" id="j-email" name="email" type="email" dir="ltr" autocomplete="email" required></div>
<div class="field"><label for="j-ig">Instagram</label><input class="input" id="j-ig" name="instagram" dir="ltr" placeholder="@yourhandle" autocomplete="off" required></div>
<div class="field"><label for="j-fb">Facebook</label><input class="input" id="j-fb" name="facebook" dir="ltr" placeholder="Your name or profile link" autocomplete="off"></div>
<div class="field"><label for="j-platforms">Any other platforms you share on?</label><input class="input" id="j-platforms" name="platforms" placeholder="TikTok, YouTube, blog…" autocomplete="off"></div>
<h3 class="q-h">Your photography</h3>
<div class="field"><label for="j-shoot">What do you love to photograph?</label><input class="input" id="j-shoot" name="shoot" required></div>
<div class="field"><label for="j-years">How long have you been photographing?</label><input class="input" id="j-years" name="years" required></div>
<fieldset class="field"><legend>Is photography a hobby, a side income or your profession?</legend><div class="opts"><label class="opt"><input type="radio" name="role" value="Hobby" required><span>Hobby</span></label><label class="opt"><input type="radio" name="role" value="Side income"><span>Side income</span></label><label class="opt"><input type="radio" name="role" value="Profession"><span>Profession</span></label></div></fieldset>
<div class="field"><label for="j-work">Where can we see your work?</label><input class="input" id="j-work" name="work" placeholder="Website, portfolio or Instagram" required></div>
<h3 class="q-h">Editing</h3>
<div class="field"><label for="j-software">Which software do you edit with?</label><input class="input" id="j-software" name="software" required></div>
<fieldset class="field"><legend>Which of these do you use?</legend><div class="opts"><label class="opt"><input type="checkbox" name="apps" value="Photoshop"><span>Photoshop</span></label><label class="opt"><input type="checkbox" name="apps" value="Lightroom Classic"><span>Lightroom Classic</span></label><label class="opt"><input type="checkbox" name="apps" value="Lightroom mobile"><span>Lightroom mobile</span></label><label class="opt"><input type="checkbox" name="apps" value="None of these"><span>None of these</span></label></div></fieldset>
<fieldset class="field"><legend>On which devices?</legend><div class="opts"><label class="opt"><input type="checkbox" name="devices" value="Windows"><span>Windows</span></label><label class="opt"><input type="checkbox" name="devices" value="Mac"><span>Mac</span></label><label class="opt"><input type="checkbox" name="devices" value="Phone"><span>Phone</span></label><label class="opt"><input type="checkbox" name="devices" value="Tablet"><span>Tablet</span></label></div></fieldset>
<fieldset class="field"><legend>Have you used editing panels or presets before?</legend><div class="opts"><label class="opt"><input type="radio" name="used_before" value="Yes" required><span>Yes</span></label><label class="opt"><input type="radio" name="used_before" value="No"><span>No</span></label></div></fieldset>
<h3 class="q-h">What matters to you</h3>
<div class="field"><label for="j-why">Why would you like to be an MWP ambassador?</label><textarea class="input area" id="j-why" name="why" rows="3" required></textarea></div>
<div class="field"><label for="j-values">What values are important to you in your photography and in the way you share it?</label><textarea class="input area" id="j-values" name="values" rows="3" required></textarea></div>
<h3 class="q-h">The program</h3>
<p class="q-note">A quick reminder of what we ask: in the first 3 months, 3 posts and 1 optional reel a month plus 1 story a week, tagging us. After that, just tag us whenever you use the tools and love the result. We'd also love your feedback and bug reports so we can keep improving.</p>
<fieldset class="field"><legend>Does this sound good to you?</legend><div class="opts"><label class="opt"><input type="radio" name="sounds_good" value="Yes" required><span>Yes</span></label><label class="opt"><input type="radio" name="sounds_good" value="I have a question"><span>I have a question</span></label></div></fieldset>
<div class="field" id="question-field" hidden><label for="j-question">Your question</label><textarea class="input area" id="j-question" name="question" rows="3"></textarea></div>
<fieldset class="field"><legend>Are you happy to send us feedback and report bugs when you find them?</legend><div class="opts"><label class="opt"><input type="radio" name="feedback" value="Yes" required><span>Yes</span></label><label class="opt"><input type="radio" name="feedback" value="No"><span>No</span></label></div></fieldset>
<button class="btn" type="submit">Send my application</button>
<p class="msg" id="join-msg" role="status"></p>
</form>
</div>
<div class="done" id="join-done" hidden>
<span class="seal"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>
<h3 id="done-h">Thank you!</h3>
<p id="done-text">We read every application personally, so it may take us a few days to get back to you.</p>
</div>
</div>
</div>
<footer class="foot"><div class="wrap">MWP · by Matan Wild · Ambassador access is personal.</div></footer>
</div>
</main>

<script src="../assets/js/lib/nav.js" defer></script>
<script type="module" src="../assets/js/pages/beta.js?v={ver()}"></script>
<script>setTimeout(function(){{document.querySelectorAll(".reveal").forEach(function(e){{e.classList.add("on")}})}},1200)</script>
</body>
</html>
"""

os.makedirs("beta", exist_ok=True)
open("beta/index.html", "w", encoding="utf-8").write(html)
# Safety net: anything that lands on /beta/account.html (an old link, a relative redirect) goes to the
# real My downloads page, keeping the sign-in details in the address.
open("beta/account.html", "w", encoding="utf-8").write("""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<title>My downloads · MWP</title>
<script>location.replace("/account/" + location.search + location.hash);</script></head>
<body style="background:#0A0908"><a href="/account/" style="color:#F4AF56">Go to My downloads</a></body></html>
""")
print("beta/index.html written", len(html))
