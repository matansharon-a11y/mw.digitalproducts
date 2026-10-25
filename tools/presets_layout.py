"""The Lightroom page (/presets/): the Lightroom Classic plugin and MWP Presets on one page, with two clear offers
(Jeinna, 25 Oct 2026): the plugin with the presets included ($69.99), or the presets alone ($19.99). Buying the plugin
unlocks the presets (checkout-webhook BUNDLES). build_products.py calls sections() for P["presets"]
(layout="collections", own_page=True: no template hero, no download list and no closing price cards).

Redesign (Jeinna, 23 Oct 2026): land, see both tools, understand the difference, buy. No repeats.
  top       h1 and the two tools side by side (mockup, type, name, one line, where it works, Learn more),
            then the two offers side by side (#offers): what's included, price, Add to cart; the plugin's is marked
  presets   its head (name, one line) → the before / after slider → three big numbers → the five collections
  plugin    its head (name, one line) → the plugin's real window (interactive) → three steps (sort, edit, share)
The template then adds the reviews (when there are any) and the FAQs. The sticky bar links Presets · Plugin · FAQs.
Content in P["presets"][lang]["m"]; the plugin's tabs and window words in P["lightroom-classic"][lang].
Styles: .lr-* (and .mk-* for the two mockups) in assets/css/product.css.
"""


def sections(p, c, u, lang, h, esc, img, gallery, lrc_window, CHECK, ARROW, price=None, plug=None):
    k = c["m"]
    g = plug
    keys = ["cull", "organize", "guided", "looks", "edit", "color", "export"]   # the plugin's tab ids, in its order
    # each picture once on the page: the mockups use photos the page shows nowhere else (the ibex is the slider's)

    # ---------------------------------------------------------------- the two mockups (real material only)
    sets_list = "".join(f'<li{" class=on" if t == "Light & Scene" else ""}>{esc(t)}</li>' for t in ("Signature", "Light & Scene", "Mono", "Adaptive", "Tools"))
    tabs = "".join(f'<b{" class=on" if t == "Looks" else ""}>{t}</b>' for t in ("Cull", "Organize", "Expedition", "Looks", "Edit", "Color", "Export"))
    looks = "".join(f'<span><img src="/assets/pages/img/lrc/look_{x}.png" alt="" loading="lazy"><i>{t}</i></span>'
                    for x, t in (("bw", "B&W"), ("moody", "Moody"), ("golden", "Golden"), ("bluehour", "Blue hour")))
    mock = {
        "presets": f'''<div class="mk mk-lap" lang="en" dir="ltr" data-no-i18n><div class="mk-lid"><div class="mk-scr"><div class="mk-lr">
<aside><p>Presets</p><ul>{sets_list}</ul></aside>
<div class="mk-view"><div class="mk-photo"><img src="{img(p["pre_img"])}" alt="{esc(k["choose"][0]["alt"])}" fetchpriority="high"></div></div>
<aside class="mk-r"><p>Amount</p><i class="mk-sl"><b></b></i><p>Exposure</p><i class="mk-sl s2"><b></b></i><p>Contrast</p><i class="mk-sl s3"><b></b></i></aside>
</div></div></div><div class="mk-base"></div></div>''',
        "plugin": (f'<div class="mk mk-lap" lang="en" dir="ltr" data-no-i18n><div class="mk-lid"><div class="mk-scr"><div class="mk-plug">'
                   f'<img class="mk-plug-bg" src="{img(p["plug_img"])}" alt="{esc(k["choose"][1]["alt"])}" style="object-position:70% 30%">'
                   f'<div class="mk-pw"><p class="mk-pw-bar"><i></i><i></i><i></i><span>MWP · Lightroom Classic</span></p><p class="mk-pw-tabs">{tabs}</p>'
                   f'<div class="mk-pw-looks">{looks}</div><p class="mk-pw-sl"><i></i></p></div></div></div></div><div class="mk-base"></div></div>'),
    }

    def offer(o, slug, hi):   # one of the two ways to buy: what's in it, its price, its own Add to cart
        li = "".join(f"<li>{CHECK}<span>{esc(x)}</span></li>" for x in o["has"])
        badge = f'<span class="lr-badge">{esc(o["badge"])}</span>' if o.get("badge") else ""
        return (f'<article class="lr-offer{" hi" if hi else ""}">{badge}'
                f'<p class="lr-type">{esc(o["type"])}</p><h2 class="lr-offer-h">{esc(o["name"])}</h2><ul class="lr-has">{li}</ul>'
                f'<p class="lr-meta">{esc(o["meta"])}</p>'
                f'<div class="lr-buy"><span class="lr-pr">{price(slug, lang)}</span>'
                f'<a class="{"btn" if hi else "ghost"}" href="#offers" data-add-to-cart="{slug}">{esc(o["cta"])}</a></div></article>')

    out = []
    # ---------------------------------------------------------------- top: the two products
    cards = ""
    # the plugin first, then the presets (Matan, 24 Oct 2026: the products always in this order); choose holds presets, plugin
    for n, (key, cd) in enumerate((("plugin", k["choose"][1]), ("presets", k["choose"][0]))):
        cards += (f'<article class="lr-card in" style="--i:{n + 2}"><a class="lr-media" href="#{key}" tabindex="-1" aria-hidden="true">{mock[key]}</a>'
                  f'<div class="lr-body"><p class="lr-type">{esc(cd["type"])}</p><h2 class="lr-name">{esc(cd["name"])}</h2>'
                  f'<p class="lr-line">{esc(cd["line"])}</p><p class="lr-meta">{esc(cd["meta"])}</p>'
                  f'<div class="lr-foot"><a class="lr-more" href="#{key}">{esc(cd["more"])}</a></div></div></article>')
    T = k["top"]
    O = k["offers"]
    out.append(f'''<section class="lr-top" id="top">
<div class="wrap">
<div class="lr-head"><p class="kick in" style="--i:0">{esc(T["kick"])}</p><h1 class="lr-h1 in" style="--i:1">{esc(T["h1"][0])} <span class="grad">{esc(T["h1"][1])}</span></h1></div>
<div class="lr-cards">{cards}</div>
<div class="lr-offers in" id="offers" style="--i:4">{offer(O["plugin"], "mwp-lightroom-plugin", True)}{offer(O["presets"], "mwp-presets", False)}</div>
</div>
</section>''')

    def head(key, cd, line):   # a tool's own head: name, one line (bought from the two offers at the top)
        return (f'<header class="lr-sh" data-r><div><p class="lr-type">{esc(cd["type"])}</p><h2 class="lr-sh-h">{esc(cd["name"])}</h2>'
                f'<p class="lr-sh-line">{esc(line)}</p></div></header>')

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
    presets_sec = (f'''<section class="sec tint lr-sec" id="presets">
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
    out.append(f'''<section class="sec lr-sec" id="plugin">
<div class="wrap">
{head("plugin", k["choose"][1], G["line"])}
<div class="lrc lr-vis" data-lrc data-r><div class="lrc-stage">{lrc_window()}</div>
<div class="lrc-desc" aria-live="polite">{descs}</div><p class="lr-note">{esc(G["cap"])}</p></div>
{three(steps)}
</div>
</section>''')
    out.append(presets_sec)   # after the plugin
    return out
