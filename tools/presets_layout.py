"""The Lightroom page (/presets/): MWP Presets and the Lightroom Classic plugin, two separate products on one page
(Jeinna, 23 Oct 2026). build_products.py calls sections() for P["presets"], layout="collections".

Each product is bought on its own: its own card, mockup, price and button at the top (#choose), then its own part of
the page opened by a strip with its name, price and button. Nothing is free and nothing is shown as a package.
Minimal: one idea per section, one big visual, a short headline and at most one line under it.
Details live in What's in the download and the FAQs, not in the sections.
  choose       the two products side by side: mockup, type, name, one line, price, Add to cart, See more
  look         before / after: the RAW and Matan's final, one preset
  collections  the five collections: a photo and a name each
  adaptive     the 12 adaptive presets beside the fox, one line
  luts         also in the pack: the 33 LUTs on a monitor running a video editor, the apps in one line
  plugin       the Lightroom Classic plugin: its strip, its interactive window, its seven tabs by phase
Content in P["presets"][lang]["m"] and, for the plugin, P["lightroom-classic"][lang]. Styles .pc-* / .mk-* in assets/css/product.css.
"""


def sections(p, c, u, lang, h, esc, img, gallery, lrc_window, CHECK, ARROW, price=None, plug=None):
    k = c["m"]
    g = plug   # the plugin's own words (P["lightroom-classic"][lang])
    out = []
    keys = ["cull", "organize", "guided", "looks", "edit", "color", "export"]   # the plugin's tab ids, in its order
    raw, fin = p["pairs_from"][0]
    tabs = "".join(f'<b{" class=on" if t == "Looks" else ""}>{t}</b>' for t in ("Cull", "Organize", "Expedition", "Looks", "Edit", "Color", "Export"))
    looks = "".join(f'<span><img src="/assets/pages/img/lrc/look_{x}.png" alt="" loading="lazy"><i>{t}</i></span>'
                    for x, t in (("bw", "B&W"), ("moody", "Moody"), ("golden", "Golden"), ("bluehour", "Blue hour")))
    sets_list = "".join(f'<li{" class=on" if t == "Light & Scene" else ""}>{esc(t)}</li>' for t in ("Signature", "Light & Scene", "Mono", "Adaptive", "Tools"))
    mock = {
        "presets": f'''<div class="mk mk-lap" lang="en" dir="ltr" data-no-i18n><div class="mk-lid"><div class="mk-scr"><div class="mk-lr">
<aside><p>Presets</p><ul>{sets_list}</ul><p class="mk-pre">{esc(c["pairs"][0])}</p></aside>
<div class="mk-view"><div class="mk-photo"><img src="{img(fin)}" alt="{esc(k["choose"][0]["alt"])}" loading="lazy"><img class="mk-raw" src="{img(raw)}" alt="" loading="lazy"><i class="mk-wipe"></i>
<span class="mk-tag l">RAW</span><span class="mk-tag r">FINAL</span></div></div>
<aside class="mk-r"><p>Amount</p><i class="mk-sl"><b></b></i><p>Exposure</p><i class="mk-sl s2"><b></b></i><p>Contrast</p><i class="mk-sl s3"><b></b></i></aside>
</div></div></div><div class="mk-base"></div></div>''',
        "plugin": (f'<div class="mk mk-lap" lang="en" dir="ltr" data-no-i18n><div class="mk-lid"><div class="mk-scr"><div class="mk-plug">'
                   f'<img class="mk-plug-bg" src="{img(fin)}" alt="{esc(k["choose"][1]["alt"])}" loading="lazy">'
                   f'<div class="mk-pw"><p class="mk-pw-bar"><i></i><i></i><i></i><span>MWP Panel · Lightroom Classic</span></p><p class="mk-pw-tabs">{tabs}</p>'
                   f'<div class="mk-pw-looks">{looks}</div><p class="mk-pw-sl"><i></i></p></div></div></div></div><div class="mk-base"></div></div>'),
    }
    slugs = {"presets": "mwp-presets", "plugin": "mwp-lightroom-plugin"}

    def buy(key, cta):   # its own price and its own button, never shared
        return (f'<div class="pc-buy"><span class="pc-buy-pr">{price(slugs[key], lang)}</span>'
                f'<a class="btn" href="#buy" data-add-to-cart="{slugs[key]}">{esc(cta)}</a></div>')

    # ---------------------------------------------------------------- the two products, side by side
    cards = ""
    for n, (key, cd) in enumerate(zip(("presets", "plugin"), k["choose"])):
        cards += (f'<article class="pc-card pc-pick" data-r style="--d:{n * .08:.2f}s"><div class="pc-media">{mock[key]}</div>'
                  f'<div class="pc-body"><p class="pc-eyebrow">{esc(cd["type"])}</p><h3 class="pc-title">{esc(cd["name"])}</h3>'
                  f'<p class="pc-desc">{esc(cd["line"])}</p><p class="pc-meta">{esc(cd["meta"])}</p>'
                  f'{buy(key, cd["cta"])}<a class="pc-cta" href="#{key}">{esc(cd["more"])} {ARROW}</a></div></article>')
    out.append(f'''<section class="sec" id="choose">
<div class="wrap">
<div class="pc-cards">{cards}</div>
</div>
</section>''')

    def strip(key, cd):   # opens each product's part of the page: its name, its price, its button
        return (f'<div class="pc-strip" data-r><div><p class="kick">{esc(cd["type"])}</p><h2 class="pc-strip-h">{esc(cd["name"])}</h2></div>'
                f'{buy(key, cd["cta"])}</div>')

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
    out.append(f'''<section class="sec" id="presets">
<div class="wrap">
{strip("presets", k["choose"][0])}
</div>
</section>
<section class="sec" id="look">
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

    # ---------------------------------------------------------------- the Lightroom Classic plugin: its own part of the page
    descs = "".join(f'<p data-lrc-desc="{keys[n]}"{"" if keys[n] == "looks" else " hidden"}><span class="n">{n + 1:02d}</span><b>{esc(t)}</b><span>{esc(d)}</span></p>'
                    for n, (t, d) in enumerate(g["lrc"]))
    cols = ""
    for n, (title, line, idx) in enumerate(g["phases"]):
        names = " · ".join(esc(g["lrc"][i][0]) for i in idx)
        cols += (f'<article class="pl-phase" data-r style="--d:{n * .08:.2f}s"><p class="pl-n">{n + 1:02d}</p><h3>{esc(title)}</h3>'
                 f'<p class="pl-tabs">{names}</p></article>')
    out.append(f'''<section class="sec tint" id="plugin">
<div class="wrap">
{strip("plugin", k["choose"][1])}
</div>
</section>
<section class="sec tint" id="inside">
<div class="wrap">
{head(g["inside_kick"], g["inside_h"])}
<div class="lrc pl-lrc pc-gap" data-lrc data-r><div class="lrc-stage">{lrc_window()}</div>
<div class="lrc-desc" aria-live="polite">{descs}</div><p class="pl-cap">{esc(g["lrc_cap"])}</p></div>
</div>
</section>
<section class="sec tint" id="workflow">
<div class="wrap">
{head(g["flow_kick"], g["flow_h"])}
<div class="pl-phases">{cols}</div>
</div>
</section>''')
    return out
