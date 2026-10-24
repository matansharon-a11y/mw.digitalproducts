"""Product scenes for the landing story, one different object per chapter, built from Matan's real material:
- Shoot: the four Field Guides as printed hardcover books (covers from the Field Guides page) that fan out.
- Edit: a laptop, straight on, in a Lightroom-style layout (preset groups from the Presets page) where the
  RAW turns into Matan's finished frame as you scroll.
- Sort: a laptop with the Lightroom Classic plugin's window (MWP Panel): click Looks, click B&W, the look wipes across.
- Finish: a desktop monitor, straight on, in a Photoshop-style layout with the real MWP Panel docked,
  applying Subject · Pop.
Calm, centred, symmetric compositions; everything moves with the story's scroll-linked transition."""

IMG = "assets/pages/img/"

# The four guides, as named on the Field Guides page.
BOOKS = [("01", "Composition", "d5f6d2a7c84cc3346ef45e4922528351"),
         ("02", "Colour", "6d84bcea4206fe4c622103d7d3aea920"),
         ("03", "Light", "ce73f34a054f9959d99fd850c1df9ce5"),
         ("04", "Planning", "2f9794f404a12b19c251a68288a8f543")]
PRESET_GROUPS = ["MWP 1 Signature", "MWP 2 Light &amp; Scene", "MWP 3 Mono", "MWP 4 Adaptive", "MWP 5 Tools"]
SLIDERS = [("Exposure", 62), ("Contrast", 58), ("Highlights", 24), ("Shadows", 66), ("Clarity", 59), ("Vibrance", 57)]


def shoot():
    books = "".join(f"""<div class="bk" style="--k:{k}">
<div class="bk-f bk-front"><img src="{IMG}{img}.jpg" alt=""><div class="bk-lab"><span class="bk-brand">MWP FIELD GUIDES</span><span class="bk-num">{n}</span><b>{t}</b></div></div>
<div class="bk-f bk-back"></div>
<div class="bk-f bk-spine"><span>{t}</span></div>
<div class="bk-f bk-pages"></div>
<div class="bk-f bk-top"></div>
</div>""" for k, (n, t, img) in enumerate(BOOKS))
    return f'<div class="st-dev st-dev-shoot" data-i="0"><div class="bk-row">{books}</div><div class="st-floor"></div></div>'


MOUSE = '<i class="st-mouse"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M5 3l14 8-6.2 1.6L9.6 19z" fill="#FEFBF1" stroke="#0A0908" stroke-width="1.4" stroke-linejoin="round"/></svg></i>'
FILM = ["3c14b23dbb00f051684ad60fb205ed10", "7c359a77f23f632596ebda32f1e9a72f", "9a95f4aafdcef50170f5aa90a3945504",
        "8726daeb4a1c2551c37d43692b07fa4a", "c339384fe0c6d91e7b1388d0fed7d1ae", "af0d1799831d0417d338c0b162975a7b"]
HISTO = ('<svg class="lr-histo" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">'
         '<path d="M0 40 L0 36 C10 34 14 22 22 20 C30 18 34 30 42 26 C50 22 56 8 64 10 C72 12 76 28 84 30 C90 32 95 36 100 37 L100 40Z" fill="rgba(120,140,255,.35)"/>'
         '<path d="M0 40 L0 37 C12 35 18 26 26 25 C36 24 40 32 50 28 C60 24 64 14 72 16 C80 18 86 32 100 36 L100 40Z" fill="rgba(255,120,110,.3)"/>'
         '<path d="M0 40 L0 38 C10 36 20 30 30 29 C40 28 46 20 56 18 C66 16 72 24 82 28 C90 31 96 35 100 38 L100 40Z" fill="rgba(120,230,140,.25)"/></svg>')


def _sl(name, cls=""):
    return f'<div class="lr-sl {cls}"><span>{name}</span><div class="lr-track"><i></i></div></div>'


def edit():
    folders = "".join(f'<div class="lr-folder{" on" if k == 1 else ""}"><i class="lr-tri"></i><span>{g}</span></div>' for k, g in enumerate(PRESET_GROUPS))
    film = "".join(f'<img src="{IMG}{f}.jpg" alt=""{" class=on" if k == 0 else ""}>' for k, f in enumerate(FILM))
    tone = "".join(_sl(n) for n in ["Exposure", "Contrast", "Highlights", "Shadows", "Whites", "Blacks"])
    presence = "".join(_sl(n) for n in ["Texture", "Clarity", "Dehaze", "Vibrance", "Saturation"])
    return f"""<div class="st-dev st-dev-edit" data-i="2">
<div class="st-lap">
<div class="st-lap-scr"><div class="st-app lrc">
<div class="lr-top"><span class="lr-id">MW PHOTO TOURS</span><nav><span>Library</span><b>Develop</b><span>Map</span><span>Book</span><span>Slideshow</span><span>Print</span><span>Web</span></nav></div>
<div class="lr-left">
<div class="lr-head">Navigator</div><img class="lr-nav" src="{IMG}try-raw-clean.jpg" alt="">
<div class="lr-head">Presets</div>{folders}
</div>
<div class="st-canvas lr-canvas"><img src="{IMG}try-raw-clean.jpg" alt=""><img class="st-wipe" src="{IMG}fbaf19aea2af10f26b2949ab31fff094.jpg" alt=""><i class="st-wline"></i><em class="st-chip l">After</em><em class="st-chip r">Before</em></div>
<div class="lr-right">
<div class="lr-histo-box">{HISTO}</div>
<div class="lr-head">Basic</div>
<div class="lr-row"><span>Treatment</span><em>Color</em><em class="off">Black &amp; White</em></div>
{_sl("Temp", "temp")}{_sl("Tint", "tint")}
<div class="lr-sub">Tone</div>{tone}
<div class="lr-sub">Presence</div>{presence}
</div>
<div class="lr-film">{film}</div>
{MOUSE}</div><i class="st-glare"></i></div>
<div class="st-lap-base"></div>
</div>
<div class="st-floor"></div>
</div>"""

LP_TABS = ["Cull", "Organize", "Expedition", "Looks", "Edit", "Color", "Export"]
LP_LOOKS = [("bw", "B&amp;W"), ("moody", "Moody"), ("golden", "Golden"), ("bluehour", "Blue hour"), ("matte", "Matte"), ("clean", "Clean")]
LP_PHOTO = "86b95f1970bb30f72735d73708d9c095"


def sort():
    """The Lightroom Classic plugin: its window over the photo; Looks, then B&W, then the look wipes across."""
    tabs = "".join(f'<span class="lp-tab{" on" if t == "Looks" else ""}">{t}{"<i class=\"st-ring lp-ring\"></i>" if t == "Looks" else ""}</span>' for t in LP_TABS)
    looks = "".join(f'<span class="lp-look"><img src="{IMG}lrc/look_{k}.png" alt="">{n}{"<i class=\"st-ring lp-ring\"></i>" if k == "bw" else ""}</span>' for k, n in LP_LOOKS)
    return f"""<div class="st-dev st-dev-sort" data-i="1">
<div class="st-lap">
<div class="st-lap-scr"><div class="st-app lpc ui-en">
<div class="lp-top"><i></i><i></i><i></i><span>MWP Panel · Lightroom Classic</span></div>
<div class="st-canvas lp-canvas"><img src="{IMG}{LP_PHOTO}.jpg" alt=""><img class="st-wipe lp-bw" src="{IMG}{LP_PHOTO}.jpg" alt=""><i class="st-wline"></i></div>
<div class="lp-side"><div class="lp-tabs">{tabs}</div><div class="lp-looks">{looks}</div><div class="lp-str"><span>Strength</span><div class="lr-track"><i style="--at:80%"></i></div></div></div>
{MOUSE}</div><i class="st-glare"></i></div>
<div class="st-lap-base"></div>
</div>
<div class="st-floor"></div>
</div>"""


def finish():
    tools = "<i></i>" * 14
    return f"""<div class="st-dev st-dev-finish" data-i="3">
<div class="st-lap">
<div class="st-lap-scr"><div class="st-app psc">
<div class="ps-menu"><span>File</span><span>Edit</span><span>Image</span><span>Layer</span><span>Select</span><span>Filter</span><span>View</span><span>Plugins</span><span>Window</span></div>
<div class="ps-opts"><i></i><i></i><i></i><span></span></div>
<div class="ps-tools">{tools}</div>
<div class="ps-doc"><div class="ps-tab">photo.psd @ 33%</div><div class="st-canvas ps-canvas"><img src="{IMG}c339384fe0c6d91e7b1388d0fed7d1ae.jpg" alt=""><img class="st-wipe" src="{IMG}52e0c3d2c90942f72d31faa689449bd0.jpg" alt=""><i class="st-wline"></i></div></div>
<div class="ps-right">
<div class="st-dock"><div class="st-dock-in"><img src="{IMG}0f68e9846bf802d72ca616b1da7a3b4c.png" alt=""><i class="st-ring st-ring-a"></i><i class="st-ring st-ring-b"></i></div></div>
<div class="ps-layers"><div class="ps-lh"><b>Layers</b><span>Channels</span><span>Paths</span></div>
<div class="ps-layer grp"><i class="ps-eye"></i><i class="ps-fold"></i><span>MWP</span></div>
<div class="ps-layer sub st-newlayer"><i class="ps-eye"></i><i class="ps-thumb"></i><span>Subject · Pop</span></div>
<div class="ps-layer"><i class="ps-eye"></i><img src="{IMG}c339384fe0c6d91e7b1388d0fed7d1ae.jpg" alt=""><span>Background</span><i class="ps-lock"></i></div>
</div>
</div>
{MOUSE}</div><i class="st-glare"></i></div>
<div class="st-lap-base"></div>
</div>
<div class="st-floor"></div>
</div>"""


HTML = '<div class="st-devs" aria-hidden="true" data-no-i18n>' + shoot() + sort() + edit() + finish() + "</div>"

CSS = """
/* ---------- landing: product scenes ---------- */
.st-media::before{content:"";position:absolute;inset:0;z-index:1;background:radial-gradient(70% 60% at 50% 55%,rgba(10,9,8,.45),rgba(10,9,8,.82));backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.st-devs{position:absolute;inset:0;z-index:2;pointer-events:none}
.st-dev{position:absolute;inset:88px 0 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;will-change:opacity,transform;perspective:1600px}
.st-dev:first-child{opacity:1}
.st-floor{width:70%;height:40px;margin-top:-6px;background:radial-gradient(closest-side,rgba(0,0,0,.7),rgba(0,0,0,0));filter:blur(4px)}

/* hardcover books */
.bk-row{position:relative;width:100%;height:min(46vh,380px);transform-style:preserve-3d;--w:min(10.4vw,168px);--h:calc(var(--w) * 1.38);--d:calc(var(--w) * .17);--gap:calc(var(--w) * 1.16)}
.bk{position:absolute;left:50%;top:50%;width:var(--w);height:var(--h);margin:calc(var(--h) / -2) 0 0 calc(var(--w) / -2);transform-style:preserve-3d;
  transform:translateX(calc((var(--k) - 1.5) * var(--gap) * (.18 + .82 * var(--e,0)))) translateZ(calc((var(--k) - 1.5) * -14px * (1 - var(--e,0)))) rotateY(calc(34deg - 16deg * var(--e,0)))}
[dir=rtl] .bk{direction:ltr}
.bk-f{position:absolute;top:0;left:50%;height:100%;backface-visibility:hidden}
.bk-front,.bk-back{width:var(--w);margin-left:calc(var(--w) / -2)}
.bk-front{transform:translateZ(calc(var(--d) / 2));border-radius:2px 5px 5px 2px;overflow:hidden;background:#0C2925;box-shadow:inset 3px 0 6px rgba(0,0,0,.35)}
.bk-front img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.bk-front::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.35) 0,rgba(255,255,255,.08) 2.5%,rgba(0,0,0,0) 6%),linear-gradient(0deg,rgba(10,9,8,.85) 0,rgba(10,9,8,0) 45%)}
.bk-lab{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;justify-content:flex-end;padding:12% 10%;color:#FEFBF1}
.bk-brand{position:absolute;top:8%;left:10%;font-size:max(7px,.5vw);font-weight:700;letter-spacing:.24em;opacity:.9}
.bk-num{font-size:max(9px,.62vw);font-weight:700;letter-spacing:.2em;color:#F4AF56}
.bk-lab b{font-size:max(15px,1.15vw);font-weight:600;letter-spacing:-.01em;line-height:1.1}
.bk-back{transform:rotateY(180deg) translateZ(calc(var(--d) / 2));background:#0C2925}
.bk-spine,.bk-pages{width:var(--d);margin-left:calc(var(--d) / -2)}
.bk-spine{transform:rotateY(-90deg) translateZ(calc(var(--w) / 2));background:linear-gradient(90deg,#08201d,#0f332e 50%,#08201d);display:flex;align-items:center;justify-content:center}
.bk-spine span{writing-mode:vertical-rl;transform:rotate(180deg);font-size:max(7px,.5vw);font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#F4AF56}
.bk-pages{transform:rotateY(90deg) translateZ(calc(var(--w) / 2 - 2px));height:calc(100% - 6px);top:3px;background:repeating-linear-gradient(90deg,#f3efe6 0,#f3efe6 1px,#d9d3c6 1px,#d9d3c6 2px)}
.bk-top{width:var(--w);height:var(--d);margin:0 0 0 calc(var(--w) / -2);top:calc(var(--d) / -2);transform:rotateX(90deg);background:repeating-linear-gradient(0deg,#f3efe6 0,#f3efe6 1px,#d9d3c6 1px,#d9d3c6 2px)}

/* laptop, straight on */
.st-lap{position:relative;z-index:2;width:min(86%,640px)}
.st-lap-scr{position:relative;aspect-ratio:16/10;padding:1.8% 1.8% 2.4%;border-radius:18px 18px 6px 6px;background:linear-gradient(180deg,#2a2a2a,#111);box-shadow:0 0 0 1px rgba(255,255,255,.08) inset,0 50px 100px rgba(0,0,0,.55)}
.st-lap-base{position:relative;height:16px;margin:0 -7%;border-radius:2px 2px 16px 16px;background:linear-gradient(180deg,#d6d6d6 0,#9a9a9a 45%,#4a4a4a 100%)}
.st-lap-base::before{content:"";position:absolute;left:50%;top:0;width:15%;height:6px;margin-left:-7.5%;border-radius:0 0 8px 8px;background:rgba(0,0,0,.28)}

/* desktop monitor, straight on */
.st-mon{position:relative;z-index:2;width:min(88%,660px);display:flex;flex-direction:column;align-items:center}
.st-mon-scr{position:relative;width:100%;aspect-ratio:16/9.6;padding:1.4%;border-radius:12px;background:linear-gradient(180deg,#232323,#0d0d0d);box-shadow:0 0 0 1px rgba(255,255,255,.08) inset,0 50px 100px rgba(0,0,0,.55)}
.st-mon-neck{width:16%;height:70px;background:linear-gradient(90deg,#8d8d8d,#d0d0d0 45%,#8d8d8d);clip-path:polygon(18% 0,82% 0,100% 100%,0 100%)}
.st-mon-foot{width:34%;height:10px;border-radius:3px 3px 10px 10px;background:linear-gradient(180deg,#d8d8d8,#7a7a7a);box-shadow:0 22px 40px rgba(0,0,0,.6)}

.st-glare{position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(115deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,0) 38%)}
.st-app{direction:ltr;position:relative;display:grid;width:100%;height:100%;border-radius:6px;overflow:hidden;background:#1d1d1d;font-size:9px;color:#bbb}
.st-lr{grid-template-columns:20% 1fr 22%}
.st-ps{grid-template-columns:5% 1fr 25%}
.st-pane{display:flex;flex-direction:column;gap:7px;padding:12px 10px;background:#252525;border-right:1px solid #111}
.st-pane-r{border-right:0;border-left:1px solid #111}
.st-pane b{font-size:8px;letter-spacing:.18em;color:#888;margin-bottom:4px}
.st-pane span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:4px 6px;border-radius:4px}
.st-pane span.on{background:rgba(244,175,86,.14);color:#F4AF56}
.st-sl{display:grid;gap:4px}
.st-sl span{padding:0}
.st-bar{position:relative;height:3px;border-radius:2px;background:#3a3a3a}
.st-bar i{position:absolute;top:50%;left:var(--at,50%);width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:#ddd}
.st-canvas{position:relative;overflow:hidden;background:#111}
.st-canvas img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.st-wipe{clip-path:inset(0 100% 0 0)}
.st-wline{position:absolute;top:0;bottom:0;left:0;width:1.5px;background:#FEFBF1;box-shadow:0 0 12px rgba(254,251,241,.6)}
.st-chip{position:absolute;top:8px;padding:3px 7px;border-radius:20px;background:rgba(10,9,8,.6);font-style:normal;font-size:7px;font-weight:700;letter-spacing:.14em;color:#FEFBF1}
.st-chip.l{left:8px;color:#F4AF56}.st-chip.r{right:8px}
.st-tools{display:flex;flex-direction:column;align-items:center;gap:9px;padding-top:12px;background:#262626;border-right:1px solid #111}
.st-tools i{width:12px;height:12px;border-radius:3px;background:#3d3d3d}
.st-tools i:nth-child(3){background:#5a5a5a}
.st-dock{position:relative;overflow:hidden;background:#2b2b2b;border-left:1px solid #111}
.st-dock-in{position:relative}
.st-dock-in img{display:block;width:100%}
.st-ring{position:absolute;border:1.5px solid #F4AF56;border-radius:5px;box-shadow:0 0 0 3px rgba(244,175,86,.18);opacity:0;transition:opacity .4s}
.st-ring-a{left:3%;top:14.6%;width:23%;height:2.9%}
.st-ring-b{left:3%;top:46.4%;width:45.5%;height:3.9%}
.st-ring.on{opacity:1}
.st-mouse{position:absolute;left:0;top:0;z-index:5;width:22px;height:22px;margin:-3px 0 0 -5px;pointer-events:none;filter:drop-shadow(0 3px 6px rgba(0,0,0,.55));will-change:left,top}
.st-mouse svg{display:block}
.st-mouse::after{content:"";position:absolute;left:3px;top:1px;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;border:2px solid #F4AF56;opacity:0;transform:scale(.3)}
.st-mouse.click::after{animation:stclick .7s cubic-bezier(.2,.7,.2,1)}
@keyframes stclick{0%{opacity:.9;transform:scale(.3)}100%{opacity:0;transform:scale(1.6)}}
.st-mouse.press svg{transform:scale(.86);transform-origin:20% 10%}
.st-pane span.hov{background:rgba(254,251,241,.06)}
/* Lightroom-style develop screen */
.lrc{grid-template-columns:19% 1fr 25%;grid-template-rows:7% 1fr 12%;background:#1a1a1a;font-size:7px;color:#b4b4b4}
.lr-top{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding:0 3%;background:#141414;border-bottom:1px solid #0a0a0a}
.lr-id{font-size:6px;font-weight:700;letter-spacing:.24em;color:#8a8a8a}
.lr-top nav{display:flex;gap:9px;font-size:7px;color:#6c6c6c}
.lr-top nav b{color:#e8e8e8;font-weight:600}
.lr-left,.lr-right{display:flex;flex-direction:column;gap:4px;padding:6px 7px;background:#262626;overflow:hidden}
.lr-left{border-right:1px solid #111}.lr-right{border-left:1px solid #111}
.lr-head{margin-top:3px;padding:2px 0 3px;border-bottom:1px solid #1b1b1b;font-size:7px;font-weight:600;color:#d0d0d0;text-align:right}
.lr-left .lr-head{text-align:left}
.lr-nav{width:100%;aspect-ratio:16/10;object-fit:cover;border:1px solid #111}
.lr-folder{display:flex;align-items:center;gap:4px;padding:2px 3px;border-radius:2px;white-space:nowrap;overflow:hidden}
.lr-tri{width:0;height:0;border-left:3px solid #8a8a8a;border-top:2.5px solid transparent;border-bottom:2.5px solid transparent;flex:none}
.lr-folder.on{background:#3d3d3d;color:#f0f0f0}
.lr-folder.on .lr-tri{border-left-color:#F4AF56}
.lr-folder.hov{background:#333}
.lr-histo-box{height:13%;min-height:24px;background:#1c1c1c;border:1px solid #111}
.lr-histo{display:block;width:100%;height:100%}
.lr-row{display:flex;align-items:center;gap:4px;font-size:6.5px}
.lr-row span{flex:1}.lr-row em{font-style:normal;color:#e8e8e8}.lr-row em.off{color:#666}
.lr-sub{margin-top:2px;font-size:6.5px;color:#8a8a8a;text-align:right}
.lr-sl{display:grid;grid-template-columns:42% 1fr;align-items:center;gap:4px;font-size:6.5px}
.lr-sl span{text-align:right}
.lr-track{position:relative;height:2px;background:#4a4a4a}
.lr-sl.temp .lr-track{background:linear-gradient(90deg,#4a6fb5,#d8c25a)}
.lr-sl.tint .lr-track{background:linear-gradient(90deg,#4fa35a,#b2549e)}
.lr-track i{position:absolute;top:50%;left:var(--at,50%);width:0;height:0;margin:-1px 0 0 -3px;border-left:3px solid transparent;border-right:3px solid transparent;border-bottom:5px solid #cfcfcf}
.lr-canvas{background:#111}
.lr-film{grid-column:1/-1;display:flex;gap:4px;align-items:center;padding:4px 6px;background:#141414;border-top:1px solid #0a0a0a;overflow:hidden}
.lr-film img{height:82%;aspect-ratio:3/2;object-fit:cover;opacity:.55;border:1px solid transparent}
.lr-film img.on{opacity:1;border-color:#cfcfcf}
/* Photoshop-style screen */
.psc{grid-template-columns:4.5% 1fr 30%;grid-template-rows:5% 6% 1fr;background:#2d2d2d;font-size:7px;color:#c8c8c8}
.ps-menu{grid-column:1/-1;display:flex;gap:9px;align-items:center;padding:0 2%;background:#1f1f1f;color:#bdbdbd;font-size:6.5px}
.ps-opts{grid-column:1/-1;display:flex;gap:6px;align-items:center;padding:0 2%;background:#343434;border-bottom:1px solid #1d1d1d}
.ps-opts i{width:12px;height:8px;border-radius:2px;background:#4b4b4b}.ps-opts span{width:60px;height:6px;border-radius:2px;background:#444}
.ps-tools{display:flex;flex-direction:column;align-items:center;gap:5px;padding-top:6px;background:#383838;border-right:1px solid #1d1d1d}
.ps-tools i{width:9px;height:9px;border-radius:2px;background:#5a5a5a}
.ps-tools i:nth-child(4){background:#8a8a8a}
.ps-doc{display:flex;flex-direction:column;background:#232323;min-width:0}
.ps-tab{flex:none;padding:3px 8px;font-size:6.5px;color:#d0d0d0;background:#3a3a3a;align-self:flex-start;border-radius:0 0 3px 0}
.ps-canvas{flex:1;margin:6%;box-shadow:0 4px 18px rgba(0,0,0,.5)}
.ps-right{display:grid;grid-template-rows:1fr auto;min-height:0;border-left:1px solid #1d1d1d}
.ps-right .st-dock{border-left:0}
.ps-layers{background:#323232;border-top:1px solid #1d1d1d;padding:3px 0 4px}
.ps-lh{display:flex;gap:8px;padding:2px 6px 4px;font-size:6.5px;color:#888}.ps-lh b{color:#e8e8e8;font-weight:600}
.ps-layer{display:flex;align-items:center;gap:4px;padding:3px 6px;font-size:6.5px;border-top:1px solid #2a2a2a}
.ps-layer img,.ps-thumb{width:16px;height:11px;object-fit:cover;border:1px solid #222;background:repeating-conic-gradient(#555 0 25%,#777 0 50%) 0 0/6px 6px}
.ps-eye{width:7px;height:4px;border-radius:50%;border:1px solid #aaa}
.ps-fold{width:9px;height:6px;border-radius:1px;background:#8d8d8d}
.ps-lock{width:5px;height:6px;margin-left:auto;border-radius:1px;background:#aaa}
.ps-layer.sub{padding-left:16px}
.ps-layer.grp span{color:#F4AF56;font-weight:600}
.st-newlayer{opacity:0;max-height:0;padding-top:0;padding-bottom:0;overflow:hidden;transition:opacity .4s,max-height .4s,padding .4s}
.st-newlayer.on{opacity:1;max-height:20px;padding-top:3px;padding-bottom:3px;background:#3d4a5a}
/* Lightroom Classic plugin window */
.lpc{grid-template-columns:1fr 36%;grid-template-rows:7% 1fr;background:#1a1a1a;font-size:7px;color:#b4b4b4}
.lp-top{grid-column:1/-1;display:flex;align-items:center;gap:4px;padding:0 3%;background:#141414;border-bottom:1px solid #0a0a0a}
.lp-top i{width:6px;height:6px;border-radius:50%;background:#555}
.lp-top span{flex:1;text-align:center;font-size:7px;color:#cfcfcf;margin-right:22px}
.lp-canvas{margin:5%;box-shadow:0 4px 18px rgba(0,0,0,.5)}
.lp-bw{filter:grayscale(1) contrast(1.15) brightness(.95)}
.lp-side{display:flex;flex-direction:column;gap:8px;padding:8px 7px;background:#262626;border-left:1px solid #111;min-width:0}
.lp-tabs{display:flex;flex-wrap:wrap;gap:3px}
.lp-tab{position:relative;padding:2px 4px;border-radius:3px;background:#2f2f2f;font-size:6px;color:#9a9a9a}
.lp-tab.on{background:#3d3d3d;color:#f0f0f0}
.lp-looks{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.lp-look{position:relative;display:flex;flex-direction:column;gap:2px;font-size:6px;color:#bdbdbd;text-align:center}
.lp-look img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:2px}
.lp-str{display:grid;gap:4px;font-size:6px;color:#9a9a9a}
.lp-ring{inset:-2px;left:-2px;top:-2px;width:auto;height:auto}
@media (max-width:1200px){.st-app{font-size:8px}.lrc,.psc,.lpc{font-size:6px}}
"""
