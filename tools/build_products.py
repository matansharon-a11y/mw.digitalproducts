"""The three product pages (MWP Presets, MWP Panel, MWP Field Guides), English and Hebrew, from one template.

Writes <folder>/index.html (English), <folder>/he/index.html and <folder>/he.html (Hebrew) for each product.
Every page follows the same story, in the home page's look:
  hero → product bar (appears once the hero has scrolled away) → the proof (RAW / final slider, or real guide
  pages) → what's inside (photo cards) → one signature feature → what's in the download → FAQs → closing call
  with the price cards.
The wording comes from Matan's sales-page designs (EN and HE); the FAQs live in tools/pages/faqs.json.
Run: python3 tools/build_products.py
"""
import glob, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lrc_preview import window as lrc_window
from ps_preview import window as ps_window
import presets_layout
from reviews_section import section as reviews_section
from brand import CART, USER, FONTS, NAV_CSS, SITE_CSS, site_links, menu_button, site_footer, BRAND, ICONS, launch_block, SINGLE_GUIDES_LIVE

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://shop.mw.photography"
import hashlib
CSS_V = hashlib.sha1(open(os.path.join(ROOT, "assets/css/product.css"), "rb").read()).hexdigest()[:8]   # fresh CSS after every change
RV_V = hashlib.sha1(open(os.path.join(ROOT, "assets/css/reviews.css"), "rb").read()).hexdigest()[:8]
FAQS = json.load(open(os.path.join(ROOT, "tools/pages/faqs.json"), encoding="utf-8"))
if not SINGLE_GUIDES_LIVE:   # until the single guides go on sale, "Can I buy just one guide?" keeps its earlier answer
    for _lang, _a in (("en", "Not at the moment. The four guides come as one set, in the language you choose, and together they cost less than four separate guides would."),
                      ("he", "כרגע לא. ארבעת המדריכים מגיעים כסט אחד, בשפה שבוחרים, ויחד הם עולים פחות מארבעה מדריכים נפרדים.")):
        for _f in FAQS["field-guides"][_lang]:
            if _f["q"] in ("Can I buy just one guide?", "אפשר לקנות מדריך אחד?"):
                _f["a"] = _a


def img(prefix, webp=True):
    """/assets/pages/img/<file> from the first characters of its name (the files are named by their hash).
    webp=False: the JPEG/PNG copy, for link previews (some apps don't show WebP)."""
    found = sorted(glob.glob(os.path.join(ROOT, "assets/pages/img", prefix + "*")), key=lambda f: not f.endswith(".webp"))   # the smaller WebP copy first
    if not webp:
        found = [f for f in found if not f.endswith(".webp")] or found
    if not found:
        raise SystemExit(f"no image starting with {prefix}")
    return "/assets/pages/img/" + os.path.basename(found[0])


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


CHECK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F4AF56" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
ARROW = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>'
BACK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>'
GRIP = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FEFBF1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/></svg>'
ZERO = {"en": "$0.00", "he": "₪0.00"}

# Words the template uses on every page
UI = {
    "en": {"buy": "Buy", "for": "MWP Photoshop Plugin Panel for", "prev": "Previous", "next": "Next", "page": "Page", "raw": "RAW", "final": "FINAL",
           "hint": "Drag the handle to compare.", "faq_kick": "Before you buy", "faq": "FAQs",
           "spec_kick": "What you get", "spec_h": "What's in the download.", "price_kick": "Get it",
           "trust": "Instant download · Secure checkout · Free updates · Help or a refund within 14 days", "terms": "Full terms",
           "more": "Questions about your setup?", "examples": "Choose an example", "examples_n": "examples", "next_ex": "Next example", "next_page": "Next page", "write": "Write to us", "bundle": "Bundle", "lang": "Language", "inside": "What's inside",
           "raw_alt": "the RAW file before editing", "final_alt": "the finished edit", "home": "Home"},
    "he": {"buy": "לרכישה", "for": "התוסף לפוטושופ של MWP עבור", "prev": "הקודם", "next": "הבא", "page": "עמוד", "raw": "RAW", "final": "סופי",
           "hint": "גררו את הידית כדי להשוות.", "faq_kick": "לפני שקונים", "faq": "שאלות נפוצות",
           "spec_kick": "בהורדה", "spec_h": "מה מקבלים", "price_kick": "לרכישה",
           "trust": "הורדה מיידית · תשלום מאובטח · עדכונים חינם · לא עובד לכם? 14 יום להחזר כספי", "terms": "התנאים המלאים",
           "more": "שאלות על ההתקנה?", "examples": "בחרו דוגמה", "examples_n": "דוגמאות", "next_ex": "לדוגמה הבאה", "next_page": "לעמוד הבא", "write": "כתבו לנו", "bundle": "חבילה", "lang": "שפה", "inside": "מה בפנים",
           "raw_alt": "קובץ ה-RAW לפני העריכה", "final_alt": "העריכה הסופית", "home": "דף הבית"},
}

# ---------------------------------------------------------------- the products
# The four Field Guides on their own (Matan, 25 Oct 2026), in the reader's order: Planning, Composition, Light, Colour
SINGLE_GUIDES = {
    "en": [("field-guide-planning", "Planning"), ("field-guide-composition", "Composition"), ("field-guide-light", "Light"), ("field-guide-colour", "Colour")],
    "he": [("field-guide-planning", "תכנון"), ("field-guide-composition", "קומפוזיציה"), ("field-guide-light", "אור"), ("field-guide-colour", "צבע")],
}

P = {}

P["presets"] = dict(
    slug="mwp-presets", hero_img="6fbe4f2a", hero_pos="62% 40%", final_img="fbaf19ae",
    proof_type="ba", pairs_from=[("3c14b23d", "fbaf19ae"), ("7c359a77", "84c2340d")],
    cards=["6fbe4f2a", "e83b1947", "f424f86b", "8cb56471", "ff95ea5c"], feat_img="e55ba138", feat_flip=False, feat_first=True,
    # where each photo's subject sits, so a 4:5 crop keeps it: the lioness's face, the lava, the lion, the eagle, the tiger
    card_focus=["38% 50%", "66% 50%", "50% 22%", "50% 30%", "38% 45%"], feat_focus="50% 18%",
    layout="collections", adobe_img="0015a37d",   # its own layout: tools/presets_layout.py
    # the Lightroom page: the Lightroom Classic plugin (presets included) or MWP Presets alone (Jeinna, 25 Oct 2026)
    # (Jeinna, 23 Oct 2026): one price and one Add to cart (mwp-presets; buying it unlocks the plugin)
    bundle="full-set", own_page=True,
    pre_img="649e2d2b", plug_img="86b95f19",   # the two mockups' photos (the dune, the photographer): each picture once on the page
    en=dict(
        name="MWP for Lightroom", name_html='MWP <span class="grad">for Lightroom</span>',
        title="Lightroom Classic Plugin + Presets · MWP",
        desc="Lightroom tools by photographer Matan Wild: a Lightroom Classic plugin to sort, keyword, edit and export, with 50 presets and 33 LUTs included. Or the presets alone.",
        hero_alt="Lioness in golden grass, photographed by Matan Wild",
        kick="MWP · for Lightroom", h1=["Pro editing", "in Lightroom."],
        lead="Presets for the look. A plugin for the workflow. The plugin comes with the presets.",
        cta="Presets", cta_b="Plugin", cta2="Compare RAW and final",
        facts=["Lightroom Classic plugin", "50 presets and 33 LUTs", "Presets included with the plugin"],
        proof_label="From RAW to final", proof_kick="From RAW to final", proof_h=["The same photo,", "before and after."],
        proof_lead="Each example shows the RAW file beside the same file with one preset, plus white balance and exposure.",
        pairs=["Light and Scene · Blue Hour", "Light and Scene · Macro Ground"],
        m=dict(choose=[dict(type="Preset pack", name="Lightroom Presets", line="50 presets built from my own edits, 12 that adapt to every photo. With 33 LUTs.",
                            meta="Lightroom · Lightroom Classic · Mobile · Camera Raw", cta="Add to cart", more="Learn more",
                            alt="A sand dune in golden light, in a Lightroom-like window"),
                       dict(type="Plugin", name="Lightroom Classic Plugin", line="Sort, keyword, edit and export a whole shoot, in one window inside Lightroom Classic.",
                            meta="Lightroom Classic 13+ · Mac and Windows", cta="Add to cart", more="Learn more",
                            alt="The Lightroom Classic plugin's window over a photo of a photographer in the field")],
               top=dict(kick="Lightroom Classic plugin + presets", h1=["Pro editing", "in Lightroom."]),
               # the two ways to buy (Jeinna, 25 Oct 2026): the plugin with the presets included, or the presets alone
               offers=dict(plugin=dict(badge="Presets included", type="Plugin + presets", name="Lightroom Classic Plugin",
                                       has=["The Lightroom Classic plugin: sort, keyword, edit and export", "MWP Presets included: 50 presets and 33 LUTs", "Free updates for both"],
                                       meta="Plugin: Lightroom Classic 13+ · Mac and Windows", cta="Add to cart"),
                           presets=dict(type="Presets only", name="Lightroom Presets",
                                        has=["50 presets, 12 that adapt to each photo", "50 mobile files and 33 LUTs", "Free updates"],
                                        meta="Lightroom · Lightroom Classic · Mobile · Camera Raw", cta="Add to cart")),
               pre=dict(line="A finished look on every photo, in one click.",
                        three=[("50", "presets in five collections"), ("12", "adapt to each photo"), ("33", "LUTs for Photoshop and video")],
                        sets_cap="Five collections"),
               plug=dict(line="Your whole shoot, from sorting to sharing.", cap="The plugin's real window. Click a tab."),
               look_kick="From RAW to final", look_h=["One click.", "A finished look."],
               sets_kick="50 presets", sets_h=["Five collections,", "every kind of light."],
               feat_line="They find the subject, the sky and the background, and adjust each one on its own.",
               luts_kick="Also in the pack", luts_h=["33 LUTs,", "for video too."],
               luts_line="Photoshop, Premiere Pro, DaVinci Resolve and Final Cut Pro.", luts_alt="Two elephants at sunset in a video editor",
               plug_kick="Included", plug_h=["Working in", "Lightroom Classic?"],
               plug_line="My plugin sorts, keywords, edits and exports a whole shoot in one window.",
               plug_cta="Meet the plugin", plug_alt="The Lightroom Classic plugin's window over a photo"),
        bar=[("plugin", "Plugin"), ("presets", "Presets"), ("faq", "FAQs")],
        inside_kick="Five collections", inside_h=["Five collections,", "for every kind of light."],
        inside_lead="Golden backlight, blue hour, desert sun, soft shade and black and white. Every preset starts from the settings in Matan's own edits.",
        cards=[("Signature", "The MWP look and its variations, from soft to deep.", "Lioness in golden grass"),
               ("Light & Scene", "Golden light, blue hour, desert, water and night.", "Volcano erupting at night"),
               ("Mono", "Black and white in MWP tones.", "Lion walking, black and white"),
               ("Adaptive", "AI masks for the subject, sky and background.", "Golden eagle on a rock"),
               ("Tools", "Exposure, fur detail, vignette and grain.", "Tiger walking out of the forest")],
        lrc=[("Cull", "Turn a day of bursts into a short list. Nothing is ever deleted."),
             ("Organize", "Trips, a collection per day, and 51,471 species for your keywords."),
             ("Expedition", "The edit I teach on my expeditions, one step at a time."),
             ("Looks", "A finished mood with a strength slider, and looks of your own."),
             ("Edit", "Subject, sky, background or people: pick an effect, set the strength."),
             ("Color", "Hue, saturation and luminance per colour, and ready fixes like Warm fur."),
             ("Export", "Instagram, web and print sizes, your watermark, and a competition check.")],
        lrc_note="Interactive preview of the real tabs and buttons · Lightroom Classic 13 or newer, Mac and Windows",
        feat_kick="12 adaptive presets", feat_h=["Every photo differs.", "So do they."],
        feat_lead="The 12 adaptive presets use Lightroom's AI masks. They find the subject, the sky and the background in each photo, and adjust each one on its own.",
        feat_points=["Subject: shadows and whites lifted on the subject", "Sky: highlights held, deeper and calmer",
                     "Background: gently darker, so the subject stands out"], feat_alt="Red fox looking at the camera",
        specs=[],
        spec_groups=[("Lightroom presets", [("50", "Desktop presets", "XMP for Lightroom Classic, Lightroom and Camera Raw"),
               ("50", "Mobile files", "DNG for Lightroom Mobile on iPhone, iPad and Android"),
               ]),
                     ("LUTs", [("33", "LUTs", ".cube for Photoshop, Premiere Pro, DaVinci Resolve and Final Cut Pro")]),
                      ("Presets: also included", [("", "Video tutorials", "Installing and using the presets, in My downloads"),
                                        ("1", "Install guide", "A page for each program, step by step")]),
                     ("Lightroom Classic Plugin", [("", "The plugin", "Lightroom Classic 13 or newer, Mac and Windows. Add it once in File › Plug-in Manager"),
                                                                     ("", "Built-in help", "A Help button in the window and a tip on every step")])],
        spec_note="Adaptive presets need Lightroom Classic 11+, Lightroom 5+ or Camera Raw 14+.",
        final_kick="MWP for Lightroom", final_h=["The plugin,", "presets included."],
        final_lead="The presets and the plugin together, one price. Free updates, kept in your account.",
        plan=("Lightroom Presets", "50 presets and 33 LUTs", ["50 Lightroom presets, desktop and mobile", "33 LUTs for photo and video", "Video tutorials and an install guide"], "Get the presets"),
        plan2=("Lightroom Classic Plugin", "A plugin for Lightroom Classic", ["Seven tabs, from sorting to sharing", "Lightroom Classic 13 or newer, Mac and Windows", "Built-in help and video tutorials"], "Get the plugin"),
    ),
    he=dict(
        name="MWP ללייטרום", name_html='MWP <span class="grad">ללייטרום</span>',
        title="תוסף ללייטרום קלאסיק + פריסטים · MWP",
        desc="כלים ללייטרום מאת הצלם מתן שרון: תוסף ללייטרום קלאסיק למיון, תיוג, עריכה וייצוא, עם 50 פריסטים ו־33 קובצי LUT כלולים. או הפריסטים לבד.",
        hero_alt="לביאה בעשב זהוב, צילום: מתן שרון",
        kick="MWP · ללייטרום", h1=["עריכה מקצועית", "בלייטרום."],
        lead="פריסטים למראה. תוסף לתהליך העבודה. התוסף מגיע עם הפריסטים.",
        cta="פריסטים", cta_b="תוסף", cta2="מ-RAW לתמונה הסופית",
        facts=["תוסף ללייטרום קלאסיק", "50 פריסטים ו־33 קובצי LUT", "הפריסטים כלולים בתוסף"],
        proof_label="מ-RAW לתמונה הסופית", proof_kick="מ-RAW לתמונה הסופית", proof_h=["אותה תמונה,", "לפני ואחרי."],
        proof_lead="בכל דוגמה רואים את קובץ ה-RAW לצד אותו קובץ עם פריסט אחד, איזון לבן וחשיפה.",
        pairs=["אור וסצנה · שעה כחולה", "אור וסצנה · קרקע במאקרו"],
        m=dict(choose=[dict(type="חבילת פריסטים", name="פריסטים ללייטרום", line="50 פריסטים שבניתי מהעריכות שלי, ו־12 מהם מתאימים את עצמם לכל תמונה. כולל 33 קובצי LUT.",
                            meta="לייטרום · לייטרום קלאסיק · מובייל · קאמרה ראו", cta="הוספה לעגלה", more="לפרטים",
                            alt="דיונת חול באור זהוב, בחלון שנראה כמו לייטרום"),
                       dict(type="תוסף", name="התוסף ללייטרום קלאסיק", line="ממיינים, מתייגים, עורכים ומייצאים צילום שלם, בלי לצאת מלייטרום קלאסיק.",
                            meta="לייטרום קלאסיק 13 ומעלה · Mac / Windows", cta="הוספה לעגלה", more="לפרטים",
                            alt="החלון של התוסף ללייטרום קלאסיק מעל צילום של צלם בשטח")],
               top=dict(kick="תוסף ללייטרום קלאסיק + פריסטים", h1=["עריכה מקצועית", "בלייטרום."]),
               offers=dict(plugin=dict(badge="הפריסטים כלולים", type="תוסף + פריסטים", name="התוסף ללייטרום קלאסיק",
                                       has=["התוסף ללייטרום קלאסיק: מיון, תיוג, עריכה וייצוא", "הפריסטים של MWP כלולים: 50 פריסטים ו־33 קובצי LUT", "עדכונים חינם לשניהם"],
                                       meta="התוסף: לייטרום קלאסיק 13 ומעלה · Mac / Windows", cta="הוספה לעגלה"),
                           presets=dict(type="פריסטים בלבד", name="פריסטים ללייטרום",
                                        has=["50 פריסטים, 12 מהם מתאימים את עצמם לכל תמונה", "50 קבצים לנייד ו־33 קובצי LUT", "עדכונים חינם"],
                                        meta="לייטרום · לייטרום קלאסיק · מובייל · קאמרה ראו", cta="הוספה לעגלה")),
               pre=dict(line="מראה מוגמר לכל תמונה, בלחיצה אחת.",
                        three=[("50", "פריסטים בחמישה אוספים"), ("12", "מתאימים את עצמם לכל תמונה"), ("33", "קובצי LUT לפוטושופ ולווידאו")],
                        sets_cap="חמישה אוספים"),
               plug=dict(line="מהמיון ועד הפרסום, בלי לצאת מלייטרום.", cap="זה החלון האמיתי של התוסף. לחצו על לשונית."),
               look_kick="מ-RAW לתמונה הסופית", look_h=["לחיצה אחת.", "מראה מוגמר."],
               sets_kick="50 פריסטים", sets_h=["חמישה אוספים,", "לכל סוג של אור."],
               feat_line="הם מוצאים את הנושא, את השמיים ואת הרקע, ומכוונים כל אחד בנפרד.",
               luts_kick="גם בחבילה", luts_h=["33 קובצי LUT,", "גם לווידאו."],
               luts_line="פוטושופ, פרמייר פרו, דה־וינצ׳י ריזולב ופיינל קאט פרו.", luts_alt="שני פילים בשקיעה בתוכנת עריכת וידאו",
               plug_kick="כלול", plug_h=["עובדים", "בלייטרום קלאסיק?"],
               plug_line="התוסף שלנו ממיין, מתייג, עורך ומייצא צילום שלם בחלון אחד.",
               plug_cta="להכיר את התוסף", plug_alt="החלון של התוסף ללייטרום קלאסיק מעל תמונה"),
        bar=[("plugin", "תוסף"), ("presets", "פריסטים"), ("faq", "שאלות נפוצות")],
        inside_kick="חמישה אוספים", inside_h=["חמישה אוספים,", "לכל סוג של אור."],
        inside_lead="אור זהוב מאחור, שעה כחולה, שמש מדברית, צל רך ושחור-לבן. כל פריסט מתחיל מההגדרות שבעריכות של מתן עצמו.",
        cards=[("חתימה", "המראה של MWP והגרסאות שלו, מרך ועד עמוק.", "לביאה בעשב זהוב"),
               ("אור וסצנה", "אור זהוב, שעה כחולה, מדבר, מים ולילה.", "הר געש מתפרץ בלילה"),
               ("מונו", "שחור-לבן בגוונים של MWP.", "אריה הולך, בשחור-לבן"),
               ("אדפטיבי", "מסכות AI לנושא, לשמיים ולרקע.", "עיט זהוב על סלע"),
               ("כלים", "חשיפה, פרטי פרווה, וינייט וגרעין.", "נמר יוצא מהיער")],
        lrc=[("מיון", "מסננים יום שלם של צילומים לרשימה קצרה. שום תמונה לא נמחקת."),
             ("ארגון", "אוסף לכל טיול ולכל יום, ומאגר של 51,471 מינים לתיוג."),
             ("משלחת", "תהליך העריכה שאני מלמד במסעות, צעד אחרי צעד."),
             ("לוקים", "לוקים מוכנים עם בקרת עוצמה, ואפשר לשמור לוקים משלכם."),
             ("עריכה", "נושא, שמיים, רקע או אנשים: בוחרים אפקט וקובעים עוצמה."),
             ("צבע", "גוון, רוויה ובהירות לכל צבע, ותיקונים מוכנים כמו פרווה חמה."),
             ("ייצוא", "ייצוא בגדלים לאינסטגרם, לאתר ולהדפסה, עם סימן המים שלכם ובדיקה לפני תחרות.")],
        lrc_note="תצוגה מקדימה של הלשוניות והכפתורים האמיתיים, באנגלית כמו בתוסף · לייטרום קלאסיק 13 ומעלה, Mac / Windows",
        feat_kick="12 פריסטים אדפטיביים", feat_h=["כל תמונה שונה.", "וכך גם הם."],
        feat_lead="12 הפריסטים האדפטיביים משתמשים במסכות ה-AI של לייטרום. הם מוצאים בכל תמונה את הנושא, את השמיים ואת הרקע, ומכוונים כל אחד בנפרד.",
        feat_points=["נושא: הצללים והלבנים עולים על הנושא", "שמיים: האור נשמר, עמוק ורגוע יותר", "רקע: כהה מעט, כך שהנושא בולט"],
        feat_alt="שועל אדום מביט במצלמה",
        specs=[],
        spec_groups=[("פריסטים ללייטרום", [("50", "פריסטים למחשב", "XMP ללייטרום קלאסיק, ללייטרום ולקאמרה ראו"),
               ("50", "קבצים לנייד", "DNG ללייטרום מובייל ב-iPhone, ב-iPad וב-Android"),
               ]),
                     ("קובצי LUT", [("33", "קובצי LUT", "בפורמט ‎.cube לפוטושופ ולתוכנות וידאו: פרמייר פרו, דה־וינצ׳י ריזולב ופיינל קאט פרו")]),
                      ("כלול עם הפריסטים", [("", "סרטוני הדרכה", "התקנה ושימוש בפריסטים, בעמוד ההורדות שלי"),
                                        ("1", "מדריך התקנה", "עמוד לכל תוכנה, צעד אחר צעד")]),
                     ("התוסף ללייטרום קלאסיק", [("", "התוסף", "לייטרום קלאסיק 13 ומעלה, Mac / Windows. מוסיפים אותו פעם אחת ב-File › Plug-in Manager"),
                                                           ("", "עזרה מובנית", "כפתור עזרה בחלון וטיפ לכל צעד")])],
        spec_note="הפריסטים האדפטיביים דורשים לייטרום קלאסיק 11 ומעלה, לייטרום 5 ומעלה או קאמרה ראו 14 ומעלה.",
        final_kick="MWP ללייטרום", final_h=["התוסף,", "עם הפריסטים."],
        final_lead="הפריסטים והתוסף יחד, במחיר אחד. עדכונים בחינם, והכול נשמר בחשבון שלכם.",
        plan=("פריסטים ללייטרום", "50 פריסטים ו־33 קובצי LUT", ["50 פריסטים ללייטרום, למחשב ולנייד", "33 קובצי LUT לתמונות ולווידאו", "סרטוני הדרכה ומדריך התקנה"], "לרכישת הפריסטים"),
        plan2=("התוסף ללייטרום קלאסיק", "תוסף ללייטרום קלאסיק", ["שבע לשוניות: ממיון ועד ייצוא", "לייטרום קלאסיק 13 ומעלה, Mac / Windows", "עזרה מובנית וסרטוני הדרכה"], "לרכישת התוסף"),
    ),
)

P["panel"] = dict(
    slug="mwp-panel", hero_img="866c1bdb", hero_pos="58% 40%", final_img="99ef2d40",
    proof_type="ba", pairs_from=[("c339384f", "52e0c3d2"), ("af0d1799", "95e05791")],
    cards=["4a2055a1", "8929f94d", "2cfa033c", "99ef2d40"], feat_img="2cfa033c", feat_flip=True, feat_first=True, ps_show=True,
    # the showcase photo, tested against the ibex, elephants, lion, lynx, eagle and donkeys: every edit reads clearly on it.
    # Its areas are real cut-outs (assets/pages/img/ps/, made with an AI subject mask); no RAW: Before hides the edits.
    ps_photo=(None, "8929f94d", {k: f"url(/assets/pages/img/ps/8929f94d-{k.lower()}.png)" for k in ("Subject", "Sky", "Background", "Lights", "Darks")}
              | {"Eye": "radial-gradient(ellipse 4% 3% at 46.3% 29.2%, #000 55%, transparent 100%), radial-gradient(ellipse 4% 3% at 59.6% 29.2%, #000 55%, transparent 100%)"}, True),
    bundle="full-set",
    en=dict(
        name="MWP Photoshop Plugin Panel", name_html='MWP <span class="grad">Photoshop Plugin Panel</span>',
        title="Photoshop Plugin for Easy Photo Editing · MWP",
        desc="A Photoshop plugin to edit and learn as you go, without risking your original. Pick the subject, sky or background, an effect and a strength. Mac and Windows.",
        hero_alt="A tiger, photographed by Matan Wild",
        kick="MWP Photoshop Plugin Panel", h1=["Photoshop,", "made easy."],
        lead="Pick what to edit: the subject, the sky or the background. Pick an effect, set the strength, and the plugin builds the masks and layers for you. Your original stays locked.",
        cta="Get the plugin", cta2="Compare RAW and final",
        facts=["Learn as you go, without risking your original", "Photoshop 2023 or newer · Mac and Windows"],
        proof_label="From RAW to final", proof_kick="From RAW to final", proof_h=["The subject brighter.", "The sky calmer."],
        proof_lead="Choose the subject or the sky, then an effect. The plugin builds the mask and puts each edit on its own layer.",
        pairs=["Subject · Pop", "Background · Darken"],
        inside_kick="What's inside", inside_h=["Four tabs,", "in the order you edit."],
        inside_lead="From the first crop to the Instagram copy, without leaving the plugin.",
        cards=[("Prepare", "Crop around the subject, straighten, find and erase dust, denoise. Neutral colour in one click.", "Iceberg under storm light"),
               ("Edit", "Subject, eye, sky, background, lights, darks or any color. 8 effects. Paint them in or out.", "Red fox looking at the camera"),
               ("Style", "11 looks from golden to blue hour to B&W. Sun glow, sunbeams, rim light, spotlight.", "Lion walking, black and white"),
               ("Export", "Your own watermark. Instagram, web and print copies in one step. Apply your edit to a whole series.", "Two elephants at sunset")],
        feat_kick="Built to be safe", feat_h=["No way", "to ruin it."],
        feat_lead="Subject, Sky and Background use Photoshop's own AI. Hold a button to see the area in red before you edit.",
        feat_points=["<strong>Every edit on its own layer.</strong> All edits sit in one MWP group. Your photo underneath stays locked.",
                     "<strong>One button, one undo.</strong> Ctrl+Z takes back a whole step. Before / After shows the original at any time.",
                     "<strong>Exports are new files.</strong> The plugin never saves over your original file."],
        feat_alt="Lion walking, black and white", ps_label="Interactive preview of the real plugin · the Edit tab, button for button", ps_alt="Young red fox looking at the camera",
        specs=[("", "Photoshop plugin", "Double-click to install. Mac and Windows."),
               ("21", "User Manual · PDF", "21 pages. Every button, step by step, for complete beginners."),
               ("", "Installation Guide · PDF", "Setup step by step, with fixes for common problems."),
               ("", "Built-in guide", "A tip on every button and a full help page inside the plugin."),
               ("", "Video tutorials", "Installing and using the plugin, in My downloads.")],
        spec_note="Works with Photoshop 2023 (24.2) or newer on Mac and Windows. Not for Lightroom, iPad or phones.",
        final_kick="MWP Photoshop Plugin Panel", final_h=["Edit with", "confidence."],
        final_lead="The plugin with a user manual, an install guide and free updates. Or get it in the full set, with every tool and guide.",
        plan=("MWP Photoshop Plugin Panel", "Photoshop plugin", ["Photoshop plugin, Mac and Windows", "User Manual · PDF, 21 pages", "Installation Guide · PDF"], "Get the plugin"),
        plan2=("The full set", "From the shot to the share", ["The Lightroom Classic plugin", "MWP Photoshop Plugin Panel", "MWP Presets: 50 presets and 33 LUTs", "MWP Field Guides: 4 PDF guides, 137 lessons"], "Get the full set"),
    ),
    he=dict(
        name="התוסף לפוטושופ של MWP", name_html='התוסף לפוטושופ של <span class="grad">MWP</span>',
        title="תוסף לפוטושופ לעריכה בלי להסתבך · MWP",
        desc="עורכים תמונות בפוטושופ ולומדים תוך כדי עבודה, בלי לסכן את הקובץ המקורי. בוחרים את הנושא, השמיים או הרקע, בוחרים אפקט וקובעים עוצמה.",
        hero_alt="טיגריס, צילום: מתן שרון",
        kick="התוסף לפוטושופ של MWP", h1=["פוטושופ,", "בלי להסתבך."],
        lead="בוחרים מה לערוך: הנושא, השמיים או הרקע. בוחרים אפקט וקובעים עוצמה, והתוסף בונה את המסכות והשכבות לבד. התמונה המקורית לא נפגעת.",
        cta="לרכישת התוסף", cta2="מ-RAW לתמונה הסופית",
        facts=["לומדים תוך כדי עבודה, בלי לסכן את הקובץ המקורי", "פוטושופ 2023 ומעלה · Mac / Windows"],
        proof_label="מ-RAW לתמונה הסופית", proof_kick="מ-RAW לתמונה הסופית", proof_h=["מבליטים את הנושא,", "מרגיעים את השמיים."],
        proof_lead="בוחרים נושא או שמיים, ואז אפקט. התוסף בונה את המסכה ושם כל עריכה בשכבה נפרדת.",
        pairs=["נושא · הבלטה", "רקע · הכהיה"],
        inside_kick="מה יש בפנים", inside_h=["ארבע לשוניות,", "לפי סדר העריכה."],
        inside_lead="מהחיתוך הראשון ועד הקובץ לאינסטגרם, בלי לצאת מהתוסף.",
        cards=[("הכנה", "חיתוך סביב הנושא, יישור, ניקוי כתמי אבק והפחתת רעש. איזון צבע בלחיצה אחת.", "קרחון באור סערה"),
               ("עריכה", "נושא, עין, שמיים, רקע, אזורים בהירים או כהים, או צבע מסוים. 8 אפקטים, ומכחול להוסיף או להוריד אותם.", "שועל אדום מביט במצלמה"),
               ("סגנון", "11 לוקים, מזהוב ועד שעה כחולה ושחור-לבן. זוהר שמש, קרני אור, תאורת קצה וזרקור.", "אריה הולך, בשחור-לבן"),
               ("ייצוא", "סימן מים משלכם, קבצים לאינסטגרם, לאתר ולהדפסה בבת אחת, והעתקת העריכה לסדרה שלמה.", "שני פילים בשקיעה")],
        feat_kick="בלי סיכון", feat_h=["אי אפשר", "להרוס את התמונה."],
        feat_lead="הבחירה של הנושא, השמיים והרקע נעשית עם ה-AI של פוטושופ. לחיצה ארוכה על כפתור צובעת את האזור באדום, כדי שתראו מה ייערך.",
        feat_points=["<strong>כל עריכה בשכבה משלה.</strong> כל העריכות מרוכזות בקבוצה אחת של MWP, והתמונה שמתחת נשארת נעולה.",
                     "<strong>כפתור אחד, ביטול אחד.</strong> Ctrl+Z מבטל פעולה שלמה, ו״לפני / אחרי״ מראה את המקור בכל רגע.",
                     "<strong>הייצוא תמיד לקובץ חדש.</strong> התוסף אף פעם לא דורס את הקובץ המקורי."],
        feat_alt="אריה הולך, בשחור-לבן", ps_label="התוסף האמיתי, באנגלית כמו שהוא · לשונית העריכה, כפתור אחר כפתור", ps_alt="שועל אדום צעיר מביט במצלמה",
        specs=[("", "התוסף לפוטושופ", "לחיצה כפולה להתקנה. Mac / Windows."),
               ("21", "מדריך למשתמש", "21 עמודים שמסבירים כל כפתור, צעד אחרי צעד, גם למי שמעולם לא פתח פוטושופ."),
               ("", "מדריך התקנה", "התקנה צעד אחרי צעד, עם פתרונות לבעיות נפוצות."),
               ("", "מדריך מובנה", "טיפ לכל כפתור ועמוד עזרה מלא בתוך התוסף."),
               ("", "סרטוני הדרכה", "התקנה ושימוש בתוסף, בעמוד ההורדות שלי.")],
        spec_note="עובד עם פוטושופ 2023 (‏24.2) ומעלה, ב-Mac וב-Windows. לא ללייטרום, ל-iPad או לטלפון.",
        final_kick="התוסף לפוטושופ של MWP", final_h=["עורכים", "בלי לפחד לטעות."],
        final_lead="התוסף עם מדריך למשתמש, מדריך התקנה ועדכונים בחינם. או בסט המלא, יחד עם כל הכלים והמדריכים.",
        plan=("התוסף לפוטושופ של MWP", "תוסף לפוטושופ", ["תוסף לפוטושופ, Mac / Windows", "מדריך למשתמש, 21 עמודים", "מדריך התקנה"], "לרכישת התוסף"),
        plan2=("הסט המלא", "מהצילום ועד הפרסום", ["התוסף ללייטרום קלאסיק", "התוסף לפוטושופ של MWP", "הפריסטים של MWP: 50 פריסטים ו-33 קובצי LUT", "מדריכי השטח של MWP: 4 מדריכים, 137 שיעורים"], "לסט המלא"),
    ),
)

P["field-guides"] = dict(
    slug="mwp-field-guides", hero_img="5275cc7b", hero_pos="56% 55%", final_img="57773169",
    proof_type="pages", pages={"en": ["ad1aed91", "4b0264b3"], "he": ["94febd64", "124b0082"]},
    cards=["d5f6d2a7", "6d84bcea", "ce73f34a", "2f9794f4"],
    feat_img={"en": "669cd248", "he": "6a58bfae"}, feat_flip=False,
    steps={"en": ["b47f93dd", "ca5358c4", "d73281c0"], "he": ["9456cbfa", "86253563", "d73281c0"]},
    bundle="full-set",
    en=dict(
        name="MWP Field Guides", name_html='MWP <span class="grad">Field Guides</span>',
        title="Photography Guides: Composition, Colour, Light & Planning · MWP",
        desc="137 one-page photography lessons on composition, colour, light and planning, for beginners and experienced photographers. PDF, in English or Hebrew.",
        hero_alt="Mountains at dusk, photographed by Matan Wild",
        kick="MWP Field Guides · PDF photography guides", h1=["What makes", "a strong image."],
        lead="Four visual guides with 137 one-page lessons on composition, colour, light and planning, for beginners and experienced photographers. Every lesson is a real photo from the field, with a drawing that shows why it works.",
        cta="Get the guides", cta2="Look inside", facts=["137 lessons", "English or Hebrew", "PDF for any device"],
        proof_label="Look inside", proof_kick="Look inside", proof_h=["This is what every", "lesson looks like."],
        proof_lead="Flip through real pages from the guide. A photo, a drawing and a short explanation. Nothing extra.",
        page_alts=["Clean background page", "Odd numbers page"],
        inside_kick="What's in the set", inside_h=["Four guides. Four skills", "every photographer needs."], inside_lead="",
        cards=[("Composition", "Where to place it, what to leave out and how to lead the eye. 39 lessons.", "Puma looking into the lens"),
               ("Colour", "Harmony, temperature, saturation and white balance. 36 lessons and 10 theory pages.", "Puffin among yellow flowers"),
               ("Light", "Direction, quality, time of day and exposure. 25 lessons and 8 light tools.", "Lynx in side light"),
               ("Planning", "Seasons, sky, apps, fieldcraft and gear. 37 lessons and 13 planning tools.", "Young fox looking into the lens")],
        feat_kick="Why it works", feat_h=["A whole lesson", "on one page."],
        feat_lead='On every page: a real photo, a drawing that shows what is happening in it, and a line or two you can remember in the field. Every lesson ends with "Break the rule": when to go against it, and how.',
        feat_points=[], feat_alt="The look room page from the Composition guide",
        steps_kick="Three steps", steps_h=["Read, practise,", "go shoot."],
        steps=[("Read a lesson", "One page, one idea. Start with any guide and any page.", "The backlight page from the Light guide"),
               ("Practise", "Every guide has drills, a checklist and a cheat sheet to take into the field.", "The check the frame checklist"),
               ("Go shoot", "Arrive at the scene with a plan, and know what to look for in the viewfinder.", "A photographer lying on the ice, shooting")],
        specs=[("4", "Field guides", "Composition, colour, light and planning"),
               ("137", "Lessons", "One page each: a real photo, a drawing and a short explanation"),
               ("31", "Tools and diagrams", "With drills, a checklist and a cheat sheet in every guide"),
               ("229", "Pages", "PDF for any device, in English or Hebrew: you choose one language")],
        spec_note="",
        final_kick="MWP Field Guides", final_h=["Your next shoot", "starts here."],
        # single guides (Matan, 25 Oct 2026; DRAFT copy, waiting for his OK): shown under the two price cards
        singles=dict(h="Or start with one guide", line="Each guide on its own, in English or Hebrew. All four together cost less.",
                     cta="Add to cart", owned="You already have all four guides."),
        final_lead="4 guides, 137 lessons and 229 pages of composition, colour, light and planning. In English or Hebrew, in one set.",
        plan=("MWP Field Guides", "Learn to shoot: before the click", ["4 field guides, English or Hebrew", "137 lessons, 229 pages", "Cheat sheets, drills and checklists"], "Get the guides"),
        plan2=("The full set", "From the shot to the share", ["The Lightroom Classic plugin", "MWP Photoshop Plugin Panel", "MWP Presets: 50 presets and 33 LUTs", "MWP Field Guides: 4 PDF guides, 137 lessons"], "Get the full set"),
    ),
    he=dict(
        name="מדריכי השטח של MWP", name_html='מדריכי השטח של <span class="grad">MWP</span>',
        title="מדריכי צילום: קומפוזיציה, צבע, אור ותכנון · MWP",
        desc="ארבעה מדריכי צילום עם 137 שיעורים קצרים על קומפוזיציה, צבע, אור ותכנון, למתחילים ולמתקדמים. בכל עמוד תמונה ושרטוט שמראה למה היא עובדת.",
        hero_alt="הרים בדמדומים, צילום: מתן שרון",
        kick="מדריכי השטח של MWP · מדריכי צילום דיגיטליים", h1=["איך יוצרים תמונה?", "137 שיעורים מהשטח."],
        lead="ארבעה מדריכים על קומפוזיציה, צבע, אור ותכנון, למתחילים ולמתקדמים. בכל עמוד תמונה ושרטוט שמראה למה היא עובדת.",
        cta="לרכישת הסט", cta2="הציצו פנימה", facts=["137 שיעורים", "עברית או אנגלית", "נפתחים בכל מכשיר"],
        proof_label="הצצה פנימה", proof_kick="הצצה פנימה", proof_h=["ככה נראה", "כל שיעור."],
        proof_lead="דפדפו בעמודים אמיתיים מתוך המדריך. תמונה, שרטוט והסבר קצר, בלי מילים מיותרות.",
        page_alts=["עמוד רקע נקי", "עמוד מספרים אי־זוגיים"],
        inside_kick="מה בסט", inside_h=["ארבעת היסודות", "של כל תמונה טובה."], inside_lead="",
        cards=[("קומפוזיציה", "איפה למקם, מה להשאיר בחוץ ואיך להוביל את העין. 39 שיעורים.", "פומה מביטה לעדשה"),
               ("צבע", "הרמוניה, טמפרטורה, רוויה ואיזון לבן. 36 שיעורים ו-10 עמודי תיאוריה.", "פאפין בין פרחים צהובים"),
               ("אור", "כיוון, איכות, שעה וחשיפה. 25 שיעורים ו-8 כלי אור.", "לינקס באור צד"),
               ("תכנון", "עונות, שמיים, אפליקציות, שטח וציוד. 37 שיעורים ו-13 כלי תכנון.", "שועל צעיר מביט לעדשה")],
        feat_kick="למה זה עובד", feat_h=["שיעור שלם", "בעמוד אחד."],
        feat_lead='בכל עמוד: תמונה, שרטוט שמסביר מה קורה בה, ומשפט או שניים שקל לזכור בשטח. כל שיעור נגמר ב"שוברים את הכלל": מתי כדאי ללכת נגדו, ואיך.',
        feat_points=[], feat_alt="העמוד מקום למבט מתוך מדריך הקומפוזיציה",
        steps_kick="שלושה צעדים", steps_h=["קוראים, מתרגלים,", "יוצאים לצלם."],
        steps=[("קוראים שיעור", "עמוד אחד, רעיון אחד. אפשר להתחיל מכל מדריך ומכל עמוד.", "עמוד התאורה האחורית מתוך מדריך האור"),
               ("מתרגלים", "בכל מדריך יש תרגילים, צ׳קליסט ודף סיכום שלוקחים לשטח.", "צ׳קליסט בודקים את הפריים"),
               ("יוצאים לצלם", "מגיעים לסצנה עם תוכנית, ויודעים מה לחפש בעינית.", "צלם שוכב על הקרח ומצלם")],
        specs=[("4", "מדריכים", "קומפוזיציה, צבע, אור ותכנון"),
               ("137", "שיעורים", "כל אחד בעמוד: תמונה, שרטוט והסבר קצר"),
               ("31", "כלים ודיאגרמות", "ובכל מדריך תרגילים, צ׳קליסט ודף סיכום"),
               ("229", "עמודים", "נפתחים בכל מכשיר, בעברית או באנגלית: בוחרים שפה אחת")],
        spec_note="",
        final_kick="מדריכי השטח של MWP", final_h=["יוצאים לצלם,", "עם תוכנית."],
        singles=dict(h="או מתחילים במדריך אחד", line="כל מדריך בנפרד, באנגלית או בעברית. ארבעתם יחד עולים פחות.",
                     cta="הוספה לעגלה", owned="כל ארבעת המדריכים כבר אצלכם."),
        final_lead="4 מדריכים, 137 שיעורים ו-229 עמודים של קומפוזיציה, צבע, אור ותכנון. בעברית או באנגלית, בסט אחד.",
        plan=("מדריכי השטח של MWP", "לצלם עם תוכנית", ["4 מדריכי שטח, עברית או אנגלית", "137 שיעורים, 229 עמודים", "דפי סיכום, תרגילים וצ׳קליסטים"], "לרכישת הסט"),
        plan2=("הסט המלא", "מהצילום ועד הפרסום", ["התוסף ללייטרום קלאסיק", "התוסף לפוטושופ של MWP", "הפריסטים של MWP: ‏50 פריסטים ו-33 קובצי LUT", "מדריכי השטח של MWP: ‏4 מדריכים, 137 שיעורים"], "לסט המלא"),
    ),
)


P["lightroom-classic"] = dict(
    # the Lightroom Classic plugin (Jeinna, 25 Oct 2026): sold with MWP Presets included (buying it unlocks them), on the
    # Lightroom page (/presets/); it has no page of its own.
    forward="/presets/#plugin",   # shown on the Lightroom page (/presets/); this dict holds its words
    slug="mwp-lightroom-plugin", hero_img="86b95f19", hero_pos="88% 45%", final_img="d73281c0",
    bundle="full-set",
    en=dict(
        name="Lightroom Classic Plugin", name_html='Lightroom Classic <span class="grad">Plugin</span>',
        title="Lightroom Classic Plugin · MWP",
        desc="A Lightroom Classic plugin by photographer Matan Wild: sort bursts, keyword trips and species, edit the subject, the sky or the background, and export for Instagram, web and print. Mac and Windows; no presets needed.",
        hero_alt="A photographer behind a long lens in the mountains, photographed by Matan Wild",
        kick="MWP · a Lightroom Classic plugin", h1=["From sorting", "to sharing."],
        lead="Sort, keyword, edit and export a whole shoot, in one window inside Lightroom Classic.",
        lrc_cap="Interactive preview of the real plugin · click a tab",
        cta="Get the plugin",
        facts=["Lightroom Classic 13+", "Mac and Windows", "No presets needed"],
        inside_kick="Look inside", inside_h=["Seven tabs,", "one window."],
        inside_lead="These are the plugin's real tabs and buttons. Click a tab to open it.",
        lrc=P["presets"]["en"]["lrc"],
        lrc_note="Interactive preview of the real tabs and buttons · Lightroom Classic 13 or newer, Mac and Windows",
        flow_kick="How it fits your shoot", flow_h=["Sort it. Edit it.", "Share it."],
        flow_lead="The tabs follow the order of a real day in the field, from a full card to a finished post.",
        phases=[("Sort the shoot", "Hundreds of frames down to the few worth editing.", [0, 1]),
                ("Edit the photo", "The subject, the sky and the colour, one tab at a time.", [2, 3, 4, 5]),
                ("Share it", "The right size for each place, with your watermark.", [6])],
        get=dict(kick="MWP Presets included", h=["Works on its own.", "Presets included."],
                 lead="It has its own looks inside, and MWP Presets come with it.",
                 points=["Everything it does is ordinary Lightroom settings, masks and collections. Nothing is locked in.",
                         "Sorting never deletes a photo.",
                         "Early access: it works today, and new features arrive as free updates."],
                 img="6fbe4f2a", alt="Lioness in golden grass",
                 box_kick="A separate product, if you want it", box_h="MWP Presets",
                 box=[("50", "Lightroom presets, 12 adaptive"), ("50", "Mobile files for Lightroom Mobile"), ("33", "LUTs for Photoshop and video")],
                 box_cta="See MWP Presets", more="See the bundles", more_href="/shop/#bundles"),
        specs=[("", "Lightroom Classic plugin", "Add it once in Lightroom Classic: File › Plug-in Manager › Add"),
               ("", "Built-in help", "A Help button in the window and a tip on every step"),
               ("", "Install note", "Installing, updating and getting help, in the download"),
               ("", "Video tutorials", "Installing and using the plugin, in My downloads")],
        spec_note="Needs Lightroom Classic 13 or newer on Mac or Windows. Not for Lightroom (the cloud app), Lightroom Mobile or Photoshop.",
        final_kick="Lightroom Classic Plugin", final_h=["Your whole shoot,", "in one window."],
        final_lead="The plugin with built-in help, video tutorials and free updates. Or in the full set, with MWP Presets, MWP Photoshop Plugin Panel and the Field Guides.",
        plan=("Lightroom Classic Plugin", "A plugin for Lightroom Classic", ["Seven tabs, from sorting to sharing", "Lightroom Classic 13 or newer, Mac and Windows", "Built-in help and video tutorials"], "Get the plugin"),
        plan2=("The full set", "From the shot to the share", ["The Lightroom Classic plugin", "MWP Photoshop Plugin Panel", "MWP Presets: 50 presets and 33 LUTs", "MWP Field Guides: 4 PDF guides, 137 lessons"], "Get the full set"),
        bar=[("inside", "Look inside"), ("workflow", "How it works"), ("get", "Works on its own"), ("faq", "FAQs")],
    ),
    he=dict(
        name="התוסף ללייטרום קלאסיק", name_html='התוסף ללייטרום <span class="grad">קלאסיק</span>',
        title="תוסף ללייטרום קלאסיק · MWP",
        desc="תוסף ללייטרום קלאסיק מאת הצלם מתן שרון: מיון רצפים, מילות מפתח לטיולים ולמינים, עריכה של הנושא, השמיים או הרקע, וייצוא לאינסטגרם, לאתר ולהדפסה. Mac / Windows, בלי צורך בפריסטים.",
        hero_alt="צלם מאחורי עדשה ארוכה בהרים, צילום: מתן שרון",
        kick="MWP · תוסף ללייטרום קלאסיק", h1=["מהמיון", "ועד הפרסום."],
        lead="ממיינים, מתייגים, עורכים ומייצאים צילום שלם, בחלון אחד בתוך לייטרום קלאסיק.",
        lrc_cap="תצוגה מקדימה של התוסף האמיתי · לחצו על לשונית",
        cta="לרכישת התוסף",
        facts=["לייטרום קלאסיק 13 ומעלה", "Mac / Windows", "לא צריך פריסטים"],
        inside_kick="הצצה פנימה", inside_h=["שבע לשוניות,", "חלון אחד."],
        inside_lead="אלה הלשוניות והכפתורים האמיתיים של התוסף. לחצו על לשונית כדי לפתוח אותה.",
        lrc=P["presets"]["he"]["lrc"],
        lrc_note="תצוגה מקדימה של הלשוניות והכפתורים האמיתיים, באנגלית כמו בתוסף · לייטרום קלאסיק 13 ומעלה, Mac / Windows",
        flow_kick="איך זה משתלב בצילום", flow_h=["ממיינים. עורכים.", "משתפים."],
        flow_lead="הלשוניות בנויות לפי סדר של יום אמיתי בשטח, מהמיון הראשון ועד הפוסט.",
        phases=[("ממיינים", "מאות פריימים, עד המעטים ששווה לערוך.", [0, 1]),
                ("עורכים", "הנושא, השמיים והצבע, לשונית אחר לשונית.", [2, 3, 4, 5]),
                ("משתפים", "הגודל הנכון לכל מקום, עם סימן המים שלכם.", [6])],
        get=dict(kick="הפריסטים של MWP כלולים", h=["עובד לבד.", "הפריסטים כלולים."],
                 lead="יש בו לוקים משלו, והפריסטים של MWP מגיעים איתו.",
                 points=["כל מה שהוא עושה הוא הגדרות, מסכות ואוספים רגילים של לייטרום. שום דבר לא נעול.",
                         "המיון אף פעם לא מוחק תמונה.",
                         "גישה מוקדמת: הוא עובד כבר היום, ותכונות חדשות מגיעות כעדכונים חינמיים."],
                 img="6fbe4f2a", alt="לביאה בעשב זהוב",
                 box_kick="מוצר נפרד, אם תרצו", box_h="הפריסטים של MWP",
                 box=[("50", "פריסטים ללייטרום, 12 אדפטיביים"), ("50", "קבצים ללייטרום מובייל"), ("33", "קובצי LUT לפוטושופ ולווידאו")],
                 box_cta="לפריסטים של MWP", more="לחבילות", more_href="/shop/he/#bundles"),
        specs=[("", "תוסף ללייטרום קלאסיק", "מוסיפים אותו פעם אחת בלייטרום קלאסיק: File › Plug-in Manager › Add"),
               ("", "עזרה מובנית", "כפתור עזרה בחלון וטיפ לכל צעד"),
               ("", "הוראות התקנה", "התקנה, עדכון וקבלת עזרה, בתוך ההורדה"),
               ("", "סרטוני הדרכה", "התקנה ושימוש בתוסף, בעמוד ההורדות שלי")],
        spec_note="דורש לייטרום קלאסיק 13 ומעלה, ב-Mac או ב-Windows. לא ללייטרום (גרסת הענן), ללייטרום מובייל או לפוטושופ.",
        final_kick="התוסף ללייטרום קלאסיק", final_h=["כל הצילום,", "בחלון אחד."],
        final_lead="התוסף עם עזרה מובנית, סרטוני הדרכה ועדכונים בחינם. או בסט המלא, עם הפריסטים, התוספים ומדריכי השטח של MWP.",
        plan=("התוסף ללייטרום קלאסיק", "תוסף ללייטרום קלאסיק", ["שבע לשוניות: ממיון ועד ייצוא", "לייטרום קלאסיק 13 ומעלה, Mac / Windows", "עזרה מובנית וסרטוני הדרכה"], "לרכישת התוסף"),
        plan2=("הסט המלא", "מהצילום ועד הפרסום", ["התוסף ללייטרום קלאסיק", "התוסף לפוטושופ של MWP", "הפריסטים של MWP: ‏50 פריסטים ו-33 קובצי LUT", "מדריכי השטח של MWP: ‏4 מדריכים, 137 שיעורים"], "לסט המלא"),
        bar=[("inside", "הצצה פנימה"), ("workflow", "איך זה עובד"), ("get", "עובד לבד"), ("faq", "שאלות נפוצות")],
    ),
)


# ---------------------------------------------------------------- the template
def h(lines, tag="h2", cls="h2"):
    a, b = lines
    return f'<{tag} class="{cls}">{esc(a)} <span class="grad">{esc(b)}</span></{tag}>'


def price(slug, lang, was=False):
    return f'<span data-price="{slug}"{" data-was" if was else ""} data-no-i18n>{ZERO[lang]}</span>'


def structured(folder, lang, url):
    """schema.org data for search engines: the breadcrumb trail and the page's FAQs.
    No Product markup yet: Google wants a price in it, and the prices are set in the admin (add it once they are)."""
    c, u = P[folder][lang], UI[lang]
    data = [
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": u["home"], "item": f"{SITE}/he/" if lang == "he" else f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": c["name"], "item": url}]},
        {"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": lang, "mainEntity": [
            {"@type": "Question", "name": f["q"], "acceptedAnswer": {"@type": "Answer", "text": f["a"]}}
            for f in FAQS[folder][lang]]},
    ]
    return json.dumps(data, ensure_ascii=False).replace("</", "<\\/")


def nav_right(lang, folder):
    he = lang == "he"
    t = (lambda e, hb: hb if he else e)
    # the language switch goes to the other language's page and remembers the choice (mwp_lang)
    other = (f'<a href="/{folder}/" hreflang="en" lang="en" onclick="try{{localStorage.setItem(\'mwp_lang\',\'en\')}}catch(e){{}}">EN</a><span class="on" aria-current="true">עב</span>'
             if he else
             f'<span class="on" aria-current="true">EN</span><a href="/{folder}/he/" hreflang="he" lang="he" onclick="try{{localStorage.setItem(\'mwp_lang\',\'he\')}}catch(e){{}}">עב</a>')
    return (f'<div class="navr"><div class="nav-icons">'
            f'<button class="nav-ico" type="button" data-cart aria-label="{t("Cart", "עגלה")}" aria-haspopup="dialog">{CART}<span class="count" hidden>0</span><span class="tip">{t("Cart", "עגלה")}</span></button>'
            f'<button class="nav-ico" type="button" data-account aria-label="{t("Account", "חשבון")}" aria-haspopup="menu" aria-expanded="false">{USER}<span class="tip">{t("Account", "חשבון")}</span></button>'
            f'</div><div class="lang-toggle" role="group" aria-label="{UI[lang]["lang"]}">{other}</div></div>')


def page(folder, lang):
    p, c, u = P[folder], P[folder][lang], UI[lang]
    he = lang == "he"
    slug = p["slug"]
    url = f"{SITE}/{folder}/{'he/' if he else ''}"
    proof_id = "compare" if p.get("proof_type") == "ba" else "inside"
    parts = []

    # hero
    facts = "".join(f"<li>{esc(f)}</li>" for f in c["facts"])
    parts.append(f'''<section class="hero" id="top">
<img src="{img(p["hero_img"])}" alt="{esc(c["hero_alt"])}" fetchpriority="high" style="object-position:{p["hero_pos"]}">
<div class="vf" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
<div class="wrap">
<p class="kick in" style="--i:0">{esc(c["kick"])}</p>
<h1 class="h1 in" style="--i:1">{esc(c["h1"][0])} <span class="grad">{esc(c["h1"][1])}</span></h1>
<p class="lead in" style="--i:2">{esc(c["lead"])}</p>
<div class="ctas in" style="--i:3"><a class="btn" href="#buy" data-add-to-cart="{slug}">{esc(c["cta"])} <span class="pr">· {price(slug, lang)}</span></a>{f'<a class="ghost" href="#buy" data-add-to-cart="{p["slug_b"]}">{esc(c["cta_b"])} <span class="pr">· {price(p["slug_b"], lang)}</span></a>' if p.get("slug_b") else ""}</div>
<ul class="facts in" style="--i:4">{facts}</ul>
</div>
</section>''')

    # two versions of one product (MWP Panel: Photoshop and Lightroom Classic), right after the hero
    if "versions" in c:
        cards = "".join(f'''<a class="ver" href="#{href}" data-r style="--d:{k * 0.08:.2f}s">
    <div class="ver-ph"><img src="{img(p["versions_img"][k][0])}" alt="{esc(alt)}" loading="lazy" style="object-position:{p["versions_img"][k][1]}"><div class="ver-top"><p class="ver-for">{esc(c.get("versions_for", [u["for"]] * 2)[k])}</p><h3>{esc(app)}</h3></div>{f'<span class="ver-badge">{esc(badge)}</span>' if badge else ""}</div>
    <div class="ver-body"><p>{esc(line)}</p><ol class="ver-tabs">{"".join(f'<li><b>{i + 1}</b>{esc(t)}</li>' for i, t in enumerate(tabs))}</ol><p class="ver-req">{esc(req)}</p><span class="ver-go">{esc(go)} {ARROW}</span></div></a>'''
                        for k, (app, badge, line, req, go, href, tabs, alt) in enumerate(c["versions"]))
        parts.append(f'''<section class="sec" id="versions">
    <div class="wrap">
    <div class="head c" data-r><p class="kick">{esc(c["versions_kick"])}</p>{h(c["versions_h"])}<p class="lead">{esc(c["versions_lead"])}</p></div>
    <div class="vers">{cards}</div>
    </div>
    </section>''')

    # the proof
    # the proof: a gallery of slides, the next one peeking in from the edge (no tabs, nothing on the photo)
    def gallery(slides, caps):
        n = len(slides)
        bar = (f'<div class="gal-bar"><p class="cap" aria-live="polite">{esc(caps[0])}</p>'
               f'<div class="gal-nav"><span class="count"><b>01</b> / {n:02d}</span>'
               f'<button class="gbtn" type="button" data-prev aria-label="{u["prev"]}" disabled>{BACK}</button>'
               f'<button class="gbtn" type="button" data-nextg aria-label="{u["next"]}">{ARROW}</button></div></div>') if n > 1 else ""
        caps_attr = esc(json.dumps(caps, ensure_ascii=False))
        return (f'<div class="gal" data-gal data-caps="{caps_attr}" data-r><div class="gal-track">'
                + "".join(f'<figure class="slide{" on" if k == 0 else ""}" data-k="{k}">{sl}</figure>' for k, sl in enumerate(slides))
                + f'</div>{bar}</div>')
    if p["proof_type"] == "ba":
        slides = [f'''<div class="ba">
    <img class="before" src="{img(b)}" alt="{esc(c["name"])}, {esc(lab)}: {u["raw_alt"]}" loading="lazy">
    <img class="after" src="{img(a)}" alt="{esc(c["name"])}, {esc(lab)}: {u["final_alt"]}" loading="lazy">
    <span class="tag t1">{u["raw"]}</span><span class="tag t2">{u["final"]}</span>
    <span class="line"></span><span class="knob">{GRIP}</span>
    <input type="range" min="0" max="100" value="50" step="0.1" aria-label="{u["hint"]}">
    </div>''' for (b, a), lab in zip(p["pairs_from"], c["pairs"])]
        parts.append(f'''<section class="sec" id="compare">
    <div class="wrap">
    <div class="head c" data-r><p class="kick">{esc(c["proof_kick"])}</p>{h(c["proof_h"])}<p class="lead">{esc(c["proof_lead"])}</p></div>
    {gallery(slides, c["pairs"])}
    </div>
    </section>''')
    else:
        pages = p["pages"][lang]
        slides = [f'<div class="pg"><img src="{img(x)}" alt="{esc(c["page_alts"][k])}" loading="lazy"></div>' for k, x in enumerate(pages)]
        caps = ["" for _ in pages]   # the counter says it all
        parts.append(f'''<section class="sec" id="inside">
    <div class="wrap">
    <div class="head c" data-r><p class="kick">{esc(c["proof_kick"])}</p>{h(c["proof_h"])}<p class="lead">{esc(c["proof_lead"])}</p></div>
    {gallery(slides, caps)}
    </div>
    </section>''')

    after_proof = len(parts)   # where the feature goes when it comes first (feat_first)

    # what's inside: photo cards
    inside_id = "contents" if p["proof_type"] == "pages" else "inside"
    cards = "".join(f'''<article class="card" data-r style="--d:{k * 0.08:.2f}s"><div class="ph"><img src="{img(im)}" alt="{esc(alt)}" loading="lazy"><span class="no">0{k + 1}</span></div><h3>{esc(t)}</h3><p>{esc(d)}</p></article>'''
                    for k, (im, (t, d, alt)) in enumerate(zip(p["cards"], c["cards"])))
    lead = f'<p class="lead">{esc(c["inside_lead"])}</p>' if c["inside_lead"] else ""
    if p.get("ps_show"):   # MWP Photoshop Plugin Panel: Photoshop as one centred showcase, like the Lightroom Classic one
        ba, fa, areas, tall = p["ps_photo"]
        descs = "".join(f'<p data-pw-desc="{esc(t2)}"{"" if k == 1 else " hidden"}><span class="n">0{k + 1}</span><b>{esc(t)}</b><span>{esc(d)}</span></p>'
                        for k, ((t, d, alt), t2) in enumerate(zip(c["cards"], ("Prepare", "Edit", "Style", "Export"))))
        parts.append(f'''<section class="sec tint" id="{inside_id}">
    <div class="wrap">
    <div class="head c" data-r><p class="kick">{esc(c["inside_kick"])}</p>{h(c["inside_h"])}{lead}</div>
    <div class="lrc pws" data-pws data-r><p class="lrc-label"><i aria-hidden="true"></i><span>{esc(c["ps_label"].split(" · ")[0])}<span class="req"> · {esc(c["ps_label"].split(" · ")[1])}</span></span></p>
    <div class="lrc-stage"><div class="psw" lang="en" dir="ltr" data-no-i18n><div class="psw-bar"><i></i><i></i><i></i><span>Photoshop</span></div>
    <div class="psw-main"><div class="psw-canvas" data-areas="{esc(json.dumps(areas))}"><div class="psw-pic{" tall" if tall else ""}"><img class="psw-after" src="{img(fa)}" alt="{esc(c["ps_alt"])}" loading="lazy"><div class="psw-layers"></div><div class="psw-mask"></div>{f'<img class="psw-before" src="{img(ba)}" alt="" loading="lazy">' if ba else ""}</div><span class="psw-tag">{"לפני" if lang == "he" else "Before"}</span><span class="psw-sim">{"הדמיה בעמוד הזה · בפוטושופ התוסף בונה מסכות אמיתיות" if lang == "he" else "Simulated on this page · in Photoshop the plugin builds real masks"}</span></div>
    {ps_window("/assets/img/logo-mark.png")}</div></div></div>
    <div class="lrc-desc" aria-live="polite">{descs}</div></div>
    </div>
    </section>''')
    else:
        parts.append(f'''<section class="sec tint" id="{inside_id}">
    <div class="wrap" data-rail>
    <div class="rail-top"><div class="head" data-r><p class="kick">{esc(c["inside_kick"])}</p>{h(c["inside_h"])}{lead}</div>
    <div class="rail-nav"><button type="button" aria-label="{u["prev"]}">{BACK}</button><button type="button" aria-label="{u["next"]}">{ARROW}</button></div></div>
    <div class="rail{" n3" if len(p["cards"]) == 3 else ""}">{cards}</div>
    </div>
    </section>''')

    # a second app (MWP Panel in Lightroom Classic): the tabs as a numbered list, no photos
    if "lrc_kick" in c:   # (the presets keep the tab list for the plugin page, without this section)
        keys = ["cull", "organize", "guided", "looks", "edit", "color", "export"]   # the plugin's tab ids, in its order
        # under the window, one line for the tab that's open (the window's own tabs switch it)
        descs = "".join(f'<p data-lrc-desc="{keys[k]}"{"" if keys[k] == "looks" else " hidden"}><span class="n">{k + 1:02d}</span><b>{esc(t)}</b><span>{esc(d)}</span></p>'
                        for k, (t, d) in enumerate(c["lrc"]))
        parts.append(f'''<section class="sec" id="lightroom-classic">
    <div class="wrap">
    <div class="head c" data-r><p class="kick">{esc(c["lrc_kick"])}</p>{h(c["lrc_h"])}<p class="lead">{esc(c["lrc_lead"])}</p></div>
    <div class="lrc" data-lrc data-r><p class="lrc-label"><i aria-hidden="true"></i><span>{esc(c["lrc_note"].split(" · ")[0])}<span class="req"> · {esc(c["lrc_note"].split(" · ")[1])}</span></span></p><div class="lrc-stage">{lrc_window()}</div>
    <div class="lrc-desc" aria-live="polite">{descs}</div></div>
    </div>
    </section>''')

    # signature feature
    fimg = p["feat_img"][lang] if isinstance(p["feat_img"], dict) else p["feat_img"]
    ticks = "".join(f"<li>{CHECK}<span>{pt}</span></li>" for pt in c["feat_points"])
    parts.append(f'''<section class="sec">
    <div class="wrap feat{" flip" if p["feat_flip"] else ""}">
    {f'<div class="ph live" data-r><p class="lrc-label"><i aria-hidden="true"></i><span>{esc(c["feat_live"])}</span></p>{ps_window("/assets/img/logo-mark.png")}</div>' if c.get("feat_live") else f'<div class="ph{" tall" if p.get("feat_tall") else ""}" data-r><img src="{img(fimg)}" alt="{esc(c["feat_alt"])}" loading="lazy"></div>'}
    <div data-r style="--d:.1s"><p class="kick">{esc(c["feat_kick"])}</p>{h(c["feat_h"])}<p class="lead">{esc(c["feat_lead"])}</p>{f'<ul class="ticks">{ticks}</ul>' if ticks else ""}</div>
    </div>
    </section>''')
    if p.get("feat_first"):   # the feature right after the proof, before what's inside
        parts.insert(after_proof, parts.pop())

    # three steps (Field Guides)
    if "steps" in p:
        steps = "".join(f'''<div class="step" data-r style="--d:{k * 0.08:.2f}s"><div class="ph"><img src="{img(im)}" alt="{esc(alt)}" loading="lazy"></div><span class="n">0{k + 1}</span><h3>{esc(t)}</h3><p>{esc(d)}</p></div>'''
                        for k, (im, (t, d, alt)) in enumerate(zip(p["steps"][lang], c["steps"])))
        parts.append(f'''<section class="sec" id="how">
    <div class="wrap"><div class="head" data-r><p class="kick">{esc(c["steps_kick"])}</p>{h(c["steps_h"])}</div><div class="steps">{steps}</div></div>
    </section>''')

    # MWP Presets has its own layout (tools/presets_layout.py): the hero, then its collections, in place of the template's middle
    if p.get("layout") == "collections":
        p["grip"] = GRIP
        own = presets_layout.sections(p, c, u, lang, h, esc, img, gallery, lrc_window, CHECK, ARROW, price, P["lightroom-classic"][lang])
        parts = own if p.get("own_page") else parts[:1] + own   # own_page: the layout makes its own top, in place of the hero

    # what's in the download
    def spec_rows(specs):
        return "".join(f'<div class="row"><dt>{f"<b>{esc(n)}</b>" if n else ""}{esc(t)}</dt><dd>{esc(d)}</dd></div>' for n, t, d in specs)
    rows = ("".join(f'<p class="spec-group">{esc(g)}</p>' + spec_rows(sp) for g, sp in c["spec_groups"]) if "spec_groups" in c
            else spec_rows(c["specs"]))
    note = f'<p class="note">{esc(c["spec_note"])}</p>' if c["spec_note"] else ""
    if not p.get("own_page"):   # the Lightroom page keeps the contents in one FAQ answer
        parts.append(f'''<section class="sec tint" id="specs">
<div class="wrap specs">
<div class="head" data-r><p class="kick">{u["spec_kick"]}</p><h2 class="h2">{u["spec_h"]}</h2></div>
<div data-r style="--d:.1s"><dl>{rows}</dl>{note}</div>
</div>
</section>''')

    # customer reviews of this product (hidden until assets/reviews/reviews.json has some), just before the FAQs
    review_key = {"presets": "presets", "lightroom-classic": "plugin", "panel": "panel", "field-guides": "guides"}[folder]
    parts.append(reviews_section(lang, product=review_key, cls=dict(head="head c")))

    # FAQs
    qa = "".join(f'<details><summary>{esc(f["q"])}<i aria-hidden="true"></i></summary><div class="a"><p>{esc(f["a"])}</p></div></details>' for f in FAQS[folder][lang])
    parts.append(f'''<section class="sec" id="faq">
<div class="wrap">
<div class="head c faq-head" data-r><h2 class="h2">{u["faq"]}</h2></div>
<div class="faq" data-r>{qa}</div>
<p class="small">{u["more"]} <a href="/support/">{u["write"]}</a></p>
</div>
</section>''')

    # closing call with the two price cards
    def singles_block(c, lang):
        """The Field Guides page: each guide on its own, under the set. product-page.js hides it from anyone who
        already owns the four guides (the set, or a bundle with it); cart.js refuses them too."""
        if "singles" not in c or not SINGLE_GUIDES_LIVE:
            return ""
        S = c["singles"]
        cards = "".join(f'<div class="single" data-r><p class="single-nm">{esc(name)}</p><p class="single-pr">{price(sl, lang)}</p>'
                        f'<a class="ghost" href="#buy" data-add-to-cart="{sl}">{esc(S["cta"])}</a></div>'
                        for sl, name in SINGLE_GUIDES[lang])
        return (f'<div class="singles" data-singles><h3 class="singles-h">{esc(S["h"])}</h3><p class="singles-line">{esc(S["line"])}</p>'
                f'<div class="singles-row">{cards}</div><p class="singles-owned" hidden>{esc(S["owned"])}</p></div>')

    def plan(data, s, hi=False, badge=""):
        name, sub, pts, cta = data
        li = "".join(f"<li>{CHECK}<span>{esc(x)}</span></li>" for x in pts)
        deal = (f'<p class="deal"><s>{price(s, lang, was=True)}</s> <span class="save" data-save="{s}" data-no-i18n hidden></span></p>'
                if s != slug else "")   # bundles: the sum of the parts struck out, and the saving
        return (f'<div class="plan{" hi" if hi else ""}" data-r>{f"<span class=badge>{badge}</span>" if badge else ""}<h3>{esc(name)}</h3><p class="sub">{esc(sub)}</p>'
                f'<div class="amt">{price(s, lang)}</div>{deal}<ul>{li}</ul>'
                f'<a class="{"btn" if hi else "ghost"}" href="#buy" data-add-to-cart="{s}">{esc(cta)}</a></div>')
    if not p.get("own_page"):   # the Lightroom page: each product is bought from its card and its own head
        parts.append(f'''<section class="final" id="buy">
<img src="{img(p["final_img"])}" alt="" loading="lazy">
<div class="wrap">
<div class="head c" data-r><p class="kick">{esc(c["final_kick"])}</p>{h(c["final_h"])}<p class="lead">{esc(c["final_lead"])}</p></div>
{launch_block(lang)}<div class="prices">{plan(c["plan"], slug, hi=True)}{plan(c["plan2"], p["bundle"], badge="" if p.get("slug_b") else u["bundle"])}</div>
{singles_block(c, lang)}
<p class="small">{u["trust"]} · <a href="/legal/">{u["terms"]}</a></p>
</div>
</section>''')

    # product bar
    # a page with its own layout lists its own sections
    bar_links = c["bar"] if "bar" in c else [(proof_id, c["proof_label"]), (inside_id, c.get("bar_inside", u["inside"])), ("faq", u["faq"])]
    bar = (f'<div class="pbar" aria-label="{esc(c["name"])}"><div class="wrap"><span class="nm" data-no-i18n>{c["name_html"]}</span>'
           f'<nav>{"".join(f"<a href=#{i}>{esc(t)}</a>" for i, t in bar_links)}</nav>'
           # a page with two products to choose from shows no price or Buy: its links are the two products
           + ('</div></div>' if p.get("slug_b") else
              # the Lightroom page: two offers, so Buy takes them to the choice instead of picking one for them
              f'<a class="btn sm" href="#offers">{u["buy"]}</a></div></div>' if p.get("own_page") else
              f'<span class="pp">{price(slug, lang)}</span><a class="btn sm" href="#buy" data-add-to-cart="{slug}">{u["buy"]}</a></div></div>'))

    redirect = ("" if he else
                f'<script>try{{if(localStorage.getItem("mwp_lang")==="he")location.replace("/{folder}/he/"+location.search+location.hash)}}catch(e){{}}</script>')
    remember = '<script>try{localStorage.setItem("mwp_lang","he")}catch(e){}</script>' if he else ""
    return f'''<!doctype html>
<html lang="{lang}" dir="{"rtl" if he else "ltr"}">
<head>
<meta charset="utf-8">
{redirect}{remember}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(c["title"])}</title>
<meta name="description" content="{esc(c["desc"])}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="en" href="{SITE}/{folder}/"><link rel="alternate" hreflang="he" href="{SITE}/{folder}/he/"><link rel="alternate" hreflang="x-default" href="{SITE}/{folder}/">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="theme-color" content="#0A0908">
<meta property="og:type" content="website"><meta property="og:site_name" content="MWP">
<meta property="og:title" content="{esc(c["title"])}"><meta property="og:description" content="{esc(c["desc"])}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}{img(p["hero_img"], webp=False)}">
<meta property="og:image:alt" content="{esc(c["hero_alt"])}"><meta property="og:locale" content="{"he_IL" if he else "en_US"}">
<meta name="twitter:card" content="summary_large_image">
{ICONS}
<script type="application/ld+json">{structured(folder, lang, url)}</script>
<script type="application/json" id="mwp-product">{json.dumps({"slug": slug, "name": c["name"], "description": c["desc"], "image": SITE + img(p["hero_img"]), "url": url}, ensure_ascii=False).replace("</", "<" + chr(92) + "/")}</script>
<link rel="preload" as="image" href="{img(p["hero_img"])}" fetchpriority="high">
<link rel="stylesheet" href="/assets/css/product.css?v={CSS_V}">
<link rel="stylesheet" href="/assets/css/reviews.css?v={RV_V}">
<style id="site-nav">{NAV_CSS}{SITE_CSS}</style>
{FONTS}
</head>
<body>
<a class="skip" href="#main">{"דילוג לתוכן" if he else "Skip to content"}</a>
<nav class="nav site-header" aria-label="{"ראשי" if he else "Main"}">
<div class="wrap container">
{BRAND.replace('href="/"', 'href="/he/"') if he else BRAND}
<div class="links">{site_links(lang, f"/{folder}/")}</div>
{nav_right(lang, folder)}
{menu_button(lang)}
</div>
</nav>
{bar}
<main id="main">
{chr(10).join(parts)}
</main>
{site_footer(lang)}
<script src="/assets/js/lib/nav.js" defer></script>
<script type="module" src="/assets/js/pages/product-page.js"></script>
</body>
</html>
'''


# A product without a page of its own (the Lightroom Classic plugin lives on the Lightroom page since 23 Oct 2026):
# its addresses forward there. GitHub Pages has no server redirects: canonical + refresh + a link.
def forward(lang, target):
    page, anchor = target.split("#")
    to = f"{page}{'he/' if lang == 'he' else ''}#{anchor}"
    t = "התוסף ללייטרום קלאסיק · MWP" if lang == "he" else "Lightroom Classic Plugin · MWP"
    link = "לתוסף ללייטרום קלאסיק" if lang == "he" else "Go to the Lightroom Classic plugin"
    return f'''<!doctype html>
<html lang="{lang}" dir="{"rtl" if lang == "he" else "ltr"}">
<head>
<meta charset="utf-8">
<title>{t}</title>
<link rel="canonical" href="{SITE}{page}{'he/' if lang == 'he' else ''}">
<meta name="robots" content="noindex, follow">
<meta http-equiv="refresh" content="0; url={to}">
<script>location.replace("{to}")</script>
</head>
<body style="background:#0A0908;color:#FEFBF1;font-family:system-ui,sans-serif;padding:40px"><a href="{to}" style="color:#F4AF56">{link}</a></body>
</html>
'''


if __name__ == "__main__":
    for folder in P:
        if P[folder].get("forward"):   # no page of its own: its addresses forward (see forward())
            os.makedirs(os.path.join(ROOT, folder, "he"), exist_ok=True)
            for path, lang in [(f"{folder}/index.html", "en"), (f"{folder}/he/index.html", "he"), (f"{folder}/he.html", "he")]:
                open(os.path.join(ROOT, path), "w", encoding="utf-8").write(forward(lang, P[folder]["forward"]))
            print("forwards", folder)
            continue
        en, he = page(folder, "en"), page(folder, "he")
        os.makedirs(os.path.join(ROOT, folder, "he"), exist_ok=True)
        for path, html in [(f"{folder}/index.html", en), (f"{folder}/he/index.html", he), (f"{folder}/he.html", he)]:
            open(os.path.join(ROOT, path), "w", encoding="utf-8").write(html)
        print("built", folder)
