"""Makes a personal copy of an MWP download for one buyer.

  python3 personalize.py <in.zip> <out.zip> --name "Dana Cohen" --email dana@example.com --id 1a2b3c4d

Every copy carries the buyer, so a shared copy leads back to them:
  - PDFs (field guides, install guide, licence): a quiet line at the foot of every page,
    "Licensed to Dana Cohen · dana@example.com · MWP-1A2B3C4D", plus the same in the PDF's properties.
    The Field Guides also get a large, faint watermark across the middle of every page (Matan, 14 Nov 2026: copies
    were passed on): "Licensed to Dana Cohen" / "dana@example.com · MWP-1A2B3C4D · Not for sharing".
  - Lightroom presets (.xmp): a comment at the top of each file (Lightroom ignores it).
  - LUTs (.cube): a comment line at the top (editors ignore it).
  - A LICENSED-TO.txt at the top of the pack.
Mobile presets (.dng) and everything else are copied unchanged.
"""
import argparse, io, math, os, re, sys, zipfile
from datetime import date

from pypdf import PdfReader, PdfWriter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

try:
    from bidi.algorithm import get_display   # Hebrew names read right to left
except ImportError:                         # pragma: no cover
    def get_display(s): return s

FONT_PATHS = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/dejavu/DejaVuSans.ttf"]
FONT = "Helvetica"
for p in FONT_PATHS:
    if os.path.exists(p):
        pdfmetrics.registerFont(TTFont("Stamp", p)); FONT = "Stamp"; break


def stamp_line(name, email, lid):
    who = f"{name} · {email}" if name else email
    return f"Licensed to {who} · {lid}"


def watermark(c, w, h, name, email, lid):
    """Two lines along the page's diagonal, centred, faint enough to read the page through."""
    top = get_display(f"Licensed to {name}" if name else f"Licensed to {email}")
    bottom = get_display(f"{email} · {lid} · Not for sharing" if name else f"{lid} · Not for sharing")
    angle = math.degrees(math.atan2(h, w))
    diag = math.hypot(w, h)
    size = min(diag * 0.62 / max(1, pdfmetrics.stringWidth(top, FONT, 1)), diag * 0.045)
    c.saveState()
    c.translate(w / 2, h / 2)
    c.rotate(angle)
    c.setFillColorRGB(0.5, 0.5, 0.5, alpha=0.26)
    c.setFont(FONT, size)
    c.drawCentredString(0, size * 0.25, top)
    c.setFont(FONT, size * 0.5)
    c.drawCentredString(0, -size * 0.75, bottom)
    c.restoreState()


def stamp_pdf(data, line, lid, mark=None):
    reader = PdfReader(io.BytesIO(data))
    writer = PdfWriter()
    text = get_display(line)
    overlays = {}
    for page in reader.pages:
        w, h = float(page.mediabox.width), float(page.mediabox.height)
        key = (round(w), round(h))
        if key not in overlays:
            buf = io.BytesIO()
            c = canvas.Canvas(buf, pagesize=(w, h))
            size = max(5.5, min(8, w / 90))
            c.setFont(FONT, size)
            c.setFillColorRGB(0.55, 0.55, 0.55, alpha=0.75)
            c.drawCentredString(w / 2, max(8, h * 0.012), text)
            if mark:   # (name, email): the large watermark across the page
                watermark(c, w, h, mark[0], mark[1], lid)
            c.save()
            overlays[key] = PdfReader(io.BytesIO(buf.getvalue())).pages[0]
        # the page joins the writer first, then gets the stamp: pypdf 7 (7 Nov 2026) refuses to change a page that
        # isn't in a writer ("replace_contents() for pages not assigned to a writer")
        writer.add_page(page).merge_page(overlays[key])
    meta = dict(reader.metadata or {})
    meta.update({"/Subject": line, "/Keywords": f"MWP licence {lid}"})
    writer.add_metadata({k: str(v) for k, v in meta.items()})
    writer.compress_identical_objects()   # defaults: remove duplicates and orphans (the keyword was renamed in pypdf 7)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def stamp_xmp(data, line):
    s = data.decode("utf-8", errors="replace")
    comment = f"<!-- MWP Presets · {line} · Personal licence, not for sharing. -->\n"
    if s.startswith("<?xpacket") or s.startswith("<?xml"):
        end = s.find("?>") + 2
        s = s[:end] + "\n" + comment + s[end:].lstrip("\n")
    else:
        s = comment + s
    return s.encode("utf-8")


def stamp_cube(data, line):
    return f"# MWP LUT · {line} · Personal licence, not for sharing.\n".encode("utf-8") + data


def personalize(src, dst, name, email, lid, big_mark=False):
    line = stamp_line(name, email, lid)
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zout:
        names = zin.namelist()
        top = names[0].split("/")[0] + "/" if names and "/" in names[0] else ""
        for info in zin.infolist():
            data = zin.read(info)
            low = info.filename.lower()
            if info.is_dir():
                zout.writestr(info, b""); continue
            if low.endswith(".pdf"):
                data = stamp_pdf(data, line, lid, (name, email) if big_mark else None)
            elif low.endswith(".xmp"):
                data = stamp_xmp(data, line)
            elif low.endswith(".cube"):
                data = stamp_cube(data, line)
            zi = zipfile.ZipInfo(info.filename, date_time=info.date_time)
            zi.external_attr = info.external_attr
            # DNG and other already-compressed files are stored, everything else deflated
            zi.compress_type = zipfile.ZIP_STORED if low.endswith((".dng", ".jpg", ".png")) else zipfile.ZIP_DEFLATED
            zout.writestr(zi, data)
        note = (f"{line}\n\nThis copy of MWP was made for you on {date.today().isoformat()}.\n"
                "It is licensed for your personal use only. Please don't share these files.\n"
                "Every file in this pack is marked with your licence.\n\nshop.mw.photography\n")
        zout.writestr(top + "LICENSED-TO.txt", note)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("dst")
    ap.add_argument("--name", default=""); ap.add_argument("--email", required=True); ap.add_argument("--id", required=True)
    ap.add_argument("--big-mark", action="store_true", help="the Field Guides' large watermark")
    a = ap.parse_args()
    personalize(a.src, a.dst, a.name.strip(), a.email.strip(), "MWP-" + re.sub(r"[^A-Za-z0-9]", "", a.id)[:8].upper(), a.big_mark)
    print("written", a.dst, os.path.getsize(a.dst))
