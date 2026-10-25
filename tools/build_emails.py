"""The shop's Mailchimp emails: the free-guide welcome series (Matan, 25 Oct 2026). One design for all (dark like the
shop, logo, one photo, one gold button, Mailchimp's unsubscribe + address in the footer), English and Hebrew.
Writes docs/emails/<id>.html; paste each into Mailchimp (automation "MWP Shop · Free guide welcome", Code your own).

Now:       1 right after they confirm (the tag "Shop: free guide"): how to use the sample
           2 three days later: one photo from RAW to final
At launch: 3 the Lightroom and Photoshop tools · 4 the full Field Guides (only once the shop can take orders:
           Lemon Squeezy approved, docs/GO-LIVE.md)
Voice: anthropic-skills mwp-content-voice. No prices here (they live in the shop and change), no invented facts.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs/emails")
SHOP = "https://shop.mw.photography"
LOGO = f"{SHOP}/assets/img/logo-mark.png"

EMAILS = {
    "1-guide-en": dict(lang="en", subject="Your free guide, and how to use it", preheader="One lesson, one outing.",
        kick="MWP FIELD GUIDES · FREE SAMPLE", title=("Your sample is ", "in your account."),
        img=f"{SHOP}/assets/pages/img/5275cc7bcd4fb7560d8f7163592e3122.jpg",
        body=["16 lessons on composition, light, colour and planning, waiting in My downloads.",
              "A tip from the field: don't read it all at once. Pick one lesson before your next outing and shoot with only that in mind. Look room one weekend, side light the next. One idea at a time is how it sticks."],
        button=("Open my free guide", f"{SHOP}/account/")),
    "1-guide-he": dict(lang="he", subject="המדריך החינמי שלכם, ואיך להשתמש בו", preheader="שיעור אחד, יציאה אחת.",
        kick="מדריכי השטח של MWP · טעימה חינמית", title=("הטעימה כבר ", "בחשבון שלכם."),
        img=f"{SHOP}/assets/pages/img/5275cc7bcd4fb7560d8f7163592e3122.jpg",
        body=["16 שיעורים על קומפוזיציה, אור, צבע ותכנון, מחכים בהורדות שלי.",
              "טיפ מהשטח: אל תקראו הכול בבת אחת. בחרו שיעור אחד לפני היציאה הבאה, וצלמו רק איתו בראש. קומפוזיציה בסוף שבוע אחד, אור צידי בסוף השבוע שאחריו. רעיון אחד בכל פעם, ככה זה נשאר."],
        button=("לפתיחת המדריך", f"{SHOP}/account/")),
    "2-raw-final-en": dict(lang="en", subject="One photo, from RAW to final", preheader="One preset, white balance, exposure. That's it.",
        kick="FROM RAW TO FINAL", title=("Same photo, ", "after the edit."),
        img=f"{SHOP}/assets/email/raw-final-blue-hour.jpg",
        body=["On the left, the RAW file. On the right, the same frame after the edit: one preset from the Light and Scene collection (Blue Hour), plus white balance and exposure. Nothing else.",
              "Good light does most of the work. The Field Guides are about being there for it, and the presets finish the edit in one click."],
        button=("See the Lightroom tools", f"{SHOP}/presets/")),
    "2-raw-final-he": dict(lang="he", subject="תמונה אחת, מ-RAW לתמונה הסופית", preheader="פריסט אחד, איזון לבן וחשיפה. זה הכול.",
        kick="מ-RAW לתמונה הסופית", title=("אותה תמונה, ", "אחרי העריכה."),
        img=f"{SHOP}/assets/email/raw-final-blue-hour.jpg",
        body=["משמאל קובץ ה-RAW, מימין אותו פריים אחרי העריכה: פריסט אחד מקולקציית אור וסצנה (שעה כחולה), ועוד איזון לבן וחשיפה. זה הכול.",
              "אור טוב עושה את רוב העבודה. מדריכי השטח עוזרים להיות שם בשבילו, והפריסטים משלימים את העריכה בקליק אחד."],
        button=("לכלים ללייטרום", f"{SHOP}/presets/he/")),
    # ---------------------------------------------------------------- at launch (the shop can take orders)
    "3-tools-en": dict(lang="en", subject="Two tools for the edit", preheader="Lightroom or Photoshop: start with the one you use.",
        kick="FOR THE EDIT", title=("Start with ", "the app you use."),
        img=f"{SHOP}/assets/pages/img/8f730b9bb76b93ca707cae719a309479.jpg",
        body=["If you edit in Lightroom, the presets and the Lightroom Classic plugin take a whole shoot from the card to a finished look.",
              "If you finish in Photoshop, the plugin panel picks the animal, the sky or the background and does the masks for you.",
              "Every tool is the way we edit on our own expeditions, turned into simple buttons."],
        button=("Compare the tools", f"{SHOP}/shop/")),
    "3-tools-he": dict(lang="he", subject="שני כלים לעריכה", preheader="לייטרום או פוטושופ: מתחילים מהתוכנה שלכם.",
        kick="לעריכה", title=("מתחילים ", "מהתוכנה שלכם."),
        img=f"{SHOP}/assets/pages/img/8f730b9bb76b93ca707cae719a309479.jpg",
        body=["עורכים בלייטרום? הפריסטים והתוסף ללייטרום קלאסיק לוקחים צילום שלם מהכרטיס ועד מראה סופי.",
              "מסיימים בפוטושופ? התוסף לפוטושופ בוחר את החיה, את השמיים או את הרקע, ועושה בשבילכם את המסכות.",
              "כל כלי הוא הדרך שבה אנחנו עורכים במסעות שלנו, בכפתורים פשוטים."],
        button=("להשוואה בין הכלים", f"{SHOP}/shop/he/")),
    "4-full-guides-en": dict(lang="en", subject="That was 16 of 137 lessons", preheader="The full Field Guides: four guides, 229 pages.",
        kick="THE FULL GUIDES", title=("16 down, ", "121 to go."),
        img=f"{SHOP}/assets/pages/img/0cf44582c4078749d18156eec10c90d3.jpg",
        body=["The sample had one section from each guide. The full MWP Field Guides have 137 lessons in four guides on composition, light, colour and planning, 229 pages in English or Hebrew.",
              "They're written for the moment before you press the shutter, so the photo is already there when you open the edit."],
        button=("Get the full Field Guides", f"{SHOP}/field-guides/")),
    "4-full-guides-he": dict(lang="he", subject="זה היה 16 מתוך 137 שיעורים", preheader="מדריכי השטח המלאים: ארבעה מדריכים, 229 עמודים.",
        kick="המדריכים המלאים", title=("16 מאחוריכם, ", "121 לפניכם."),
        img=f"{SHOP}/assets/pages/img/0cf44582c4078749d18156eec10c90d3.jpg",
        body=["בטעימה היה פרק אחד מכל מדריך. מדריכי השטח המלאים של MWP הם 137 שיעורים בארבעה מדריכים על קומפוזיציה, אור, צבע ותכנון, 229 עמודים בעברית או באנגלית.",
              "הם נכתבו לרגע שלפני הלחיצה על הכפתור, כדי שהתמונה כבר תהיה שם כשאתם פותחים את העריכה."],
        button=("למדריכי השטח המלאים", f"{SHOP}/field-guides/he/")),
}

FOOT = {
    "en": ("You're getting this because you asked for the free Field Guides sample on shop.mw.photography and said yes to tips and offers.",
           "Matan Wild · MWP", "Unsubscribe"),
    "he": ("קיבלתם את המייל כי ביקשתם את הטעימה החינמית ממדריכי השטח ב-shop.mw.photography ואישרתם לקבל טיפים והצעות.",
           "מתן וויילד · MWP", "הסרה מרשימת התפוצה"),
}


def html(e):
    he = e["lang"] == "he"
    al, d = ("right", "rtl") if he else ("left", "ltr")
    font = "Heebo,Arial,sans-serif" if he else "'Google Sans',Arial,sans-serif"
    paras = "".join(f'<p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#CDD7DD;">{p}</p>' for p in e["body"])
    note, sign, unsub = FOOT[e["lang"]]
    kick_style = "" if he else "letter-spacing:2px;"
    return f"""<!doctype html>
<html lang="{e['lang']}" dir="{d}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark light"><title>{e['subject']}</title></head>
<body style="margin:0;padding:0;background:#0A0908;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{e['preheader']}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0908;">
<tr><td align="center" style="padding:28px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="{d}" style="max-width:560px;background:#100E0C;border:1px solid #2a2724;border-radius:18px;overflow:hidden;font-family:{font};color:#FEFBF1;">
<tr><td style="padding:22px 28px 0;text-align:{al};"><img src="{LOGO}" width="34" height="36" alt="MWP" style="display:inline-block;border:0;"></td></tr>
<tr><td style="padding:18px 28px 0;"><img src="{e['img']}" width="504" alt="" style="display:block;width:100%;max-width:504px;height:auto;border:0;border-radius:12px;"></td></tr>
<tr><td style="padding:26px 28px 6px;text-align:{al};">
<p style="margin:0 0 10px;color:#F4AF56;font-size:12px;font-weight:bold;{kick_style}">{e['kick']}</p>
<h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:normal;color:#FEFBF1;">{e['title'][0]}<b style="color:#F4AF56;">{e['title'][1]}</b></h1>
{paras}
</td></tr>
<tr><td style="padding:6px 28px 8px;text-align:{al};">
<a href="{e['button'][1]}" style="display:inline-block;background:#F4AF56;color:#0A0908;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:64px;">{e['button'][0]}</a>
</td></tr>
<tr><td style="padding:22px 28px 6px;text-align:{al};font-size:15px;color:#FEFBF1;">{sign}</td></tr>
<tr><td style="padding:10px 28px 26px;text-align:{al};font-size:11px;line-height:1.6;color:#9CB1C2;">
{note}<br><a href="*|UNSUB|*" style="color:#9CB1C2;">{unsub}</a> · *|LIST:ADDRESSLINE|*
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
"""


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for key, e in EMAILS.items():
        path = os.path.join(OUT, f"{key}.html")
        open(path, "w", encoding="utf-8", newline="\n").write(html(e))
        print(path, "·", e["subject"])
