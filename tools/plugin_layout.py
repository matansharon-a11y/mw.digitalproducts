"""The Lightroom Classic Plugin page's own layout (build_products.py calls sections() for P["lightroom-classic"], layout="plugin").

The plugin is the fourth MWP product, but it has no price of its own: it comes with every copy of MWP Presets
(Jeinna, 22 Oct 2026), so every buy button on this page adds MWP Presets. After the hero:
  inside      the interactive window (lrc_preview.py), one line under it for the open tab
  workflow    the seven tabs grouped by when you use them: sort the shoot, edit the photo, share it
  get         how you get it: included with MWP Presets, with what else is in that download
The template then adds What's in the download, the FAQs (tools/pages/faqs.json) and the price cards.
Content in P["lightroom-classic"][lang]; styles .pl-* in assets/css/product.css.
"""


def sections(p, c, u, lang, h, esc, img, lrc_window, CHECK, ARROW, price):
    out = []
    keys = ["cull", "organize", "guided", "looks", "edit", "color", "export"]   # the plugin's tab ids, in its order

    def head(kick, title, lead):
        return f'<div class="head c" data-r><p class="kick">{esc(kick)}</p>{h(title)}{f"<p class=lead>{esc(lead)}</p>" if lead else ""}</div>'

    # ---------------------------------------------------------------- look inside: the real window
    descs = "".join(f'<p data-lrc-desc="{keys[n]}"{"" if keys[n] == "looks" else " hidden"}><span class="n">{n + 1:02d}</span><b>{esc(t)}</b><span>{esc(d)}</span></p>'
                    for n, (t, d) in enumerate(c["lrc"]))
    label, req = c["lrc_note"].split(" · ")
    out.append(f'''<section class="sec tint" id="inside">
<div class="wrap">
{head(c["inside_kick"], c["inside_h"], c["inside_lead"])}
<div class="lrc" data-lrc data-r><p class="lrc-label"><i aria-hidden="true"></i><span>{esc(label)}<span class="req"> · {esc(req)}</span></span></p><div class="lrc-stage">{lrc_window()}</div>
<div class="lrc-desc" aria-live="polite">{descs}</div></div>
</div>
</section>''')

    # ---------------------------------------------------------------- the seven tabs, by when you use them
    cols = ""
    for n, (title, line, idx) in enumerate(c["phases"]):
        tabs = "".join(f'<li><b>{esc(c["lrc"][i][0])}</b><span>{esc(c["lrc"][i][1])}</span></li>' for i in idx)
        cols += (f'<article class="pl-phase" data-r style="--d:{n * .08:.2f}s"><p class="pl-n">{n + 1:02d}</p><h3>{esc(title)}</h3>'
                 f'<p class="pl-line">{esc(line)}</p><ul>{tabs}</ul></article>')
    out.append(f'''<section class="sec" id="workflow">
<div class="wrap">
{head(c["flow_kick"], c["flow_h"], c["flow_lead"])}
<div class="pl-phases">{cols}</div>
</div>
</section>''')

    # ---------------------------------------------------------------- how you get it: with MWP Presets
    g = c["get"]
    ticks = "".join(f"<li>{CHECK}<span>{esc(x)}</span></li>" for x in g["points"])
    rows = "".join(f'<li><b>{esc(a)}</b><span>{esc(b)}</span></li>' for a, b in g["box"])
    out.append(f'''<section class="sec tint" id="get">
<div class="wrap pl-get">
<div class="pl-get-tx" data-r><p class="kick">{esc(g["kick"])}</p>{h(g["h"])}<p class="lead">{esc(g["lead"])}</p><ul class="ticks">{ticks}</ul></div>
<aside class="pl-box" data-r style="--d:.1s"><div class="pl-box-ph"><img src="{img(g["img"])}" alt="{esc(g["alt"])}" loading="lazy"></div>
<div class="pl-box-in"><p class="pl-box-k">{esc(g["box_kick"])}</p><h3>{esc(g["box_h"])}</h3><ul class="pl-box-l">{rows}</ul>
<div class="pl-box-buy"><span class="pl-box-pr">{price("mwp-presets", lang)}</span><a class="btn" href="#buy" data-add-to-cart="mwp-presets">{esc(g["box_cta"])}</a></div>
<a class="pl-box-more" href="{esc(g["more_href"])}">{esc(g["more"])} {ARROW}</a></div></aside>
</div>
</section>''')
    return out
