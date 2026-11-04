"""Lighter photos (Nov 2026): every photo in assets/pages/img also comes in smaller WebP sizes, and each page offers
them to the browser, which downloads only the size the screen needs (a phone or a small column gets the small one).

  python3 tools/image_sizes.py make         make the missing sizes (run after adding photos; commit the new files)
  python3 tools/image_sizes.py apply _site  in the published copy (the deploy does this): add srcset/sizes to every
                                            <img> and image preload that points at a photo with sizes

The pages keep their original src (a browser without srcset still gets the photo). Lazy images get sizes="auto, 100vw"
(the browser measures the image's real width; older browsers fall back to the screen width); the others 100vw.
Sizes: 480, 960 and 1600 wide (never wider than the original); a JPG or PNG also gets a full-width WebP.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "assets/pages/img")
WIDTHS = (480, 960, 1600)
QUALITY = 78
VARIANT = re.compile(r"-\d+\.webp$")
MANIFEST = os.path.join(DIR, "sizes.json")   # {photo: [[width, file], …]}, written by make, read by apply (no image library needed)


def originals():
    for f in sorted(os.listdir(DIR)):
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")) and not VARIANT.search(f):
            yield f


def plan(name, width):
    """The sizes a photo gets: [(width, file name)]."""
    stem, ext = os.path.splitext(name)
    out = [(w, f"{stem}-{w}.webp") for w in WIDTHS if w < width]
    if ext.lower() != ".webp" or width > WIDTHS[-1]:
        top = min(width, WIDTHS[-1])
        if top not in [w for w, _ in out]:
            out.append((top, f"{stem}-{top}.webp"))
    return out


def make():
    from PIL import Image
    made = 0
    for f in originals():
        im = Image.open(os.path.join(DIR, f))
        if im.width < 600:
            continue
        for w, out in plan(f, im.width):
            dst = os.path.join(DIR, out)
            if os.path.exists(dst):
                continue
            src = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
            src.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(dst, "WEBP", quality=QUALITY, method=6)
            made += 1
    print(f"made {made} sizes")
    import json
    json.dump(table(), open(MANIFEST, "w"), indent=0, sort_keys=True)
    print("wrote", os.path.relpath(MANIFEST, ROOT))


def table():
    """{original file name: 'a-480.webp 480w, a-960.webp 960w, …'} for the photos that have their sizes."""
    have = set(os.listdir(DIR))
    out = {}
    for f in originals():
        stem = os.path.splitext(f)[0]
        ws = sorted((int(m.group(1)), x) for x in have for m in [re.fullmatch(re.escape(stem) + r"-(\d+)\.webp", x)] if m)
        if ws:
            if ws[-1][0] < WIDTHS[-1]:   # no size reaches the original's width: offer the original too (big screens)
                from PIL import Image
                ow = Image.open(os.path.join(DIR, f)).width
                if ow > ws[-1][0]:
                    ws.append((ow, f))
            out[f] = ws
    return out


IMG = re.compile(r"<img\b[^>]*>", re.I)
LINK = re.compile(r'<link\b[^>]*rel="preload"[^>]*as="image"[^>]*>', re.I)
SRC = re.compile(r'(\s(?:src|href)=")([^"]*?assets/pages/img/)([^"/?#]+)(")')


def srcset_for(prefix, name, tab):
    return ", ".join(f"{prefix}{x} {w}w" for w, x in tab[name])


def apply(site):
    import json
    tab = json.load(open(MANIFEST))
    pages = changed = 0
    for dp, _, files in os.walk(site):
        for f in files:
            if not f.endswith(".html"):
                continue
            path = os.path.join(dp, f)
            html = open(path, encoding="utf-8").read()
            n = 0

            def img(m):
                nonlocal n
                tag = m.group(0)
                s = SRC.search(tag)
                if not s or "srcset=" in tag or s.group(3) not in tab:
                    return tag
                lazy = re.search(r'loading="lazy"', tag)
                add = f' srcset="{srcset_for(s.group(2), s.group(3), tab)}" sizes="{"auto, 100vw" if lazy else "100vw"}"'
                n += 1
                return tag[:-1].rstrip("/").rstrip() + add + (" />" if tag.endswith("/>") else ">")

            def link(m):
                nonlocal n
                tag = m.group(0)
                s = SRC.search(tag)
                if not s or "imagesrcset=" in tag or s.group(3) not in tab:
                    return tag
                n += 1
                return tag[:-1].rstrip() + f' imagesrcset="{srcset_for(s.group(2), s.group(3), tab)}" imagesizes="100vw">'

            new = LINK.sub(link, IMG.sub(img, html))
            if n:
                open(path, "w", encoding="utf-8").write(new)
                pages += 1
                changed += n
    print(f"photo sizes offered: {changed} images on {pages} pages")


if __name__ == "__main__":
    if sys.argv[1:2] == ["make"]:
        make()
    elif sys.argv[1:2] == ["apply"] and len(sys.argv) > 2:
        apply(sys.argv[2])
    else:
        print(__doc__)
