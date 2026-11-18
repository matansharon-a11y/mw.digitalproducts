"""Builds affiliates/index.html: the MWP Affiliate Program's invitation page (Matan, 18 Nov 2026; launches January 2027).
Invite-only: it opens from the personal link in Matan's invitation (/affiliates/?invite=<token>), is not linked from the
site and not indexed. It shows the program (the English is Matan's approved "MWP Affiliate Program" page, word for
word; the Hebrew is a draft for his approval) and the person's own code, and joining takes one click: Accept → every
MWP tool free, their code made in Lemon Squeezy (from 1 January 2027, for a year), then they create their account.
Script: assets/js/pages/affiliates.js. Server: supabase/functions/affiliate. Same look as the Ambassador page.
Run: python3 tools/build_affiliates.py"""
import hashlib, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from brand import NAV_CSS, FONTS, BRAND, ICONS

IMG = "/assets/pages/img/"
HERO = "5275cc7bcd4fb7560d8f7163592e3122.jpg"
TICK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'

# ---------------------------------------------------------------- the program (Matan's page, word for word)
TOOLS = [  # (name, line) English, Hebrew
    (("Lightroom Presets", "50 presets and 33 LUTs"), ("פריסטים ללייטרום", "‏50 פריסטים ו־33 קובצי LUT")),
    (("Lightroom Classic Plugin", "A whole shoot, in one window"), ("התוסף ללייטרום קלאסיק", "צילום שלם, בחלון אחד")),
    (("Photoshop Panel", "Subject, sky and background edits"), ("הפאנל לפוטושופ", "עריכה של הנושא, השמיים והרקע")),
    (("Field Guides", "Matan's field knowledge, page by page"), ("מדריכי השטח", "הידע של מתן מהשטח, עמוד אחר עמוד")),
]
CARDS = [  # number, title, points: English, then Hebrew
    (1, ("What you get", "מה מקבלים"), (
        ["Free access to all MWP tools, with every update",
         "Your personal code, like <b class=code>MWPKELVIN10</b>: 10% off for your followers",
         "10% of every sale made with your code"],
        ["גישה חינם לכל הכלים של MWP, כולל כל עדכון",
         "קוד אישי, כמו <b class=code>MWPKELVIN10</b>: ‏10% הנחה לעוקבים שלכם",
         "‏10% מכל מכירה שנעשית עם הקוד שלכם"])),
    (2, ("What we ask, each month", "מה אנחנו מבקשים, בכל חודש"), (
        ["One post and one story. A video is always welcome.",
         "Tag <span dir=ltr>@mw_phototours</span>, with <span dir=ltr>#mwppresets #mwppanel #jointhewildsideofphotography</span>",
         "The Paid partnership label on every post",
         "Your own words: how you use the tools, and how they help beginners or pros",
         "A collab post with MWP, when it fits"],
        ["פוסט אחד וסטורי אחד. סרטון תמיד יתקבל בשמחה.",
         "תיוג <span dir=ltr>@mw_phototours</span>, עם <span dir=ltr>#mwppresets #mwppanel #jointhewildsideofphotography</span>",
         "התווית \"שותפות בתשלום\" בכל פוסט",
         "במילים שלכם: איך אתם משתמשים בכלים, ואיך הם עוזרים למתחילים או למקצוענים",
         "פוסט משותף (Collab) עם MWP, כשזה מתאים"])),
    (3, ("How payment works", "איך התשלום עובד"), (
        ["A sale counts once its 14-day refund period has passed.",
         "Your earnings build up. Once they reach $100, we pay you monthly, around the 15th."],
        ["מכירה נספרת אחרי שתקופת ההחזר שלה, 14 יום, עברה.",
         "הרווחים שלכם מצטברים. כשהם מגיעים ל־100$, אנחנו משלמים לכם מדי חודש, בסביבות ה־15 בחודש."])),
    (4, ("The agreement", "ההסכם"), (
        ["One year, renewable each year.",
         "Either side can end it with 30 days' notice.",
         "Anything you've earned is always paid."],
        ["שנה אחת, עם אפשרות לחדש בכל שנה.",
         "כל צד יכול לסיים אותו בהודעה של 30 יום מראש.",
         "כל מה שהרווחתם ישולם תמיד."])),
]


def tools(i):
    return "".join(f'<li><b>{t[i][0]}</b><span>{t[i][1]}</span></li>' for t in TOOLS)


def cards(i):
    out = []
    for n, titles, points in CARDS:
        lis = "".join(f"<li>{TICK}<span>{p}</span></li>" for p in points[i])
        out.append(f'<article class="card"><span class="num">{n}</span><h3>{titles[i]}</h3><ul>{lis}</ul></article>')
    return "".join(out)


def block(i):
    lang, d = ("en", "ltr") if i == 0 else ("he", "rtl")
    t = (lambda en, he: en if i == 0 else he)
    return f"""<div class="only-{lang}" lang="{lang}" dir="{d}" data-no-i18n>
<section class="top">
<img class="bg" src="{IMG}{HERO}" alt="">
<div class="shade"></div>
<div class="wrap">
<p class="badge">{t("By invitation · From January 2027", "בהזמנה אישית · מינואר 2027")}</p>
<h1 class="h1">{t('MWP Affiliate <span class="grad">Program</span>', 'תוכנית השותפים <span class="grad">של MWP</span>')}</h1>
<p class="lead">{t("You're invited to share the editing toolkit of Matan Wild, founder of MW Photo Tours, in your own words, and to earn from every sale your code brings.",
  "אנחנו מזמינים אתכם לשתף, במילים שלכם, את ערכת העריכה של מתן וויילד, מייסד אם־דבליו פוטו טורס, ולהרוויח מכל מכירה שהקוד שלכם מביא.")}</p>
<div class="you" data-you hidden>
<p class="you-hi">{t("Hi", "היי")} <span data-name></span>. {t("Your code:", "הקוד שלכם:")}</p>
<p class="you-code" dir="ltr" data-code></p>
<p class="you-when">{t("10% off for your followers, from", "‏10% הנחה לעוקבים שלכם, החל מ־")} <span data-start></span></p>
</div>
<p class="cta"><a class="btn" href="#join">{t("Join the program", "להצטרפות לתוכנית")}</a></p>
</div>
</section>

<section class="sec">
<div class="wrap">
<p class="kick">{t("The tools you'll share", "הכלים שתשתפו")}</p>
<ul class="tools">{tools(i)}</ul>
<div class="cards">{cards(i)}</div>
</div>
</section>

<section class="sec join" id="join">
<div class="wrap">
<div class="panel">
<div data-step="form">
<p class="kick">{t("Join", "הצטרפות")}</p>
<h2 class="h2">{t("Ready to share MWP?", "מוכנים לשתף את MWP?")}</h2>
<p class="sub">{t("Joining gives you every MWP tool now. Your code starts working on", "ההצטרפות נותנת לכם את כל הכלים של MWP כבר עכשיו. הקוד שלכם יתחיל לעבוד ב־")} <span data-start></span>.</p>
<label class="check"><input type="checkbox" data-agree><span>{t("I've read the MWP Affiliate Program above and I accept it.", "קראתי את תוכנית השותפים של MWP שלמעלה ואני מסכים/ה לה.")}</span></label>
<button type="button" class="btn" data-accept>{t("Join the program", "להצטרפות לתוכנית")}</button>
<p class="msg" role="status" data-msg></p>
</div>
<div data-step="done" hidden>
<span class="seal">{TICK}</span>
<h2 class="h2">{t("You're in.", "הצטרפתם.")}</h2>
<p class="sub">{t("Now create your account with", "עכשיו פתחו חשבון עם")} <b dir="ltr" data-email></b>. {t("Your tools are waiting in My downloads, with your code, your share link and your earnings.",
  "הכלים מחכים לכם ב\"ההורדות שלי\", יחד עם הקוד שלכם, הקישור לשיתוף והרווחים.")}</p>
<p><a class="btn" data-signup href="/account/?mode=signup">{t("Create your account", "לפתיחת חשבון")}</a></p>
<p class="alt"><a href="/account/">{t("I already have an account: sign in", "כבר יש לי חשבון: כניסה")}</a></p>
</div>
<div data-step="bad" hidden>
<h2 class="h2">{t("This page opens from your invitation.", "העמוד הזה נפתח מההזמנה שלכם.")}</h2>
<p class="sub" data-bad>{t("Please use the personal link in Matan's email.", "השתמשו בקישור האישי שבמייל של מתן.")}</p>
</div>
</div>
</div>
</section>
<p class="q">{t("Questions? Reply to Matan's email.", "שאלות? השיבו למייל של מתן.")}</p>
</div>"""


CSS = """
*,*::before,*::after{box-sizing:border-box}
[hidden]{display:none!important}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:#0A0908;color:#FEFBF1;font-family:"Google Sans",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
html[lang=he] body{font-family:Heebo,"Google Sans",sans-serif}
html[lang=he] .only-en,html:not([lang=he]) .only-he{display:none!important}
img{display:block;max-width:100%}
a{color:inherit}
.wrap{max-width:1120px;margin:0 auto;padding:0 40px}
.kick{margin:0;font-size:12px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#9CB1C2}
html[lang=he] .kick,html[lang=he] .badge{letter-spacing:.04em}
.grad{background:linear-gradient(90deg,#E4AA7C 0%,#F4AF56 55%,#F8D29C 100%);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:600}
.h1{margin:22px 0 0;font-size:clamp(42px,6vw,88px);line-height:1;font-weight:400;letter-spacing:-.035em;text-wrap:balance}
.h2{margin:12px 0 0;font-size:clamp(28px,3.2vw,44px);line-height:1.1;font-weight:400;letter-spacing:-.02em}
.lead{margin:22px auto 0;max-width:620px;font-size:clamp(16px,1.35vw,19px);line-height:1.65;color:#CDD7DD;text-wrap:pretty}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 30px;border:0;border-radius:64px;background:linear-gradient(90deg,#E4AA7C,#F4AF56);color:#0A0908;font:inherit;font-weight:700;font-size:16px;cursor:pointer;text-decoration:none;box-shadow:0 14px 34px -12px rgba(244,175,86,.6)}
.btn[disabled]{opacity:.55;cursor:default}
.top{position:relative;margin-top:-80px;min-height:92svh;display:flex;align-items:center;padding:130px 0 80px;overflow:hidden;text-align:center}
.top .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.85}
.top .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,9,8,.6),rgba(10,9,8,.25) 35%,rgba(10,9,8,.6) 75%,#0A0908),radial-gradient(ellipse at 50% 55%,rgba(10,9,8,.55),transparent 70%)}
.top .wrap{position:relative;width:100%}
.badge{display:inline-flex;align-items:center;gap:10px;margin:0;padding:8px 16px;border-radius:64px;background:rgba(244,175,86,.1);border:1px solid rgba(244,175,86,.4);color:#F4AF56;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
.you{margin:30px auto 0;max-width:440px;padding:20px 24px;border-radius:20px;border:1px solid rgba(244,175,86,.35);background:rgba(10,9,8,.55)}
.you-hi,.you-when{margin:0;font-size:15px;color:#CDD7DD}
.you-code{margin:8px 0;font-size:clamp(26px,3.4vw,36px);font-weight:700;letter-spacing:.08em;color:#F4AF56}
.cta{margin:32px 0 0}
.sec{padding:80px 0}
.tools{list-style:none;margin:20px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.tools li{display:flex;flex-direction:column;gap:6px;padding:20px;border-radius:18px;background:rgba(254,251,241,.04);border:1px solid rgba(254,251,241,.08)}
.tools b{font-size:17px;font-weight:500}
.tools span{font-size:14px;line-height:1.5;color:#9CB1C2}
.cards{margin-top:28px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
.card{position:relative;padding:30px 30px 26px;border-radius:24px;background:linear-gradient(180deg,rgba(254,251,241,.06),rgba(254,251,241,.02));border:1px solid rgba(254,251,241,.09)}
.card .num{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;border:1px solid rgba(244,175,86,.5);color:#F4AF56;font-weight:700;font-size:14px}
.card h3{margin:14px 0 0;font-size:22px;font-weight:500}
.card ul{list-style:none;margin:16px 0 0;padding:0;display:flex;flex-direction:column;gap:12px}
.card li{display:grid;grid-template-columns:18px minmax(0,1fr);gap:10px;font-size:15.5px;line-height:1.55;color:#CDD7DD}
.card li svg{margin-top:4px;color:#F4AF56}
.code{color:#F4AF56;font-weight:700;letter-spacing:.04em}
.join .panel{max-width:620px;margin:0 auto;padding:44px 40px;border-radius:28px;text-align:center;background:linear-gradient(180deg,rgba(254,251,241,.07),rgba(254,251,241,.02));border:1px solid rgba(254,251,241,.12)}
.sub{margin:16px auto 0;max-width:480px;font-size:16px;line-height:1.6;color:#CDD7DD}
.check{display:flex;gap:12px;align-items:flex-start;max-width:440px;margin:26px auto 22px;text-align:start;font-size:15px;line-height:1.55;color:#CDD7DD;cursor:pointer}
.check input{flex:none;width:20px;height:20px;margin:2px 0 0;accent-color:#F4AF56}
.msg{min-height:22px;margin:14px 0 0;font-size:14px;color:#F2A0A0}
.seal{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;color:#F4AF56;background:rgba(244,175,86,.1);box-shadow:inset 0 0 0 1px rgba(244,175,86,.35)}
.seal svg{width:24px;height:24px}
.alt{margin:16px 0 0;font-size:15px}.alt a{color:#F4AF56;text-underline-offset:3px}
.q{margin:0;padding:0 20px 70px;text-align:center;font-size:14px;color:#8C979F}
.lang-sw{font:inherit;font-size:14px;color:#FEFBF1;background:none;border:1px solid rgba(254,251,241,.25);border-radius:999px;padding:6px 14px;cursor:pointer}
@media (max-width:900px){.tools{grid-template-columns:repeat(2,minmax(0,1fr))}.cards{grid-template-columns:minmax(0,1fr)}}
@media (max-width:600px){.wrap{padding:0 16px}.sec{padding:56px 0}.card{padding:24px 20px}.join .panel{padding:32px 20px}.tools li{padding:16px}}
"""


def ver():
    h = hashlib.sha1()
    for f in ["assets/js/pages/affiliates.js"] + sorted(os.path.join("assets/js/lib", n) for n in os.listdir("assets/js/lib")):
        h.update(open(f, "rb").read())
    return h.hexdigest()[:8]


html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>MWP Affiliate Program</title>
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#0A0908">
{ICONS}
<script>try{{var l=new URLSearchParams(location.search).get("lang")||localStorage.getItem("mwp_lang");if(l==="he"){{document.documentElement.lang="he";document.documentElement.dir="rtl"}}}}catch(e){{}}</script>
<style>
{CSS}
{NAV_CSS}
html .nav,html.nav-scrolled .nav{{background:linear-gradient(180deg,rgba(10,9,8,.82),rgba(10,9,8,.45));border-bottom:1px solid rgba(254,251,241,.06);backdrop-filter:none!important;-webkit-backdrop-filter:none!important}}
html .nav .wrap,html.nav-scrolled .nav .wrap{{height:80px;display:flex;align-items:center;justify-content:space-between}}
@media (max-width:600px){{html .nav .wrap,html.nav-scrolled .nav .wrap{{height:64px}}}}
</style>
{FONTS}
</head>
<body>
<nav class="nav site-header" aria-label="Main">
<div class="wrap container">
{BRAND}
<button type="button" class="lang-sw" data-lang-switch><span class="only-en">עברית</span><span class="only-he">English</span></button>
</div>
</nav>
<main id="main">
{block(0)}
{block(1)}
</main>
<script type="module" src="/assets/js/pages/affiliates.js?v={ver()}"></script>
</body>
</html>
"""

os.makedirs("affiliates", exist_ok=True)
open("affiliates/index.html", "w", encoding="utf-8").write(html)
print("affiliates/index.html written", len(html))
