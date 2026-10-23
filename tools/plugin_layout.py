"""The Lightroom Classic Plugin page's own layout (build_products.py calls sections() for P["lightroom-classic"], layout="plugin").

The plugin is the fourth MWP product, sold on its own (Jeinna, 23 Oct 2026; before that it came with MWP Presets).
Every buy button on this page adds the plugin; MWP Presets only appears as a separate product, with a link. After the hero:
  inside      the interactive window (lrc_preview.py), one line under it for the open tab
  workflow    the seven tabs grouped by when you use them: sort the shoot, edit the photo, share it
  get         works on its own: no presets needed; links to MWP Presets and the bundles (separate products)
Minimal (23 Oct 2026): short heads without leads, the window does the talking, details in the FAQs.
The template then adds What's in the download, the FAQs (tools/pages/faqs.json) and the price cards.
Content in P["lightroom-classic"][lang]; styles .pl-* in assets/css/product.css.
"""


def sections(p, c, u, lang, h, esc, img, lrc_window, CHECK, ARROW, price):
    out = []
    keys = ["cull", "organize", "guided", "looks", "edit", "color", "export"]   # the plugin's tab ids, in its order

    def head(kick, title, lead):
        return f'<div class="head c" data-r><p class="kick">{esc(kick)}</p>{h(title)}{f"<p class=lead>{esc(lead)}</p>" if lead else ""}</div>'

    # ---------------------------------------------------------------- look inside: the real window, a quiet caption under it
    descs = "".join(f'<p data-lrc-desc="{keys[n]}"{"" if keys[n] == "looks" else " hidden"}><span class="n">{n + 1:02d}</span><b>{esc(t)}</b><span>{esc(d)}</span></p>'
                    for n, (t, d) in enumerate(c["lrc"]))
    out.append(f'''<section class="sec tint" id="inside">
<div class="wrap">
{head(c["inside_kick"], c["inside_h"], "")}
<div class="lrc pl-lrc" data-lrc data-r><div class="lrc-stage">{lrc_window()}</div>
<div class="lrc-desc" aria-live="polite">{descs}</div><p class="pl-cap">{esc(c["lrc_cap"])}</p></div>
</div>
</section>''')

    # ---------------------------------------------------------------- the seven tabs by when you use them: names only
    cols = ""
    for n, (title, line, idx) in enumerate(c["phases"]):
        tabs = " · ".join(esc(c["lrc"][i][0]) for i in idx)
        cols += (f'<article class="pl-phase" data-r style="--d:{n * .08:.2f}s"><p class="pl-n">{n + 1:02d}</p><h3>{esc(title)}</h3>'
                 f'<p class="pl-tabs">{tabs}</p></article>')
    out.append(f'''<section class="sec" id="workflow">
<div class="wrap">
{head(c["flow_kick"], c["flow_h"], "")}
<div class="pl-phases">{cols}</div>
</div>
</section>''')

    # ---------------------------------------------------------------- works on its own; the presets and bundles are separate
    g = c["get"]
    pre = "/presets/he/" if lang == "he" else "/presets/"
    bun = "/shop/he/#bundles" if lang == "he" else "/shop/#bundles"
    out.append(f'''<section class="sec tint" id="get">
<div class="wrap">
{head(g["kick"], g["h"], g["lead"])}
<p class="pl-links" data-r><a class="pc-cta" href="{pre}">{esc(g["box_cta"])} {ARROW}</a><a class="pc-cta" href="{bun}">{esc(g["more"])} {ARROW}</a></p>
</div>
</section>''')
    return out
