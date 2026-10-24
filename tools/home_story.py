"""The landing page's own look, different from the sales pages: a cinematic viewfinder hero, a pinned
"Shoot · Edit · Finish" story that walks through the three products as you scroll, and a closing line.
All wording comes from the existing home copy (drafts for Matan); facts are the ones on the sales pages."""

IMG = "assets/pages/img/"
import home_devices
CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4AF56" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>'
ARROW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'

CHAPTERS = [
    dict(step="Shoot", step_he="צילום", tag="PDF field guides", name="Field Guides", slug="mwp-field-guides", href="field-guides/",
         img="5275cc7bcd4fb7560d8f7163592e3122.jpg", pos="56% 55%", alt="Mountains at dusk, photographed by Matan Wild",
         title="Know what to aim for, before you press the shutter",
         body=["137 one-page lessons on composition, colour, light and planning, for beginners and experienced photographers alike. Each one is a real photo from the field, with a drawing that shows why it works.",
               "Every guide ends with drills, a checklist and a cheat sheet for your next shoot."],
         points=["4 PDF guides, 137 lessons", "Composition, colour, light and planning", "English or Hebrew"],
         cta="See the Field Guides", box="0cf44582c4078749d18156eec10c90d3.jpg", gk="FIELD GUIDES · PDF", sub="4 guides · 229 pages"),
    dict(step="Sort", step_he="מיון", tag="Lightroom Classic plugin", name="Lightroom Classic Plugin", slug="mwp-presets", href="presets/#plugin",
         img="86b95f1970bb30f72735d73708d9c095.jpg", pos="80% 45%", alt="A photographer behind a long lens in the mountains, photographed by Matan Wild",
         title="From sorting to sharing",
         body=["Find the sharpest frame in every burst, build each trip into a collection per day, and keyword species from a list of 51,471. Then edit and export, all inside Lightroom Classic.",
               "Nothing is ever deleted, and every change stays in Lightroom, ready to adjust."],
         points=["Seven tabs, from sorting to sharing", "Lightroom Classic 13 or newer · Mac and Windows", "Comes with MWP Presets, in one purchase"],
         cta="See the plugin", box="86b95f1970bb30f72735d73708d9c095.jpg", gk="LIGHTROOM CLASSIC PLUGIN", sub="7 tabs · one window"),
    dict(step="Edit", step_he="מראה מוגמר", tag="Lightroom presets", name="Presets", slug="mwp-presets", href="presets/",
         img="8cb56471dbe5940badc7a93cad5c8bf1.jpg", pos="50% 12%", alt="MWP Presets, Lightroom presets by Matan Wild",
         title="A natural starting point for every photo",
         body=["50 Lightroom presets built from my own edits. 12 are adaptive: they find the subject, the sky and the background, and treat each one on its own.",
               "You set the strength. On desktop, on your phone and, with 33 LUTs, on video."],
         points=["50 Lightroom presets, 12 adaptive", "50 mobile files", "33 LUTs for Photoshop and video"],
         cta="See MWP Presets", box="8cb56471dbe5940badc7a93cad5c8bf1.jpg", gk="LIGHTROOM PRESETS", sub="50 presets · 33 LUTs"),
    dict(step="Photoshop", step_he="פוטושופ", tag="Photoshop plugin", name="Photoshop Plugin Panel", slug="mwp-panel", href="panel/",
         img="866c1bdb5cf29c21c1a04f6fc87b03e9.jpg", pos="62% 38%", alt="A tiger, photographed by Matan Wild",
         title="Photoshop, made easy.",
         body=["Pick what to edit: the subject, the sky or the background. Pick an effect, set the strength, and the plugin builds the masks and layers for you.",
               "Your original stays locked, and one undo takes back a whole step."],
         points=["Learn as you go, without risking your original", "11 looks and 4 light effects", "User manual and video tutorials"],
         cta="See the Photoshop plugin", box="866c1bdb5cf29c21c1a04f6fc87b03e9.jpg", gk="PHOTOSHOP PLUGIN", sub="8 effects · 11 looks"),
]

HERO = f"""<script>(function(){{var h=document.documentElement;h.classList.add("st-wait");var go=function(){{h.classList.remove("st-wait")}};setTimeout(go,1500);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(go)}})();</script>
<section class="st-hero" id="top">
<img class="st-hero-img" src="{IMG}1a2e3ed3f44db1f671babb09a599b29f.jpg" fetchpriority="high" alt="A male lion roaring, photographed by Matan Wild">
<div class="st-hero-shade"></div>
<div class="st-vf" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
<div class="wrap st-hero-in">
<p class="kick st-in" style="--i:0">Lightroom · Photoshop · Photography guides</p>
<h1 class="st-h1"><span class="st-l"><span style="--i:1">Pro editing,</span></span> <span class="st-l"><span class="grad" style="--i:2">in a few clicks.</span></span></h1>
<p class="lead st-in" style="--i:3">I built these tools for every kind of photographer: plugins for Lightroom Classic and Photoshop, presets, and short photography guides that are easy to use.</p>
<p class="st-meta st-in" style="--i:3">Instant download<span aria-hidden="true">·</span>Secure checkout<span aria-hidden="true">·</span>Free updates</p>
<div class="ctas st-in" style="--i:4"><a class="btn" href="#shop">Find your tool</a></div>
</div>
</section>"""


SCENES = [home_devices.shoot, home_devices.sort, home_devices.edit, home_devices.finish]   # the same scene per chapter on phones


def _step(c):
    """The step's name in each language, written for that language (the Hebrew isn't a translation)."""
    return f'<span class="only-en">{c["step"]}</span><span class="only-he" data-no-i18n>{c["step_he"]}</span>'


def _chapter_text(i, c):
    lis = "".join(f"<li>{CHECK}<span>{p}</span></li>" for p in c["points"])
    return f"""<article class="st-art" data-i="{i}">
<p class="st-step"><span class="st-num">0{i + 1}</span>{_step(c)}</p>
<p class="st-tag">{c["tag"]}</p>
<h3 class="st-name" data-no-i18n>MWP <span class="grad">{c["name"]}</span></h3>
<p class="st-line">{c["title"]}</p>
<div class="st-body">{"".join(f"<p>{t}</p>" for t in c["body"])}{f'<p class="st-close-line">{c["close"]}</p>' if c.get("close") else ""}</div>
<ul class="st-pts">{lis}</ul>
<div class="st-acts"><a class="btn" href="{c["href"]}">{c["cta"]} {ARROW}</a></div>
<div class="st-mscene"><img class="st-mbg" src="{IMG}{c["img"]}" alt="{c["alt"]}" loading="lazy" style="object-position: {c["pos"]}"><div class="st-mstage" aria-hidden="true" data-no-i18n>{SCENES[i]()}</div></div>
</article>"""


STORY = f"""<section class="st-ch" id="shop" aria-label="The collection">
<div class="wrap st-ch-head">
<p class="kick">The collection</p>
<h2 class="h2">Four tools. <span class="b grad">One for every step.</span></h2>
<p class="lead">Out shooting? The Field Guides. Editing in Lightroom? The Lightroom Classic plugin and MWP Presets. Working in Photoshop? The MWP Photoshop Plugin Panel.</p>
</div>
<div class="st-track">
<div class="st-sticky">
<div class="st-grid">
<div class="st-media" aria-hidden="true">
{"".join(f'<img class="st-mimg" data-i="{i}" src="{IMG}{c["img"]}" alt="" loading="lazy" style="object-position: {c["pos"]}">' for i, c in enumerate(CHAPTERS))}
{home_devices.HTML}
<div class="st-vf st-vf-sm"><span></span><span></span><span></span><span></span></div>
<div class="st-count"><span class="st-cur">01</span><span class="st-of">/ 0{len(CHAPTERS)}</span></div>
</div>
<div class="st-side">
<div class="st-ambs" aria-hidden="true">{"".join(f'<img class="st-amb" data-i="{i}" src="{IMG}{c["img"]}" alt="">' for i, c in enumerate(CHAPTERS))}</div>
<div class="st-ghosts" aria-hidden="true">{"".join(f'<span class="st-ghost" data-i="{i}">0{i + 1}</span>' for i, c in enumerate(CHAPTERS))}</div>
<div class="st-texts">
<div class="st-prog" aria-hidden="true">{"".join(f'<span data-i="{i}">{_step(c)}</span>' for i, c in enumerate(CHAPTERS))}</div>
{"".join(_chapter_text(i, c) for i, c in enumerate(CHAPTERS))}
</div>
</div>
</div>
</div>
</div>
</section>"""

CLOSE = """<section class="st-close">
<div class="wrap">
<p class="kick">MWP · by Matan Wild</p>
<h2 class="st-big"><span>Shoot it. Edit it.</span> <span class="grad">Finish it.</span></h2>
<div class="ctas"><a class="btn" href="#shop">Shop the collection</a></div>
</div>
</section>"""

CSS = home_devices.CSS + """
html[lang=he] .only-en{display:none!important}html:not([lang=he]) .only-he{display:none!important}
/* ---------- landing: cinematic hero ---------- */
.st-hero{position:relative;min-height:100svh;display:flex;flex-direction:column;justify-content:flex-start;overflow:hidden;background:#0A0908;isolation:isolate}
.st-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:62% 35%;z-index:-2;animation:stkb 24s cubic-bezier(.2,.6,.2,1) both;transform-origin:65% 40%}
@keyframes stkb{from{transform:scale(1.14)}to{transform:scale(1)}}
.st-hero-shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(10,9,8,.92) 0%,rgba(10,9,8,.55) 42%,rgba(10,9,8,.1) 75%),linear-gradient(0deg,#0A0908 0%,rgba(10,9,8,0) 38%)}
[dir=rtl] .st-hero-shade{background:linear-gradient(270deg,rgba(10,9,8,.92) 0%,rgba(10,9,8,.55) 42%,rgba(10,9,8,.1) 75%),linear-gradient(0deg,#0A0908 0%,rgba(10,9,8,0) 38%)}
[dir=rtl] .st-hero-img{transform-origin:35% 40%}
@media (max-width:700px){.st-hero-img{object-position:54% 30%;transform-origin:54% 30%}}
.st-vf{position:absolute;inset:clamp(18px,3.4vw,44px);pointer-events:none;z-index:0}
.st-hero .st-vf{top:calc(clamp(18px,3.4vw,44px) + 80px)}
.st-vf span{position:absolute;width:26px;height:26px;border-color:rgba(254,251,241,.45);border-style:solid;border-width:0}
.st-vf span:nth-child(1){top:0;left:0;border-top-width:1px;border-left-width:1px}
.st-vf span:nth-child(2){top:0;right:0;border-top-width:1px;border-right-width:1px}
.st-vf span:nth-child(3){bottom:0;left:0;border-bottom-width:1px;border-left-width:1px}
.st-vf span:nth-child(4){bottom:0;right:0;border-bottom-width:1px;border-right-width:1px}
:root{--hero-top:clamp(110px,22vh,240px)}
/* the hero tucks 80px under the header: the text starts --hero-top below it, the same as on the product pages */
.st-hero-in{position:relative;width:100%;padding-top:calc(var(--hero-top) + 80px);padding-bottom:clamp(72px,12vh,140px)}
@media (max-width:700px){:root{--hero-top:clamp(100px,17vh,170px)}.st-hero{min-height:0}.st-hero-in{padding-top:calc(var(--hero-top) + 64px);padding-bottom:64px}}
.st-hero-in .lead{max-width:560px;margin-top:28px}
.st-hero-in .st-meta{display:flex;align-items:center;gap:12px;margin:18px 0 0;font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:rgba(254,251,241,.55)}
.st-hero-in .st-meta span{color:#F4AF56}
[dir="rtl"] .st-hero-in .st-meta{letter-spacing:normal;font-size:13px}
.st-hero-in .ctas{margin-top:36px}
.st-h1{margin:18px 0 0;font-size:clamp(52px,8.4vw,132px);line-height:.94;font-weight:400;letter-spacing:-.04em;color:#FEFBF1}
.st-h1 .grad{font-weight:600}
.st-l{display:block;overflow:hidden;padding-bottom:.22em;margin-bottom:-.16em}
.st-l > span{display:inline-block;will-change:transform,opacity;backface-visibility:hidden;animation:strise 1.6s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--i) * .14s + .1s)}
@keyframes strise{from{transform:translate3d(0,110%,0);opacity:0}50%{opacity:1}to{transform:translate3d(0,0,0);opacity:1}}
/* hold the intro until the fonts are in, so the words do not swap typeface mid-animation */
html.st-wait .st-l > span,html.st-wait .st-in,html.st-wait .st-hero-img{animation-play-state:paused}
.st-in{will-change:transform,opacity;animation:stfade 1.4s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--i) * .14s + .2s)}
@keyframes stfade{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}

/* ---------- landing: pinned story ---------- */
.st-ch{position:relative;background:#0A0908}
.st-ch-head{display:flex;flex-direction:column;gap:16px;align-items:center;text-align:center;max-width:720px;margin:0 auto;padding-top:clamp(72px,10vh,120px);padding-bottom:clamp(40px,6vh,64px)}
.st-ch-head .lead{text-wrap:balance}
.st-track{position:relative;height:540vh}
.st-sticky{position:sticky;top:0;height:100vh;overflow:hidden}
.st-grid{position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);height:100%;width:100%}
.st-media{position:relative;height:100%;overflow:hidden;background:#141210}
.st-media::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(90deg,rgba(10,9,8,0) 55%,rgba(10,9,8,.55) 85%,#0A0908 100%),linear-gradient(0deg,rgba(10,9,8,.55) 0%,rgba(10,9,8,0) 30%)}
[dir=rtl] .st-media::after{background:linear-gradient(270deg,rgba(10,9,8,0) 55%,rgba(10,9,8,.55) 85%,#0A0908 100%),linear-gradient(0deg,rgba(10,9,8,.55) 0%,rgba(10,9,8,0) 30%)}
.st-mimg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;clip-path:inset(100% 0 0 0);will-change:clip-path,transform}
.st-mimg:first-of-type{clip-path:inset(0 0 0 0)}

.st-media .st-vf{inset:104px 40px 40px 40px;z-index:2}
.st-count{position:absolute;left:64px;bottom:60px;z-index:2;display:flex;align-items:baseline;gap:10px;color:#FEFBF1;direction:ltr}
[dir=rtl] .st-count{left:auto;right:64px}
.st-cur{font-size:56px;font-weight:500;letter-spacing:-.03em;line-height:1}
.st-of{font-size:14px;color:rgba(254,251,241,.6);letter-spacing:.1em}
.st-side{position:relative;display:flex;align-items:center;padding:96px clamp(40px,6vw,120px) 40px clamp(56px,7vw,128px);overflow:hidden}
[dir=rtl] .st-side{padding:96px clamp(56px,7vw,128px) 40px clamp(40px,6vw,120px)}
.st-ambs{position:absolute;inset:-10%;z-index:0;pointer-events:none}
.st-amb{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(70px) saturate(1.4);opacity:0;transform:scale(1.2)}
.st-ghosts{position:absolute;right:-1vw;top:50%;transform:translateY(-58%);z-index:0;pointer-events:none;direction:ltr}
[dir=rtl] .st-ghosts{right:auto;left:-1vw}
.st-ghost{position:absolute;right:0;top:0;transform:translateY(-50%);font-size:min(46vh,30vw);line-height:1;font-weight:600;letter-spacing:-.06em;color:transparent;-webkit-text-stroke:1px rgba(254,251,241,.1);opacity:0}
[dir=rtl] .st-ghost{right:auto;left:0}
.st-texts{position:relative;z-index:1;width:100%;max-width:560px;min-height:520px}
.st-prog{display:flex;gap:22px;margin-bottom:40px}
.st-prog span{position:relative;padding-bottom:10px;font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:rgba(254,251,241,.38);transition:color .5s}
.st-prog span::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,#E4AA7C,#F4AF56);transform:scaleX(0);transform-origin:left;transition:transform .7s cubic-bezier(.2,.7,.2,1)}
[dir=rtl] .st-prog span::after{transform-origin:right}
.st-prog span.on{color:#FEFBF1}
.st-prog span.on::after,.st-prog span.done::after{transform:scaleX(1)}
.st-art{position:absolute;inset:auto 0 auto 0;top:70px;opacity:0;pointer-events:none;will-change:opacity,transform}
.st-art.on{pointer-events:auto}
.st-art:first-of-type{opacity:1}
.st-step{display:flex;align-items:baseline;gap:14px;margin:0;color:#9CB1C2;font-size:13px;font-weight:600;letter-spacing:.22em;text-transform:uppercase}
.st-num{color:#F4AF56}
.st-tag{margin:18px 0 0;color:#9CB1C2;font-size:14px}
.st-name{margin:10px 0 0;font-size:clamp(34px,3.7vw,58px);line-height:1;font-weight:400;letter-spacing:-.03em;color:#FEFBF1;white-space:nowrap}
.st-name .grad{font-weight:600}
.st-line{margin:22px 0 0;font-size:clamp(18px,1.5vw,22px);line-height:1.5;color:#CDD7DD;max-width:460px}
.st-body{margin-top:14px;display:grid;gap:10px}
.st-body p{margin:0;font-size:15px;line-height:1.6;color:#9CB1C2}
.st-body .st-close-line{color:#FEFBF1;font-weight:600}
.st-pts{list-style:none;margin:28px 0 0;padding:24px 0 0;border-top:1px solid rgba(254,251,241,.1);display:grid;gap:12px}
.st-pts li{display:flex;gap:12px;align-items:flex-start;font-size:16px;color:#CDD7DD}
.st-pts svg{flex:none;margin-top:4px}
.st-acts{display:flex;flex-wrap:wrap;gap:12px;margin-top:34px}
.st-acts .btn svg{margin-inline-start:6px}
[dir=rtl] .st-acts .btn svg{transform:scaleX(-1)}
.st-art-img,.st-mscene{display:none}

/* ---------- landing: closing line ---------- */
.st-close{padding:clamp(88px,13vh,150px) 0;text-align:center;background:radial-gradient(80% 60% at 50% 100%,rgba(244,175,86,.08),transparent 70%),#0A0908}
.st-close .wrap{display:flex;flex-direction:column;align-items:center;gap:28px}
.st-big{margin:0;font-size:clamp(44px,7.4vw,112px);line-height:.98;font-weight:400;letter-spacing:-.04em;color:#FEFBF1}
.st-big span{display:block}
.st-big .grad{font-weight:600}

/* ---------- smaller screens: the story becomes a simple list ---------- */
@media (min-width:901px){
  .st-texts{display:grid;min-height:0;align-content:center}
  .st-prog{grid-row:1;margin-bottom:30px}
  .st-art{position:relative;inset:auto;top:auto;grid-area:2/1}
  .st-pts{margin-top:22px;padding-top:18px;gap:10px}
  .st-acts{margin-top:26px}
}
@media (min-width:901px) and (max-height:820px){
  .st-side{padding-top:84px;padding-bottom:24px}
  .st-prog{margin-bottom:18px}
  .st-tag{display:none}
  .st-name{font-size:clamp(30px,3vw,44px)}
  .st-line{margin-top:14px;font-size:18px}
  .st-body{gap:8px}
  .st-body p{font-size:14px;line-height:1.55}
  .st-pts{margin-top:16px;padding-top:14px;gap:6px}
  .st-pts li{font-size:14px}
  .st-acts{margin-top:22px}
}
@media (max-width:900px){
  .st-track{height:auto}
  .st-sticky{position:static;height:auto;display:block;padding:40px 0 24px}
  .st-grid{display:block}
  .st-media,.st-prog,.st-ambs,.st-ghosts{display:none}
  .st-side{padding:0 20px;display:block}
  .st-texts{max-width:none}
  .st-texts{min-height:0;display:grid;gap:72px}
  .st-art{position:static;opacity:1!important;transform:none!important;pointer-events:auto}
  .st-name{white-space:normal}
  .st-art{display:flex;flex-direction:column}
  /* the product scene, as on desktop: drawn 720 x 540 and scaled to the frame (--ms, set by the script) */
  .st-mscene{display:block;position:relative;order:-1;margin:0 0 26px;aspect-ratio:4/3;border-radius:6px;overflow:hidden;background:#141210}
  .st-mbg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.15);filter:blur(7px) brightness(.45) saturate(1.2)}
  .st-mscene::after{content:"";position:absolute;inset:0;background:radial-gradient(70% 60% at 50% 55%,rgba(10,9,8,0),rgba(10,9,8,.55));pointer-events:none}
  .st-mstage{position:absolute;left:50%;top:50%;z-index:1;width:720px;height:540px;margin:-270px 0 0 -360px;transform:scale(var(--ms,.45));pointer-events:none}
  .st-mstage .st-dev{inset:0;opacity:1}
  .st-mstage .bk-row{--w:150px;height:400px}
  .st-mstage .bk-brand,.st-mstage .bk-spine span{font-size:8px}.st-mstage .bk-num{font-size:10px}.st-mstage .bk-lab b{font-size:17px}
  .st-mstage .st-app{font-size:8px}.st-mstage .lrc,.st-mstage .psc{font-size:7px}
}
@media (max-width:600px){
  .st-h1{font-size:clamp(46px,13vw,64px)}
  .st-hero-shade{background:linear-gradient(0deg,#0A0908 0%,rgba(10,9,8,.7) 55%,rgba(10,9,8,.35) 100%)}
}
@media (prefers-reduced-motion:reduce){
  .st-hero-img,.st-l > span,.st-in{animation:none}
  .st-mimg,.st-art,.st-prog span::after{transition:none}
}
"""

JS = """<script>
// Pinned story, scroll-linked: the next photo wipes up and the text cross-fades in step with the scroll,
// eased toward the scroll position every frame so it glides rather than jumps.
(function () {
  var track = document.querySelector(".st-track"); if (!track) return;
  var imgs = track.querySelectorAll(".st-mimg"), arts = track.querySelectorAll(".st-art"), prog = track.querySelectorAll(".st-prog span");
  var cur = track.querySelector(".st-cur"), n = arts.length;
  var ghosts = track.querySelectorAll(".st-ghost"), ambs = track.querySelectorAll(".st-amb"), devs = track.querySelectorAll(".st-media .st-dev"), mdevs = track.querySelectorAll(".st-mstage .st-dev");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var target = 0, shown = 0, running = false, lastIdx = -1;
  var ss = function (a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function measure() {
    if (window.innerWidth <= 900) return null;
    var r = track.getBoundingClientRect(), total = r.height - window.innerHeight;
    var p = Math.min(1, Math.max(0, -r.top / total));
    return p * (n - 1 + 0.7) - 0.35;   // -0.35 … n-0.65: room before the first and after the last chapter
  }
  function follow(m) {
    if (m.__run) return; m.__run = true;
    (function step() {
      var k = reduce ? 1 : 0.12;
      m.__x += (m.__tx - m.__x) * k; m.__y += (m.__ty - m.__y) * k;
      if (Math.abs(m.__tx - m.__x) < 0.02 && Math.abs(m.__ty - m.__y) < 0.02) { m.__x = m.__tx; m.__y = m.__ty; }
      m.style.left = m.__x.toFixed(3) + "%"; m.style.top = m.__y.toFixed(3) + "%";
      if (m.__x !== m.__tx || m.__y !== m.__ty) requestAnimationFrame(step); else m.__run = false;
    })();
  }
  function paint(v) {
    for (var i = 0; i < n; i++) {
      var d = v - i;                                   // <0: upcoming, 0: on screen, >0: already passed
      // photos: each one wipes up over the one before as the scroll reaches it
      var reveal = i === 0 ? 1 : ss(-0.78, -0.22, d);
      imgs[i].style.clipPath = "inset(" + ((1 - reveal) * 100).toFixed(2) + "% 0 0 0)";
      imgs[i].style.transform = "scale(" + (1 + 0.08 * (1 - reveal) + 0.03 * ss(0, 1, d)).toFixed(4) + ")";
      // text: fade and drift; out upward, in from below
      var dOp = (i === 0 && d < 0) || (i === n - 1 && d > 0) ? 0 : d;   // first and last chapter stay fully on at the ends
      var op = 1 - ss(0.18, 0.5, Math.abs(dOp));
      arts[i].style.opacity = op.toFixed(3);
      arts[i].style.transform = "translateY(" + (-d * 40).toFixed(1) + "px)";
      if (ghosts[i]) { ghosts[i].style.opacity = op.toFixed(3); ghosts[i].style.transform = "translateY(calc(-50% + " + (-d * 120).toFixed(1) + "px))"; }
      if (ambs[i]) ambs[i].style.opacity = (op * 0.26).toFixed(3);
      if (devs[i]) {
        devs[i].style.opacity = op.toFixed(3);
        devs[i].style.transform = "translateY(" + (-d * 60).toFixed(1) + "px) scale(" + (0.94 + 0.06 * op).toFixed(4) + ")";
        scene(devs[i], d, op);
      }
    }
    var k = Math.min(n - 1, Math.max(0, Math.round(v)));
    if (k !== lastIdx) {
      lastIdx = k;
      arts.forEach(function (a, i) { a.classList.toggle("on", i === k); a.setAttribute("aria-hidden", i === k ? "false" : "true"); });
      prog.forEach(function (p, i) { p.classList.toggle("on", i === k); p.classList.toggle("done", i < k); });
      if (cur) cur.textContent = "0" + (k + 1);
    }
  }
  // One product scene at chapter offset d (<0 upcoming, 0 on screen): mouse, clicks, compare wipe, books fanning out.
  function scene(dv, d, op) {
        var w = ss(-0.4, 0.34, d);                      // this chapter's own timeline, 0 → 1, tied to the scroll
        var mouse = dv.querySelector(".st-mouse"), app = dv.querySelector(".st-app");
        var rings = dv.querySelectorAll(".st-ring");
        // Presets: click the preset, then drag the compare line. Panel: click Subject, then Pop, then drag.
        var start = rings.length ? 0.42 : 0.26;
        var wipe = Math.min(1, Math.max(0, (w - start) / (1 - start)));
        var wp = dv.querySelector(".st-wipe"), wl = dv.querySelector(".st-wline");
        if (wp) wp.style.clipPath = "inset(0 " + ((1 - wipe) * 100).toFixed(2) + "% 0 0)";
        if (wl) { wl.style.left = (wipe * 100).toFixed(2) + "%"; wl.style.opacity = (wipe > 0.01 && wipe < 0.99) ? "1" : "0"; }
        dv.querySelectorAll(".lr-track i").forEach(function (b, j) { var to = [56, 46, 62, 58, 30, 70, 54, 56, 62, 56, 53, 58, 55][j] || 55; b.style.setProperty("--at", (50 + (to - 50) * wipe).toFixed(1) + "%"); });
        var nl = dv.querySelector(".st-newlayer"); if (nl) nl.classList.toggle("on", w > 0.32);
        if (rings.length) { rings[0].classList.toggle("on", w > 0.18); rings[1].classList.toggle("on", w > 0.32); }
        if (mouse && app && op > 0.02) {
          var A = app.getBoundingClientRect();
          var at = function (el, fx, fy) { var r = el.getBoundingClientRect(); return [(r.left + r.width * fx - A.left) / A.width * 100, (r.top + r.height * fy - A.top) / A.height * 100]; };
          var canvas = dv.querySelector(".st-canvas");
          // one continuous path: rest → click target(s) → grab the compare line → drag it across
          var keys = rings.length
            ? [[0, [70, 84]], [0.18, at(rings[0], .5, .55)], [0.32, at(rings[1], .3, .55)], [start, at(canvas, 0, .62)], [1, at(canvas, 1, .62)]]
            : [[0, [60, 86]], [0.18, at(dv.querySelector(".lr-folder.on"), .45, .55)], [start, at(canvas, 0, .62)], [1, at(canvas, 1, .62)]];
          var pos = keys[keys.length - 1][1];
          for (var q = 1; q < keys.length; q++) if (w <= keys[q][0]) {
            var a0 = keys[q - 1], a1 = keys[q], u = Math.min(1, Math.max(0, (w - a0[0]) / (a1[0] - a0[0] || 1)));
            var drag = a0[0] >= start, t = drag ? u : u * u * (3 - 2 * u);
            var arc = drag ? 0 : Math.sin(Math.PI * t) * -5;          // a gentle arc, like a hand moving a mouse
            pos = [a0[1][0] + (a1[1][0] - a0[1][0]) * t, a0[1][1] + (a1[1][1] - a0[1][1]) * t + arc];
            break;
          }
          mouse.__tx = pos[0]; mouse.__ty = pos[1];
          if (mouse.__x == null) { mouse.__x = pos[0]; mouse.__y = pos[1]; }
          follow(mouse);
          var clicks = rings.length ? [0.18, 0.32] : [0.18];
          var near = clicks.some(function (c) { return Math.abs(w - c) < 0.02; });
          mouse.classList.toggle("click", near); mouse.classList.toggle("press", near || (w > start && w < 0.995));
        }
        dv.style.setProperty("--e", ss(-0.45, 0.2, d).toFixed(3));   // books fan out as the chapter arrives
  }
  // Phones: each chapter's scene plays as it scrolls up the screen, done by the time it is a little above the middle.
  function phones() {
    mdevs.forEach(function (dv) {
      var stage = dv.parentNode, box = stage.parentNode, r = box.getBoundingClientRect(), vh = window.innerHeight;
      stage.style.setProperty("--ms", (box.clientWidth / 720).toFixed(4));
      if (r.bottom < -200 || r.top > vh + 200) return;
      var p = Math.min(1, Math.max(0, (vh - (r.top + r.height / 2)) / (vh * 0.55)));
      scene(dv, -0.45 + 0.85 * p, 1);
    });
  }
  function loop() {
    shown += (target - shown) * (reduce ? 1 : 0.07);
    if (Math.abs(target - shown) < 0.0005) shown = target;
    paint(shown);
    if (shown !== target) requestAnimationFrame(loop); else running = false;
  }
  function onScroll() {
    var m = measure();
    if (m === null) { arts.forEach(function (a) { a.removeAttribute("aria-hidden"); a.style.opacity = ""; a.style.transform = ""; }); imgs.forEach(function (im) { im.style.clipPath = ""; im.style.transform = ""; }); phones(); return; }
    target = m;
    if (!running) { running = true; requestAnimationFrame(loop); }
  }
  shown = target = measure() || 0; if (measure() !== null) paint(shown); else phones();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
})();
</script>"""
