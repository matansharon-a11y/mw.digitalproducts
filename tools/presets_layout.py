"""The MWP Presets page's own layout (build_products.py calls sections() for P["presets"], layout="collections").

One page, two collections and one purchase:
  collections      two product cards: Collection 01 · Lightroom Presets, Collection 02 · LUTs (the LUTs)
  lightroom        Collection 01: before / after, the five preset collections, the adaptive presets, desktop and mobile
  adobe            Collection 02: the LUTs in a video editor frame, where they work, how to load them
  included         also in the download: the Lightroom Classic plugin (interactive preview); tutorials and guide in its lead
Each fact appears once: files and apps on the cards, the full list in What's in the download.
Facts come from the download and the FAQs (tools/pages/faqs.json); the content lives in P["presets"][lang]["col"].
Styles: .pc-* in assets/css/product.css.
"""


def sections(p, c, u, lang, h, esc, img, gallery, lrc_window, CHECK, ARROW):
    k = c["col"]
    out = []

    def head(kick, title, lead, center=True):
        return (f'<div class="head{" c" if center else ""}" data-r><p class="kick">{esc(kick)}</p>{h(title)}'
                f'{f"<p class=lead>{esc(lead)}</p>" if lead else ""}</div>')

    def chips(items, cls="pc-chips"):
        return f'<ul class="{cls}">' + "".join(f"<li>{esc(x)}</li>" for x in items) + "</ul>"

    # ---------------------------------------------------------------- the two collections as product cards
    raw, fin = p["pairs_from"][0]
    # the two cards show each collection as a product mockup, with slow motion (styles .mk-*, paused off screen and
    # for reduced motion by product-page.js / CSS). Only real material moves: the RAW and Matan's final of one photo;
    # the video clip pans and the playhead runs, with no invented "LUT before / after".
    sets_list = "".join(f'<li{" class=on" if t == "Light & Scene" else ""}>{esc(t)}</li>' for t in ("Signature", "Light & Scene", "Mono", "Adaptive", "Tools"))
    media = [
        f'''<div class="mk mk-lap" lang="en" dir="ltr" data-no-i18n><div class="mk-lid"><div class="mk-scr"><div class="mk-lr">
<aside><p>Presets</p><ul>{sets_list}</ul><p class="mk-pre">{esc(c["pairs"][0])}</p></aside>
<div class="mk-view"><div class="mk-photo"><img src="{img(fin)}" alt="{esc(k["cards"][0]["alt"])}" loading="lazy"><img class="mk-raw" src="{img(raw)}" alt="" loading="lazy"><i class="mk-wipe"></i>
<span class="mk-tag l">RAW</span><span class="mk-tag r">FINAL</span></div></div>
<aside class="mk-r"><p>Amount</p><i class="mk-sl"><b></b></i><p>Exposure</p><i class="mk-sl s2"><b></b></i><p>Contrast</p><i class="mk-sl s3"><b></b></i></aside>
</div></div></div><div class="mk-base"></div></div>''',
        f'''<div class="mk mk-mon" lang="en" dir="ltr" data-no-i18n><div class="mk-disp"><div class="mk-ed">
<div class="mk-clip"><img src="{img(p["adobe_img"])}" alt="{esc(k["cards"][1]["alt"])}" loading="lazy"><span class="mk-rec">00:00:0<b>4</b>:12</span></div>
<div class="mk-tl"><span class="mk-play"></span><div class="mk-tracks"><i class="mk-fx">.cube LUT</i><i class="mk-v"><b></b><b></b><b></b></i><i class="mk-a"></i><span class="mk-head"></span></div></div>
</div></div><div class="mk-stand"></div></div>''',
    ]
    cards = ""
    for n, (cd, m) in enumerate(zip(k["cards"], media)):
        rows = "".join(f'<div><dt>{esc(a)}</dt><dd>{esc(b)}</dd></div>' for a, b in cd["rows"])
        cards += (f'<article class="pc-card" data-r style="--d:{n * .08:.2f}s"><div class="pc-media">{m}</div>'
                  f'<div class="pc-body"><p class="pc-eyebrow">{esc(cd["eyebrow"])}</p><h3 class="pc-title">{esc(cd["title"])}</h3>'
                  f'<p class="pc-count"><b>{esc(cd["count"])}</b> {esc(cd["count_label"])}</p>'
                  f'<p class="pc-desc">{esc(cd["desc"])}</p><dl class="pc-dl">{rows}</dl>'
                  f'<a class="pc-cta" href="#{cd["href"]}">{esc(cd["cta"])} {ARROW}</a></div></article>')
    out.append(f'''<section class="sec" id="collections">
<div class="wrap">
{head(k["kick"], k["h"], k["lead"])}
<div class="pc-cards">{cards}</div>
<p class="pc-one" data-r>{esc(k["one"])}</p>
</div>
</section>''')

    # ---------------------------------------------------------------- collection header (shared by 01 and 02)
    def col_head(n, cd, lead):
        return (f'<header class="pc-colhead" data-r><p class="pc-num">{esc(n)}</p><p class="kick">{esc(cd["eyebrow"])}</p>'
                f'<h2 class="pc-h">{esc(cd["title"])}</h2><p class="pc-lead">{esc(lead)}</p></header>')

    def sub(title, text):   # a block's own small heading, centred like every section head
        return f'<div class="pc-sub" data-r><h3>{esc(title)}</h3>{f"<p>{esc(text)}</p>" if text else ""}</div>'

    # ---------------------------------------------------------------- Collection 01 · Lightroom Presets
    L = k["lr"]
    slides = [f'''<div class="ba">
<img class="before" src="{img(b)}" alt="{esc(lab)}: {u["raw_alt"]}" loading="lazy">
<img class="after" src="{img(a)}" alt="{esc(lab)}: {u["final_alt"]}" loading="lazy">
<span class="tag t1">{u["raw"]}</span><span class="tag t2">{u["final"]}</span>
<span class="line"></span><span class="knob">{p["grip"]}</span>
<input type="range" min="0" max="100" value="50" step="0.1" aria-label="{u["hint"]}">
</div>''' for (b, a), lab in zip(p["pairs_from"], c["pairs"])]
    sets = "".join(f'''<article class="pc-set" data-r style="--d:{n * .06:.2f}s"><div class="pc-set-ph"><img src="{img(im)}" alt="{esc(alt)}" loading="lazy" style="object-position:{p["card_focus"][n]}"></div>
<p class="pc-set-n">{n + 1:02d}</p><h4>{esc(t)}</h4><p>{esc(d)}</p></article>'''
                   for n, (im, (t, d, alt)) in enumerate(zip(p["cards"], c["cards"])))
    ticks = "".join(f"<li>{CHECK}<span>{esc(pt)}</span></li>" for pt in c["feat_points"])
    out.append(f'''<section class="sec pc-col" id="lightroom-presets">
<div class="wrap">
{col_head("01", k["cards"][0], L["lead"])}
<div class="pc-block">{sub(L["ba_h"], c["proof_lead"])}{gallery(slides, c["pairs"])}</div>
<div class="pc-block">{sub(L["sets_h"], c["inside_lead"])}<div class="pc-sets">{sets}</div></div>
<div class="pc-block pc-feat"><div class="pc-feat-ph" data-r><img src="{img(p["feat_img"])}" alt="{esc(c["feat_alt"])}" loading="lazy" style="object-position:{p["feat_focus"]}"></div>
<div class="pc-feat-tx" data-r style="--d:.1s"><p class="kick">{esc(c["feat_kick"])}</p>{h(c["feat_h"], "h3", "pc-feat-h")}<p class="pc-feat-p">{esc(c["feat_lead"])}</p><ul class="ticks">{ticks}</ul></div></div>
</div>
</section>''')

    # ---------------------------------------------------------------- Collection 02 · LUTs (the LUTs)
    A = k["ad"]
    steps = "".join(f'<li><span>{n + 1}</span>{esc(s)}</li>' for n, s in enumerate(A["steps"]))
    out.append(f'''<section class="sec tint pc-col" id="luts">
<div class="wrap">
{col_head("02", k["cards"][1], A["lead"])}
<div class="pc-block pc-adobe">
<div class="pc-video big" data-r lang="en" dir="ltr" data-no-i18n><img src="{img(p["adobe_img"])}" alt="{esc(k["cards"][1]["alt"])}" loading="lazy">
<div class="pc-tl"><span class="pc-play"></span><i class="pc-track v"><b></b><b></b><b></b></i><i class="pc-track a"></i><span class="pc-lut">.cube</span></div></div>
<div class="pc-adobe-tx" data-r style="--d:.1s"><p class="kick">{esc(A["steps_kick"])}</p><h3 class="pc-sub-h">{esc(A["steps_h"])}</h3><ol class="pc-steps">{steps}</ol><p class="pc-note">{esc(A["note"])}</p></div>
</div>
</div>
</section>''')

    # ---------------------------------------------------------------- also included: the Lightroom Classic plugin and tutorials
    I = k["inc"]
    keys = ["cull", "organize", "guided", "looks", "edit", "color", "export"]
    descs = "".join(f'<p data-lrc-desc="{keys[n]}"{"" if keys[n] == "looks" else " hidden"}><span class="n">{n + 1:02d}</span><b>{esc(t)}</b><span>{esc(d)}</span></p>'
                    for n, (t, d) in enumerate(c["lrc"]))
    out.append(f'''<section class="sec tint" id="included">
<div class="wrap">
{head(I["kick"], I["h"], I["lead"])}
<div class="lrc" data-lrc data-r><p class="lrc-label"><i aria-hidden="true"></i><span>{esc(c["lrc_note"].split(" · ")[0])}<span class="req"> · {esc(c["lrc_note"].split(" · ")[1])}</span></span></p><div class="lrc-stage">{lrc_window()}</div>
<div class="lrc-desc" aria-live="polite">{descs}</div></div>
</div>
</section>''')
    return out
