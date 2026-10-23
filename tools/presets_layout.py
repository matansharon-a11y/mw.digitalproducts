"""The Lightroom page (/presets/): MWP Presets and the Lightroom Classic plugin, two separate products on one page.
build_products.py calls sections() for P["presets"] (layout="collections", own_page=True: no template hero, no
download list and no closing price cards, so every product is introduced once and bought from two places only).

Redesign (Jeinna, 23 Oct 2026): land, see both products, understand the difference, buy. No repeats.
  top       h1 and the two products side by side: mockup, type, name, one line, where it works, price, Buy, Learn more
  presets   its head (name, one line, price, Buy) → the before / after slider → three big numbers → the five collections
  plugin    its head (name, one line, price, Buy) → the plugin's real window (interactive) → three steps (sort, edit, share)
The template then adds the reviews (when there are any) and the FAQs. The sticky bar links Presets · Plugin · FAQs.
Content in P["presets"][lang]["m"]; the plugin's tabs and window words in P["lightroom-classic"][lang].
Styles: .lr-* (and .mk-* for the two mockups) in assets/css/product.css.
"""


def sections(p, c, u, lang, h, esc, img, gallery, lrc_window, CHECK, ARROW, price=None, plug=None):
    k = c["m"]
    g = plug
    keys = ["cull", "organize", "guided", "looks", "edit", "color", "export"]   # the plugin's tab ids, in its order
    slugs = {"presets": "mwp-presets", "plugin": "mwp-lightroom-plugin"}
    raw, fin = p["pairs_from"][0]

    # ---------------------------------------------------------------- the two mockups (real material only)
    sets_list = "".join(f'<li{" class=on" if t == "Light & Scene" else ""}>{esc(t)}</li>' for t in ("Signature", "Light & Scene", "Mono", "Adaptive", "Tools"))
    tabs = "".join(f'<b{" class=on" if t == "Looks" else ""}>{t}</b>' for t in ("Cull", "Organize", "Expedition", "Looks", "Edit", "Color", "Export"))
    looks = "".join(f'<span><img src="/assets/pages/img/lrc/look_{x}.png" alt="" loading="lazy"><i>{t}</i></span>'
                    for x, t in (("bw", "B&W"), ("moody", "Moody"), ("golden", "Golden"), ("bluehour", "Blue hour")))
    mock = {
        "presets": f'''<div class="mk mk-lap" lang="en" dir="ltr" data-no-i18n><div class="mk-lid"><div class="mk-scr"><div class="mk-lr">
<aside><p>Presets</p><ul>{sets_list}</ul><p class="mk-pre">{esc(c["pairs"][0])}</p></aside>
<div class="mk-view"><div class="mk-photo"><img src="{img(fin)}" alt="{esc(k["choose"][0]["alt"])}" fetchpriority="high"><img class="mk-raw" src="{img(raw)}" alt=""><i class="mk-wipe"></i>
<span class="mk-tag l">RAW</span><span class="mk-tag r">FINAL</span></div></div>
<aside class="mk-r"><p>Amount</p><i class="mk-sl"><b></b></i><p>Exposure</p><i class="mk-sl s2"><b></b></i><p>Contrast</p><i class="mk-sl s3"><b></b></i></aside>
</div></div></div><div class="mk-base"></div></div>''',
        "plugin": (f'<div class="mk mk-lap" lang="en" dir="ltr" data-no-i18n><div class="mk-lid"><div class="mk-scr"><div class="mk-plug">'
                   f'<img class="mk-plug-bg" src="{img(fin)}" alt="{esc(k["choose"][1]["alt"])}">'
                   f'<div class="mk-pw"><p class="mk-pw-bar"><i></i><i></i><i></i><span>MWP Panel · Lightroom Classic</span></p><p class="mk-pw-tabs">{tabs}</p>'
                   f'<div class="mk-pw-looks">{looks}</div><p class="mk-pw-sl"><i></i></p></div></div></div></div><div class="mk-base"></div></div>'),
    }

    def buy(key, cta):   # its own price and its own button
        return (f'<div class="lr-buy"><span class="lr-pr">{price(slugs[key], lang)}</span>'
                f'<a class="btn" href="#buy" data-add-to-cart="{slugs[key]}">{esc(cta)}</a></div>')

    out = []
    # ---------------------------------------------------------------- top: the two products
    cards = ""
    for n, (key, cd) in enumerate(zip(("presets", "plugin"), k["choose"])):
        cards += (f'<article class="lr-card in" style="--i:{n + 2}"><a class="lr-media" href="#{key}" tabindex="-1" aria-hidden="true">{mock[key]}</a>'
                  f'<div class="lr-body"><p class="lr-type">{esc(cd["type"])}</p><h2 class="lr-name">{esc(cd["name"])}</h2>'
                  f'<p class="lr-line">{esc(cd["line"])}</p><p class="lr-meta">{esc(cd["meta"])}</p>'
                  f'<div class="lr-foot">{buy(key, cd["cta"])}<a class="lr-more" href="#{key}">{esc(cd["more"])}</a></div></div></article>')
    T = k["top"]
    out.append(f'''<section class="lr-top" id="top">
<div class="wrap">
<div class="lr-head"><p class="kick in" style="--i:0">{esc(T["kick"])}</p><h1 class="lr-h1 in" style="--i:1">{esc(T["h1"][0])} <span class="grad">{esc(T["h1"][1])}</span></h1></div>
<div class="lr-cards">{cards}</div>
</div>
</section>''')

    def head(key, cd, line):   # a product's own head: name, one line, price, Buy
        return (f'<header class="lr-sh" data-r><div><p class="lr-type">{esc(cd["type"])}</p><h2 class="lr-sh-h">{esc(cd["name"])}</h2>'
                f'<p class="lr-sh-line">{esc(line)}</p></div>{buy(key, cd["cta"])}</header>')

    def three(items):   # three short facts, one big word or number each
        return '<ul class="lr-three" data-r>' + "".join(f'<li><b>{esc(a)}</b><span>{esc(b)}</span></li>' for a, b in items) + "</ul>"

    # ---------------------------------------------------------------- the presets
    slides = [f'''<div class="ba">
<img class="before" src="{img(b)}" alt="{esc(lab)}: {u["raw_alt"]}" loading="lazy">
<img class="after" src="{img(a)}" alt="{esc(lab)}: {u["final_alt"]}" loading="lazy">
<span class="tag t1">{u["raw"]}</span><span class="tag t2">{u["final"]}</span>
<span class="line"></span><span class="knob">{p["grip"]}</span>
<input type="range" min="0" max="100" value="50" step="0.1" aria-label="{u["hint"]}">
</div>''' for (b, a), lab in zip(p["pairs_from"], c["pairs"])]
    sets = "".join(f'''<figure class="lr-set" data-r style="--d:{n * .06:.2f}s"><div class="lr-set-ph"><img src="{img(im)}" alt="{esc(alt)}" loading="lazy" style="object-position:{p["card_focus"][n]}"></div>
<figcaption>{esc(t)}</figcaption></figure>''' for n, (im, (t, d, alt)) in enumerate(zip(p["cards"], c["cards"])))
    P = k["pre"]
    out.append(f'''<section class="sec lr-sec" id="presets">
<div class="wrap">
{head("presets", k["choose"][0], P["line"])}
<div class="lr-vis">{gallery(slides, c["pairs"])}</div>
{three(P["three"])}
<p class="lr-cap" data-r>{esc(P["sets_cap"])}</p>
<div class="lr-sets">{sets}</div>
</div>
</section>''')

    # ---------------------------------------------------------------- the plugin
    descs = "".join(f'<p data-lrc-desc="{keys[n]}"{"" if keys[n] == "looks" else " hidden"}><span class="n">{n + 1:02d}</span><b>{esc(t)}</b><span>{esc(d)}</span></p>'
                    for n, (t, d) in enumerate(g["lrc"]))
    G = k["plug"]
    steps = [(title, " · ".join(g["lrc"][i][0] for i in idx)) for title, line, idx in g["phases"]]
    out.append(f'''<section class="sec tint lr-sec" id="plugin">
<div class="wrap">
{head("plugin", k["choose"][1], G["line"])}
<div class="lrc lr-vis" data-lrc data-r><div class="lrc-stage">{lrc_window()}</div>
<div class="lrc-desc" aria-live="polite">{descs}</div><p class="lr-note">{esc(G["cap"])}</p></div>
{three(steps)}
</div>
</section>''')
    return out
