"""MWP Ambassador Program terms: Matan's text, shared by the page (tools/build_beta.py) and the signed-terms
PDF (tools/personalize/terms_pdf.py), so the PDF always matches what the person accepted.
Change the wording only with Matan's OK, and when you do, bump TERMS_VERSION here AND in
supabase/functions/beta/index.ts (each acceptance records the version).
Blocks: ("p", html) a paragraph, ("ul", [html, ...]) a list. Only <strong> and <a> tags are used."""

TERMS_VERSION = "2026-10-24.6"   # .6: the Lightroom Classic plugin is included (Matan, 24 Oct 2026). .5: the monthly reel is optional. .2: the Field Guides are included; Facebook page is MW Photo Tours. .3: guides are read online. .4: Hebrew text writes MWP in Latin letters

TERMS_DATE = "Oct 24, 2026"
TERMS_INTRO = [
    "The MWP Ambassador Program gives a small group of selected photographers free access to the MWP - PS Panel, the MWP - Signature Preset Pack, the MWP Lightroom Classic Plugin and the MWP Field Guides. In return, we ask ambassadors to create with them, share their work, tell their audience about the experience, and send us feedback and bug reports that help us improve the tools. These terms explain what you get, what we ask, and how we both use the content.",
    "By accepting your access, you agree to these terms.",
]
TERMS = [
    ("Your free license", [
        ("p", 'MW Photo Tours ("MWP", "we") grants you a free, personal, non-exclusive, non-transferable, lifetime license to use:'),
        ("ul", ["MWP - PS Panel", "MWP - Signature Preset Pack", "MWP Lightroom Classic Plugin", "MWP Field Guides, to read online in your account (they can't be downloaded)", "All future updates to all four, for life"]),
        ("p", "You may use them on your own photos, for personal and professional work, including paid client work. The license is for you only. It covers up to 2 devices."),
    ]),
    ("What we invite you to do", [
        ("p", "We want you to use the tools freely and show what they can do. You're welcome to:"),
        ("ul", ["Edit and publish your photos made with the panel and presets",
                "Share before/after comparisons and editing walkthroughs",
                "Post feed posts, reels, stories and carousels about your workflow",
                "Create Instagram collaborative posts with @mw_phototours",
                "Write about your honest experience: reviews, blog posts, newsletters, YouTube"]),
        ("p", "<strong>What we ask in return:</strong> during your first 3 months, at least 3 posts and 1 optional reel per month, plus at least 1 story per week, all tagging MWP as described in section 3. After that, for the rest of the year, simply tag and mention us whenever you use the tools and are happy with the results. These are minimums: if you love the results, we'd love to see you share more of everything. Your opinions are your own. We never ask for a positive review, only an honest one."),
    ]),
    ("Tagging and disclosure", [
        ("p", "When you publish work made with the panel or presets:"),
        ("ul", ["Tag @mw_phototours on Instagram and MW Photo Tours on Facebook, in the post and on the image",
                "Use #mwppanel #mwppresets #jointhewildsideofphotography",
                "Mention the panel or preset by name when you talk about your edit"]),
        ("p", "Because you received the tools for free, your audience must know that. Mark sponsored or gifted content clearly, using the platform's \"Paid partnership\" label or #ad / #gifted at the start of the caption. This is required by consumer-protection rules in Israel and most other countries, and it protects both of us."),
    ]),
    ("Your content and how we use it", [
        ("p", "Your photos, videos and texts remain yours. You keep full copyright."),
        ("p", "You give MWP a free, non-exclusive, worldwide license to reshare content you publish about the panel or presets, always with credit to you. This covers:"),
        ("ul", ["Reposting on MWP social media, stories and highlights",
                "Showing it on the MWP website, product pages and newsletter",
                "Quoting short parts of your written reviews"]),
        ("p", "For paid ads or printed materials, we will ask you first and get your written OK. You can ask us to stop using a specific piece at any time; we'll remove it from new uses within 14 days."),
    ]),
    ("Feedback and your direct line", [
        ("p", "Feedback is a core part of the program. Ambassadors help us find issues, fix them and shape what comes next. As an ambassador, you commit to:"),
        ("ul", ["Share honest feedback on the panel and presets: what works, what's missing, what you'd change",
                "Report bugs and glitches to our team as soon as you hit them, with a screenshot and your version and setup, so we can run fixes quickly",
                "Try new updates and tell us what you think"]),
        ("p", "In return, you'll be in regular contact with our team through Emilya, and you'll have a direct line to Matan. MWP may use your feedback and suggestions to improve its tools, with no payment owed."),
    ]),
    ("What's not allowed", [
        ("ul", ["Sharing, selling, giving away or uploading the panel, plugin or preset files, screenshots or copies of the guides, or your access, to anyone",
                "Copying, modifying or repackaging the presets or guides as your own product",
                "Reverse-engineering the panel or the plugin",
                "Claiming the presets are your own creation",
                "Using MWP's name or logo outside posts about your experience, or in a way that suggests you speak for MWP",
                "Publishing content that is offensive, misleading, or harms wildlife or nature for a photo"]),
        ("p", "If you're unsure whether something is OK, just ask us first."),
    ]),
    ("Duration and ending the program", [
        ("p", "The ambassadorship runs for 12 months from the day you accept, and can be renewed by mutual agreement."),
        ("p", "Either side can end it at any time with written notice (email or WhatsApp is enough). MWP may end it immediately if these terms are broken."),
        ("p", "When it ends:"),
        ("ul", ["Your license to the panel, presets, plugin and guides stays with you for life, including future updates, unless the program ended because of a breach of section 6",
                "Content you already published can stay up",
                "MWP may keep content it already reshared, but won't start new uses"]),
    ]),
    ("General", [
        ("ul", ["<strong>No payment, no employment.</strong> The free license is the full benefit. You're an independent creator, not an MWP employee, agent or partner.",
                "<strong>As is.</strong> The panel, presets, plugin and guides are provided as is. MWP isn't liable for lost files, edits or software issues; please keep backups.",
                "<strong>Changes.</strong> We may update these terms. We'll let you know, and continuing in the program means you accept the update.",
                '<strong>Contact.</strong> Day-to-day contact is with Emilya from our team, and you have a direct line to Matan. General address: <a href="mailto:contact@matanwildphotography.com">contact@matanwildphotography.com</a>.']),
    ]),
]


# ---------------------------------------------------------------- Hebrew (Matan: everything in Hebrew on the Hebrew site)
# The same terms in Hebrew, chapter for chapter. Handles, hashtags and the email stay as they're typed.
TERMS_DATE_HE = "24 באוקטובר 2026"
TERMS_INTRO_HE = [
    "תוכנית השגרירים של MWP נותנת לקבוצה קטנה של צלמים נבחרים גישה חינמית לפאנל של MWP, לפריסטים של MWP, לתוסף של MWP ללייטרום קלאסיק ולמדריכי השטח של MWP. בתמורה, אנחנו מבקשים מהשגרירים ליצור איתם, לשתף את העבודות, לספר לקהל שלהם על החוויה, ולשלוח לנו משוב ודיווחי תקלות שעוזרים לנו לשפר את הכלים. התנאים האלה מסבירים מה מקבלים, מה אנחנו מבקשים, ואיך שנינו משתמשים בתוכן.",
    "כשאתם מאשרים את הגישה, אתם מסכימים לתנאים האלה.",
]
TERMS_HE = [
    ("הרישיון החינמי שלכם", [
        ("p", 'אם־דבליו פוטו טורס ("MWP", "אנחנו") מעניקה לכם רישיון חינמי, אישי, לא בלעדי, שאינו ניתן להעברה ולכל החיים, לשימוש ב:'),
        ("ul", ["הפאנל של MWP", "הפריסטים של MWP", "התוסף של MWP ללייטרום קלאסיק", "מדריכי השטח של MWP, לקריאה אונליין בחשבון שלכם (אי אפשר להוריד אותם)", "כל העדכונים העתידיים לארבעתם, לכל החיים"]),
        ("p", "מותר להשתמש בהם בתמונות שלכם, לעבודה אישית ומקצועית, כולל עבודות בתשלום ללקוחות. הרישיון הוא לכם בלבד, ומכסה עד 2 מכשירים."),
    ]),
    ("מה אנחנו מזמינים אתכם לעשות", [
        ("p", "אנחנו רוצים שתשתמשו בכלים בחופשיות ותראו מה הם יכולים לעשות. אתם מוזמנים:"),
        ("ul", ["לערוך ולפרסם תמונות שעשיתם עם הפאנל והפריסטים",
                "לשתף השוואות לפני ואחרי והדגמות עריכה",
                "לפרסם פוסטים, רילס, סטוריז וקרוסלות על תהליך העבודה שלכם",
                "ליצור פוסטים משותפים באינסטגרם עם @mw_phototours",
                "לכתוב על החוויה הכנה שלכם: ביקורות, פוסטים בבלוג, ניוזלטרים, יוטיוב"]),
        ("p", "<strong>מה אנחנו מבקשים בתמורה:</strong> בשלושת החודשים הראשונים, לפחות 3 פוסטים בחודש ורילס אחד אם תרצו, ועוד לפחות סטורי אחד בשבוע, כולם עם תיוג של MWP כמתואר בסעיף 3. אחר כך, לשאר השנה, פשוט מתייגים ומזכירים אותנו בכל פעם שמשתמשים בכלים ומרוצים מהתוצאה. אלה המינימום: אם אתם אוהבים את התוצאות, נשמח לראות אתכם משתפים עוד מכל דבר. הדעות שלכם הן שלכם. אנחנו אף פעם לא מבקשים ביקורת חיובית, רק כנה."),
    ]),
    ("תיוג וגילוי נאות", [
        ("p", "כשאתם מפרסמים עבודה שנעשתה עם הפאנל או הפריסטים:"),
        ("ul", ["מתייגים את @mw_phototours באינסטגרם ואת אם־דבליו פוטו טורס בפייסבוק, בפוסט ועל התמונה",
                "משתמשים ב-#mwppanel #mwppresets #jointhewildsideofphotography",
                "מזכירים את הפאנל או את הפריסט בשמם כשמדברים על העריכה"]),
        ("p", "מכיוון שקיבלתם את הכלים בחינם, הקהל שלכם צריך לדעת את זה. סמנו בבירור תוכן ממומן או תוכן שקיבלתם במתנה, עם תווית \"שיתוף פעולה בתשלום\" של הפלטפורמה או #ad / #gifted בתחילת הכיתוב. זה נדרש לפי כללי הגנת הצרכן בישראל וברוב המדינות, וזה מגן על שנינו."),
    ]),
    ("התוכן שלכם ואיך אנחנו משתמשים בו", [
        ("p", "התמונות, הסרטונים והטקסטים שלכם נשארים שלכם. זכויות היוצרים המלאות נשארות אצלכם."),
        ("p", "אתם נותנים ל-MWP רישיון חינמי, לא בלעדי ובכל העולם לשתף מחדש תוכן שאתם מפרסמים על הפאנל או הפריסטים, תמיד עם קרדיט לכם. זה כולל:"),
        ("ul", ["שיתוף מחדש ברשתות החברתיות, בסטוריז ובהיילייטס של MWP",
                "הצגה באתר של MWP, בעמודי המוצרים ובניוזלטר",
                "ציטוט קטעים קצרים מהביקורות הכתובות שלכם"]),
        ("p", "לפרסומות בתשלום או לחומרים מודפסים, נשאל אתכם קודם ונקבל את האישור שלכם בכתב. אפשר לבקש מאיתנו להפסיק להשתמש ביצירה מסוימת בכל עת; נוריד אותה משימושים חדשים תוך 14 יום."),
    ]),
    ("משוב וקו ישיר", [
        ("p", "משוב הוא חלק מרכזי בתוכנית. השגרירים עוזרים לנו למצוא בעיות, לתקן אותן ולעצב את מה שיבוא. כשגרירים, אתם מתחייבים:"),
        ("ul", ["לשתף משוב כן על הפאנל והפריסטים: מה עובד, מה חסר, מה הייתם משנים",
                "לדווח לצוות שלנו על באגים ותקלות ברגע שנתקלים בהם, עם צילום מסך, הגרסה וההגדרות שלכם, כדי שנוכל לתקן מהר",
                "לנסות עדכונים חדשים ולספר לנו מה דעתכם"]),
        ("p", "בתמורה, תהיו בקשר קבוע עם הצוות שלנו דרך אמיליה, ויהיה לכם קו ישיר למתן. MWP רשאית להשתמש במשוב ובהצעות שלכם כדי לשפר את הכלים, בלי תשלום."),
    ]),
    ("מה אסור", [
        ("ul", ["לשתף, למכור, למסור או להעלות את קובצי הפאנל, התוסף או הפריסטים, צילומי מסך או עותקים של המדריכים, או את הגישה שלכם, לאף אחד",
                "להעתיק, לשנות או לארוז מחדש את הפריסטים או המדריכים כמוצר שלכם",
                "לפרק את הפאנל או התוסף כדי להבין או לשכפל את הקוד שלהם",
                "לטעון שהפריסטים הם יצירה שלכם",
                "להשתמש בשם או בלוגו של MWP מחוץ לפוסטים על החוויה שלכם, או בדרך שמשתמע ממנה שאתם מדברים בשם MWP",
                "לפרסם תוכן פוגעני, מטעה, או כזה שפוגע בחיות בר או בטבע לטובת תמונה"]),
        ("p", "אם אתם לא בטוחים שמשהו בסדר, פשוט שאלו אותנו קודם."),
    ]),
    ("משך התוכנית וסיומה", [
        ("p", "השגרירות נמשכת 12 חודשים מהיום שאישרתם, ואפשר לחדש אותה בהסכמה של שני הצדדים."),
        ("p", "כל צד יכול לסיים אותה בכל עת בהודעה בכתב (מייל או וואטסאפ מספיקים). MWP רשאית לסיים אותה מיד אם התנאים האלה הופרו."),
        ("p", "כשהיא מסתיימת:"),
        ("ul", ["הרישיון שלכם לפאנל, לפריסטים, לתוסף ולמדריכים נשאר אצלכם לכל החיים, כולל עדכונים עתידיים, אלא אם התוכנית הסתיימה בגלל הפרה של סעיף 6",
                "תוכן שכבר פרסמתם יכול להישאר",
                "MWP רשאית להשאיר תוכן שכבר שיתפה מחדש, אבל לא תתחיל שימושים חדשים"]),
    ]),
    ("כללי", [
        ("ul", ["<strong>בלי תשלום, בלי העסקה.</strong> הרישיון החינמי הוא ההטבה כולה. אתם יוצרים עצמאיים, לא עובדים, סוכנים או שותפים של MWP.",
                "<strong>כמות שהם.</strong> הפאנל, הפריסטים, התוסף והמדריכים ניתנים כמות שהם. MWP אינה אחראית לקבצים, לעריכות או לתקלות תוכנה שאבדו; שמרו גיבויים.",
                "<strong>שינויים.</strong> אנחנו עשויים לעדכן את התנאים האלה. נודיע לכם, והמשך ההשתתפות בתוכנית פירושו שאתם מקבלים את העדכון.",
                '<strong>יצירת קשר.</strong> הקשר השוטף הוא עם אמיליה מהצוות שלנו, ויש לכם קו ישיר למתן. הכתובת הכללית: <a href="mailto:contact@matanwildphotography.com">contact@matanwildphotography.com</a>.']),
    ]),
]
assert len(TERMS_HE) == len(TERMS) and all(len(a[1]) == len(b[1]) for a, b in zip(TERMS, TERMS_HE))
