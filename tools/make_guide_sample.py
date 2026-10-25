"""The free MWP Field Guides sample (the shop's sign-up gift): one complete section from each of the four guides,
with a cover and a closing page, in English and Hebrew. The result is the zip uploaded as the file of the product
mwp-field-guides-sample (one PDF per language; the personal-copies worker keeps the person's language and stamps
their name on every page, like the paid guides).

Usage: python tools/make_guide_sample.py <guides folder with English/ and Hebrew/> <fonts folder> <out folder>
The fonts folder holds gs-400.ttf, gs-600.ttf (Google Sans) and heebo-400.ttf, heebo-600.ttf (Heebo).

Design (25 Oct 2026, made in-house in the brand style): the cover is one photo edge to edge (the mountains with wild
asses, as in the sign-up pop-up) with the words in the calm sky, the logo in the top corner and the photo credit;
the closing page is night-dark with the words on one side and the four real guide covers on the other, and a gold
button to the full guides. Headlines in two weights: the frame words regular, the key words bold in gold.
"""
import os, sys, zipfile
import pymupdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# One section per guide: its opening page, then four lessons. Page numbers (1-based) are the same in both languages.
PICKS = [
    ("MWP-Composition-Guide", [5, 6, 8, 10, 11]),   # Where to put it: rule of thirds, horizon low, space to move, look room
    ("MWP-Light-Guide", [6, 7, 8, 9, 10]),          # Where the light comes from: front, side, from behind, rim
    ("MWP-Colour-Guide", [21, 22, 23, 26, 28]),     # Colour and the subject: what pulls the eye, one accent, background, eyes
    ("MWP-Planning-Guide", [6, 7, 8, 9, 10]),       # Know the animal: their hours, follow the food, read the trail, read the body
]
INTRO = ("MWP-Composition-Guide", 2)                # "Hi, I'm Matan"
LESSONS, ALL, PAGES = 16, 137, 229                  # this sample; the four full guides (53 + 47 + 60 + 69 pages)
COVER_PHOTO = os.path.join(ROOT, "assets/pages/img/5275cc7bcd4fb7560d8f7163592e3122.jpg")
LOGO = os.path.join(ROOT, "assets/img/logo-mark.png")

WORDS = {
    "en": dict(kick="MWP FIELD GUIDES · FREE SAMPLE", title=("See the photo", "before you press the shutter."),
               sub=f"{LESSONS} lessons from the four guides: composition, light, colour and planning. By Matan Wild.",
               credit="Photo: Matan Wild",
               end_kick="THE FULL GUIDES", end_title=(f"That was {LESSONS} of", f"{ALL} lessons."),
               end_sub="The MWP Field Guides: four PDF guides on composition, light, colour and planning, in English or Hebrew.",
               facts=f"4 guides · {ALL} lessons · {PAGES} pages", button="Get the full Field Guides",
               link="https://shop.mw.photography/field-guides/", link_text="shop.mw.photography/field-guides"),
    "he": dict(kick="מדריכי השטח של MWP · טעימה חינמית", title=("לראות את התמונה", "לפני שלוחצים על הכפתור."),
               sub=f"{LESSONS} שיעורים מארבעת המדריכים: קומפוזיציה, אור, צבע ותכנון. מאת מתן וויילד.",
               credit="צילום: מתן וויילד",
               end_kick="המדריכים המלאים", end_title=(f"זה היה {LESSONS} מתוך", f"{ALL} שיעורים."),
               end_sub="מדריכי השטח של MWP: ארבעה מדריכי PDF על קומפוזיציה, אור, צבע ותכנון, בעברית או באנגלית.",
               facts=f"4 מדריכים · {ALL} שיעורים · {PAGES} עמודים", button="למדריכי השטח המלאים",
               link="https://shop.mw.photography/field-guides/he/", link_text="shop.mw.photography/field-guides/he"),
}
NIGHT = (10 / 255, 9 / 255, 8 / 255)      # brand night #0A0908
GOLD = "#F4AF56"                          # the shop's gold (tools/brand.py); the gradient's light end
GOLD_RGB = (244 / 255, 175 / 255, 86 / 255)


def css(fonts, rtl):
    fam = "Heebo" if rtl else "GoogleSans"
    a, b = (os.path.basename(f) for f in fonts)
    return (f"@font-face {{font-family: {fam}; src: url({a});}} @font-face {{font-family: {fam}; font-weight: bold; src: url({b});}} "
            f"* {{font-family: {fam}; color: #FEFBF1; direction: {'rtl' if rtl else 'ltr'}; text-align: left; margin: 0;}} "   # MuPDF starts RTL text at the right
            f".k {{color: {GOLD}; font-size: 11px; font-weight: bold; letter-spacing: {'1px' if rtl else '2.4px'}; margin-bottom: 14px;}} "
            f".t {{font-size: 42px; line-height: 1.08; font-weight: normal;}} .t b {{color: {GOLD}; font-weight: bold;}} "
            f".s {{font-size: 15px; color: #CDD7DD; line-height: 1.5; margin-top: 16px;}} "
            f".f {{font-size: 12px; color: #9CB1C2; letter-spacing: {'0' if rtl else '0.6px'}; margin-top: 18px;}} "
            f".c {{font-size: 9px; color: #FEFBF1;}} .u {{font-size: 11px; color: #9CB1C2; margin-top: 10px;}} "
            f".btn {{font-size: 15px; font-weight: bold; color: #0A0908; text-align: center;}}")


def shade(page, rect, top_alpha, bottom_alpha):
    """A smooth dark vertical fade over a photo: a night-coloured image whose transparency runs top to bottom."""
    from io import BytesIO
    from PIL import Image
    h = 512
    img = Image.new("RGBA", (4, h))
    for y in range(h):
        a = top_alpha + (bottom_alpha - top_alpha) * (y / (h - 1)) ** 1.15
        for x in range(4):
            img.putpixel((x, y), (10, 9, 8, round(255 * a)))
    buf = BytesIO()
    img.save(buf, "PNG")
    page.insert_image(rect, stream=buf.getvalue(), keep_proportion=False)


def cover(doc, size, fonts, lang):
    rtl, w = lang == "he", WORDS[lang]
    page = doc.new_page(width=size.width, height=size.height)
    page.insert_image(page.rect, filename=COVER_PHOTO, keep_proportion=False)
    shade(page, pymupdf.Rect(0, 0, size.width, size.height * 0.72), 0.82, 0.0)          # the sky darker for the words
    shade(page, pymupdf.Rect(0, size.height * 0.82, size.width, size.height), 0.0, 0.45)  # room for the credit
    m = 52
    lw = size.width * 0.06
    lr = pymupdf.Rect(size.width - m - lw, 38, size.width - m, 38 + lw * 120 / 113) if rtl else pymupdf.Rect(m, 38, m + lw, 38 + lw * 120 / 113)
    page.insert_image(lr, filename=LOGO)
    arch = pymupdf.Archive(os.path.dirname(fonts[0]))
    box = pymupdf.Rect(m, 38 + lw * 120 / 113 + 28, size.width * 0.76, size.height * 0.70)
    if rtl:
        box = pymupdf.Rect(size.width * 0.24, box.y0, size.width - m, box.y1)
    html = (f'<p class="k">{w["kick"]}</p><p class="t">{w["title"][0]}<br><b>{w["title"][1]}</b></p>'
            f'<p class="s">{w["sub"]}</p>')
    page.insert_htmlbox(box, html, css=css(fonts, rtl), archive=arch)
    cr = pymupdf.Rect(m, size.height - 30, size.width - m, size.height - 14)
    page.insert_htmlbox(cr, f'<p class="c" style="text-align:{"left" if rtl else "right"}">{w["credit"]}</p>',   # bottom right in both
                        css=css(fonts, rtl), archive=arch)


def closing(doc, size, fonts, lang, covers):
    rtl, w = lang == "he", WORDS[lang]
    page = doc.new_page(width=size.width, height=size.height)
    page.draw_rect(page.rect, color=None, fill=NIGHT)
    m, gap = 52, 14
    # the four guide covers, 2 x 2, on the side away from the words
    gw = size.width * 0.44
    cw = (gw - gap) / 2
    ch = cw * size.height / size.width
    gx = m if rtl else size.width - m - gw
    gy = (size.height - (2 * ch + gap)) / 2
    for i, pix in enumerate(covers):
        r = pymupdf.Rect(gx + (i % 2) * (cw + gap), gy + (i // 2) * (ch + gap), gx + (i % 2) * (cw + gap) + cw, gy + (i // 2) * (ch + gap) + ch)
        page.insert_image(r, pixmap=pix)
        page.draw_rect(r, color=(1, 1, 1), stroke_opacity=0.12, width=0.6)
    arch = pymupdf.Archive(os.path.dirname(fonts[0]))
    tx0, tx1 = (gx + gw + 44, size.width - m) if rtl else (m, gx - 44)
    html = (f'<p class="k">{w["end_kick"]}</p><p class="t">{w["end_title"][0]}<br><b>{w["end_title"][1]}</b></p>'
            f'<p class="s">{w["end_sub"]}</p><p class="f">{w["facts"]}</p>')
    bw, bh = 250, 48
    # measure the words on a scratch page first, so the block (words, button, link) can sit centred on the covers
    scratch = pymupdf.open().new_page(width=size.width, height=size.height)
    spare, _ = scratch.insert_htmlbox(pymupdf.Rect(tx0, 0, tx1, size.height), html, css=css(fonts, rtl), archive=arch)
    used = size.height - spare
    top = (size.height - (used + 28 + bh + 30)) / 2
    page.insert_htmlbox(pymupdf.Rect(tx0, top, tx1, top + used + 4), html, css=css(fonts, rtl), archive=arch)
    # the button: fully rounded, gold, one per page
    by = top + used + 28
    br = pymupdf.Rect(tx1 - bw, by, tx1, by + bh) if rtl else pymupdf.Rect(tx0, by, tx0 + bw, by + bh)
    page.draw_rect(br, color=None, fill=GOLD_RGB, radius=0.5)
    page.insert_htmlbox(pymupdf.Rect(br.x0, br.y0 + 3, br.x1, br.y1), f'<p class="btn">{w["button"]}</p>', css=css(fonts, rtl), archive=arch)
    page.insert_link({"kind": pymupdf.LINK_URI, "from": br, "uri": w["link"]})
    ur = pymupdf.Rect(tx0, br.y1 + 4, tx1, br.y1 + 26)
    page.insert_htmlbox(ur, f'<p class="u">{w["link_text"]}</p>', css=css(fonts, rtl), archive=arch)
    page.insert_link({"kind": pymupdf.LINK_URI, "from": ur, "uri": w["link"]})


def build(src, fonts_dir, out, lang):
    folder = os.path.join(src, "English" if lang == "en" else "Hebrew")
    name = lambda stem: os.path.join(folder, stem + ("-HE" if lang == "he" else "") + ".pdf")
    guides = {stem: pymupdf.open(name(stem)) for stem, _ in PICKS}
    size = guides[PICKS[0][0]][0].rect
    fonts = [os.path.join(fonts_dir, f) for f in (("heebo-400.ttf", "heebo-600.ttf") if lang == "he" else ("gs-400.ttf", "gs-600.ttf"))]
    doc = pymupdf.open()
    cover(doc, size, fonts, lang)
    doc.insert_pdf(guides[INTRO[0]], from_page=INTRO[1] - 1, to_page=INTRO[1] - 1)
    for stem, pages in PICKS:
        for p in pages:   # the section's opening page, then its lessons
            doc.insert_pdf(guides[stem], from_page=p - 1, to_page=p - 1)
    covers = [guides[stem][0].get_pixmap(matrix=pymupdf.Matrix(0.8, 0.8)) for stem, _ in PICKS]
    closing(doc, size, fonts, lang, covers)
    doc.set_metadata({"title": "MWP Field Guides · free sample" if lang == "en" else "מדריכי השטח של MWP · טעימה חינמית",
                      "author": "Matan Wild"})
    path = os.path.join(out, f"MWP-Field-Guides-Sample{'-HE' if lang == 'he' else ''}.pdf")
    doc.save(path, garbage=4, deflate=True)
    print(path, doc.page_count, "pages", round(os.path.getsize(path) / 1e6, 1), "MB")
    return path


if __name__ == "__main__":
    src, fonts_dir, out = sys.argv[1:4]
    os.makedirs(out, exist_ok=True)
    pdfs = [build(src, fonts_dir, out, lang) for lang in ("en", "he")]
    with zipfile.ZipFile(os.path.join(out, "MWP-Field-Guides-Sample.zip"), "w", zipfile.ZIP_STORED) as z:
        for p in pdfs:
            z.write(p, "MWP - Field Guides sample/" + ("Hebrew/" if p.endswith("-HE.pdf") else "English/") + os.path.basename(p))
    print("zip written")
