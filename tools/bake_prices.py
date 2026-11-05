"""Writes the current prices into the published pages, so a price shows the moment the page does
(run by the deploy workflow on _site, like stamp_scripts.py; the repository's files keep their 0.00 placeholders).

Reads the public page_prices view with the public (anon) key from assets/js/config.js, then fills every
<span data-price="slug"> (data-was: the struck-out "before" price) and <span data-save="slug"> the same way
assets/js/lib/prices.js does: shekels on the Hebrew pages, dollars on the English ones (SHOW_ILS; checkout still
charges dollars, and prices.js and the cart say so on the Hebrew pages). The page's <html> gets the
prices-on class so the spots aren't hidden while loading. prices.js still asks for the live prices on every
visit and corrects anything changed in the admin since the last deploy.
If the prices can't be read, nothing is changed: the pages behave as before.
Usage: python3 tools/bake_prices.py _site
"""
import json, pathlib, re, sys, urllib.request

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
cfg = (pathlib.Path(__file__).resolve().parent.parent / "assets/js/config.js").read_text(encoding="utf-8")
url = re.search(r'SUPABASE_URL:\s*"([^"]+)"', cfg).group(1)
key = re.search(r'SUPABASE_ANON_KEY:\s*"([^"]+)"', cfg).group(1)
try:
    req = urllib.request.Request(f"{url}/rest/v1/page_prices?select=*", headers={"apikey": key, "Authorization": f"Bearer {key}"})
    rows = {r["slug"]: r for r in json.load(urllib.request.urlopen(req, timeout=20))}
except Exception as e:   # never block a deploy on this
    print(f"::warning::Prices not baked into the pages ({e}); they load in the browser as before.")
    sys.exit(0)


# The November Sale (assets/js/lib/sale.js, the one source): the pages show what prices.js shows in the browser, so
# anything that reads a page without running its scripts (search engines, link previews, AI tools) sees the same
# sale price as a visitor (Jeinna, 5 Nov 2026). Only while the sale is on at deploy time; a nightly run (deploy.yml
# schedule) bakes again, so the sale prices leave the pages the night it ends.
import datetime
_sale_js = (pathlib.Path(__file__).resolve().parent.parent / "assets/js/lib/sale.js").read_text(encoding="utf-8")
_m = lambda pat: re.search(pat, _sale_js, re.S)
SALE_START = datetime.datetime.fromisoformat(_m(r'start:\s*"([^"]+)"').group(1))
SALE_END = datetime.datetime.fromisoformat(_m(r'end:\s*"([^"]+)"').group(1))
SALE_PCT = int(_m(r'\n\s*pct:\s*(\d+)').group(1))
SALE_SPECIAL = {k: int(v) for k, v in re.findall(r'"([a-z0-9-]+)":\s*\{\s*pct:\s*(\d+)', _sale_js)}
_now = datetime.datetime.now(datetime.timezone.utc)
SALE_ON = SALE_START <= _now <= SALE_END


def sale_pct(slug):
    return (SALE_SPECIAL.get(slug, SALE_PCT)) if SALE_ON else 0


def sale_price(cents, slug, cur):
    """As salePrice() in sale.js: dollars to the cent, shekels to the whole shekel."""
    pct = sale_pct(slug)
    if not pct or cents is None:
        return cents
    v = cents * (100 - pct) / 100
    return round(v / 100) * 100 if cur == "ILS" else round(v)


def fmt(cents, cur):
    num = f"{(cents or 0) / 100:,.2f}"
    return {"ILS": "₪", "USD": "$"}.get(cur, "") + num + ("" if cur in ("ILS", "USD") else f" {cur}")


def price(slug, was, he, has_was=False):
    r = rows.get(slug)
    if he:
        c, cur = (r or {}).get("compare_at_ils_cents" if was else "price_ils_cents"), "ILS"
    else:
        c, cur = (r or {}).get("compare_at_cents" if was else "price_cents"), (r or {}).get("currency") or "USD"
    if not c:
        return ""   # no price set yet: nothing, never ₪0.00
    if was or not sale_pct(slug):
        return fmt(c, cur)
    # as textFor() in prices.js: the original struck through, then the sale price; where the same block already
    # strikes through a "before" price (a bundle's sum of parts), only the sale price
    now = fmt(sale_price(c, slug, cur), cur)
    return now if has_was else f'<s class="sale-was">{fmt(c, cur)}</s> {now}'


def save(slug, he, hebrew=False):
    r = rows.get(slug)
    if not r:
        return ""
    now, was, cur = (r.get("price_ils_cents"), r.get("compare_at_ils_cents"), "ILS") if he else (r.get("price_cents"), r.get("compare_at_cents"), r.get("currency") or "USD")
    now = sale_price(now, slug, cur)   # during the sale, the saving includes it (as saveFor() in prices.js)
    if not was or not now or was <= now:
        return ""
    return ("חוסכים " if hebrew else "Save ") + fmt(was - now, cur)


SHOW_ILS = True   # the same switch as in assets/js/lib/prices.js and cart.js (Matan, 24 Oct 2026: shekels in Hebrew)

PRICE = re.compile(r'<span([^>]*\bdata-price="([a-z0-9-]+)"[^>]*)>(?:[^<]|<s class="sale-was">[^<]*</s>)*</span>')
BLOCK = re.compile(r'<(section|article|div)\b[^>]*\bclass="[^"]*\bplan\b[^"]*"|<section\b')


def has_was_near(s, pos, slug):
    """Does the block this price sits in (its .plan card, else its <section>) strike through a "before" price for the
    same product? Mirrors el.closest("section, .plan").querySelector('[data-was][data-price=slug]') in prices.js."""
    starts = [m for m in BLOCK.finditer(s, 0, pos)]
    if not starts:
        return False
    m = starts[-1]
    tag = m.group(1) or "section"
    depth, i = 0, m.start()
    end_re = re.compile(rf'<{tag}\b|</{tag}>')
    for t in end_re.finditer(s, m.start()):
        depth += 1 if not t.group(0).startswith("</") else -1
        if depth == 0:
            i = t.end()
            break
    else:
        i = len(s)
    if i < pos:   # the nearest opener closed before this price: look in its <section> instead
        sec = [x for x in re.finditer(r"<section\b", s[:pos])]
        if not sec:
            return False
        j = s.find("</section>", sec[-1].start())
        block = s[sec[-1].start(): j if j > 0 else len(s)]
    else:
        block = s[m.start():i]
    return bool(re.search(rf'<span[^>]*\bdata-was\b[^>]*\bdata-price="{re.escape(slug)}"|<span[^>]*\bdata-price="{re.escape(slug)}"[^>]*\bdata-was\b', block))
SAVE = re.compile(r'<span([^>]*\bdata-save="([a-z0-9-]+)"[^>]*)>[^<]*</span>')
done = 0
for f in root.rglob("*.html"):
    s = f.read_text(encoding="utf-8")
    if "data-price=" not in s:
        continue
    hebrew = bool(re.search(r'<html[^>]*\blang="he"', s))
    he = SHOW_ILS and hebrew
    src = s
    s = PRICE.sub(lambda m: f'<span{m.group(1)}>{price(m.group(2), "data-was" in m.group(1), he, has_was_near(src, m.start(), m.group(2)))}</span>', s)

    def fill_save(m):
        t = save(m.group(2), he, hebrew)
        attrs = re.sub(r"\s+hidden(?=[\s>]|$)", "", m.group(1)) if t else m.group(1)
        return f"<span{attrs}>{t}</span>"
    s = SAVE.sub(fill_save, s)
    s = re.sub(r"<html\b([^>]*)>", lambda m: (f"<html{m.group(1).replace('class=\"', 'class=\"prices-on ', 1)}>" if 'class="' in m.group(1)
                                              else f'<html{m.group(1)} class="prices-on">'), s, count=1)
    f.write_text(s, encoding="utf-8")
    done += 1
print(f"Prices baked into {done} pages ({len(rows)} products; sale {'on' if SALE_ON else 'off'}).")
