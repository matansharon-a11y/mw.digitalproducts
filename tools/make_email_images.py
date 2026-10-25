"""Images for the shop's Mailchimp emails (the free-guide welcome series), hosted on the shop at /assets/email/.
The RAW / final pair is the site's own (the Lightroom page's "Light and Scene · Blue Hour" example: one preset, plus
white balance and exposure). Run: python tools/make_email_images.py <fonts folder with gs-600.ttf>"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "assets/pages/img")
OUT = os.path.join(ROOT, "assets/email")


def raw_final(fonts):
    raw = Image.open(os.path.join(IMG, "3c14b23dbb00f051684ad60fb205ed10.jpg")).convert("RGB")
    fin = Image.open(os.path.join(IMG, "fbaf19aea2af10f26b2949ab31fff094.jpg")).convert("RGB")
    w = 1120                      # 2x the email's 560px column
    h = round(w / 2 * raw.height / raw.width)
    gap = 8
    sheet = Image.new("RGB", (w + gap, h), (16, 14, 12))
    for i, im in enumerate((raw, fin)):
        sheet.paste(im.resize((w // 2, h), Image.LANCZOS), (i * (w // 2 + gap), 0))
    d = ImageDraw.Draw(sheet)
    f = ImageFont.truetype(os.path.join(fonts, "gs-600.ttf"), 26)
    for i, label in enumerate(("RAW", "FINAL")):
        x = i * (w // 2 + gap) + 22
        tw = d.textlength(label, font=f)
        d.rounded_rectangle((x - 12, 20, x + tw + 12, 62), radius=21, fill=(10, 9, 8))
        d.text((x, 24), label, font=f, fill=(244, 175, 86) if i else (254, 251, 241))
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "raw-final-blue-hour.jpg")
    sheet.save(path, quality=82, optimize=True, progressive=True)
    print(path, sheet.size, os.path.getsize(path) // 1024, "KB")


if __name__ == "__main__":
    raw_final(sys.argv[1])
