"""The MWP Presets page's own layout (build_products.py calls sections() for P["presets"], layout="collections").

Minimal (Jeinna, 23 Oct 2026): one idea per section, one big visual, a short headline and at most one line under it.
Details live in What's in the download and the FAQs, not in the sections.
  look         before / after: the RAW and Matan's final, one preset
  collections  the five collections: a photo and a name each
  adaptive     the 12 adaptive presets beside the fox, one line
  luts         also in the pack: the 33 LUTs on a monitor running a video editor, the apps in one line
  plugin       the Lightroom Classic plugin, a separate product (sold on its own): its window, one line, a link
Content in P["presets"][lang]["m"]. Styles .pc-* / .mk-* in assets/css/product.css.
"""


def sections(p, c, u, lang, h, esc, img, gallery, lrc_window, CHECK, ARROW):
    k = c["m"]
    out = []

    def head(kick, title, lead=""):
        return (f'<div class="head c" data-r><p class="kick">{esc(kick)}</p>{h(title)}'
                f'{f"<p class=lead>{esc(lead)}</p>" if lead else ""}</div>')

    # ---------------------------------------------------------------- before / after
    slides = [f'''<div class="ba">
<img class="before" src="{img(b)}" alt="{esc(lab)}: {u["raw_alt"]}" loading="lazy">
<img class="after" src="{img(a)}" alt="{esc(lab)}: {u["final_alt"]}" loading="lazy">
<span class="tag t1">{u["raw"]}</span><span class="tag t2">{u["final"]}</span>
<span class="line"></span><span class="knob">{p["grip"]}</span>
<input type="range" min="0" max="100" value="50" step="0.1" aria-label="{u["hint"]}">
</div>''' for (b, a), lab in zip(p["pairs_from"], c["pairs"])]
    out.append(f'''<section class="sec" id="look">
<div class="wrap">
{head(k["look_kick"], k["look_h"])}
<div class="pc-gap">{gallery(slides, c["pairs"])}</div>
</div>
</section>''')

    # ---------------------------------------------------------------- the five collections: photo and name
    sets = "".join(f'''<article class="pc-set" data-r style="--d:{n * .06:.2f}s"><div class="pc-set-ph"><img src="{img(im)}" alt="{esc(alt)}" loading="lazy" style="object-position:{p["card_focus"][n]}"></div>
<h4>{esc(t)}</h4></article>''' for n, (im, (t, d, alt)) in enumerate(zip(p["cards"], c["cards"])))
    out.append(f'''<section class="sec" id="collections">
<div class="wrap">
{head(k["sets_kick"], k["sets_h"])}
<div class="pc-sets pc-gap">{sets}</div>
</div>
</section>''')

    # ---------------------------------------------------------------- adaptive presets
    out.append(f'''<section class="sec" id="adaptive">
<div class="wrap pc-feat">
<div class="pc-feat-ph" data-r><img src="{img(p["feat_img"])}" alt="{esc(c["feat_alt"])}" loading="lazy" style="object-position:{p["feat_focus"]}"></div>
<div class="pc-feat-tx" data-r style="--d:.1s"><p class="kick">{esc(c["feat_kick"])}</p>{h(c["feat_h"], "h3", "pc-feat-h")}<p class="pc-feat-p">{esc(k["feat_line"])}</p></div>
</div>
</section>''')

    # ---------------------------------------------------------------- the LUTs: a monitor running a video editor
    mon = f'''<div class="mk mk-mon big" lang="en" dir="ltr" data-no-i18n><div class="mk-disp"><div class="mk-ed">
<div class="mk-clip"><img src="{img(p["adobe_img"])}" alt="{esc(k["luts_alt"])}" loading="lazy"><span class="mk-rec">00:00:0<b>4</b>:12</span></div>
<div class="mk-tl"><span class="mk-play"></span><div class="mk-tracks"><i class="mk-fx">.cube LUT</i><i class="mk-v"><b></b><b></b><b></b></i><i class="mk-a"></i><span class="mk-head"></span></div></div>
</div></div><div class="mk-stand"></div></div>'''
    out.append(f'''<section class="sec tint" id="luts">
<div class="wrap">
{head(k["luts_kick"], k["luts_h"], k["luts_line"])}
<div class="pc-gap pc-mon" data-r>{mon}</div>
</div>
</section>''')

    # ---------------------------------------------------------------- the Lightroom Classic plugin, a separate product
    raw, fin = p["pairs_from"][0]
    tabs = "".join(f'<b{" class=on" if t == "Looks" else ""}>{t}</b>' for t in ("Cull", "Organize", "Expedition", "Looks", "Edit", "Color", "Export"))
    looks = "".join(f'<span><img src="/assets/pages/img/lrc/look_{x}.png" alt="" loading="lazy"><i>{t}</i></span>'
                    for x, t in (("bw", "B&W"), ("moody", "Moody"), ("golden", "Golden"), ("bluehour", "Blue hour")))
    win = (f'<div class="mk mk-lap" lang="en" dir="ltr" data-no-i18n><div class="mk-lid"><div class="mk-scr"><div class="mk-plug">'
           f'<img class="mk-plug-bg" src="{img(fin)}" alt="{esc(k["plug_alt"])}" loading="lazy">'
           f'<div class="mk-pw"><p class="mk-pw-bar"><i></i><i></i><i></i><span>MWP Panel · Lightroom Classic</span></p><p class="mk-pw-tabs">{tabs}</p>'
           f'<div class="mk-pw-looks">{looks}</div><p class="mk-pw-sl"><i></i></p></div></div></div></div><div class="mk-base"></div></div>')
    href = "/lightroom-classic/he/" if lang == "he" else "/lightroom-classic/"
    out.append(f'''<section class="sec" id="plugin">
<div class="wrap pc-x">
<div class="pc-x-ph" data-r>{win}</div>
<div class="pc-x-tx" data-r style="--d:.1s"><p class="kick">{esc(k["plug_kick"])}</p>{h(k["plug_h"])}<p class="lead">{esc(k["plug_line"])}</p>
<a class="pc-cta" href="{href}">{esc(k["plug_cta"])} {ARROW}</a></div>
</div>
</section>''')
    return out
