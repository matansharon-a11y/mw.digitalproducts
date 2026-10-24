"""Names in Hebrew, for the Hebrew site (Matan: "everything in Hebrew"). MWP always stays in Latin letters.
Used by tools/unify_pages.py for the Hebrew sales pages; assets/js/i18n.js has the same list (NAMES)
for every other page. Keep the two lists the same. Longest names first."""
import re

MWP = "MWP"
NAMES = [
    ("MWP - PS Panel", f"פאנל התוסף לפוטושופ של {MWP}"),
    ("MWP - Signature Preset Pack", f"הפריסטים של {MWP}"),
    ("MWP Field Guides", f"מדריכי השטח של {MWP}"), ("MWP FIELD GUIDES", f"מדריכי השטח של {MWP}"),
    ("MWP Field Guide", f"מדריך השטח של {MWP}"), ("MWP FIELD GUIDE", f"מדריך השטח של {MWP}"),
    ("MWP Presets", f"הפריסטים של {MWP}"), ("MWP PRESETS", f"הפריסטים של {MWP}"),
    ("MWP Photoshop Plugin Panel", f"פאנל התוסף לפוטושופ של {MWP}"), ("MWP PHOTOSHOP PLUGIN PANEL", f"פאנל התוסף לפוטושופ של {MWP}"),
    ("MW Photo Tours", "אם־דבליו פוטו טורס"), ("MW PHOTO TOURS", "אם־דבליו פוטו טורס"),
    ("Matan Wild Photography", "מתן וויילד צילום"), ("Matan Wild", "מתן וויילד"),
    ("Lemon Squeezy", "למון סקוויזי"),
    ("Photoshop (Beta)", "פוטושופ (בטא)"), ("Photoshop", "פוטושופ"), ("PHOTOSHOP", "פוטושופ"),
    ("Lightroom Classic", "לייטרום קלאסיק"), ("Lightroom Mobile", "לייטרום מובייל"),
    ("Lightroom", "לייטרום"), ("LIGHTROOM", "לייטרום"),
    ("Camera Raw", "קאמרה ראו"), ("Premiere Pro", "פרמייר פרו"), ("DaVinci Resolve", "דה־וינצ׳י ריזולב"),
    ("Final Cut Pro", "פיינל קאט פרו"), ("Adobe", "אדובי"),
    ("Windows", "ווינדוס"), ("Mac", "מק"),
    ("Instagram", "אינסטגרם"), ("Facebook", "פייסבוק"), ("WhatsApp", "וואטסאפ"), ("YouTube", "יוטיוב"),
    ("Supabase", "סופאבייס"), ("MailerLite", "מיילרלייט"), ("Make.com", "מייק"), ("monday.com", "מאנדיי"),
    ("Resend", "ריסנד"),
]
_RE = [(re.compile(r"(?<![A-Za-z0-9@._/])" + re.escape(en) + r"(?![A-Za-z0-9])"), he) for en, he in NAMES]


# "ל-Lightroom" becomes "ללייטרום": a one-letter Hebrew prefix joins the now-Hebrew word ("ו־ווינדוס" keeps a maqaf).
_PREFIX = re.compile(r"(?<![\u05D0-\u05EA])(ו?[בלכמשה]|ו)[-־](?=[\u05D0-\u05EA])")


def _join(m, text):
    nxt = text[m.end():m.end() + 1]
    return m.group(1) + ("־" if m.group(1)[-1] == "ו" and nxt == "ו" else "")


def names(text):
    out = text
    for rx, he in _RE:
        out = rx.sub(he, out)
    if out != text:
        out = _PREFIX.sub(lambda m: _join(m, out), out)
    return out
