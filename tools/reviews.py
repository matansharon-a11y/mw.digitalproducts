"""Prepare customer review screenshots (assets/reviews/): see assets/reviews/README.md.

For every screenshot in assets/reviews/ that reviews.json doesn't list yet: makes a WebP copy at most 1400 px wide
(<name>.webp, the original stays as it is), adds an entry with the copy's width and height, and prints which entries
still miss their products or alt text. Existing entries get their width and height refreshed.
Run: python3 tools/reviews.py
"""
import json, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "assets/reviews")
DATA = os.path.join(DIR, "reviews.json")
MAX_W = 1400
PRODUCTS = {"presets", "plugin", "panel", "guides"}


def web_copy(name):
    """The WebP the page shows: <name>.webp, at most MAX_W wide."""
    base, ext = os.path.splitext(name)
    if ext.lower() == ".webp":
        return name
    out = base + ".webp"
    src, dst = os.path.join(DIR, name), os.path.join(DIR, out)
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        im = Image.open(src)
        im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
        if im.width > MAX_W:
            im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
        im.save(dst, "WEBP", quality=86, method=6)
    return out


def main():
    data = json.load(open(DATA, encoding="utf-8"))
    reviews = data.setdefault("reviews", [])
    listed = {r.get("image") for r in reviews} | {r.get("original") for r in reviews}
    shots = sorted(f for f in os.listdir(DIR) if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")))
    made = {os.path.splitext(f)[0] + ".webp" for f in shots if not f.lower().endswith(".webp")}
    for f in shots:
        if f in listed or f in made:   # already listed, or a copy this script made
            continue
        img = web_copy(f)
        if img in listed:
            continue
        reviews.append({"image": img, "original": f, "products": [], "alt": "", "source": "", "source_he": "", "lang": "en", "featured": False})
        listed |= {img, f}
        print("added", f)
    for r in reviews:
        path = os.path.join(DIR, r["image"])
        if not os.path.exists(path):
            print("MISSING FILE", r["image"])
            continue
        with Image.open(path) as im:
            r["width"], r["height"] = im.size
        todo = [k for k in ("alt", "source") if not r.get(k)]
        bad = [p for p in r.get("products", []) if p not in PRODUCTS]
        if not r.get("products"):
            todo.append("products")
        if todo or bad:
            print(f"{r['image']}: fill in {', '.join(todo)}" + (f"; unknown products {bad}" if bad else ""))
    json.dump(data, open(DATA, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open(DATA, "a").write("\n")
    print(f"{len(reviews)} reviews in reviews.json")


if __name__ == "__main__":
    main()
