"""Hebrew for the English words left on Matan's Hebrew sales pages (presets/he.html, panel/he.html,
field-guides/he.html). Applied by tools/unify_pages.py after the names (tools/he_names.py).
Keys are the exact text (after the names are already in Hebrew)."""
import re
import html as html_lib
from he_names import names

EXACT = {
    # page titles (TITLES in tools/unify_pages.py)
    "Lightroom presets for wildlife and landscapes · MWP Presets": "פריסטים ללייטרום לצילומי חיות בר ונופים · הפריסטים של MWP",
    # search descriptions (DESC in tools/unify_pages.py)
    "50 Lightroom presets and 33 video LUTs built from the MWP edits of wildlife and landscapes. For Lightroom Classic, Lightroom, Lightroom Mobile and Camera Raw.":
        "50 פריסטים ללייטרום ו־33 קובצי LUT לווידאו, שנבנו מתוך העריכות של MWP לצילומי חיות בר ונופים. ללייטרום קלאסיק, ללייטרום, ללייטרום מובייל ולקאמרה ראו.",
    "MWP Photoshop Plugin Panel, a Photoshop plugin: the way we edit on our expeditions, built in as simple buttons. Pick the animal or the sky, pick an effect, set how strong.":
        "התוסף לפוטושופ של MWP, פלאגין לפוטושופ: הדרך שבה אנחנו עורכים במסעות שלנו, בכפתורים פשוטים. בוחרים את החיה או את השמיים, בוחרים אפקט וקובעים עוצמה.",
    "MWP Field Guides: four visual guides with 137 short lessons on composition, colour, light and planning, each one a real photo from the field.":
        "מדריכי השטח של MWP: ארבעה מדריכים חזותיים עם 137 שיעורים קצרים על קומפוזיציה, צבע, אור ותכנון. כל שיעור הוא צילום אמיתי מהשטח.",
    # product labels and mockups
    "PRESETS": "פריסטים", "לייטרום PRESETS": "פריסטים ללייטרום", "FIELD GUIDES": "מדריכי שטח", "פוטושופ PLUGIN": "פלאגין לפוטושופ",
    "Presets": "פריסטים", "Panel": "פאנל", "Field Guides": "מדריכי שטח",
    "50 presets · 12 adaptive · 33 LUTs": "50 פריסטים · 12 אדפטיביים · 33 קובצי LUT",
    "8 effects · 11 looks · 4 lights": "8 אפקטים · 11 לוקים · 4 תאורות",
    "Light and Scene · Blue Hour": "אור וסצנה · שעה כחולה", "Light and Scene · Macro Ground": "אור וסצנה · קרקע במאקרו",
    "Light and Scene": "אור וסצנה", "Blue Hour": "שעה כחולה", "Macro Ground": "קרקע במאקרו",
    "Signature": "חתימה", "Light & Scene": "אור וסצנה", "Mono": "מונו", "Adaptive": "אדפטיבי", "Tools": "כלים",
    "BASIC": "בסיסי", "LAYERS": "שכבות", "Original · locked": "מקור · נעול",
    "MWP PRESET": "פריסט MWP", "MWP · PANEL": "MWP · פאנל",
    "Subject · Pop": "נושא · הבלטה", "Background · Darken": "רקע · הכהיה", "Pop": "הבלטה", "Darken": "הכהיה",
    "01 · PREPARE": "01 · הכנה", "02 · EDIT": "02 · עריכה", "03 · STYLE": "03 · סגנון", "03 · EXPORT": "03 · ייצוא", "04 · EXPORT": "04 · ייצוא",
    "SUBJECT": "נושא", "Before / After": "לפני / אחרי",
    "Pop, Brighten, Darken, Warm, Cool, Glow, Blur": "הבלטה, הבהרה, הכהיה, חימום, קירור, זוהר, טשטוש", "Sharpen": "חידוד",
    "לחבילת Presets + Panel": "לחבילת הפריסטים והתוסף",
    # the panel demo: tabs, buttons and notes
    "Prepare": "הכנה", "Edit": "עריכה", "Style": "סגנון", "Export": "ייצוא",
    "Crop": "חיתוך", "Straighten": "יישור", "Find dust": "איתור אבק", "Erase": "מחיקה", "Denoise": "הפחתת רעש", "White balance": "איזון לבן",
    "Subject": "נושא", "Eye": "עין", "Sky": "שמיים", "Background": "רקע", "Lights": "אורות", "Darks": "כהים",
    "Dodge & Burn": "הבהרה והכהיה", "Vignette": "וינייטה",
    "11 looks": "11 לוקים", "My looks": "הלוקים שלי", "Painted light": "אור מצויר", "Colors": "צבעים",
    "Instagram": "אינסטגרם", "Web": "רשת", "Print": "הדפסה", "Watermark": "סימן מים", "Apply to others": "החלה על תמונות נוספות",
    "Clean the frame first: crop, straighten, find and erase dust, denoise.": "קודם מנקים את הפריים: חיתוך, יישור, איתור ומחיקה של אבק, הפחתת רעש.",
    "The animal, its eyes, the sky and the background, each in one click.": "החיה, העיניים שלה, השמיים והרקע, כל אחד בקליק אחד.",
    "Add a finishing look on top of the preset, or save your own.": "מוסיפים לוק מסיים מעל הפריסט, או שומרים לוק משלכם.",
    "Your own watermark, sized for where the photo is going.": "סימן מים משלכם, בגודל שמתאים למקום שאליו התמונה הולכת.",
    "PLACEHOLDER: ה\"אחרי\" כאן הוא העריכה הסופית של מתן. לפני ההשקה להחליף באותו RAW שנערך רק עם התוסף.": "ממלא מקום: ה\"אחרי\" כאן הוא העריכה הסופית של מתן. לפני ההשקה להחליף באותו RAW שנערך רק עם התוסף.",
    "מתחילים בלייטרום עם פריסט, ומסיימים בפוטושופ עם התוסף לפוטושופ של MWP. נסו כאן: לחצו על Subject, ‏Eye, ‏Background ו-Dodge & Burn.":
        "מתחילים בלייטרום עם פריסט, ומסיימים בפוטושופ עם התוסף לפוטושופ של MWP. נסו כאן: לחצו על נושא, עין, רקע והבהרה והכהיה.",
    "נושא, עין, שמיים, רקע, Dodge and Burn, כפתור אחד לכל אחד.": "נושא, עין, שמיים, רקע, הבהרה והכהיה, כפתור אחד לכל אחד.",
    "קובעים חשיפה לפריים, ובמחוון Amount מחזקים או מרככים את המראה.": "קובעים חשיפה לפריים, ובמחוון העוצמה מחזקים או מרככים את המראה.",
    # questions and answers
    "הם עובדים על קובצי RAW מכל מצלמה שלייטרום תומך בה. מכוונים חשיפה ומשתמשים במחוון Amount לפי כל סצנה.":
        "הם עובדים על קובצי RAW מכל מצלמה שלייטרום תומך בה. מכוונים חשיפה ומשתמשים במחוון העוצמה לפי כל סצנה.",
    "כן. בלייטרום ובקאמרה ראו, מחוון Amount שמתחת לפריסטים מחזק או מרכך כל פריסט.":
        "כן. בלייטרום ובקאמרה ראו, מחוון העוצמה שמתחת לפריסטים מחזק או מרכך כל פריסט.",
    "לייטרום קלאסיק 11 ומעלה, לייטרום 5 ומעלה או קאמרה ראו 14 ומעלה. אם לייטרום מבקש לעדכן את המסכות אחרי ההחלה, לוחצים Update.":
        "לייטרום קלאסיק 11 ומעלה, לייטרום 5 ומעלה או קאמרה ראו 14 ומעלה. אם לייטרום מבקש לעדכן את המסכות אחרי ההחלה, לוחצים על כפתור העדכון.",
    "כן. הם נושאים את הצבע והטון של פריסטים 01 עד 33 ובנויים לצילום Rec.709 רגיל. בצילום LOG ממירים קודם ל-Rec.709, ואז מחילים את ה-LUT.":
        "כן. הם נושאים את הצבע והטון של פריסטים 01 עד 33 ובנויים לצילום וידאו רגיל. בצילום לוג (שטוח) ממירים קודם לצבע רגיל, ואז מחילים את ה-LUT.",
    "פוטושופ 2023 (גרסה 24.2) ומעלה, על מק או ווינדוס, במנוי Creative Cloud. התוסף לא עובד בלייטרום, באייפד או בטלפון.":
        "פוטושופ 2023 (גרסה 24.2) ומעלה, על מק או ווינדוס, במנוי קריאייטיב קלאוד. התוסף לא עובד בלייטרום, באייפד או בטלפון.",
    "הפלאגין, המדריך למשתמש (PDF, ‏21 עמודים) ומדריך ההתקנה (PDF). להתקנה לוחצים פעמיים על קובץ הפלאגין, ו-Creative Cloud עושה את השאר. אחר כך פותחים אותו בפוטושופ, בתפריט Plugins.":
        "הפלאגין, המדריך למשתמש (PDF, ‏21 עמודים) ומדריך ההתקנה (PDF). להתקנה לוחצים פעמיים על קובץ הפלאגין, וקריאייטיב קלאוד עושה את השאר. אחר כך פותחים אותו בפוטושופ, בתפריט התוספים.",
    "לא. כל כפתור מוסיף שכבה משלו ושכבת המקור נעולה. ‏Ctrl+Z אחד (במק Cmd+Z) מבטל כפתור שלם, Reset MWP מסיר את כל מה שהתוסף הוסיף, והייצוא תמיד נשמר כקובץ חדש.":
        "לא. כל כפתור מוסיף שכבה משלו ושכבת המקור נעולה. ביטול אחד (‏Ctrl+Z, ובמק Cmd+Z) מבטל כפתור שלם, כפתור האיפוס מסיר את כל מה שהתוסף הוסיף, והייצוא תמיד נשמר כקובץ חדש.",
    "כן. שומרים את התמונה כ-PSD וכל השכבות נשארות. כל אפקט שומר את העוצמה שלו, ושכבות קאמרה ראו ו-Denoise נפתחות שוב בלחיצה כפולה.":
        "כן. שומרים את התמונה כקובץ PSD וכל השכבות נשארות. כל אפקט שומר את העוצמה שלו, ושכבות קאמרה ראו והפחתת הרעש נפתחות שוב בלחיצה כפולה.",
    "קובצי RAW (נפתחים קודם בקאמרה ראו, ואז לוחצים Open) וקובצי JPEG, ב-RGB של 8 או 16 ביט. אם תמונה היא CMYK או 32 ביט, התוסף יגיד באיזה תפריט להמיר אותה.":
        "קובצי RAW (נפתחים קודם בקאמרה ראו, ואז לוחצים על פתיחה) וקובצי JPEG, בצבעי RGB של 8 או 16 ביט. אם תמונה היא בצבעי CMYK או 32 ביט, התוסף יגיד באיזה תפריט להמיר אותה.",
    "מוסיפים או מוחקים את האפקט במכחול עם Paint in ו-Paint out, או בוחרים צבע עם Pick ועורכים רק אותו. אם Select Subject או Select Sky מפסיקים לעבוד, הגדרה אחת בפוטושופ מתקנת את זה, ועמוד העזרה של התוסף מראה איפה.":
        "מוסיפים או מוחקים את האפקט במכחול, או בוחרים צבע בטפטפת ועורכים רק אותו. אם בחירת הנושא או בחירת השמיים של פוטושופ מפסיקות לעבוד, הגדרה אחת בפוטושופ מתקנת את זה, ועמוד העזרה של התוסף מראה איפה.",
    "כן. פותחים את שאר התמונות, חוזרים לתמונה הערוכה ולוחצים Apply תחת More photos. הנושא, השמיים והרקע מזוהים מחדש בכל תמונה. אפשר גם לשמור את העריכה כלוק תחת Save my look.":
        "כן. פותחים את שאר התמונות, חוזרים לתמונה הערוכה ולוחצים על החלה על תמונות נוספות. הנושא, השמיים והרקע מזוהים מחדש בכל תמונה. אפשר גם לשמור את העריכה כלוק משלכם.",
    "אינסטגרם (עד 1080 × 1350 פיקסלים), Web (צלע ארוכה 2048 פיקסלים) ו-Print (גודל מלא, פרופיל הצבע נשמר), כל אחד מחודד ליעד ונשמר כקובץ JPEG חדש. לפני הייצוא מוסיפים סימן מים משלכם, לוגו או טקסט. לסטוריז ולרילס חותכים ל-9:16 ומייצאים ב-Web.":
        "אינסטגרם (עד 1080 × 1350 פיקסלים), רשת (צלע ארוכה 2048 פיקסלים) והדפסה (גודל מלא, פרופיל הצבע נשמר), כל אחד מחודד ליעד ונשמר כקובץ JPEG חדש. לפני הייצוא מוסיפים סימן מים משלכם, לוגו או טקסט. לסטוריז ולרילס חותכים ל-9:16 ומייצאים לרשת.",
    "רק Expand ו-Generative Fill, ורק כשלוחצים Generate בפוטושופ. השניים האלה מוסיפים פיקסלים, אז כדאי לבדוק את התקנון לפני שמשתמשים בהם בתחרות צילום. כל השאר לא משתמש בקרדיטים.":
        "רק הרחבת הפריים והמילוי הגנרטיבי, ורק כשלוחצים על יצירה בפוטושופ. השניים האלה מוסיפים פיקסלים, אז כדאי לבדוק את התקנון לפני שמשתמשים בהם בתחרות צילום. כל השאר לא משתמש בקרדיטים.",
    # the Lightroom and Photoshop screens
    "MWP 1 Signature": "MWP 1 חתימה", "MWP 2 Light & Scene": "MWP 2 אור וסצנה", "MWP 3 Mono": "MWP 3 מונו",
    "MWP 4 Adaptive": "MWP 4 אדפטיבי", "MWP 5 Tools": "MWP 5 כלים",
    "Library": "ספרייה", "Develop": "פיתוח", "Map": "מפה", "Book": "ספר", "Slideshow": "מצגת", "Navigator": "ניווט",
    "After": "אחרי", "Before": "לפני", "Basic": "בסיסי", "Treatment": "טיפול", "Color": "צבע", "Black & White": "שחור-לבן",
    "Temp": "טמפרטורה", "Tint": "גוון", "Tone": "טון", "Exposure": "חשיפה", "Contrast": "ניגודיות", "Highlights": "הבהרות",
    "Shadows": "צללים", "Whites": "לבנים", "Blacks": "שחורים", "Presence": "נוכחות", "Texture": "מרקם", "Clarity": "חדות",
    "Dehaze": "הסרת אובך", "Vibrance": "חיוניות", "Saturation": "רוויה",
    "File": "קובץ", "Image": "תמונה", "Layer": "שכבה", "Select": "בחירה", "Filter": "מסנן", "View": "תצוגה",
    "Plugins": "תוספים", "Window": "חלון", "Layers": "שכבות", "Channels": "ערוצים", "Paths": "נתיבים",
    "Composition": "קומפוזיציה", "Colour": "צבע", "Light": "אור", "Planning": "תכנון",
    # accessibility labels
    "Main": "ראשי", "Cart": "עגלה", "Account": "חשבון",
}


def _tr(t):
    core = t.strip()
    if not core:
        return t
    plain = html_lib.unescape(core)
    he = EXACT.get(plain)
    if he is None:
        he = EXACT.get(names(plain)) or _EXACT_NAMED.get(names(plain))
    if he is None:
        he = names(plain)
    if he == plain:
        return t
    he = he.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    lead = t[:len(t) - len(t.lstrip())]
    trail = t[len(t.rstrip()):]
    return lead + he + trail


_EXACT_NAMED = {names(k): v for k, v in EXACT.items()}   # keys as they read once the names are in Hebrew
_STR = re.compile(r"""('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)""")
_ATTR = re.compile(r'(\s(?:alt|title|aria-label|placeholder|data-tip)=")([^"]*)(")')
LOGO = re.compile(r'<a class="brand"[^>]*>.*?</a>', re.S)


def hebrew(html):
    """Every visible English word on a Hebrew page, in Hebrew (MWP always stays in Latin letters)."""
    keep = []
    def hold(m):
        keep.append(m.group(0)); return f"\0{len(keep) - 1}\0"
    html = LOGO.sub(hold, html, count=1)
    parts = re.split(r"(<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>)", html, flags=re.S)
    out = []
    for i, part in enumerate(parts):
        if i % 2:   # script or style
            if part.startswith("<script") and " src=" not in part.split(">", 1)[0] and "importmap" not in part.split(">", 1)[0]:
                head, body = part.split(">", 1)
                body = _STR.sub(lambda m: m.group(0)[0] + _tr(m.group(0)[1:-1]) + m.group(0)[-1]
                                if m.group(0)[1:-1].strip() in EXACT or (re.search(r"[A-Za-z]", m.group(0))
                                    and not re.fullmatch(r"[\"'`][\w./#:-]*[\"'`]", m.group(0))) else m.group(0), body)
                part = head + ">" + body
            out.append(part)
            continue
        part = re.sub(r">([^<>]+)<", lambda m: ">" + (_tr(m.group(1)) if re.search(r"[A-Za-z]", m.group(1)) else m.group(1)) + "<", part)
        part = _ATTR.sub(lambda m: m.group(1) + _tr(m.group(2)) + m.group(3), part)
        out.append(part)
    html = "".join(out)
    html = re.sub(r"<title>([^<]*)</title>", lambda m: "<title>" + _tr(m.group(1)) + "</title>", html)
    html = re.sub(r'(<meta name="description" content=")([^"]*)(")', lambda m: m.group(1) + _tr(m.group(2)) + m.group(3), html)
    html = re.sub(r"\0(\d+)\0", lambda m: keep[int(m.group(1))], html)
    return html.replace('aria-label="MWP, home"', 'aria-label="MWP, דף הבית"')
