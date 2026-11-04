"""Lighter photos (Nov 2026): every photo in assets/pages/img also comes in smaller WebP sizes, and each page offers
them to the browser, which downloads only the size the screen needs (a phone or a small column gets the small one).

  python3 tools/image_sizes.py make         make the missing sizes (run after adding photos; commit the new files)
  python3 tools/image_sizes.py apply _site  in the published copy (the deploy does this): add srcset/sizes to every
                                            <img> and image preload that points at a photo with sizes

The pages keep their original src (a browser without srcset still gets the photo). Each image gets its measured sizes
(layout.json), else 100vw. Never sizes="auto" (the <img> tags have no width/height, so it stretched photos), and never
a 1px size (clean_sizes).
Sizes: 480, 960 and 1600 wide (never wider than the original); a JPG or PNG also gets a full-width WebP.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "assets/pages/img")
WIDTHS = (480, 960, 1600)
QUALITY = 78
VARIANT = re.compile(r"-\d+\.webp$")
LAYOUT = os.path.join(DIR, "layout.json")   # how wide each photo shows, per page (tools/measure_image_sizes.mjs)
SIZES = os.path.join(DIR, "sizes")   # the smaller copies live in their own folder, so nothing that looks photos up by name picks one
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
            os.makedirs(SIZES, exist_ok=True)
            dst = os.path.join(SIZES, out)
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
    """{original file name: [[width, path], …]} for the photos that have smaller copies (paths relative to DIR)."""
    from PIL import Image
    have = set(os.listdir(SIZES)) if os.path.isdir(SIZES) else set()
    out = {}
    for f in originals():
        stem = os.path.splitext(f)[0]
        ws = sorted((int(m.group(1)), "sizes/" + x) for x in have for m in [re.fullmatch(re.escape(stem) + r"-(\d+)\.webp", x)] if m)
        if ws:
            ow = Image.open(os.path.join(DIR, f)).width
            if ow > ws[-1][0]:   # no copy reaches the original's width: offer the original too (big screens)
                ws.append((ow, f))
            out[f] = ws
    return out


IMG = re.compile(r"<img\b[^>]*>", re.I)
LINK = re.compile(r'<link\b[^>]*rel="preload"[^>]*as="image"[^>]*>', re.I)
SRC = re.compile(r'(\s(?:src|href)=")([^"]*?assets/pages/img/)([^"/?#]+)(")')


def clean_sizes(sizes):
    """A measured `sizes` never says 1px: the photo was hidden while measuring (scripts off), not small, so the
    browser picked the 480 px copy and the photo looked blurry (Nov 2026). Use the widest measured share instead."""
    vws = [int(x) for x in re.findall(r"(\d+)vw", sizes)]
    return sizes.replace(" 1px", f" {max(vws) if vws else 100}vw")


def srcset_for(prefix, name, tab):
    return ", ".join(f"{prefix}{x} {w}w" for w, x in tab[name])


def apply(site):
    import json
    tab = json.load(open(MANIFEST))
    layout = json.load(open(LAYOUT)) if os.path.exists(LAYOUT) else {}   # measured `sizes` per page (measure_image_sizes.mjs)
    pages = changed = 0
    for dp, _, files in os.walk(site):
        rel_dir = os.path.relpath(dp, site)
        if rel_dir.split(os.sep)[0] in ("assets", "admin"):   # emails and the admin: leave them as they are
            continue
        for f in files:
            if not f.endswith(".html"):
                continue
            path = os.path.join(dp, f)
            rel = os.path.normpath(os.path.join(rel_dir, f)).replace(os.sep, "/")
            measured = layout.get(rel, [])
            html = open(path, encoding="utf-8").read()
            n, k, by_src = 0, 0, {}

            def img(m):
                nonlocal n, k
                tag = m.group(0)
                if not re.search(r'\ssrc="[^"]*?assets/pages/img/', tag):   # counted the same way as the measuring
                    return tag
                sizes = measured[k] if k < len(measured) else None   # the k-th photo of the page, as measured
                k += 1
                s = SRC.search(tag)
                if not s or not s.group(1).strip().startswith("src") or "srcset=" in tag or s.group(3) not in tab:
                    return tag
                # no sizes="auto": without width/height on the <img> the browser lays it out at 300x150 first, so
                # photos showed stretched or squashed (Nov 2026)
                sizes = clean_sizes(sizes or "100vw")
                by_src.setdefault(s.group(3), sizes)
                add = f' srcset="{srcset_for(s.group(2), s.group(3), tab)}" sizes="{sizes}"'
                n += 1
                return tag[:-1].rstrip("/").rstrip() + add + (" />" if tag.endswith("/>") else ">")

            def link(m):
                nonlocal n
                tag = m.group(0)
                s = SRC.search(tag)
                if not s or "imagesrcset=" in tag or s.group(3) not in tab:
                    return tag
                n += 1   # the preload asks for exactly what the photo itself will pick
                return tag[:-1].rstrip() + f' imagesrcset="{srcset_for(s.group(2), s.group(3), tab)}" imagesizes="{by_src.get(s.group(3), "100vw")}">'

            new = IMG.sub(img, html)
            new = LINK.sub(link, new)
            if n:
                open(path, "w", encoding="utf-8").write(new)
                pages += 1
                changed += n
    print(f"photo sizes offered: {changed} images on {pages} pages ({len(layout)} pages measured)")


if __name__ == "__main__":
    if sys.argv[1:2] == ["make"]:
        make()
    elif sys.argv[1:2] == ["apply"] and len(sys.argv) > 2:
        apply(sys.argv[2])
    else:
        print(__doc__)
