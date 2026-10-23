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
from brand import CART, USER, FONTS, NAV_CSS, SITE_CSS, site_links, menu_button, site_footer, BRAND, ICONS

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://shop.mw.photography"
import hashlib
CSS_V = hashlib.sha1(open(os.path.join(ROOT, "assets/css/product.css"), "rb").read()).hexdigest()[:8]   # fresh CSS after every change
FAQS = json.load(open(os.path.join(ROOT, "tools/pages/faqs.json"), encoding="utf-8"))


def img(prefix):
    """/assets/pages/img/<file> from the first characters of its name (the files are named by their hash)."""
    found = sorted(glob.glob(os.path.join(ROOT, "assets/pages/img", prefix + "*")), key=lambda f: not f.endswith(".webp"))   # the smaller WebP copy first
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
    "en": {"buy": "Buy", "for": "MWP Panel for", "prev": "Previous", "next": "Next", "page": "Page", "raw": "RAW", "final": "FINAL",
           "hint": "Drag the handle to compare.", "faq_kick": "Before you buy", "faq": "FAQs",
           "spec_kick": "What you get", "spec_h": "What's in the download.", "price_kick": "Get it",
           "trust": "Instant download · Secure checkout · Free updates · Help or a refund within 14 days", "terms": "Full terms",
           "more": "Questions about your setup?", "examples": "Choose an example", "examples_n": "examples", "next_ex": "Next example", "next_page": "Next page", "write": "Write to us", "bundle": "Bundle", "lang": "Language", "inside": "What's inside",
           "raw_alt": "the RAW file before editing", "final_alt": "the finished edit", "home": "Home"},
    "he": {"buy": "לרכישה", "for": "הפאנל של MWP עבור", "prev": "הקודם", "next": "הבא", "page": "עמוד", "raw": "RAW", "final": "סופי",
           "hint": "גררו את הידית כדי להשוות.", "faq_kick": "לפני שקונים", "faq": "שאלות נפוצות",
           "spec_kick": "מה מקבלים", "spec_h": "מה יש בהורדה.", "price_kick": "לרכישה",
           "trust": "הורדה מיידית · תשלום מאובטח · עדכונים חינם · עזרה או החזר תוך 14 יום", "terms": "התנאים המלאים",
           "more": "שאלות על ההתקנה?", "examples": "בחרו דוגמה", "examples_n": "דוגמאות", "next_ex": "לדוגמה הבאה", "next_page": "לעמוד הבא", "write": "כתבו לנו", "bundle": "חבילה", "lang": "שפה", "inside": "מה בפנים",
           "raw_alt": "קובץ ה-RAW לפני העריכה", "final_alt": "העריכה הסופית", "home": "דף הבית"},
}

# ---------------------------------------------------------------- the products
P = {}

P["presets"] = dict(
    slug="mwp-presets", hero_img="6fbe4f2a", hero_pos="62% 40%", final_img="fbaf19ae",
    proof_type="ba", pairs_from=[("3c14b23d", "fbaf19ae"), ("7c359a77", "84c2340d")],
    cards=["6fbe4f2a", "e83b1947", "f424f86b", "8cb56471", "ff95ea5c"], feat_img="e55ba138", feat_flip=False, feat_first=True,
    # where each photo's subject sits, so a 4:5 crop keeps it: the lioness's face, the lava, the lion, the eagle, the tiger
    card_focus=["38% 50%", "66% 50%", "50% 22%", "50% 30%", "38% 45%"], feat_focus="50% 18%",
    layout="collections", adobe_img="0015a37d",   # its own layout: tools/presets_layout.py
    bundle="full-set",
    en=dict(
        name="MWP Presets", name_html='MWP <span class="grad">Presets</span>',
        title="Lightroom Presets for Wildlife Photography · MWP Presets",
        desc="50 Lightroom presets for wildlife and nature photos. 12 adaptive presets find the animal, the sky and the background, so the look fits your photo. With a panel for Lightroom Classic, 50 mobile DNGs and 33 video LUTs.",
        hero_alt="Lioness in golden grass, photographed by Matan Wild",
        kick="MWP Presets · Lightroom and Adobe presets for wildlife", h1=["Natural edits,", "for wildlife."],
        lead="Two collections from Matan Wild's own edits: 50 Lightroom presets for your photos, 12 of them adaptive, and 33 Adobe presets for Photoshop and Premiere Pro.",
        cta="Get MWP Presets", cta2="Compare RAW and final",
        facts=["50 Lightroom presets", "33 Adobe presets for Photoshop and Premiere Pro", "Lightroom Classic panel included"],
        proof_label="From RAW to final", proof_kick="From RAW to final", proof_h=["The same photo,", "before and after."],
        proof_lead="Each example shows the RAW file beside the same file with one preset, plus white balance and exposure.",
        pairs=["Light and Scene · Blue Hour", "Light and Scene · Macro Ground"],
        col=dict(
            kick="Two collections, one purchase", h=["Presets for every edit,", "in Lightroom and Adobe apps."],
            lead="MWP Presets hold two collections of the same MWP colour: Lightroom Presets for your photos, and Adobe Presets (LUTs) for Photoshop and Premiere Pro. You get both.",
            one="Edit photos in Lightroom and video in Premiere Pro? Both collections come in one download, in the same MWP colour.",
            cards=[dict(eyebrow="Collection 01", title="Lightroom Presets", count="50", count_label="presets · 12 adaptive",
                        desc="Five collections for wildlife and nature, made from Matan Wild's own edits. On desktop and on your phone.",
                        rows=[("Files", ".xmp desktop · .dng mobile"), ("Works in", "Lightroom Classic, Lightroom, Lightroom Mobile, Camera Raw"), ("Best for", "Photos, RAW or JPEG")],
                        cta="Explore Lightroom Presets", href="lightroom-presets", alt="Three ibex on a rocky slope at dusk"),
                   dict(eyebrow="Collection 02", title="Adobe Presets", count="33", count_label="LUTs · presets 01 to 33",
                        desc="The colour and tone of presets 01 to 33 as LUTs, for Photoshop, Premiere Pro and other editors that read .cube files.",
                        rows=[("Files", ".cube LUTs"), ("Works in", "Photoshop, Premiere Pro, DaVinci Resolve, Final Cut Pro"), ("Best for", "Video, and photos in Photoshop")],
                        cta="Explore Adobe Presets", href="adobe-presets", alt="Two elephants at sunset")],
            lr=dict(lead="50 presets in five collections, every one started from Matan's own edits. 12 of them adapt to each photo.",
                    ba_h="One preset, before and after", sets_h="Five collections"),
            ad=dict(lead="33 LUTs that carry the colour and tone of presets 01 to 33, so a video or a Photoshop file gets the same MWP look as your photos.",
                    steps_kick="How to use them", steps_h="In Photoshop, in three steps",
                    steps=["Add a Color Lookup adjustment layer", "Choose Load 3D LUT", "Pick an MWP LUT, then set the layer's opacity"],
                    note="Built for standard Rec.709 footage. With LOG footage, convert to Rec.709 first, then apply the LUT."),
            inc=dict(kick="Also included", h=["A panel for Lightroom Classic,", "and video tutorials."],
                     lead="Every copy of MWP Presets comes with a panel for Lightroom Classic (early access), video tutorials and an install guide, at no extra cost. Click a tab to look inside the panel."),
        ),
        bar=[("lightroom-presets", "Lightroom Presets"), ("adobe-presets", "Adobe Presets"), ("included", "Included"), ("faq", "FAQs")],
        inside_kick="Five collections", inside_h=["Five collections,", "for every kind of light."],
        inside_lead="Golden backlight, blue hour, desert sun, soft shade and black and white. Every preset starts from the settings in Matan's own edits.",
        cards=[("Signature", "The MWP look and its variations, from soft to deep.", "Lioness in golden grass"),
               ("Light & Scene", "Golden light, blue hour, desert, water and night.", "Volcano erupting at night"),
               ("Mono", "Black and white in MWP tones.", "Lion walking, black and white"),
               ("Adaptive", "AI masks for the subject, sky and background.", "Golden eagle on a rock"),
               ("Tools", "Exposure, fur detail, vignette and grain.", "Tiger walking out of the forest")],
        lrc_kick="Inside Lightroom Classic", lrc_h=["Seven tabs,", "from the card to the post."],
        lrc_lead="MWP Presets come with a panel for Lightroom Classic: from the first cull to the export, in one window. Early access, with free updates. Click a tab to look inside.",
        lrc=[("Cull", "Turn a day of bursts into a short list. Nothing is ever deleted."),
             ("Organize", "Trips, a collection per day, and 51,471 species for your keywords."),
             ("Expedition", "The edit we teach in camp, one step per line."),
             ("Looks", "A finished mood with a strength slider, and looks of your own."),
             ("Edit", "Subject, sky, background or people: pick an effect, set the strength."),
             ("Color", "Hue, saturation and luminance per colour, and ready fixes like Warm fur."),
             ("Export", "Instagram, web and print sizes, your watermark, and a competition check.")],
        lrc_note="Interactive preview of the real tabs and buttons · Lightroom Classic 13 or newer, Mac and Windows",
        feat_kick="12 adaptive presets", feat_h=["Every photo differs.", "So do they."],
        feat_lead="The 12 adaptive presets use Lightroom's AI masks. They find the subject, the sky and the background in each photo, and adjust each one on its own.",
        feat_points=["Subject: shadows and whites lifted on the animal", "Sky: highlights held, deeper and calmer",
                     "Background: gently darker, so the animal stands out"], feat_alt="Red fox looking at the camera",
        specs=[],
        spec_groups=[("Collection 01 · Lightroom Presets", [("50", "Desktop presets", "XMP for Lightroom Classic, Lightroom and Camera Raw"),
               ("50", "Mobile files", "DNG for Lightroom Mobile on iPhone, iPad and Android"),
               ]),
                     ("Collection 02 · Adobe Presets", [("33", "LUTs", ".cube for Photoshop, Premiere Pro, DaVinci Resolve and Final Cut Pro")]),
                     ("Also included", [("", "Lightroom Classic panel", "Early access. Add it once in Lightroom's Plug-in Manager; the manual is built in"),
                                        ("", "Video tutorials", "Installing and using the presets and the panel, in My downloads"),
                                        ("1", "Install guide", "A page for each program, step by step")])],
        spec_note="Adaptive presets need Lightroom Classic 11+, Lightroom 5+ or Camera Raw 14+. The panel needs Lightroom Classic 13 or newer, on Mac or Windows.",
        final_kick="MWP Presets", final_h=["Start", "your next edit."],
        final_lead="50 presets, the Lightroom Classic panel, 50 mobile files, 33 LUTs and an install guide. Free updates, kept in your account.",
        plan=("MWP Presets", "Lightroom and Adobe presets", ["50 Lightroom presets, desktop and mobile", "33 Adobe presets (LUTs)", "Lightroom Classic panel included"], "Get MWP Presets"),
        plan2=("The full set", "From the shot to the share", ["MWP Presets: presets, LUTs and the Lightroom Classic panel", "MWP Panel: the Photoshop plugin", "MWP Field Guides: 4 PDF guides, 137 lessons"], "Get the full set"),
    ),
    he=dict(
        name="הפריסטים של MWP", name_html='הפריסטים של <span class="grad">MWP</span>',
        title="פריסטים ללייטרום לצילום חיות בר · הפריסטים של MWP",
        desc="50 פריסטים ללייטרום לצילומי חיות בר וטבע. 12 פריסטים אדפטיביים מוצאים את החיה, את השמיים ואת הרקע, כך שהמראה מתאים לתמונה שלכם. עם פאנל ללייטרום קלאסיק, 50 קובצי DNG לנייד ו־33 קובצי LUT לווידאו.",
        hero_alt="לביאה בעשב זהוב, צילום: מתן וויילד",
        kick="הפריסטים של MWP · פריסטים ללייטרום ולאדובי לחיות בר", h1=["עריכה טבעית,", "לחיות בר."],
        lead="שני אוספים מתוך העריכות של מתן וויילד עצמו: 50 פריסטים ללייטרום לתמונות שלכם, 12 מהם אדפטיביים, ו־33 פריסטים לאדובי, לפוטושופ ולפרמייר פרו.",
        cta="לרכישת הפריסטים של MWP", cta2="מ-RAW לתמונה הסופית",
        facts=["50 פריסטים ללייטרום", "33 פריסטים לאדובי, לפוטושופ ולפרמייר פרו", "כולל פאנל ללייטרום קלאסיק"],
        proof_label="מ-RAW לתמונה הסופית", proof_kick="מ-RAW לתמונה הסופית", proof_h=["אותה תמונה,", "לפני ואחרי."],
        proof_lead="בכל דוגמה רואים את קובץ ה-RAW לצד אותו קובץ עם פריסט אחד, איזון לבן וחשיפה.",
        pairs=["אור וסצנה · שעה כחולה", "אור וסצנה · קרקע במאקרו"],
        col=dict(
            kick="שני אוספים, רכישה אחת", h=["פריסטים לכל עריכה,", "בלייטרום ובתוכנות של אדובי."],
            lead="בפריסטים של MWP יש שני אוספים באותו צבע של MWP: פריסטים ללייטרום לתמונות שלכם, ופריסטים לאדובי (קובצי LUT) לפוטושופ ולפרמייר פרו. מקבלים את שניהם.",
            one="עורכים תמונות בלייטרום ווידאו בפרמייר פרו? שני האוספים מגיעים בהורדה אחת, באותו צבע של MWP.",
            cards=[dict(eyebrow="אוסף 01", title="פריסטים ללייטרום", count="50", count_label="פריסטים · 12 אדפטיביים",
                        desc="חמישה אוספים לחיות בר ולטבע, מתוך העריכות של מתן וויילד עצמו. במחשב ובטלפון.",
                        rows=[("קבצים", "‎.xmp למחשב · ‎.dng לנייד"), ("עובד ב", "לייטרום קלאסיק, לייטרום, לייטרום מובייל, קאמרה ראו"), ("מתאים ל", "תמונות, RAW או JPEG")],
                        cta="לפריסטים ללייטרום", href="lightroom-presets", alt="שלושה יעלים במדרון סלעי בדמדומים"),
                   dict(eyebrow="אוסף 02", title="פריסטים לאדובי", count="33", count_label="קובצי LUT · פריסטים 01 עד 33",
                        desc="הצבע והטון של פריסטים 01 עד 33 כקובצי LUT, לפוטושופ, לפרמייר פרו ולתוכנות אחרות שקוראות קובצי ‎.cube.",
                        rows=[("קבצים", "קובצי LUT בפורמט ‎.cube"), ("עובד ב", "פוטושופ, פרמייר פרו, דה־וינצ׳י ריזולב, פיינל קאט פרו"), ("מתאים ל", "וידאו, ותמונות בפוטושופ")],
                        cta="לפריסטים לאדובי", href="adobe-presets", alt="שני פילים בשקיעה")],
            lr=dict(lead="50 פריסטים בחמישה אוספים, כל אחד מתחיל מהעריכות של מתן עצמו. 12 מהם מתאימים את עצמם לכל תמונה.",
                    ba_h="פריסט אחד, לפני ואחרי", sets_h="חמישה אוספים"),
            ad=dict(lead="33 קובצי LUT שנושאים את הצבע והטון של פריסטים 01 עד 33, כך שסרטון או קובץ פוטושופ מקבלים את אותו מראה של MWP כמו התמונות שלכם.",
                    steps_kick="איך משתמשים בהם", steps_h="בפוטושופ, בשלושה צעדים",
                    steps=["מוסיפים שכבת התאמה Color Lookup", "בוחרים Load 3D LUT", "בוחרים LUT של MWP ומכוונים את האטימות של השכבה"],
                    note="בנויים לצילומי וידאו רגילים ב-Rec.709. עם צילומי LOG, ממירים קודם ל-Rec.709 ואז מחילים את ה-LUT."),
            inc=dict(kick="כלול גם", h=["פאנל ללייטרום קלאסיק,", "וסרטוני הדרכה."],
                     lead="כל עותק של הפריסטים של MWP מגיע עם פאנל ללייטרום קלאסיק (גישה מוקדמת), סרטוני הדרכה ומדריך התקנה, בלי תוספת תשלום. לחצו על לשונית כדי להציץ לתוך הפאנל."),
        ),
        bar=[("lightroom-presets", "פריסטים ללייטרום"), ("adobe-presets", "פריסטים לאדובי"), ("included", "כלול"), ("faq", "שאלות נפוצות")],
        inside_kick="חמישה אוספים", inside_h=["חמישה אוספים,", "לכל סוג של אור."],
        inside_lead="אור זהוב מאחור, שעה כחולה, שמש מדברית, צל רך ושחור-לבן. כל פריסט מתחיל מההגדרות שבעריכות של מתן עצמו.",
        cards=[("חתימה", "המראה של MWP והגרסאות שלו, מרך ועד עמוק.", "לביאה בעשב זהוב"),
               ("אור וסצנה", "אור זהוב, שעה כחולה, מדבר, מים ולילה.", "הר געש מתפרץ בלילה"),
               ("מונו", "שחור-לבן בגוונים של MWP.", "אריה הולך, בשחור-לבן"),
               ("אדפטיבי", "מסכות AI לנושא, לשמיים ולרקע.", "עיט זהוב על סלע"),
               ("כלים", "חשיפה, פרטי פרווה, וינייט וגרעין.", "נמר יוצא מהיער")],
        lrc_kick="בתוך לייטרום קלאסיק", lrc_h=["שבע לשוניות,", "מהכרטיס ועד הפרסום."],
        lrc_lead="הפריסטים של MWP מגיעים עם פאנל ללייטרום קלאסיק: מהמיון הראשון ועד הייצוא, בחלון אחד. גישה מוקדמת, עם עדכונים חינמיים. לחצו על לשונית כדי להציץ פנימה.",
        lrc=[("מיון", "הופכים יום של רצפים לרשימה קצרה. שום דבר לא נמחק."),
             ("ארגון", "טיולים, אוסף לכל יום, ו־51,471 מינים למילות המפתח שלכם."),
             ("משלחת", "העריכה שאנחנו מלמדים במחנה, צעד אחד בכל שורה."),
             ("לוקים", "אווירה מוגמרת עם מחוון עוצמה, ולוקים משלכם."),
             ("עריכה", "נושא, שמיים, רקע או אנשים: בוחרים אפקט וקובעים עוצמה."),
             ("צבע", "גוון, רוויה ובהירות לכל צבע, ותיקונים מוכנים כמו פרווה חמה."),
             ("ייצוא", "גדלים לאינסטגרם, לאתר ולהדפסה, סימן המים שלכם ובדיקה לתחרויות.")],
        lrc_note="תצוגה מקדימה של הלשוניות והכפתורים האמיתיים, באנגלית כמו בתוסף · לייטרום קלאסיק 13 ומעלה, מק ו־ווינדוס",
        feat_kick="12 פריסטים אדפטיביים", feat_h=["כל תמונה שונה.", "וכך גם הם."],
        feat_lead="12 הפריסטים האדפטיביים משתמשים במסכות ה-AI של לייטרום. הם מוצאים בכל תמונה את הנושא, את השמיים ואת הרקע, ומכוונים כל אחד בנפרד.",
        feat_points=["נושא: הצללים והלבנים עולים על החיה", "שמיים: האור נשמר, עמוק ורגוע יותר", "רקע: כהה מעט, כך שהחיה בולטת"],
        feat_alt="שועל אדום מביט במצלמה",
        specs=[],
        spec_groups=[("אוסף 01 · פריסטים ללייטרום", [("50", "פריסטים למחשב", "XMP ללייטרום קלאסיק, ללייטרום ולקאמרה ראו"),
               ("50", "קבצים לנייד", "DNG ללייטרום מובייל באייפון, באייפד ובאנדרואיד"),
               ]),
                     ("אוסף 02 · פריסטים לאדובי", [("33", "קובצי LUT", "בפורמט ‎.cube לפוטושופ ולתוכנות וידאו: פרמייר פרו, דה־וינצ׳י ריזולב ופיינל קאט פרו")]),
                     ("כלול גם", [("", "פאנל ללייטרום קלאסיק", "גישה מוקדמת. מוסיפים אותו פעם אחת במנהל התוספים של לייטרום; המדריך מובנה בו"),
                                        ("", "סרטוני הדרכה", "התקנה ושימוש בפריסטים ובפאנל, בעמוד ההורדות שלי"),
                                        ("1", "מדריך התקנה", "עמוד לכל תוכנה, צעד אחר צעד")])],
        spec_note="הפריסטים האדפטיביים דורשים לייטרום קלאסיק 11 ומעלה, לייטרום 5 ומעלה או קאמרה ראו 14 ומעלה. הפאנל דורש לייטרום קלאסיק 13 ומעלה, במק או בווינדוס.",
        final_kick="הפריסטים של MWP", final_h=["התחילו", "את העריכה הבאה."],
        final_lead="50 פריסטים, הפאנל ללייטרום קלאסיק, 50 קבצים לנייד, 33 קובצי LUT ומדריך התקנה. עדכונים בחינם, והכול נשמר בחשבון שלכם.",
        plan=("הפריסטים של MWP", "פריסטים ללייטרום ולאדובי", ["50 פריסטים ללייטרום, למחשב ולנייד", "33 פריסטים לאדובי (קובצי LUT)", "כולל פאנל ללייטרום קלאסיק"], "לרכישת הפריסטים של MWP"),
        plan2=("הסט המלא", "מהצילום ועד השיתוף", ["הפריסטים של MWP: פריסטים, קובצי LUT והפאנל ללייטרום קלאסיק", "הפאנל של MWP: הפלאגין לפוטושופ", "מדריכי השטח של MWP: ‏4 מדריכי PDF, ‏137 שיעורים"], "לסט המלא"),
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
    bundle="presets-panel",
    en=dict(
        name="MWP Panel", name_html='MWP <span class="grad">Panel</span>',
        title="Photoshop Plugin for Wildlife Photographers · MWP Panel",
        desc="Edit wildlife photos in Photoshop without learning layers or masks. Pick the animal, the sky or the background, pick an effect, set the strength. Your original stays locked. Mac and Windows.",
        hero_alt="A tiger, photographed by Matan Wild",
        kick="MWP Panel · Photoshop plugin for wildlife", h1=["Photoshop,", "made easy."],
        lead="Pick the animal, the sky or the background. Pick an effect. Set the strength. The panel builds the masks and layers for you, and your original stays locked.",
        cta="Get MWP Panel", cta2="Compare RAW and final",
        facts=["No layers or masks to learn", "Your original stays locked", "Photoshop 2023 or newer · Mac and Windows"],
        proof_label="From RAW to final", proof_kick="From RAW to final", proof_h=["The animal brighter.", "The sky calmer."],
        proof_lead="Choose the subject or the sky, then an effect. The panel builds the mask and puts the edit on its own layer.",
        pairs=["Subject · Pop", "Background · Darken"],
        inside_kick="What's inside", inside_h=["Four tabs,", "in the order you edit."],
        inside_lead="From the first crop to the Instagram copy, without leaving the panel.",
        cards=[("Prepare", "Crop around the animal, straighten, find and erase dust, denoise. Neutral color in one tap.", "Iceberg under storm light"),
               ("Edit", "Subject, eye, sky, background, lights, darks or any color. 8 effects. Paint them in or out.", "Red fox looking at the camera"),
               ("Style", "11 looks from golden to blue hour to B&W. Sun glow, sunbeams, rim light, spotlight.", "Lion walking, black and white"),
               ("Export", "Your own watermark. Instagram, web and print copies in one step. Apply your edit to a whole series.", "Two elephants at sunset")],
        feat_kick="Built to be safe", feat_h=["No way", "to ruin it."],
        feat_lead="Subject, Sky and Background use Photoshop's own AI. Hold a button to see the area in red before you edit.",
        feat_points=["<strong>Every edit on its own layer.</strong> All edits sit in one MWP group. Your photo underneath stays locked.",
                     "<strong>One button, one undo.</strong> Ctrl+Z takes back a whole button. Before / After shows the original at any time.",
                     "<strong>Exports are new files.</strong> The panel never saves over your original file."],
        feat_alt="Lion walking, black and white", ps_label="Interactive preview of the real panel · the Edit tab, button for button", ps_alt="Young red fox looking at the camera",
        specs=[("", "Photoshop plugin", "Double-click to install. Mac and Windows."),
               ("21", "User Manual · PDF", "21 pages. Every button, step by step, for complete beginners."),
               ("", "Installation Guide · PDF", "Setup step by step, with fixes for common problems."),
               ("", "Built-in guide", "Hover tips and a full help page inside the panel."),
               ("", "Video tutorials", "Installing and using the panel, in My downloads.")],
        spec_note="Works with Photoshop 2023 (24.2) or newer on Mac and Windows. Not for Lightroom, iPad or phones.",
        final_kick="MWP Panel", final_h=["Edit with", "confidence."],
        final_lead="The plugin with both PDF guides and free updates. Or together with MWP Presets, for Lightroom and Photoshop in the same look.",
        plan=("MWP Panel", "Photoshop plugin", ["Photoshop plugin, Mac and Windows", "User Manual · PDF, 21 pages", "Installation Guide · PDF"], "Get MWP Panel"),
        plan2=("MWP Panel + MWP Presets", "Photoshop and Lightroom", ["Everything in MWP Panel", "50 Lightroom presets in the same look", "Lightroom Classic, Lightroom, Lightroom Mobile and Camera Raw"], "Get the bundle"),
    ),
    he=dict(
        name="הפאנל של MWP", name_html='הפאנל של <span class="grad">MWP</span>',
        title="פלאגין לפוטושופ לצלמי חיות בר · הפאנל של MWP",
        desc="עורכים צילומי חיות בר בפוטושופ בלי ללמוד שכבות ומסכות. בוחרים את החיה, את השמיים או את הרקע, בוחרים אפקט וקובעים עוצמה. המקור נשאר נעול. מק ו־ווינדוס.",
        hero_alt="טיגריס, צילום: מתן וויילד",
        kick="הפאנל של MWP · פלאגין לפוטושופ לחיות בר", h1=["פוטושופ,", "בלי להסתבך."],
        lead="בוחרים את החיה, את השמיים או את הרקע. בוחרים אפקט. קובעים עוצמה. הפאנל בונה בשבילכם את המסכות ואת השכבות, והמקור נשאר נעול.",
        cta="לקבלת הפאנל של MWP", cta2="מ-RAW לתמונה הסופית",
        facts=["בלי ללמוד שכבות ומסכות", "המקור נשאר נעול", "פוטושופ 2023 ומעלה · מק ו־ווינדוס"],
        proof_label="מ-RAW לתמונה הסופית", proof_kick="מ-RAW לתמונה הסופית", proof_h=["החיה בהירה יותר.", "השמיים רגועים יותר."],
        proof_lead="בוחרים את הנושא או את השמיים, ואז אפקט. הפאנל בונה את המסכה ושם את העריכה בשכבה נפרדת.",
        pairs=["נושא · הבלטה", "רקע · הכהיה"],
        inside_kick="מה יש בפנים", inside_h=["ארבע לשוניות,", "לפי סדר העריכה."],
        inside_lead="מהחיתוך הראשון ועד העותק לאינסטגרם, בלי לצאת מהפאנל.",
        cards=[("הכנה", "חיתוך סביב החיה, יישור, איתור ומחיקה של כתמי אבק, הפחתת רעש. צבע ניטרלי בנגיעה אחת.", "קרחון באור סערה"),
               ("עריכה", "נושא, עין, שמיים, רקע, אזורים בהירים או כהים, או כל צבע. 8 אפקטים, שאפשר להוסיף או למחוק במכחול.", "שועל אדום מביט במצלמה"),
               ("סגנון", "11 לוקים, מזהוב ועד שעה כחולה ושחור-לבן. זוהר שמש, קרני אור, תאורת קצה וזרקור.", "אריה הולך, בשחור-לבן"),
               ("ייצוא", "סימן מים משלכם. עותקים לאינסטגרם, לאתר ולהדפסה בשלב אחד. העתקת העריכה לסדרה שלמה.", "שני פילים בשקיעה")],
        feat_kick="בנוי להיות בטוח", feat_h=["אין דרך", "להרוס אותה."],
        feat_lead="נושא, שמיים ו-רקע משתמשים ב-AI של פוטושופ עצמו. לחיצה ארוכה על כפתור מראה את האזור באדום, לפני שעורכים.",
        feat_points=["<strong>כל עריכה בשכבה משלה.</strong> כל העריכות יושבות בקבוצת MWP אחת. התמונה שמתחת נשארת נעולה.",
                     "<strong>כפתור אחד, ביטול אחד.</strong> Ctrl+Z מבטל כפתור שלם. לפני / אחרי מראה את המקור בכל רגע.",
                     "<strong>הייצוא תמיד לקובץ חדש.</strong> הפאנל אף פעם לא שומר על הקובץ המקורי."],
        feat_alt="אריה הולך, בשחור-לבן", ps_label="תצוגה מקדימה אינטראקטיבית של הפאנל האמיתי, באנגלית כמו בתוסף · לשונית העריכה, כפתור אחר כפתור", ps_alt="שועל אדום צעיר מביט במצלמה",
        specs=[("", "הפלאגין לפוטושופ", "לחיצה כפולה להתקנה. מק ו־ווינדוס."),
               ("21", "מדריך למשתמש · PDF", "21 עמודים. כל כפתור, צעד אחרי צעד, גם למתחילים גמורים."),
               ("", "מדריך התקנה · PDF", "התקנה צעד אחרי צעד, עם פתרונות לבעיות נפוצות."),
               ("", "מדריך מובנה", "טיפים במעבר עכבר ועמוד עזרה מלא בתוך הפאנל."),
               ("", "סרטוני הדרכה", "התקנה ושימוש בפאנל, בעמוד ההורדות שלי.")],
        spec_note="עובד עם פוטושופ 2023 (‏24.2) ומעלה, במק ובווינדוס. לא ללייטרום, לאייפד או לטלפון.",
        final_kick="הפאנל של MWP", final_h=["עורכים", "בביטחון."],
        final_lead="הפלאגין עם שני מדריכי ה-PDF ועדכונים בחינם. או יחד עם הפריסטים של MWP, ללייטרום ולפוטושופ באותו לוק.",
        plan=("הפאנל של MWP", "פלאגין לפוטושופ", ["פלאגין לפוטושופ, מק ו־ווינדוס", "מדריך למשתמש · PDF, ‏21 עמודים", "מדריך התקנה · PDF"], "לקבלת הפאנל של MWP"),
        plan2=("הפאנל + הפריסטים של MWP", "פוטושופ ולייטרום", ["כל מה שיש בהפאנל של MWP", "50 פריסטים ללייטרום באותו לוק", "לייטרום קלאסיק, לייטרום, לייטרום מובייל, קאמרה ראו"], "לקבלת החבילה"),
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
        title="Wildlife & Nature Photography Guides (PDF) · MWP Field Guides",
        desc="Four visual guides to wildlife and nature photography: 137 one-page lessons on composition, colour, light and planning. Each is a real photo from the field, with a drawing that shows why it works. PDF, English or Hebrew.",
        hero_alt="Mountains at dusk, photographed by Matan Wild",
        kick="MWP Field Guides · wildlife and nature photography guides", h1=["Aim first.", "Then shoot."],
        lead="Four visual guides with 137 one-page lessons on composition, colour, light and planning. Every lesson is a real photo from the field, with a drawing that shows why it works.",
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
        final_lead="4 guides, 137 lessons and 229 pages of composition, colour, light and planning. In English or Hebrew, in one set.",
        plan=("MWP Field Guides", "Learn to shoot: before the click", ["4 field guides, English or Hebrew", "137 lessons, 229 pages", "Cheat sheets, drills and checklists"], "Get the guides"),
        plan2=("The full set", "From the shot to the share", ["MWP Field Guides: 4 PDF guides, 137 lessons", "MWP Presets: presets, LUTs and the Lightroom Classic panel", "MWP Panel: the Photoshop plugin"], "Get the full set"),
    ),
    he=dict(
        name="מדריכי השטח של MWP", name_html='מדריכי השטח של <span class="grad">MWP</span>',
        title="מדריכים לצילום חיות בר וטבע ב-PDF · מדריכי השטח של MWP",
        desc="ארבעה מדריכי צילום טבע חזותיים עם 137 שיעורים של עמוד אחד על קומפוזיציה, צבע, אור ותכנון. כל שיעור הוא צילום אמיתי מהשטח, עם שרטוט שמראה למה הוא עובד. PDF, בעברית או באנגלית.",
        hero_alt="הרים בדמדומים, צילום: מתן וויילד",
        kick="מדריכי השטח של MWP · מדריכים לצילום חיות בר וטבע", h1=["קודם מכוונים.", "אחר כך מצלמים."],
        lead="4 מדריכים חזותיים עם 137 שיעורים של עמוד אחד על קומפוזיציה, צבע, אור ותכנון. כל שיעור הוא צילום אמיתי מהשטח, עם שרטוט שמראה למה הוא עובד.",
        cta="לרכישת הסט", cta2="הציצו פנימה", facts=["137 שיעורים", "עברית או אנגלית", "PDF לכל מכשיר"],
        proof_label="הצצה פנימה", proof_kick="הצצה פנימה", proof_h=["ככה נראה", "כל שיעור."],
        proof_lead="דפדפו בעמודים אמיתיים מתוך המדריך. צילום, שרטוט והסבר קצר, בלי מילים מיותרות.",
        page_alts=["עמוד רקע נקי", "עמוד מספרים אי־זוגיים"],
        inside_kick="מה בסט", inside_h=["4 מדריכים. 4 מיומנויות", "שכל צלם צריך."], inside_lead="",
        cards=[("קומפוזיציה", "איפה למקם, מה להשאיר בחוץ ואיך להוביל את העין. 39 שיעורים.", "פומה מביטה לעדשה"),
               ("צבע", "הרמוניה, טמפרטורה, רוויה ואיזון לבן. 36 שיעורים ו-10 עמודי תיאוריה.", "פאפין בין פרחים צהובים"),
               ("אור", "כיוון, איכות, שעה וחשיפה. 25 שיעורים ו-8 כלי אור.", "לינקס באור צד"),
               ("תכנון", "עונות, שמיים, אפליקציות, שטח וציוד. 37 שיעורים ו-13 כלי תכנון.", "שועל צעיר מביט לעדשה")],
        feat_kick="למה זה עובד", feat_h=["שיעור שלם", "בעמוד אחד."],
        feat_lead='בכל עמוד: צילום אמיתי, שרטוט שמראה מה קורה בו, והסבר של משפט או שניים שקל לזכור בשטח. ובסוף כל שיעור, "שוברים את הכלל": מתי כדאי ללכת נגד הכלל, ואיך.',
        feat_points=[], feat_alt="העמוד מקום למבט מתוך מדריך הקומפוזיציה",
        steps_kick="שלושה צעדים", steps_h=["קוראים, מתרגלים,", "יוצאים לצלם."],
        steps=[("קוראים שיעור", "עמוד אחד, רעיון אחד. אפשר להתחיל מכל מדריך ומכל עמוד.", "עמוד התאורה האחורית מתוך מדריך האור"),
               ("מתרגלים", "בכל מדריך יש תרגילים, צ׳קליסט ודף סיכום שלוקחים לשטח.", "צ׳קליסט בודקים את הפריים"),
               ("יוצאים לצלם", "מגיעים לסצנה עם תוכנית, ויודעים מה לחפש בעינית.", "צלם שוכב על הקרח ומצלם")],
        specs=[("4", "מדריכים", "קומפוזיציה, צבע, אור ותכנון"),
               ("137", "שיעורים", "כל אחד בעמוד: צילום אמיתי, שרטוט והסבר קצר"),
               ("31", "כלים ודיאגרמות", "ובכל מדריך תרגילים, צ׳קליסט ודף סיכום"),
               ("229", "עמודים", "PDF לכל מכשיר, בעברית או באנגלית: בוחרים שפה אחת")],
        spec_note="",
        final_kick="מדריכי השטח של MWP", final_h=["הצילום הבא שלכם", "מתחיל כאן."],
        final_lead="4 מדריכים, 137 שיעורים ו-229 עמודים של קומפוזיציה, צבע, אור ותכנון. בעברית או באנגלית, בסט אחד.",
        plan=("מדריכי השטח של MWP", "לומדים לצלם: לפני הקליק", ["4 מדריכי שטח, עברית או אנגלית", "137 שיעורים, 229 עמודים", "דפי סיכום, תרגילים וצ׳קליסטים"], "לרכישת הסט"),
        plan2=("הסט המלא", "מהצילום ועד השיתוף", ["מדריכי השטח של MWP: ‏4 מדריכי PDF, ‏137 שיעורים", "הפריסטים של MWP: פריסטים, קובצי LUT והפאנל ללייטרום קלאסיק", "הפאנל של MWP: הפלאגין לפוטושופ"], "לסט המלא"),
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
            {"@type": "ListItem", "position": 1, "name": u["home"], "item": f"{SITE}/"},
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
    proof_id = "compare" if p["proof_type"] == "ba" else "inside"
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
<div class="ctas in" style="--i:3"><a class="btn" href="#buy" data-add-to-cart="{slug}">{esc(c["cta"])} <span class="pr">· {price(slug, lang)}</span></a></div>
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
    if p.get("ps_show"):   # MWP Panel: Photoshop as one centred showcase, like the Lightroom Classic one
        ba, fa, areas, tall = p["ps_photo"]
        descs = "".join(f'<p data-pw-desc="{esc(t2)}"{"" if k == 1 else " hidden"}><span class="n">0{k + 1}</span><b>{esc(t)}</b><span>{esc(d)}</span></p>'
                        for k, ((t, d, alt), t2) in enumerate(zip(c["cards"], ("Prepare", "Edit", "Style", "Export"))))
        parts.append(f'''<section class="sec tint" id="{inside_id}">
<div class="wrap">
<div class="head c" data-r><p class="kick">{esc(c["inside_kick"])}</p>{h(c["inside_h"])}{lead}</div>
<div class="lrc pws" data-pws data-r><p class="lrc-label"><i aria-hidden="true"></i><span>{esc(c["ps_label"].split(" · ")[0])}<span class="req"> · {esc(c["ps_label"].split(" · ")[1])}</span></span></p>
<div class="lrc-stage"><div class="psw" lang="en" dir="ltr" data-no-i18n><div class="psw-bar"><i></i><i></i><i></i><span>Photoshop</span></div>
<div class="psw-main"><div class="psw-canvas" data-areas="{esc(json.dumps(areas))}"><div class="psw-pic{" tall" if tall else ""}"><img class="psw-after" src="{img(fa)}" alt="{esc(c["ps_alt"])}" loading="lazy"><div class="psw-layers"></div><div class="psw-mask"></div>{f'<img class="psw-before" src="{img(ba)}" alt="" loading="lazy">' if ba else ""}</div><span class="psw-tag">Before</span><span class="psw-sim">Simulated on this page · in Photoshop the panel builds real masks</span></div>
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
    if "lrc" in c:
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
        parts = parts[:1] + presets_layout.sections(p, c, u, lang, h, esc, img, gallery, lrc_window, CHECK, ARROW)

    # what's in the download
    def spec_rows(specs):
        return "".join(f'<div class="row"><dt>{f"<b>{esc(n)}</b>" if n else ""}{esc(t)}</dt><dd>{esc(d)}</dd></div>' for n, t, d in specs)
    rows = ("".join(f'<p class="spec-group">{esc(g)}</p>' + spec_rows(sp) for g, sp in c["spec_groups"]) if "spec_groups" in c
            else spec_rows(c["specs"]))
    note = f'<p class="note">{esc(c["spec_note"])}</p>' if c["spec_note"] else ""
    parts.append(f'''<section class="sec tint" id="specs">
<div class="wrap specs">
<div class="head" data-r><p class="kick">{u["spec_kick"]}</p><h2 class="h2">{u["spec_h"]}</h2></div>
<div data-r style="--d:.1s"><dl>{rows}</dl>{note}</div>
</div>
</section>''')

    # FAQs
    qa = "".join(f'<details><summary>{esc(f["q"])}<i aria-hidden="true"></i></summary><div class="a"><p>{esc(f["a"])}</p></div></details>' for f in FAQS[folder][lang])
    parts.append(f'''<section class="sec" id="faq">
<div class="wrap">
<div class="head c" data-r><p class="kick">{u["faq_kick"]}</p><h2 class="h2">{u["faq"]}</h2></div>
<div class="faq" data-r>{qa}</div>
<p class="small">{u["more"]} <a href="/support/">{u["write"]}</a></p>
</div>
</section>''')

    # closing call with the two price cards
    def plan(data, s, hi=False, badge=""):
        name, sub, pts, cta = data
        li = "".join(f"<li>{CHECK}<span>{esc(x)}</span></li>" for x in pts)
        deal = (f'<p class="deal"><s>{price(s, lang, was=True)}</s> <span class="save" data-save="{s}" data-no-i18n hidden></span></p>'
                if s != slug else "")   # bundles: the sum of the parts struck out, and the saving
        return (f'<div class="plan{" hi" if hi else ""}" data-r>{f"<span class=badge>{badge}</span>" if badge else ""}<h3>{esc(name)}</h3><p class="sub">{esc(sub)}</p>'
                f'<div class="amt">{price(s, lang)}</div>{deal}<ul>{li}</ul>'
                f'<a class="{"btn" if hi else "ghost"}" href="#buy" data-add-to-cart="{s}">{esc(cta)}</a></div>')
    parts.append(f'''<section class="final" id="buy">
<img src="{img(p["final_img"])}" alt="" loading="lazy">
<div class="wrap">
<div class="head c" data-r><p class="kick">{esc(c["final_kick"])}</p>{h(c["final_h"])}<p class="lead">{esc(c["final_lead"])}</p></div>
<div class="prices">{plan(c["plan"], slug, hi=True)}{plan(c["plan2"], p["bundle"], badge=u["bundle"])}</div>
<p class="small">{u["trust"]} · <a href="/legal/">{u["terms"]}</a></p>
</div>
</section>''')

    # product bar
    bar_links = [(proof_id, c["proof_label"]), (inside_id, c.get("bar_inside", u["inside"])), ("faq", u["faq"])]
    if "bar" in c:   # a page with its own layout lists its own sections
        bar_links = c["bar"]
    bar = (f'<div class="pbar" aria-label="{esc(c["name"])}"><div class="wrap"><span class="nm" data-no-i18n>{c["name_html"]}</span>'
           f'<nav>{"".join(f"<a href=#{i}>{esc(t)}</a>" for i, t in bar_links)}</nav>'
           f'<span class="pp">{price(slug, lang)}</span><a class="btn sm" href="#buy" data-add-to-cart="{slug}">{u["buy"]}</a></div></div>')

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
<meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}{img(p["hero_img"])}">
<meta property="og:image:alt" content="{esc(c["hero_alt"])}"><meta property="og:locale" content="{"he_IL" if he else "en_US"}">
<meta name="twitter:card" content="summary_large_image">
{ICONS}
<script type="application/ld+json">{structured(folder, lang, url)}</script>
<script type="application/json" id="mwp-product">{json.dumps({"slug": slug, "name": c["name"], "description": c["desc"], "image": SITE + img(p["hero_img"]), "url": url}, ensure_ascii=False).replace("</", "<" + chr(92) + "/")}</script>
<link rel="preload" as="image" href="{img(p["hero_img"])}" fetchpriority="high">
<link rel="stylesheet" href="/assets/css/product.css?v={CSS_V}">
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


if __name__ == "__main__":
    for folder in P:
        en, he = page(folder, "en"), page(folder, "he")
        os.makedirs(os.path.join(ROOT, folder, "he"), exist_ok=True)
        for path, html in [(f"{folder}/index.html", en), (f"{folder}/he/index.html", he), (f"{folder}/he.html", he)]:
            open(os.path.join(ROOT, path), "w", encoding="utf-8").write(html)
        print("built", folder)
