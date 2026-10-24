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


def fmt(cents, cur):
    num = f"{(cents or 0) / 100:,.2f}"
    return {"ILS": "₪", "USD": "$"}.get(cur, "") + num + ("" if cur in ("ILS", "USD") else f" {cur}")


def price(slug, was, he):
    r = rows.get(slug)
    if he:
        c = (r or {}).get("compare_at_ils_cents" if was else "price_ils_cents")
        return "" if not c else fmt(c, "ILS")   # no price set yet: nothing, never ₪0.00
    c = (r or {}).get("compare_at_cents" if was else "price_cents")
    return "" if not c else fmt(c, (r or {}).get("currency") or "USD")


def save(slug, he, hebrew=False):
    r = rows.get(slug)
    if not r:
        return ""
    now, was, cur = (r.get("price_ils_cents"), r.get("compare_at_ils_cents"), "ILS") if he else (r.get("price_cents"), r.get("compare_at_cents"), r.get("currency") or "USD")
    if not was or not now or was <= now:
        return ""
    return ("חוסכים " if hebrew else "Save ") + fmt(was - now, cur)


SHOW_ILS = True   # the same switch as in assets/js/lib/prices.js and cart.js (Matan, 24 Oct 2026: shekels in Hebrew)

PRICE = re.compile(r'<span([^>]*\bdata-price="([a-z0-9-]+)"[^>]*)>[^<]*</span>')
SAVE = re.compile(r'<span([^>]*\bdata-save="([a-z0-9-]+)"[^>]*)>[^<]*</span>')
done = 0
for f in root.rglob("*.html"):
    s = f.read_text(encoding="utf-8")
    if "data-price=" not in s:
        continue
    hebrew = bool(re.search(r'<html[^>]*\blang="he"', s))
    he = SHOW_ILS and hebrew
    s = PRICE.sub(lambda m: f'<span{m.group(1)}>{price(m.group(2), "data-was" in m.group(1), he)}</span>', s)

    def fill_save(m):
        t = save(m.group(2), he, hebrew)
        attrs = re.sub(r"\s+hidden(?=[\s>]|$)", "", m.group(1)) if t else m.group(1)
        return f"<span{attrs}>{t}</span>"
    s = SAVE.sub(fill_save, s)
    s = re.sub(r"<html\b([^>]*)>", lambda m: (f"<html{m.group(1).replace('class=\"', 'class=\"prices-on ', 1)}>" if 'class="' in m.group(1)
                                              else f'<html{m.group(1)} class="prices-on">'), s, count=1)
    f.write_text(s, encoding="utf-8")
    done += 1
print(f"Prices baked into {done} pages ({len(rows)} products).")
