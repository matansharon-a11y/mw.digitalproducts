"""The free MWP Field Guides sample (the shop's sign-up gift): one complete section from each of the four guides,
with a cover and a closing page, in English and Hebrew. The result is the zip uploaded as the file of the product
mwp-field-guides-sample (one PDF per language; the personal-copies worker keeps the person's language and stamps
their name on every page, like the paid guides).

Usage: python tools/make_guide_sample.py <guides folder with English/ and Hebrew/> <fonts folder> <out folder>
The fonts folder holds gs-400.ttf, gs-600.ttf (Google Sans) and heebo-400.ttf, heebo-600.ttf (Heebo).
The page picks and the cover / closing words are drafts for Matan (25 Oct 2026); change them here and run again.
"""
import os, sys, zipfile
import pymupdf

# One section per guide: its opening page, then four lessons. Page numbers (1-based) are the same in both languages.
PICKS = [
    ("MWP-Composition-Guide", [5, 6, 8, 10, 11]),   # Where to put it: rule of thirds, horizon low, space to move, look room
    ("MWP-Light-Guide", [6, 7, 8, 9, 10]),          # Where the light comes from: front, side, from behind, rim
    ("MWP-Colour-Guide", [21, 22, 23, 26, 28]),     # Colour and the subject: what pulls the eye, one accent, background, eyes
    ("MWP-Planning-Guide", [6, 7, 8, 9, 10]),       # Know the animal: their hours, follow the food, read the trail, read the body
]
INTRO = ("MWP-Composition-Guide", 2)                # "Hi, I'm Matan"
LESSONS, ALL = 16, 137

WORDS = {
    "en": dict(kick="MWP FIELD GUIDES · FREE SAMPLE", title="See the photo before you press the shutter.",
               sub=f"{LESSONS} lessons from the four guides: composition, light, colour and planning. By Matan Wild.",
               end_kick="THE FULL GUIDES", end_title=f"That was {LESSONS} of {ALL} lessons.",
               end_sub="The MWP Field Guides: 4 PDF guides on composition, colour, light and planning, in English or Hebrew.",
               end_link="shop.mw.photography/field-guides"),
    "he": dict(kick="מדריכי השטח של MWP · טעימה חינמית", title="לראות את התמונה לפני שלוחצים על הכפתור.",
               sub=f"{LESSONS} שיעורים מארבעת המדריכים: קומפוזיציה, אור, צבע ותכנון. מאת מתן וויילד.",
               end_kick="המדריכים המלאים", end_title=f"זה היה {LESSONS} מתוך {ALL} שיעורים.",
               end_sub="מדריכי השטח של MWP: ארבעה מדריכי PDF על קומפוזיציה, צבע, אור ותכנון, בעברית או באנגלית.",
               end_link="shop.mw.photography/field-guides/he/"),
}
BG = (8 / 255, 32 / 255, 42 / 255)        # the guides' own dark page colour (#08202A)
GOLD = "#F4AF56"                          # brand gold (tools/brand.py)


def text_page(doc, size, fonts, lang, kick, title, sub, link=None, thumbs=None):
    page = doc.new_page(width=size.width, height=size.height)
    page.draw_rect(page.rect, color=None, fill=BG)
    if thumbs:   # the four guide covers in a row, under the words
        w = (size.width - 120 - 3 * 18) / 4
        h = w * size.height / size.width
        for i, pix in enumerate(thumbs):
            r = pymupdf.Rect(60 + i * (w + 18), size.height - 60 - h, 60 + i * (w + 18) + w, size.height - 60)
            page.insert_image(r, pixmap=pix)
    rtl = lang == "he"
    family = "Heebo" if rtl else "GoogleSans"
    css = (f"@font-face {{font-family: {family}; src: url({os.path.basename(fonts[0])});}} "
           f"@font-face {{font-family: {family}; font-weight: bold; src: url({os.path.basename(fonts[1])});}} "
           f"* {{font-family: {family}; color: #FEFBF1; direction: {'rtl' if rtl else 'ltr'}; text-align: {'right' if rtl else 'left'};}} "
           f".k {{color: {GOLD}; font-size: 11px; font-weight: bold; letter-spacing: 2px;}} "
           f".t {{font-size: 34px; font-weight: bold; line-height: 1.15;}} .s {{font-size: 15px; color: #CDD7DD; line-height: 1.5;}} "
           f".l {{font-size: 15px; color: {GOLD}; font-weight: bold;}}")
    html = (f'<p class="k">{kick}</p><p class="t">{title}</p><p class="s">{sub}</p>'
            + (f'<p class="l">{link}</p>' if link else ""))
    box = pymupdf.Rect(60, 70, size.width - 60, size.height - (60 + (size.width - 174) / 4 * size.height / size.width + 30 if thumbs else 60))
    arch = pymupdf.Archive(os.path.dirname(fonts[0]))
    page.insert_htmlbox(box, html, css=css, archive=arch)
    if link:
        page.insert_link({"kind": pymupdf.LINK_URI, "from": box, "uri": "https://" + link})
    return page


def build(src, fonts_dir, out, lang):
    folder = os.path.join(src, "English" if lang == "en" else "Hebrew")
    name = lambda stem: os.path.join(folder, stem + ("-HE" if lang == "he" else "") + ".pdf")
    guides = {stem: pymupdf.open(name(stem)) for stem, _ in PICKS}
    size = guides[PICKS[0][0]][0].rect
    fonts = [os.path.join(fonts_dir, f) for f in (("heebo-400.ttf", "heebo-600.ttf") if lang == "he" else ("gs-400.ttf", "gs-600.ttf"))]
    w = WORDS[lang]
    doc = pymupdf.open()
    thumbs = [guides[stem][0].get_pixmap(matrix=pymupdf.Matrix(0.4, 0.4)) for stem, _ in PICKS]
    text_page(doc, size, fonts, lang, w["kick"], w["title"], w["sub"], thumbs=thumbs)
    doc.insert_pdf(guides[INTRO[0]], from_page=INTRO[1] - 1, to_page=INTRO[1] - 1)
    for stem, pages in PICKS:
        doc.insert_pdf(guides[stem], from_page=pages[0] - 1, to_page=pages[0] - 1)   # the section's opening page
        for p in pages[1:]:
            doc.insert_pdf(guides[stem], from_page=p - 1, to_page=p - 1)
    text_page(doc, size, fonts, lang, w["end_kick"], w["end_title"], w["end_sub"], link=w["end_link"])
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
