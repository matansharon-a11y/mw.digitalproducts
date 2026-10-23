"""The MWP Presets page's own layout (build_products.py calls sections() for P["presets"], layout="collections").

One page, two collections and one purchase:
  collections      two product cards: Collection 01 · Lightroom Presets, Collection 02 · Adobe Presets (the LUTs)
  lightroom        Collection 01: before / after, the five preset collections, the adaptive presets, desktop and mobile
  adobe            Collection 02: the LUTs in a video editor frame, where they work, how to load them
  which            a comparison: which collection is for you
  included         also in the download: the Lightroom Classic panel (interactive preview) and the video tutorials
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
    media = [
        # Lightroom Presets: a real RAW / final split of the same photo
        f'<div class="pc-split"><img src="{img(fin)}" alt="{esc(k["cards"][0]["alt"])}" loading="lazy">'
        f'<img class="pc-raw" src="{img(raw)}" alt="" loading="lazy"><span class="pc-tag l">{u["raw"]}</span><span class="pc-tag r">{u["final"]}</span><i></i></div>',
        # Adobe Presets: a photo in a video editor frame (illustration: the timeline, not a LUT result)
        f'<div class="pc-video" lang="en" dir="ltr" data-no-i18n><img src="{img(p["adobe_img"])}" alt="{esc(k["cards"][1]["alt"])}" loading="lazy">'
        f'<div class="pc-tl"><span class="pc-play"></span><i class="pc-track v"><b></b><b></b><b></b></i><i class="pc-track a"></i><span class="pc-lut">.cube</span></div></div>',
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
    def col_head(n, cd, lead, meta):
        return (f'<header class="pc-colhead" data-r><p class="pc-num">{esc(n)}</p><div><p class="kick">{esc(cd["eyebrow"])}</p>'
                f'<h2 class="pc-h">{esc(cd["title"])}</h2><p class="pc-lead">{esc(lead)}</p>{chips(meta, "pc-meta")}</div></header>')

    # ---------------------------------------------------------------- Collection 01 · Lightroom Presets
    L = k["lr"]
    slides = [f'''<div class="ba">
<img class="before" src="{img(b)}" alt="{esc(lab)}: {u["raw_alt"]}" loading="lazy">
<img class="after" src="{img(a)}" alt="{esc(lab)}: {u["final_alt"]}" loading="lazy">
<span class="tag t1">{u["raw"]}</span><span class="tag t2">{u["final"]}</span>
<span class="line"></span><span class="knob">{p["grip"]}</span>
<input type="range" min="0" max="100" value="50" step="0.1" aria-label="{u["hint"]}">
</div>''' for (b, a), lab in zip(p["pairs_from"], c["pairs"])]
    sets = "".join(f'''<article class="pc-set" data-r style="--d:{n * .06:.2f}s"><div class="pc-set-ph"><img src="{img(im)}" alt="{esc(alt)}" loading="lazy"></div>
<p class="pc-set-n">{n + 1:02d}</p><h4>{esc(t)}</h4><p>{esc(d)}</p></article>'''
                   for n, (im, (t, d, alt)) in enumerate(zip(p["cards"], c["cards"])))
    ticks = "".join(f"<li>{CHECK}<span>{esc(pt)}</span></li>" for pt in c["feat_points"])
    devices = "".join(f'<div class="pc-dev" data-r><p class="pc-dev-n">{esc(n)}</p><div><h4>{esc(t)}</h4><p>{esc(d)}</p></div></div>' for n, t, d in L["devices"])
    out.append(f'''<section class="sec pc-col" id="lightroom-presets">
<div class="wrap">
{col_head("01", k["cards"][0], L["lead"], L["meta"])}
<div class="pc-block"><div class="pc-sub" data-r><h3>{esc(L["ba_h"])}</h3><p>{esc(c["proof_lead"])}</p></div>{gallery(slides, c["pairs"])}</div>
<div class="pc-block"><div class="pc-sub" data-r><h3>{esc(L["sets_h"])}</h3><p>{esc(c["inside_lead"])}</p></div><div class="pc-sets">{sets}</div></div>
<div class="pc-block pc-feat"><div class="pc-feat-ph" data-r><img src="{img(p["feat_img"])}" alt="{esc(c["feat_alt"])}" loading="lazy"></div>
<div data-r style="--d:.1s"><p class="kick">{esc(c["feat_kick"])}</p>{h(c["feat_h"], "h3", "pc-feat-h")}<p class="lead">{esc(c["feat_lead"])}</p><ul class="ticks">{ticks}</ul></div></div>
<div class="pc-block pc-devs">{devices}</div>
</div>
</section>''')

    # ---------------------------------------------------------------- Collection 02 · Adobe Presets (the LUTs)
    A = k["ad"]
    apps = "".join(f'<li data-r style="--d:{n * .06:.2f}s"><b>{esc(t)}</b><span>{esc(d)}</span></li>' for n, (t, d) in enumerate(A["apps"]))
    steps = "".join(f'<li><span>{n + 1}</span>{esc(s)}</li>' for n, s in enumerate(A["steps"]))
    out.append(f'''<section class="sec tint pc-col" id="adobe-presets">
<div class="wrap">
{col_head("02", k["cards"][1], A["lead"], A["meta"])}
<div class="pc-block pc-adobe">
<div class="pc-video big" data-r lang="en" dir="ltr" data-no-i18n><img src="{img(p["adobe_img"])}" alt="{esc(k["cards"][1]["alt"])}" loading="lazy">
<div class="pc-tl"><span class="pc-play"></span><i class="pc-track v"><b></b><b></b><b></b></i><i class="pc-track a"></i><span class="pc-lut">.cube</span></div></div>
<div data-r style="--d:.1s"><h3 class="pc-sub-h">{esc(A["apps_h"])}</h3><ul class="pc-apps">{apps}</ul>
<h3 class="pc-sub-h">{esc(A["steps_h"])}</h3><ol class="pc-steps">{steps}</ol><p class="pc-note">{esc(A["note"])}</p></div>
</div>
</div>
</section>''')

    # ---------------------------------------------------------------- which collection is for you
    W = k["which"]
    trs = "".join(f'<tr><th scope="row">{esc(r[0])}</th><td>{esc(r[1])}</td><td>{esc(r[2])}</td></tr>' for r in W["rows"])
    out.append(f'''<section class="sec" id="which">
<div class="wrap">
{head(W["kick"], W["h"], W["lead"])}
<div class="pc-table-wrap" data-r><table class="pc-table"><thead><tr><td></td><th scope="col"><span>01</span>{esc(k["cards"][0]["title"])}</th><th scope="col"><span>02</span>{esc(k["cards"][1]["title"])}</th></tr></thead><tbody>{trs}</tbody></table></div>
<p class="pc-one" data-r>{esc(W["foot"])}</p>
</div>
</section>''')

    # ---------------------------------------------------------------- also included: the Lightroom Classic panel and tutorials
    I = k["inc"]
    keys = ["cull", "organize", "guided", "looks", "edit", "color", "export"]
    descs = "".join(f'<p data-lrc-desc="{keys[n]}"{"" if keys[n] == "looks" else " hidden"}><span class="n">{n + 1:02d}</span><b>{esc(t)}</b><span>{esc(d)}</span></p>'
                    for n, (t, d) in enumerate(c["lrc"]))
    extras = "".join(f'<li data-r><b>{esc(t)}</b><span>{esc(d)}</span></li>' for t, d in I["extras"])
    out.append(f'''<section class="sec tint" id="included">
<div class="wrap">
{head(I["kick"], I["h"], I["lead"])}
<ul class="pc-extras">{extras}</ul>
<div class="lrc" data-lrc data-r><p class="lrc-label"><i aria-hidden="true"></i><span>{esc(c["lrc_note"].split(" · ")[0])}<span class="req"> · {esc(c["lrc_note"].split(" · ")[1])}</span></span></p><div class="lrc-stage">{lrc_window()}</div>
<div class="lrc-desc" aria-live="polite">{descs}</div></div>
</div>
</section>''')
    return out
