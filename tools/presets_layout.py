"""The Lightroom page: MWP Presets, its own layout (build_products.py calls sections() for P["presets"], layout="collections").

One purchase, two Lightroom tools (Jeinna, 23 Oct 2026, after research: a tool that can't be bought on its own belongs
on the page of the product it comes with, as a clearly labelled "included" section, not on a page of its own):
  lightroom                 the two tools as product cards (01 Lightroom Presets: what you buy; 02 Lightroom Classic
                            Plugin: included), then "Which Lightroom do you use?": what works where
  lightroom-presets         01 · before / after, the five collections, the adaptive presets, then the 33 LUTs (#luts),
                            which are part of the preset pack
  lightroom-classic-plugin  02 · included: the plugin's interactive window, its seven tabs by phase, what it never does
The template then adds What's in the download, reviews, FAQs and the price cards.
Facts come from the download and the FAQs (tools/pages/faqs.json); the content lives in P["presets"][lang]["lr"].
Styles: .pc-* and .mk-* in assets/css/product.css. /lightroom-classic/ forwards to #lightroom-classic-plugin.
"""


def sections(p, c, u, lang, h, esc, img, gallery, lrc_window, CHECK, ARROW):
    k = c["lr"]
    out = []
    keys = ["cull", "organize", "guided", "looks", "edit", "color", "export"]   # the plugin's tab ids, in its order

    def head(kick, title, lead):
        return (f'<div class="head c" data-r><p class="kick">{esc(kick)}</p>{h(title)}'
                f'{f"<p class=lead>{esc(lead)}</p>" if lead else ""}</div>')

    # ---------------------------------------------------------------- the two Lightroom tools
    raw, fin = p["pairs_from"][0]
    sets_list = "".join(f'<li{" class=on" if t == "Light & Scene" else ""}>{esc(t)}</li>' for t in ("Signature", "Light & Scene", "Mono", "Adaptive", "Tools"))
    tabs = "".join(f'<b{" class=on" if t == "Looks" else ""}>{t}</b>' for t in ("Cull", "Organize", "Expedition", "Looks", "Edit", "Color", "Export"))
    looks = "".join(f'<span><img src="/assets/pages/img/lrc/look_{x}.png" alt="" loading="lazy"><i>{t}</i></span>'
                    for x, t in (("bw", "B&W"), ("moody", "Moody"), ("golden", "Golden"), ("bluehour", "Blue hour")))
    # each mockup is real material: the RAW and Matan's final of one photo in a Lightroom-like screen; the plugin's
    # own window (its words stay in English, like the plugin) over the same photo in Lightroom Classic
    media = [
        f'''<div class="mk mk-lap" lang="en" dir="ltr" data-no-i18n><div class="mk-lid"><div class="mk-scr"><div class="mk-lr">
<aside><p>Presets</p><ul>{sets_list}</ul><p class="mk-pre">{esc(c["pairs"][0])}</p></aside>
<div class="mk-view"><div class="mk-photo"><img src="{img(fin)}" alt="{esc(k["cards"][0]["alt"])}" loading="lazy"><img class="mk-raw" src="{img(raw)}" alt="" loading="lazy"><i class="mk-wipe"></i>
<span class="mk-tag l">RAW</span><span class="mk-tag r">FINAL</span></div></div>
<aside class="mk-r"><p>Amount</p><i class="mk-sl"><b></b></i><p>Exposure</p><i class="mk-sl s2"><b></b></i><p>Contrast</p><i class="mk-sl s3"><b></b></i></aside>
</div></div></div><div class="mk-base"></div></div>''',
        f'''<div class="mk mk-lap" lang="en" dir="ltr" data-no-i18n><div class="mk-lid"><div class="mk-scr"><div class="mk-plug">
<img class="mk-plug-bg" src="{img(fin)}" alt="{esc(k["cards"][1]["alt"])}" loading="lazy">
<div class="mk-pw"><p class="mk-pw-bar"><i></i><i></i><i></i><span>MWP Panel · Lightroom Classic</span></p><p class="mk-pw-tabs">{tabs}</p>
<div class="mk-pw-looks">{looks}</div><p class="mk-pw-sl"><i></i></p></div>
</div></div></div><div class="mk-base"></div></div>''',
    ]
    cards = ""
    for n, (cd, m) in enumerate(zip(k["cards"], media)):
        rows = "".join(f'<div><dt>{esc(a)}</dt><dd>{esc(b)}</dd></div>' for a, b in cd["rows"])
        cards += (f'<article class="pc-card{" inc" if n else ""}" data-r style="--d:{n * .08:.2f}s"><div class="pc-media">{m}<span class="pc-badge{" inc" if n else ""}">{esc(cd["badge"])}</span></div>'
                  f'<div class="pc-body"><p class="pc-eyebrow">{esc(cd["n"])} · {esc(cd["type"])}</p><h3 class="pc-title">{esc(cd["title"])}</h3>'
                  f'<p class="pc-count"><b>{esc(cd["count"])}</b> {esc(cd["count_label"])}</p>'
                  f'<p class="pc-desc">{esc(cd["desc"])}</p><dl class="pc-dl">{rows}</dl>'
                  f'<a class="pc-cta" href="#{cd["href"]}">{esc(cd["cta"])} {ARROW}</a></div></article>')
    F = k["fit"]
    yes = f'<span class="fit-y">{CHECK}<span>{esc(F["yes"])}</span></span>'
    no = f'<span class="fit-n"><i aria-hidden="true">–</i><span>{esc(F["no"])}</span></span>'
    fit_rows = "".join(f'<tr><th scope="row"><b>{esc(app)}</b><span>{esc(where)}</span></th><td>{yes if a else no}</td><td>{yes if b else no}</td></tr>'
                       for app, where, a, b in F["rows"])
    out.append(f'''<section class="sec" id="lightroom">
<div class="wrap">
{head(k["kick"], k["h"], k["lead"])}
<div class="pc-cards">{cards}</div>
<div class="pc-fit" data-r><div class="pc-fit-head"><p class="kick">{esc(F["kick"])}</p><h3>{esc(F["h"])}</h3></div>
<table><thead><tr><td></td>{"".join(f'<th scope="col">{esc(x)}</th>' for x in F["cols"])}</tr></thead><tbody>{fit_rows}</tbody></table>
<p class="pc-fit-note">{esc(F["note"])}</p></div>
</div>
</section>''')

    # ---------------------------------------------------------------- section header for 01 and 02
    def col_head(cd, lead, extra=""):
        return (f'<header class="pc-colhead" data-r><p class="pc-num">{esc(cd["n"])}</p><p class="kick">{esc(cd["type"])}</p>'
                f'<h2 class="pc-h">{esc(cd["title"])}</h2>{extra}<p class="pc-lead">{esc(lead)}</p></header>')

    def sub(title, text):
        return f'<div class="pc-sub" data-r><h3>{esc(title)}</h3>{f"<p>{esc(text)}</p>" if text else ""}</div>'

    # ---------------------------------------------------------------- 01 · Lightroom Presets (with the LUTs)
    L = k["pre"]
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
    A = k["luts"]
    steps = "".join(f'<li><span>{n + 1}</span>{esc(s)}</li>' for n, s in enumerate(A["steps"]))
    out.append(f'''<section class="sec pc-col" id="lightroom-presets">
<div class="wrap">
{col_head(k["cards"][0], L["lead"], f'<p class="pc-pill">{esc(k["cards"][0]["badge"])}</p>')}
<div class="pc-block">{sub(L["ba_h"], c["proof_lead"])}{gallery(slides, c["pairs"])}</div>
<div class="pc-block">{sub(L["sets_h"], c["inside_lead"])}<div class="pc-sets">{sets}</div></div>
<div class="pc-block pc-feat"><div class="pc-feat-ph" data-r><img src="{img(p["feat_img"])}" alt="{esc(c["feat_alt"])}" loading="lazy" style="object-position:{p["feat_focus"]}"></div>
<div class="pc-feat-tx" data-r style="--d:.1s"><p class="kick">{esc(c["feat_kick"])}</p>{h(c["feat_h"], "h3", "pc-feat-h")}<p class="pc-feat-p">{esc(c["feat_lead"])}</p><ul class="ticks">{ticks}</ul></div></div>
<div class="pc-block pc-luts" id="luts">{sub(A["h"], A["lead"])}
<div class="pc-adobe">
<div class="pc-video big" data-r lang="en" dir="ltr" data-no-i18n><img src="{img(p["adobe_img"])}" alt="{esc(A["alt"])}" loading="lazy">
<div class="pc-tl"><span class="pc-play"></span><i class="pc-track v"><b></b><b></b><b></b></i><i class="pc-track a"></i><span class="pc-lut">.cube</span></div></div>
<div class="pc-adobe-tx" data-r style="--d:.1s"><p class="kick">{esc(A["kick"])}</p><h3 class="pc-sub-h">{esc(A["steps_h"])}</h3><ol class="pc-steps">{steps}</ol><p class="pc-note">{esc(A["note"])}</p></div>
</div></div>
</div>
</section>''')

    # ---------------------------------------------------------------- 02 · Lightroom Classic Plugin (included)
    G = k["plug"]
    descs = "".join(f'<p data-lrc-desc="{keys[n]}"{"" if keys[n] == "looks" else " hidden"}><span class="n">{n + 1:02d}</span><b>{esc(t)}</b><span>{esc(d)}</span></p>'
                    for n, (t, d) in enumerate(c["lrc"]))
    label, req = c["lrc_note"].split(" · ")
    cols = ""
    for n, (title, line, idx) in enumerate(G["phases"]):
        tl = "".join(f'<li><b>{esc(c["lrc"][i][0])}</b><span>{esc(c["lrc"][i][1])}</span></li>' for i in idx)
        cols += (f'<article class="pl-phase" data-r style="--d:{n * .08:.2f}s"><p class="pl-n">{n + 1:02d}</p><h3>{esc(title)}</h3>'
                 f'<p class="pl-line">{esc(line)}</p><ul>{tl}</ul></article>')
    gticks = "".join(f"<li>{CHECK}<span>{esc(x)}</span></li>" for x in G["points"])
    out.append(f'''<section class="sec tint pc-col" id="lightroom-classic-plugin">
<div class="wrap">
{col_head(k["cards"][1], G["lead"], f'<p class="pc-pill inc">{esc(G["badge"])}</p>')}
<p class="pc-scope" data-r>{esc(G["scope"])}</p>
<div class="pc-block"><div class="lrc" data-lrc data-r><p class="lrc-label"><i aria-hidden="true"></i><span>{esc(label)}<span class="req"> · {esc(req)}</span></span></p><div class="lrc-stage">{lrc_window()}</div>
<div class="lrc-desc" aria-live="polite">{descs}</div></div></div>
<div class="pc-block">{sub(G["flow_h"], G["flow_lead"])}<div class="pl-phases">{cols}</div></div>
<ul class="ticks pc-safe" data-r>{gticks}</ul>
</div>
</section>''')
    return out
