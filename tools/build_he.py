"""Hebrew home and shop pages with the Hebrew in the HTML, so search engines can read them.

Writes he/index.html (from index.html) and shop/he/index.html (from shop/index.html). The Hebrew comes from
assets/js/i18n.js (the same dictionary and names the browser uses), run through tools/he_static.mjs, so there is
one source of Hebrew. Run after build_home.py and build_pages.py:  python3 tools/build_he.py
"""
import html, json, os, re, subprocess, sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://shop.mw.photography"
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
RAW = {"script", "style", "noscript", "code", "textarea"}          # never translated (as in i18n.js)
ATTRS = ("placeholder", "aria-label", "title", "alt")


class El:
    def __init__(self, tag, attrs, raw):
        self.tag, self.attrs, self.raw, self.kids, self.parent, self.dirty = tag, attrs, raw, [], None, False

    def get(self, k):
        return next((v for a, v in self.attrs if a == k), None)

    def set(self, k, v):
        self.attrs = [(a, v if a == k else w) for a, w in self.attrs] if self.get(k) is not None else self.attrs + [(k, v)]
        self.dirty = True

    def classes(self):
        return (self.get("class") or "").split()


class Text:
    def __init__(self, raw, parent):
        self.raw, self.parent = raw, parent


class Tree(HTMLParser):
    """A small DOM that writes back exactly what it read, except the parts that were changed."""
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.root = El("#root", [], "")
        self.cur = self.root

    def _add(self, n):
        n.parent = self.cur
        self.cur.kids.append(n)

    def handle_starttag(self, tag, attrs):
        e = El(tag, attrs, self.get_starttag_text())
        self._add(e)
        if tag not in VOID:
            self.cur = e

    def handle_startendtag(self, tag, attrs):
        self._add(El(tag, attrs, self.get_starttag_text()))

    def handle_endtag(self, tag):
        n = self.cur
        while n is not self.root and n.tag != tag:
            n = n.parent
        if n is not self.root:
            self.cur = n.parent

    def _text(self, raw):
        last = self.cur.kids[-1] if self.cur.kids else None
        if isinstance(last, Text):
            last.raw += raw
        else:
            self._add(Text(raw, self.cur))

    def handle_data(self, d): self._text(d)
    def handle_entityref(self, n): self._text(f"&{n};")
    def handle_charref(self, n): self._text(f"&#{n};")
    def handle_comment(self, d): self._add(Text(f"<!--{d}-->", self.cur)); self.cur.kids[-1].fixed = True
    def handle_decl(self, d): self._add(Text(f"<!{d}>", self.cur)); self.cur.kids[-1].fixed = True
    def handle_pi(self, d): self._add(Text(f"<?{d}>", self.cur)); self.cur.kids[-1].fixed = True


def start_tag(e):
    if not e.dirty:
        return e.raw
    a = "".join(f" {k}" if v is None else f' {k}="{html.escape(v, quote=True)}"' for k, v in e.attrs)
    return f"<{e.tag}{a}{' /' if e.raw.rstrip().endswith('/>') else ''}>"


def write(n):
    if isinstance(n, Text):
        return n.raw
    if n.tag == "#root":
        return "".join(write(k) for k in n.kids)
    inner = "".join(write(k) for k in n.kids)
    return start_tag(n) + ("" if n.tag in VOID else inner + f"</{n.tag}>")


def walk(n, skip=False):
    yield n, skip
    if isinstance(n, El):
        cls = n.classes()
        skip = skip or n.tag in RAW or "brand" in cls or "site-brand" in cls or "only-en" in cls
        for k in list(n.kids):
            yield from walk(k, skip)


def text_of(e):
    return "".join(html.unescape(k.raw) if isinstance(k, Text) else text_of(k) for k in e.kids if not getattr(k, "fixed", False))


def hebrew_batch(texts, names):
    out = subprocess.run(["node", os.path.join(ROOT, "tools", "he_static.mjs")], input=json.dumps({"texts": texts, "names": names}),
                         capture_output=True, text=True, encoding="utf-8", check=True)
    return json.loads(out.stdout)


def translate_page(src):
    t = Tree()
    t.feed(src)
    t.close()
    nodes = list(walk(t.root))

    # product names split over two elements: "MWP <span class=grad>Presets</span>" → "הפריסטים של <span class=grad>MWP</span>"
    pn = []
    for n, skip in nodes:
        if isinstance(n, El) and not skip:
            els = [k for k in n.kids if isinstance(k, El)]
            if len(els) == 1 and "grad" in els[0].classes() and not [k for k in els[0].kids if isinstance(k, El)]:
                full = re.sub(r"\s+", " ", text_of(n)).strip()
                if 0 < len(full) <= 60:
                    pn.append((n, els[0], full))
    texts, slots = [], []
    for n, skip in nodes:
        if skip:
            continue
        if isinstance(n, Text) and not getattr(n, "fixed", False) and html.unescape(n.raw).strip():
            texts.append(html.unescape(n.raw)); slots.append(("text", n, None))
        elif isinstance(n, El):
            for a in ATTRS:
                v = n.get(a)
                if v:
                    texts.append(v); slots.append(("attr", n, a))
    res = hebrew_batch(texts, [full for _, _, full in pn])

    done = set()
    for (n, grad, full), he in zip(pn, res["names"]):
        if he != full and he.endswith("MWP"):          # the gold stays on the name, MWP in Latin letters
            n.kids = [Text(html.escape(he[:-3], quote=False), n), grad]
            grad.kids = [Text("MWP", grad)]
            done.add(id(n)); done.add(id(grad))
    for (kind, n, a), he in zip(slots, res["texts"]):
        if kind == "text":
            if id(n.parent) in done:
                continue
            src_text = html.unescape(n.raw)
            if he != src_text:
                n.raw = html.escape(he, quote=False)
        elif he.strip() != n.get(a):
            n.set(a, he.strip())
    return t, nodes, res["sales"]


def hebrew_links(nodes, sales, here):
    """Links from a Hebrew page go to the Hebrew pages: the product pages, the home page and the shop."""
    for n, _ in nodes:
        if not isinstance(n, El) or n.tag != "a" or n.get("href") is None:
            continue
        h = n.get("href")
        path, frag = (h.split("#", 1) + [None])[:2]
        frag = "#" + frag if frag is not None else ""
        for en, he in sales.items():
            if path == en or path.endswith("/" + en):
                n.set("href", path[: len(path) - len(en)] + he + frag); break
        else:
            m = re.match(r"^(?:/|\./|https://shop\.mw\.photography/)(#.*)?$", h)
            if m:
                n.set("href", "/he/" + (m.group(1) or ""))
            elif re.match(r"^/shop/?(#.*)?$", h):
                n.set("href", "/shop/he/" + (h.split("#", 1)[1:] and "#" + h.split("#", 1)[1] or ""))
            elif h.startswith("#"):
                n.set("href", here + h)          # the page has <base href="/">: keep in-page links on this page


def head_he(t, nodes, en_url, he_url):
    for n, _ in nodes:
        if not isinstance(n, El):
            continue
        if n.tag == "html":
            n.set("lang", "he"); n.set("dir", "rtl")
        elif n.tag == "link" and n.get("rel") == "canonical":
            n.set("href", he_url)
        elif n.tag == "meta" and n.get("property") == "og:url":
            n.set("content", he_url)
        elif n.tag == "meta" and n.get("property") == "og:locale":
            n.set("content", "he_IL")
    title = next(n for n, _ in nodes if isinstance(n, El) and n.tag == "title")
    meta = [n for n, _ in nodes if isinstance(n, El) and n.tag == "meta" and (n.get("name") == "description" or n.get("property") in ("og:title", "og:description"))]
    res = hebrew_batch([text_of(title)] + [m.get("content") for m in meta], [])["texts"]
    title.kids = [Text(html.escape(res[0].strip(), quote=False), title)]
    for m, he in zip(meta, res[1:]):
        m.set("content", he.strip())


ALT = '<link rel="alternate" hreflang="en" href="{en}"><link rel="alternate" hreflang="he" href="{he}"><link rel="alternate" hreflang="x-default" href="{en}">'
REMEMBER = '<script>try{localStorage.setItem("mwp_lang","he")}catch(e){}</script>'


def build(src_path, out_path, en_url, he_url, here, base=False):
    src = open(os.path.join(ROOT, src_path), encoding="utf-8").read()
    t, nodes, sales = translate_page(src)
    hebrew_links(nodes, sales, here)
    head_he(t, nodes, en_url, he_url)
    out = write(t.root)
    # the Hebrew page remembers the choice, carries both addresses, and (home) resolves its links from the root
    extra = REMEMBER + ALT.format(en=en_url, he=he_url) + ('<meta property="og:locale" content="he_IL">' if 'og:locale' not in out else "")
    if base and "<base " not in out:
        extra = '<base href="/">' + extra
    out = out.replace('<meta charset="utf-8">', '<meta charset="utf-8">' + extra, 1)
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from brand import LANG_GUARD
    out = out.replace(LANG_GUARD, "")   # already Hebrew: nothing to wait for
    out = re.sub(r'<script>try\{if\(localStorage\.getItem\("mwp_lang"\)==="he"\)location\.replace\([^<]*</script>', "", out)   # no redirect loop
    os.makedirs(os.path.dirname(os.path.join(ROOT, out_path)), exist_ok=True)
    open(os.path.join(ROOT, out_path), "w", encoding="utf-8").write(out)
    print("written", out_path, len(out))


if __name__ == "__main__":
    build("index.html", "he/index.html", f"{SITE}/", f"{SITE}/he/", "/he/", base=True)
    build("shop/index.html", "shop/he/index.html", f"{SITE}/shop/", f"{SITE}/shop/he/", "/shop/he/")
