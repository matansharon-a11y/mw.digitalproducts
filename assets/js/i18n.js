// ============================================================================
// EN / עב switch for the shop pages. English is the source text; this file
// holds the Hebrew. With Hebrew chosen, the page flips to right-to-left and
// every known string (including text the scripts add later) is shown in
// Hebrew. Product names and descriptions come from the database as written.
// The choice is remembered and shared with the sales pages.
// ============================================================================
const KEY = "mwp_lang";

export function getLang() {
  try { return localStorage.getItem(KEY) === "he" ? "he" : "en"; } catch { return "en"; }
}
function setLang(lang) {
  try { localStorage.setItem(KEY, lang); } catch { /* private mode: still switches this page */ }
}

const HE = {
  // header, banner, footer
  "Skip to content": "דילוג לתוכן",
  "Instant download after payment": "הורדה מיידית אחרי התשלום",
  "Secure card checkout": "תשלום מאובטח בכרטיס",
  "Free updates to everything you buy": "עדכונים חינם לכל מה שקונים",
  "MWP, home": "MWP, דף הבית",
  "Menu": "תפריט",
  "Main": "ראשי",
  "All products": "כל המוצרים",
  "Presets": "פריסטים",
  "Plugin": "פלאגין",
  "Guides & PDFs": "מדריכים ו-PDF",
  "Bundles": "חבילות",
  // copy rewrite from the audience research (Oct 2026, drafts for Matan)
  "MWP · by wildlife photographer Matan Wild": "MWP · מאת צלם חיות הבר מתן וויילד",
  "Your wildlife photos,": "צילומי חיות הבר שלכם,",
  "the way you saw them.": "כמו שראיתם אותם.",
  "Lightroom presets, a Photoshop plugin and field guides from wildlife photographer Matan Wild. The animal stands out, the light stays true, and nothing looks fake.": "פריסטים ללייטרום, פלאגין לפוטושופ ומדריכי שטח מאת צלם חיות הבר מתן וויילד. החיה בולטת, האור נשאר אמיתי, ושום דבר לא נראה מזויף.",
  "Find your tool": "מצאו את הכלי שלכם",
  "Start where you get stuck.": "מתחילים איפה שנתקעים.",
  "Not sure what makes a strong wildlife photo? Start with the Field Guides. Lightroom feels confusing? MWP Presets. Photoshop feels like a maze of menus? MWP Panel.": "לא בטוחים מה עושה צילום חיות בר חזק? מתחילים במדריכי השטח. לייטרום מבלבל? הפריסטים של MWP. פוטושופ מרגיש כמו מבוך של תפריטים? הפאנל של MWP.",
  "Know what to aim for, before you press the shutter": "לדעת למה לכוון, עוד לפני שלוחצים",
  "Every guide ends with drills, a checklist and a cheat sheet for your next shoot.": "כל מדריך נגמר בתרגילים, צ׳קליסט ודף סיכום לצילום הבא שלכם.",
  "A natural starting point for every photo": "נקודת פתיחה טבעית לכל תמונה",
  "50 Lightroom presets made from Matan Wild's own wildlife and landscape edits. 12 are adaptive: they find the animal, the sky and the background and treat each one on its own.": "50 פריסטים ללייטרום, מתוך העריכות של מתן וויילד לצילומי חיות בר ונופים. 12 מהם אדפטיביים: הם מוצאים את החיה, את השמיים ואת הרקע, ומטפלים בכל אחד בנפרד.",
  "You set the strength. On desktop, on your phone and, with 33 LUTs, on video.": "את העוצמה קובעים אתם. במחשב, בטלפון, ועם 33 קובצי LUT גם בווידאו.",
  "Photoshop, without the maze of menus": "פוטושופ, בלי מבוך התפריטים",
  "Pick the animal, the sky or the background. Pick an effect. Set the strength. The panel builds the masks and layers for you.": "בוחרים את החיה, את השמיים או את הרקע. בוחרים אפקט. קובעים עוצמה. הפאנל בונה בשבילכם את המסכות ואת השכבות.",
  "Your original stays locked, and one undo takes back a whole button.": "המקור נשאר נעול, וביטול אחד מחזיר כפתור שלם.",
  "Edit wildlife photos so they look the way you saw them: Lightroom presets, a Photoshop plugin and field guides by wildlife photographer Matan Wild. Instant download, free updates.": "לערוך צילומי חיות בר כך שייראו כמו שראיתם אותם: פריסטים ללייטרום, פלאגין לפוטושופ ומדריכי שטח מאת צלם חיות הבר מתן וויילד. הורדה מיידית ועדכונים חינם.",
  "The Field Guides help you take a stronger photo. MWP Presets and MWP Panel help you finish it, in Lightroom or Photoshop. Every bundle costs less than its parts.": "מדריכי השטח עוזרים לצלם תמונה חזקה יותר. הפריסטים והפאנל של MWP עוזרים לסיים אותה, בלייטרום או בפוטושופ. כל חבילה עולה פחות מהחלקים שלה.",
  "Know what to aim for": "לדעת למה לכוון",
  "The same look in Lightroom and Photoshop": "אותו מראה בלייטרום ובפוטושופ",
  "Wildlife Lightroom Presets, Photoshop Plugin & Guides · MWP": "פריסטים ללייטרום, פלאגין לפוטושופ ומדריכים לצילום חיות בר · MWP",
  "A natural starting point for every wildlife photo": "נקודת פתיחה טבעית לכל צילום חיות בר",
  "Photoshop for wildlife. No Photoshop skills needed.": "פוטושופ לחיות בר. בלי ידע בפוטושופ.",
  "Know what to aim for before you press the shutter": "לדעת למה לכוון לפני שלוחצים",
  "Explore": "לפרטים",
  "Everything": "כל המוצרים",
  "Contents": "תוכן העניינים",
  "Help": "עזרה",
  "My downloads": "ההורדות שלי",
  "Editing tools and guides from wildlife photographer Matan Wild.": "כלי עריכה ומדריכים מצלם חיות הבר מתן וויילד.",
  "Shop": "חנות",
  "Contact support": "פנייה לתמיכה",
  "Refunds": "החזרים",
  "Licence": "רישיון",
  "Matan Wild": "מתן וויילד",
  "Payments processed securely by Lemon Squeezy ·": "התשלומים מעובדים בצורה מאובטחת על ידי Lemon Squeezy ·",
  "Terms": "תנאים",
  "Privacy": "פרטיות",
  "Language": "שפה",

  // home
  "MWP · Presets, guides and tools by Matan Wild": "MWP · פריסטים, מדריכים וכלים מאת מתן וויילד",
  "Editing tools from the field.": "כלי עריכה מהשטח.",
  "Presets, guides and an editing plugin made by wildlife photographer Matan Wild, for photographers who edit what they shoot outdoors.":
    "פריסטים, מדריכים ופלאגין לעריכה מאת צלם חיות הבר מתן וויילד, לצלמים שעורכים את מה שהם מצלמים בטבע.",
  "Search the shop": "חיפוש בחנות",
  "Search presets, guides and more": "חיפוש פריסטים, מדריכים ועוד",
  "Search": "חיפוש",
  "Popular searches": "חיפושים פופולריים",
  "Snow": "שלג",
  "Forest light": "אור ביער",
  "Birds": "ציפורים",
  "Safari": "ספארי",
  "Black and white": "שחור-לבן",
  "Shop by category": "קנייה לפי קטגוריה",
  "New and featured": "חדש ומומלץ",
  "View all products": "לכל המוצרים",
  "Why buy here": "למה לקנות כאן",
  "Instant download": "הורדה מיידית",
  "Your files are ready the moment you pay.": "הקבצים מוכנים ברגע שמשלמים.",
  "Secure checkout": "תשלום מאובטח",
  "Card payment through Lemon Squeezy. We never see your card.": "תשלום בכרטיס דרך Lemon Squeezy. אנחנו אף פעם לא רואים את פרטי הכרטיס.",
  "Free updates": "עדכונים חינם",
  "New versions land in your downloads at no cost.": "גרסאות חדשות מגיעות להורדות שלכם בלי עלות.",
  "Real support": "תמיכה אמיתית",
  "A person replies within one business day.": "אדם אמיתי עונה תוך יום עסקים אחד.",
  "How buying works": "איך קונים",
  "Choose": "בוחרים",
  "Pick a product and check what it works with.": "בוחרים מוצר ובודקים עם מה הוא עובד.",
  "Pay": "משלמים",
  "Card checkout opens on this page. A receipt arrives by email.": "התשלום בכרטיס נפתח בעמוד הזה. הקבלה מגיעה במייל.",
  "Download": "מורידים",
  "Sign in with the link we email you and download any time.": "נכנסים עם הקישור שנשלח במייל ומורידים מתי שרוצים.",
  "Install": "מתקינים",
  "Every download includes a short install guide.": "כל הורדה כוללת מדריך התקנה קצר.",
  "Try two presets free": "שני פריסטים במתנה",
  "See how they work on your own photos before you buy. They arrive by email in a minute.": "תראו איך הם עובדים על התמונות שלכם לפני שקונים. הם מגיעים במייל תוך דקה.",
  "Email address": "כתובת מייל",
  "Send me the presets": "שלחו לי את הפריסטים",
  "Email me the free presets and occasional news. Unsubscribe anytime.": "שלחו לי את הפריסטים החינמיים ועדכונים מדי פעם. אפשר להסיר את עצמי בכל רגע.",
  "Questions": "שאלות",
  // landing menu, About Matan, hero, My details (drafts for Matan)
  "FAQs": "שאלות נפוצות",
  "About Matan": "על מתן",
  "Tools from a photographer": "כלים של צלם",
  "who works in the field.": "שעובד בשטח.",
  "Matan Wild is a wildlife photographer, the owner of MW Photo Tours and the founder of The Wild Side of Photography magazine. Matan leads photography expeditions around the world and teaches photographers and content creators. The presets, the Panel and the Field Guides come from that same work, from the shot to the edit.":
    "מתן וויילד הוא צלם חיות בר, הבעלים של אם־דבליו פוטו טורס ומייסד המגזין דה ווילד סייד אוף פוטוגרפי. מתן מוביל מסעות צילום ברחבי העולם ומלמד צלמים ויוצרי תוכן. הפריסטים, הפאנל ומדריכי השטח נולדו מאותה עבודה, מהצילום ועד העריכה.",
  "Visit mw.photography": "לאתר mw.photography",
  "Owner": "בעלים",
  "Founder": "מייסד",
  "Educator": "מרצה ומנטור",
  "The Wild Side of Photography": "דה ווילד סייד אוף פוטוגרפי",
  "Mentoring photographers and content creators": "ליווי צלמים ויוצרי תוכן",
  "Lightroom presets, a Photoshop plugin and field guides by Matan Wild, founder of MWP. Years of leading photography tours and editing alongside photographers of every level, distilled into one signature look: professional colour, natural tones, effortless to use.":
    "פריסטים ללייטרום, פלאגין לפוטושופ ומדריכי שטח מאת מתן וויילד, מייסד MWP. שנים של הובלת מסעות צילום ועריכה לצד צלמים בכל הרמות, מזוקקות למראה חתימה אחד: צבעים מקצועיים, גוונים טבעיים, ופשוט להשתמש.",
  "My details": "הפרטים שלי",
  "Used on your receipts and when we help you with an order.": "משמשים לקבלות וכשאנחנו עוזרים לכם עם הזמנה.",
  "Your purchases are tied to this email. To change it,": "הרכישות שלכם קשורות למייל הזה. כדי לשנות אותו,",
  "Full name": "שם מלא",
  "Phone (optional)": "טלפון (לא חובה)",
  "Country": "מדינה",
  "Address": "כתובת",
  "Apartment, suite, etc. (optional)": "דירה, קומה וכו' (לא חובה)",
  "City": "עיר",
  "State or region (optional)": "מחוז או אזור (לא חובה)",
  "Postal code": "מיקוד",
  "Save details": "שמירת הפרטים",
  "Saving…": "שומרים…",
  "Your details are saved.": "הפרטים נשמרו.",
  "Please enter your name.": "נא להזין שם.",
  "Please confirm your email first.": "צריך לאשר קודם את המייל.",
  "One of the fields is too long.": "אחד השדות ארוך מדי.",
  "Your account isn't ready yet. Reload the page and try again.": "החשבון עוד לא מוכן. רעננו את העמוד ונסו שוב.",
  "Testers · MWP": "בודקים · MWP",
  "For approved MWP testers.": "לבודקים מאושרים של MWP.",
  "Testers": "בודקים",
  "Test the": "בודקים את",
  "tools": "הכלים",
  "For approved testers only. Sign in with your email and your downloads are ready.": "לבודקים מאושרים בלבד. מתחברים עם המייל וההורדות מוכנות.",
  "If this email is on the testers list, a sign-in link is on its way. Open it on this device.": "אם המייל הזה ברשימת הבודקים, קישור כניסה כבר בדרך. פתחו אותו במכשיר הזה.",
  "This email isn't on the testers list.": "המייל הזה לא ברשימת הבודקים.",
  "Ask Matan to add it, or sign out and use the email he approved.": "בקשו ממתן להוסיף אותו, או התנתקו והתחברו עם המייל שהוא אישר.",
  "In Photoshop, open MWP Panel and sign in with this email. It works on up to 2 computers.": "בפוטושופ, פותחים את MWP Panel ומתחברים עם המייל הזה. הוא עובד על עד 2 מחשבים.",
  "Your copies are made for you and carry your name. Please don't share them. Download links work for 5 minutes. Trouble?": "העותקים שלכם נעשו בשבילכם ונושאים את השם שלכם. נא לא לשתף אותם. קישורי ההורדה עובדים 5 דקות. בעיה?",
  "@yourhandle": "@שם_המשתמש",
  "Copy": "העתקה",
  "Composition": "קומפוזיציה",
  "Colour": "צבע",
  "Light": "אור",
  "Planning": "תכנון",
  "Library": "ספרייה",
  "Develop": "פיתוח",
  "Map": "מפה",
  "Book": "ספר",
  "Slideshow": "מצגת",
  "Print": "הדפסה",
  "Web": "רשת",
  "Navigator": "ניווט",
  "MWP 1 Signature": "MWP 1 חתימה",
  "MWP 2 Light & Scene": "MWP 2 אור וסצנה",
  "MWP 3 Mono": "MWP 3 מונו",
  "MWP 4 Adaptive": "MWP 4 אדפטיבי",
  "MWP 5 Tools": "MWP 5 כלים",
  "Basic": "בסיסי",
  "Treatment": "טיפול",
  "Color": "צבע",
  "Black & White": "שחור-לבן",
  "Temp": "טמפרטורה",
  "Tint": "גוון",
  "Tone": "טון",
  "Exposure": "חשיפה",
  "Contrast": "ניגודיות",
  "Highlights": "הבהרות",
  "Shadows": "צללים",
  "Whites": "לבנים",
  "Blacks": "שחורים",
  "Presence": "נוכחות",
  "Texture": "מרקם",
  "Clarity": "חדות",
  "Dehaze": "הסרת אובך",
  "Vibrance": "חיוניות",
  "Saturation": "רוויה",
  "File": "קובץ",
  "Image": "תמונה",
  "Layer": "שכבה",
  "Select": "בחירה",
  "Filter": "מסנן",
  "View": "תצוגה",
  "Plugins": "תוספים",
  "Window": "חלון",
  "photo.psd @ 33%": "תמונה.psd @ 33%",
  "Layers": "שכבות",
  "Channels": "ערוצים",
  "Paths": "נתיבים",
  "Subject · Pop": "נושא · הבלטה",
  "Background": "רקע",
  "Panel": "פאנל",
  "Presets + Panel": "פריסטים + פאנל",
  "The first products are being prepared. Check back soon.": "המוצרים הראשונים בהכנה. חזרו בקרוב.",
  "Terms, licence, refunds and privacy · MWP": "תנאים, רישיון, החזרים ופרטיות · MWP",
  "Terms of sale, licence, refund policy and privacy notice for MWP.": "תנאי מכירה, רישיון, מדיניות החזרים והודעת פרטיות של MWP.",
  "When you buy a product you get a personal, non-transferable licence to use it in your own work and in work you do for clients.": "כשקונים מוצר מקבלים רישיון אישי שאינו ניתן להעברה, לשימוש בעבודות שלכם ובעבודות שאתם עושים ללקוחות.",
  "Allowed: personal work, client work, social media, prints and publications you create.": "מותר: עבודות אישיות, עבודות ללקוחות, רשתות חברתיות, הדפסות ופרסומים שאתם יוצרים.",
  "Not allowed: sharing, reselling, giving away or repackaging the files, alone or bundled with other products.": "אסור: לשתף, למכור הלאה, למסור או לארוז מחדש את הקבצים, לבד או בחבילה עם מוצרים אחרים.",
  "Sample photographs in our products and on this site remain the property of Matan Wild Photography and may not be used without written permission.": "צילומי הדוגמה במוצרים ובאתר הזה נשארים בבעלות Matan Wild Photography, ואין להשתמש בהם בלי אישור בכתב.",
  "Our products are digital files delivered instantly. If a product doesn't work for you, write to": "המוצרים שלנו הם קבצים דיגיטליים שנמסרים מיד. אם מוצר לא עובד לכם, כתבו ל",
  "within 14 days of purchase. We'll help you get it working, and if we can't, we'll refund you. Refunded orders lose access to the files.": "תוך 14 יום מהרכישה. נעזור לכם להפעיל אותו, ואם לא נצליח, נחזיר לכם את הכסף. הזמנה שהוחזרה מאבדת את הגישה לקבצים.",
  "Terms of sale": "תנאי מכירה",
  "Orders are processed by our online reseller, Lemon Squeezy, which is the merchant of record and handles payment, invoicing and sales tax. Prices are shown in the currency listed on each product page. You'll receive a receipt by email after every purchase.": "ההזמנות מעובדות על ידי המשווק המקוון שלנו, Lemon Squeezy, שהוא המוכר הרשמי ומטפל בתשלום, בחשבוניות ובמס. המחירים מוצגים במטבע שמופיע בכל עמוד מוצר. אחרי כל רכישה תקבלו קבלה במייל.",
  "Products you buy include free updates to that product. We may add, change or retire products at any time; anything you've already bought stays in your downloads.": "מוצרים שקניתם כוללים עדכונים חינם לאותו מוצר. אנחנו עשויים להוסיף, לשנות או להפסיק מוצרים בכל עת; כל מה שכבר קניתם נשאר בהורדות שלכם.",
  "We collect only what we need to sell and deliver your products: your name, email, country and what you bought. Payment details are handled by the checkout provider and never reach us.": "אנחנו אוספים רק את מה שצריך כדי למכור ולמסור לכם את המוצרים: שם, מייל, מדינה ומה קניתם. פרטי התשלום מטופלים אצל ספק התשלום ולא מגיעים אלינו.",
  "We use your email to deliver your files, answer support requests and, if you agreed, send occasional news and new releases. You can unsubscribe from any email.": "אנחנו משתמשים במייל שלכם כדי לשלוח את הקבצים, לענות לפניות תמיכה, ואם הסכמתם, לשלוח מדי פעם חדשות ומוצרים חדשים. אפשר להסיר את עצמכם מכל מייל.",
  "Our service providers: Supabase (database, sign-in and file storage), Lemon Squeezy (checkout), MailerLite (email), Make.com and monday.com (order handling). To see, correct or delete your data, write to support.": "נותני השירות שלנו: Supabase (מסד נתונים, התחברות ואחסון קבצים), Lemon Squeezy (תשלום), MailerLite (מייל), Make.com ו-monday.com (טיפול בהזמנות). כדי לראות, לתקן או למחוק את המידע שלכם, כתבו לתמיכה.",
  "Read the MWP Field Guides online.": "קריאה אונליין במדריכי השטח של MWP.",
  "Your signed copy of the terms": "העותק החתום שלכם של התנאים",
  "Preparing your PDF…": "מכינים את ה־PDF שלכם…",
  "Download again": "להוריד שוב",
  "Read online": "קריאה אונליין",
  "Your Ambassador Program terms": "התנאים שלכם בתוכנית השגרירים",
  "The signed copy of the terms you accepted, as a PDF.": "העותק החתום של התנאים שאישרתם, כקובץ PDF.",
  "Download PDF": "הורדת PDF",
  "Your guides, page by page. They're for your eyes only.": "המדריכים שלכם, עמוד אחר עמוד. הם לעיניכם בלבד.",
  "Field Guides · Read online · MWP": "מדריכי שטח · קריאה אונליין · MWP",
  "Do they work in Photoshop (Beta)?": "האם הם עובדים ב־Photoshop (Beta)?",
  "Yes. MWP Panel installs in both Photoshop and Photoshop (Beta), and one computer counts once even if you use both. The presets live in Camera Raw, which both apps share. The LUTs load in either app from Color Lookup, then Load 3D LUT.": "כן. MWP Panel מותקן גם ב־Photoshop וגם ב־Photoshop (Beta), ומחשב אחד נספר פעם אחת גם אם משתמשים בשניהם. הפריסטים יושבים ב־Camera Raw, שמשותף לשתי האפליקציות. את קובצי ה-LUT טוענים בכל אחת מהן דרך שכבת התאמה של חיפוש צבע, ואז טעינת LUT תלת־ממדי.",
  "Which programs do the products work with?": "עם אילו תוכנות המוצרים עובדים?",
  "Every product page lists what it works with under \"Works with\". Presets work in Lightroom Classic, Lightroom and Photoshop's Camera Raw; the plugin and the guides state their own requirements.":
    "בכל עמוד מוצר מופיע תחת \"עובד עם\" עם מה הוא עובד. הפריסטים עובדים ב-Lightroom Classic, ב-Lightroom וב-Camera Raw של פוטושופ. לפלאגין ולמדריכים יש דרישות משלהם, שמפורטות בעמוד שלהם.",
  "How do I get my files after paying?": "איך מקבלים את הקבצים אחרי התשלום?",
  "You get an email straight away. Open": "מקבלים מייל מיד. פותחים את",
  ", sign in to your MWP account, and everything you bought is there.": ", נכנסים לחשבון MWP שלכם, וכל מה שקניתם נמצא שם.",
  "Can I download again later?": "אפשר להוריד שוב אחר כך?",
  "Yes. Sign in to My downloads any time, including for future updates to products you own.": "כן. נכנסים להורדות שלי מתי שרוצים, גם בשביל עדכונים עתידיים למוצרים שכבר קניתם.",
  "Do I need an account?": "צריך לפתוח חשבון?",
  "Yes. You create one with your email and a password before you pay, so your files and future updates are always waiting for you.": "כן. פותחים חשבון עם מייל וסיסמה לפני התשלום, כדי שהקבצים והעדכונים העתידיים תמיד יחכו לכם.",
  "What if something doesn't work for me?": "ומה אם משהו לא עובד?",
  "Write to": "כתבו ל",
  "support": "תמיכה",
  "and we'll help. Our": "ונעזור. ב",
  "refund policy": "מדיניות ההחזרים",
  "has the details.": "יש את כל הפרטים.",
  "within 14 days of purchase. We'll help you get it working, and if we can't, we'll refund you. The": "תוך 14 יום מהרכישה. נעזור לכם להפעיל את המוצר, ואם לא נצליח, נחזיר לכם את הכסף. ב",
  "Photography guides": "מדריכי צילום",
  "Lightroom presets, a Photoshop plugin and editing guides from wildlife photographer Matan Wild. Instant download, secure checkout.":
    "פריסטים ללייטרום, פלאגין לפוטושופ ומדריכי עריכה מצלם חיות הבר מתן וויילד. הורדה מיידית ותשלום מאובטח.",
  "The first products are being prepared. Get the free sampler below and you'll hear the moment they're out.":
    "המוצרים הראשונים בהכנה. הירשמו לפריסטים החינמיים למטה ותשמעו ברגע שהם יוצאים.",
  "Coming soon": "בקרוב",

  // home (in the sales-page look)
  "MWP · by Matan Wild": "MWP · מאת מתן וויילד",
  "Products": "מוצרים",
  "MWP Presets · Lightroom": "MWP Presets · לייטרום",
  "The look behind every MWP frame.": "המראה של כל פריים של MWP.",
  "Now one click away.": "עכשיו בקליק אחד.",
  "50 presets, 12 of them adaptive · 33 LUTs for video": "50 פריסטים, 12 מהם אדפטיביים · 33 קובצי LUT לווידאו",
  "See MWP Presets": "לפריסטים",
  "MWP Panel · Photoshop": "MWP Panel · פוטושופ",
  "You were there.": "הייתם שם.",
  "Now make the photo show it.": "עכשיו תנו לתמונה להראות את זה.",
  "8 one-click effects · 11 looks · 4 painted lights": "8 אפקטים בלחיצה · 11 לוקים · 4 תאורות מצוירות",
  "See MWP Panel": "לפאנל",
  "MWP Field Guides · PDF": "MWP Field Guides · PDF",
  "See the photo": "לראות את התמונה",
  "before you press the shutter.": "לפני שלוחצים.",
  "4 guides · 137 lessons · 229 pages · English and Hebrew": "4 מדריכים · 137 שיעורים · 229 עמודים · עברית ואנגלית",
  "See the Field Guides": "למדריכי השטח",
  "Before you buy": "לפני שקונים",
  "Lightroom presets": "פריסטים ללייטרום",
  "Photoshop plugin": "פלאגין לפוטושופ",
  "PDF field guides": "מדריכי שטח ב-PDF",
  "The look behind every MWP frame.": "המראה של כל פריים של MWP.",
  // home copy, 19 Oct 2026 (Hebrew drafts for Matan)
  "Signature looks, practical guides and professional tools from Matan Wild, shaped by years of shooting, teaching and leading photography tours.": "מראות חתימה, מדריכים מעשיים וכלים מקצועיים מאת מתן וויילד, מתוך שנים של צילום, הוראה והובלת מסעות צילום.",
  "Learn the process behind the shot": "ללמוד את התהליך שמאחורי הצילום",
  "Your signature look starts here": "מראה החתימה שלכם מתחיל כאן",
  "Everything you need. All in one place.": "כל מה שצריך. במקום אחד.",
  "Matan Wild is the founder of a platform built around a community of photographers, real-world experience and a passion for better images.": "מתן וויילד הוא המייסד של פלטפורמה שנבנתה סביב קהילה של צלמים, ניסיון אמיתי מהשטח ותשוקה לתמונות טובות יותר.",
  "Drawing on years in the field, Matan shaped an approach around what photographers really need to learn, built to make a real difference in their work.": "מתוך שנים של ניסיון בשטח, מתן בנה גישה סביב מה שצלמים באמת צריכים ללמוד, כדי שתעשה הבדל אמיתי בעבודה שלהם.",
  "Four in-depth guides. Four essential subjects. One proven approach.": "ארבעה מדריכים מעמיקים. ארבעה נושאים חיוניים. גישה אחת מוכחת.",
  "Follow Matan's process in the field, from reading a scene and working with light to the decisions that shape the final image, and bring it into your own work.": "הכירו את התהליך של מתן בשטח, מקריאת הסצנה והעבודה עם האור ועד ההחלטות שמעצבות את התמונה הסופית, ויישמו אותו בעבודה שלכם.",
  "Matan Wild's signature look for your photos and video, refined through years of shooting and teaching.": "מראה החתימה של מתן וויילד לתמונות ולסרטונים שלכם, מלוטש לאורך שנים של צילום והוראה.",
  "Beautiful colour and consistent results without the guesswork: less time tweaking, more time creating.": "צבעים יפים ותוצאות עקביות בלי ניחושים: פחות זמן על כיוונונים, יותר זמן ליצירה.",
  "No more scattered tutorials and tools that don't work together.": "די למדריכים מפוזרים ולכלים שלא עובדים יחד.",
  "One editing panel for Photoshop that makes professional editing simpler and faster, with masking, colour, creative looks and export all in one place.": "פאנל עריכה אחד לפוטושופ שהופך עריכה מקצועית לפשוטה ומהירה יותר, עם מסכות, צבע, מראות יצירתיים וייצוא, הכול במקום אחד.",
  "You were there. Now make the photo show it.": "הייתם שם. עכשיו תנו לתמונה להראות את זה.",
  "See the photo before you press the shutter.": "לראות את התמונה לפני שלוחצים.",
  "Footer": "קישורים",
  "All photos: Matan Wild · contact@matanwildphotography.com": "כל הצילומים: מתן וויילד · contact@matanwildphotography.com",

  // categories
  "Preset pack": "חבילת פריסטים",
  "Guide": "מדריך",
  "Bundle": "חבילה",
  "Product": "מוצר",
  "Product details": "פרטי המוצר",
  "Product details · Editing tools from the field · MWP": "פרטי המוצר · כלי עריכה מהשטח · MWP",
  "More": "עוד",
  "Lightroom and Camera Raw looks for real field light": "מראות ללייטרום ול-Camera Raw לאור אמיתי בשטח",
  "Our photo editing plugin": "פלאגין העריכה שלנו",
  "Field guides and editing workflows to read and keep": "מדריכי שטח ותהליכי עריכה לקרוא ולשמור",
  "Several products together for less": "כמה מוצרים יחד, במחיר נמוך יותר",
  "Everything else": "כל השאר",

  // shop
  "All products · MWP": "כל המוצרים · MWP",
  "Lightroom presets, a Photoshop plugin, guides and bundles from wildlife photographer Matan Wild.": "פריסטים ללייטרום, פלאגין לפוטושופ, מדריכים וחבילות מצלם חיות הבר מתן וויילד.",
  "Category": "קטגוריה",
  "Search products": "חיפוש מוצרים",
  "Sort by": "מיון לפי",
  "Featured": "מומלצים",
  "Newest": "החדשים ביותר",
  "Price: low to high": "מחיר: מהנמוך לגבוה",
  "Price: high to low": "מחיר: מהגבוה לנמוך",
  "Show all products": "להצגת כל המוצרים",

  // product
  "A digital product by Matan Wild for Lightroom and Photoshop.": "מוצר דיגיטלי מאת מתן וויילד ללייטרום ולפוטושופ.",
  "Breadcrumb": "נתיב ניווט",
  "Buy now": "לקנייה",
  "Available soon": "בקרוב",
  "Download right after payment": "הורדה מיד אחרי התשלום",
  "Secure card checkout by Lemon Squeezy": "תשלום מאובטח בכרטיס דרך Lemon Squeezy",
  "Free updates to this product": "עדכונים חינם למוצר הזה",
  "Contents": "תכולה",
  "Works with": "עובד עם",
  "Version": "גרסה",
  "Personal and client work (": "לעבודה אישית ולעבודה עבור לקוחות (",
  "details": "פרטים",
  "About this product": "על המוצר",
  "This product isn't available.": "המוצר הזה לא זמין.",
  "See all products": "לכל המוצרים",
  "Before": "לפני",
  "After": "אחרי",
  "Choose an example": "בחירת דוגמה",
  "Preset comparison": "השוואת פריסט",

  // account
  "My downloads · MWP": "ההורדות שלי · MWP",
  "Sign in with your email to download what you've bought.": "נכנסים עם המייל כדי להוריד את מה שקניתם.",
  "Sign in with your email": "כניסה עם המייל",
  "Use the email you paid with. We'll send a one-time sign-in link; there's no password.": "השתמשו במייל שאיתו שילמתם. נשלח קישור כניסה חד־פעמי, בלי סיסמה.",
  "Email": "מייל",
  "Email me a sign-in link": "שלחו לי קישור כניסה",
  "Signed in as": "מחוברים בתור",
  "Sign out": "התנתקות",
  "Download links are created when you click and expire after 5 minutes. Trouble?": "קישורי ההורדה נוצרים כשלוחצים ותקפים ל-5 דקות. יש בעיה?",
  "Download .zip": "הורדת קובץ zip.",
  "Nothing on this email yet.": "עדיין אין רכישות במייל הזה.",
  "Bought with a different email? Sign out and use that one, or": "קניתם עם מייל אחר? התנתקו והיכנסו איתו, או",
  "contact support": "פנו לתמיכה",
  "with your order number.": "עם מספר ההזמנה.",
  "Please enter the email you used at checkout.": "הזינו את המייל שאיתו שילמתם.",
  "Too many requests. Please wait a minute and try again.": "יותר מדי בקשות. חכו דקה ונסו שוב.",
  "Your download has started. The link is valid for 5 minutes.": "ההורדה התחילה. הקישור תקף ל-5 דקות.",
  // Personal copies (drafts for Matan)
  "We're making your personal copy. It's usually ready in a few minutes; this page will start the download when it is.": "אנחנו מכינים עותק אישי בשבילכם. בדרך כלל זה לוקח כמה דקות, וההורדה תתחיל מהעמוד הזה ברגע שהוא מוכן.",
  "Your personal copy is still being made. Please come back in a little while and download it from here.": "העותק האישי שלכם עדיין בהכנה. חזרו בעוד קצת זמן והורידו אותו מכאן.",
  "Please sign in first.": "צריך להיכנס קודם.",
  "Preparing…": "מכינים…",

  // support
  "Help with downloads, installing and refunds · MWP": "עזרה בהורדה, בהתקנה ובהחזרים · MWP",
  "Help with downloading, installing or using MWP products.": "עזרה בהורדה, בהתקנה או בשימוש במוצרי MWP.",
  "How can we help?": "איך אפשר לעזור?",
  "A person answers within one business day.": "אדם אמיתי עונה תוך יום עסקים אחד.",
  "Name": "שם",
  "Topic": "נושא",
  "Downloading my files": "הורדת הקבצים שלי",
  "Installing or using a product": "התקנה או שימוש במוצר",
  "Refund request": "בקשת החזר",
  "Something else": "משהו אחר",
  "Order number (optional)": "מספר הזמנה (לא חובה)",
  "Subject": "כותרת",
  "Message": "הודעה",
  "Send message": "שליחת ההודעה",
  "Sending…": "שולחים…",
  "Please add your name.": "נא להוסיף שם.",
  "Please enter a valid email.": "נא להזין מייל תקין.",
  "Please enter a valid email address.": "נא להזין כתובת מייל תקינה.",
  "A few words, please.": "כמה מילים, בבקשה.",
  "Tell us a little more (10 characters or more).": "ספרו לנו עוד קצת (10 תווים לפחות).",
  "Thanks, we've got it. You'll hear back within one business day.": "תודה, קיבלנו. נחזור אליכם תוך יום עסקים אחד.",
  "Please tick the box so we can email you the presets.": "סמנו את התיבה כדי שנוכל לשלוח לכם את הפריסטים.",
  "Check your inbox: the free presets are on their way.": "בדקו את תיבת המייל: הפריסטים החינמיים בדרך.",

  // thank you
  "Thank you · MWP": "תודה · MWP",
  "Your order is confirmed.": "ההזמנה אושרה.",
  "Thank you. Your order is confirmed.": "תודה. ההזמנה אושרה.",
  "Your files are ready in My downloads. We've also emailed you a link": "הקבצים מחכים בהורדות שלי. שלחנו גם קישור במייל",
  "at": "לכתובת",
  "Go to my downloads": "להורדות שלי",
  "Installation help": "עזרה בהתקנה",
  "Sign in": "נכנסים",
  "With the email you paid with.": "עם המייל שאיתו שילמתם.",
  "One .zip per product.": "קובץ zip אחד לכל מוצר.",
  "Follow the guide inside the zip.": "לפי המדריך שבתוך קובץ ה-zip.",

  // legal (the terms themselves stay in English until Matan approves a Hebrew version)
  "Terms and policies": "תנאים ומדיניות",
  "Last updated": "עודכן לאחרונה",

  // 404
  "Page not found · MWP": "העמוד לא נמצא · MWP",
  "This page doesn't exist.": "העמוד הזה לא קיים.",
  "The link may be old or mistyped. Everything in the shop is one click away.": "ייתכן שהקישור ישן או שגוי. כל מה שבחנות נמצא במרחק לחיצה.",
  "Browse all products": "לכל המוצרים",
  "Home": "דף הבית",
  // home: interactive shop
  // My downloads (drafts for Matan)
  "Your library": "הספרייה שלכם",
  "Everything you own, ready to download. New versions appear here at no cost.": "כל מה שבבעלותכם, מוכן להורדה. גרסאות חדשות מופיעות כאן ללא עלות.",
  "My": "ההורדות",
  "downloads": "שלי",
  // Accounts: sign in, create account, reset password (drafts for Matan)
  "Create your MWP account (or sign in) to check out. Everything you buy lives in your account: download it anytime, and get every future update free.": "צרו חשבון MWP (או התחברו) כדי לעבור לתשלום. כל מה שאתם קונים נשמר בחשבון: אפשר להוריד בכל זמן ולקבל כל עדכון עתידי בחינם.",
  "Create account": "יצירת חשבון",
  "Password": "סיסמה",
  "Forgot password?": "שכחתם סיסמה?",
  "or": "או",
  "Your account keeps everything you buy: download it anytime, on any computer, and get every future update free.": "החשבון שומר את כל מה שאתם קונים: מורידים בכל זמן, בכל מחשב, ומקבלים כל עדכון עתידי בחינם.",
  "At least 8 characters.": "לפחות 8 תווים.",
  "We'll send a one-time link to your email. No password needed.": "נשלח קישור חד־פעמי למייל שלכם. בלי סיסמה.",
  "Send the link": "שליחת הקישור",
  "Back to sign in": "חזרה להתחברות",
  "Reset your password": "איפוס סיסמה",
  "We'll email you a link to choose a new password.": "נשלח לכם במייל קישור לבחירת סיסמה חדשה.",
  "Email me a reset link": "שלחו לי קישור איפוס",
  "Choose a new password": "בחירת סיסמה חדשה",
  "New password": "סיסמה חדשה",
  "Save password": "שמירת הסיסמה",
  "Show password": "הצגת הסיסמה",
  "Hide password": "הסתרת הסיסמה",
  "Account": "חשבון",
  "Choose a password": "בחירת סיסמה",
  "At least 8 characters. You'll use it to sign in and download your tools anytime.": "לפחות 8 תווים. תשתמשו בה כדי להתחבר ולהוריד את הכלים בכל זמן.",
  "Create your MWP account. It keeps your tools, so you can come back and download them anytime.": "צרו חשבון MWP. הוא שומר את הכלים, כך שאפשר לחזור ולהוריד אותם בכל זמן.",
  "Create account and get my tools": "יצירת חשבון וקבלת הכלים",
  // Ambassador Program page, /beta/ (drafts for Matan)
  "MWP Ambassador Program": "תוכנית השגרירים של MWP",
  "Create with MWP.": "יוצרים עם MWP.",
  "On us.": "עלינו.",
  "A small group of selected photographers gets MWP Presets, MWP Panel and the Field Guides free. In return, create with them, share your work and tell us what you think.": "קבוצה קטנה של צלמים נבחרים מקבלת את MWP Presets, ‏MWP Panel ומדריכי השטח בחינם. בתמורה, יוצרים איתם, משתפים את העבודות ומספרים לנו מה דעתכם.",
  "Join the program": "הצטרפות לתוכנית",
  "What you get": "מה מקבלים",
  "Everything we make.": "כל מה שאנחנו יוצרים.",
  "Free.": "בחינם.",
  "Free for ambassadors": "חינם לשגרירים",
  "What we ask": "מה אנחנו מבקשים",
  "Use it. Share it.": "משתמשים. משתפים.",
  "Tag us.": "מתייגים אותנו.",
  "Create and share": "יוצרים ומשתפים",
  "In your first 3 months: at least 3 posts and 1 reel a month, and 1 story a week. After that, tag us whenever you use the tools and love the results.": "ב־3 החודשים הראשונים: לפחות 3 פוסטים ורילס אחד בחודש, וסטורי אחד בשבוע. אחר כך, מתייגים אותנו בכל פעם שאתם משתמשים בכלים ואוהבים את התוצאה.",
  "Tag and disclose": "מתייגים ומציינים",
  "Tag": "תייגו את",
  "and Matan Wild, use our hashtags, and mark your posts as gifted. The terms explain how.": "ואת מתן וויילד, השתמשו בהאשטגים שלנו וסמנו את הפוסטים כתוכן שקיבלתם במתנה. התנאים מסבירים איך.",
  "Keep it personal": "שומרים את זה אישי",
  "Your licence is yours alone, on up to 2 computers. Don't share the files or your access.": "הרישיון אישי שלכם, בעד 2 מחשבים. אל תשתפו את הקבצים או את הגישה.",
  "Tell us what you think": "ספרו לנו מה דעתכם",
  "Share honest feedback and report bugs as you find them. You'll have a direct line to our team and to Matan.": "שתפו משוב כן ודווחו על באגים כשאתם נתקלים בהם. יהיה לכם קשר ישיר לצוות שלנו ולמתן.",
  "The terms": "התנאים",
  "Ambassador Program": "תוכנית השגרירים",
  "Terms of Use.": "תנאי שימוש.",
  "Terms of Use": "תנאי שימוש",
  "Read them through, then accept them below.": "קראו אותם עד הסוף, ואשרו אותם למטה.",
  "Join": "הצטרפות",
  "Your tools,": "הכלים שלכם,",
  "in two minutes.": "בתוך שתי דקות.",
  "Fill in your details and accept the terms.": "ממלאים פרטים ומאשרים את התנאים.",
  "We email you a link. Open it to download all three tools.": "אנחנו שולחים לכם קישור במייל. פותחים אותו ומורידים את שלושת הכלים.",
  "In Photoshop, open MWP Panel and sign in with the same email.": "בפוטושופ, פותחים את MWP Panel ומתחברים עם אותו מייל.",
  "Instagram": "אינסטגרם",
  "I've read and accept the": "קראתי ואני מאשר/ת את",
  "MWP Ambassador Program Terms of Use": "תנאי השימוש של תוכנית השגרירים של MWP",
  "Check your inbox": "בדקו את תיבת הדואר",
  "We've sent you a link. Open it to download your tools.": "שלחנו לכם קישור. פתחו אותו כדי להוריד את הכלים.",
  "Go to My downloads": "להורדות שלי",
  "MWP · by Matan Wild · Ambassador access is personal.": "MWP · מאת מתן וויילד · הגישה לשגרירים אישית.",
  "Lifetime": "לכל החיים",
  "licence, with every future update": "רישיון, כולל כל עדכון עתידי",
  "devices, for you only": "מכשירים, רק בשבילכם",
  "posts a month, plus an optional reel, first 3 months": "פוסטים בחודש, ועוד רילס אם תרצו, ב־3 החודשים הראשונים",
  "story a week, first 3 months": "סטורי בשבוע, ב־3 החודשים הראשונים",
  "your copyright, always": "זכויות היוצרים שלכם, תמיד",
  "months, renewable": "חודשים, עם אפשרות לחידוש",
  "Acceptance": "אישור",
  "Signature": "חתימה",
  "Your name": "השם שלכם",
  "I agree": "אני מסכים/ה",
  "Read the terms": "לקריאת התנאים",
  "Step 1 of 2 · Acceptance": "שלב 1 מתוך 2 · אישור התנאים",
  "Do you accept": "האם אתם מאשרים",
  "the terms?": "את התנאים?",
  "To join, accept the MWP Ambassador Program Terms of Use above. Then you'll fill in your details and get your tools.": "כדי להצטרף, אשרו את תנאי השימוש של תוכנית השגרירים של MWP שלמעלה. אחר כך תמלאו פרטים ותקבלו את הכלים.",
  "I've read and accept the terms": "קראתי ואני מאשר/ת את התנאים",
  "Step 2 of 2 · Your details": "שלב 2 מתוך 2 · הפרטים שלכם",
  "You're": "אתם",
  "in.": "בפנים.",
  "Tell us who you are. We'll email you a link to download your tools.": "ספרו לנו מי אתם. נשלח לכם במייל קישור להורדת הכלים.",
  "Terms accepted": "התנאים אושרו",
  "Get my tools": "קבלת הכלים",
  "Then, in Photoshop, open MWP Panel and sign in with the same email.": "אחר כך, בפוטושופ, פותחים את MWP Panel ומתחברים עם אותו מייל.",
  "Signed by": "נחתם על ידי",
  "Accepted · MWP Ambassador Program Terms of Use": "אושר · תנאי השימוש של תוכנית השגרירים של MWP",
  // Ambassador application (questionnaire) and tester code
  "Read the terms and apply": "לקריאת התנאים והגשת מועמדות",
  "Apply now": "להגשת מועמדות",
  // feedback from ambassadors and testers (My downloads)
  "Send us feedback": "שלחו לנו פידבק",
  "Found a bug, have an idea, or something to report? It goes straight to our team.": "מצאתם באג, יש לכם רעיון או משהו לדווח? זה מגיע ישר לצוות שלנו.",
  "Type": "סוג",
  "About": "בנושא",
  "Bug": "באג",
  "Recommendation": "המלצה",
  "Report": "דיווח",
  "Other": "אחר",
  "General": "כללי",
  "Your message": "ההודעה שלכם",
  "What happened, and what did you expect? Steps to reproduce help a lot.": "מה קרה, ומה ציפיתם שיקרה? צעדים לשחזור עוזרים מאוד.",
  "Send feedback": "שליחת פידבק",
  "Feedback is for ambassadors and testers.": "הפידבק מיועד לשגרירים ולבודקים.",
  "That's a lot of feedback for one day. Please send the rest tomorrow, or email us.": "זה הרבה פידבק ליום אחד. שלחו את השאר מחר, או כתבו לנו במייל.",
  "Couldn't send it. Please try again.": "לא הצלחנו לשלוח. נסו שוב.",
  "Ambassador Program · Application": "תוכנית השגרירים · טופס מועמדות",
  "Step 2 of 2 · About you": "שלב 2 מתוך 2 · קצת עליכם",
  "Let's get to": "בואו",
  "know you.": "נכיר.",
  "There are no right or wrong answers. We'd just like to get to know you a little and make sure the program works for you. It takes about 5 minutes.": "אין כאן תשובות נכונות או לא נכונות. אנחנו רק רוצים להכיר אתכם קצת ולוודא שהתוכנית מתאימה לכם. זה לוקח בערך 5 דקות.",
  "About you": "קצת עליכם",
  "Phone (WhatsApp)": "טלפון (וואטסאפ)",
  "Where are you based?": "איפה אתם גרים?",
  "Do you prefer English or Hebrew?": "מה השפה המועדפת עליכם: עברית או אנגלית?",
  "English": "אנגלית",
  "Hebrew": "עברית",
  "Choose your language. Your copy comes in that language.": "בחרו שפה. העותק שלכם יגיע בשפה הזו.",
  "Any other platforms you share on?": "יש עוד פלטפורמות שאתם משתפים בהן?",
  "TikTok, YouTube, blog…": "טיקטוק, יוטיוב, בלוג…",
  "Your photography": "הצילום שלכם",
  "What do you love to photograph?": "מה אתם הכי אוהבים לצלם?",
  "How long have you been photographing?": "כמה זמן אתם מצלמים?",
  "Is photography a hobby, a side income or your profession?": "הצילום הוא בשבילכם תחביב, הכנסה נוספת או מקצוע?",
  "Hobby": "תחביב",
  "Side income": "הכנסה נוספת",
  "Profession": "מקצוע",
  "Where can we see your work?": "איפה אפשר לראות את העבודות שלכם?",
  "Website, portfolio or Instagram": "אתר, פורטפוליו או אינסטגרם",
  "Editing": "עריכה",
  "Which software do you edit with?": "באיזו תוכנה אתם עורכים?",
  "Which of these do you use?": "במה מהבאים אתם משתמשים?",
  "Lightroom mobile": "לייטרום מובייל",
  "None of these": "אף אחד מאלה",
  "On which devices?": "באילו מכשירים?",
  "Phone": "טלפון",
  "Tablet": "טאבלט",
  "Have you used editing panels or presets before?": "השתמשתם בעבר בפאנלים או בפריסטים לעריכה?",
  "Yes": "כן",
  "No": "לא",
  "What matters to you": "מה חשוב לכם",
  "Why would you like to be an MWP ambassador?": "למה תרצו להיות שגרירים של MWP?",
  "What values are important to you in your photography and in the way you share it?": "אילו ערכים חשובים לכם בצילום שלכם ובדרך שבה אתם משתפים אותו?",
  "The program": "התוכנית",
  "A quick reminder of what we ask: in the first 3 months, 3 posts and 1 optional reel a month plus 1 story a week, tagging us. After that, just tag us whenever you use the tools and love the result. We'd also love your feedback and bug reports so we can keep improving.": "תזכורת קצרה למה שאנחנו מבקשים: בשלושת החודשים הראשונים, 3 פוסטים בחודש ורילס אחד אם תרצו, וגם סטורי אחד בשבוע, עם תיוג שלנו. אחר כך, פשוט לתייג אותנו בכל פעם שאתם משתמשים בכלים ואוהבים את התוצאה. נשמח מאוד גם לפידבק ולדיווחים על באגים, כדי שנוכל להמשיך להשתפר.",
  "Does this sound good to you?": "זה נשמע לכם טוב?",
  "I have a question": "יש לי שאלה",
  "Are you happy to send us feedback and report bugs when you find them?": "תשמחו לשלוח לנו פידבק ולדווח על באגים כשתנתקלו בהם?",
  "Your question": "השאלה שלכם",
  "Send my application": "שליחת הבקשה",
  "Thank you!": "תודה!",
  "We read every application personally, so it may take us a few days to get back to you.": "אנחנו קוראים כל טופס בעצמנו, אז ייתכן שייקח לנו כמה ימים לחזור אליכם.",
  "Please enter your Instagram handle.": "נא למלא את שם המשתמש באינסטגרם.",
  "Please answer every question.": "נא לענות על כל השאלות.",
  "Couldn't send your application. Please try again.": "לא הצלחנו לשלוח את הבקשה. נסו שוב.",
  "Enter your name, email and tester code, and your downloads are ready.": "הזינו שם, מייל וקוד בודקים, וההורדות שלכם מוכנות.",
  "Tester code": "קוד בודקים",
  "Get access": "קבלת גישה",
  "Sign out and enter your tester code with this email, or use the email you joined with.": "התנתקו והזינו את קוד הבודקים עם המייל הזה, או השתמשו במייל שאיתו הצטרפתם.",
  "Please enter your tester code.": "נא למלא את קוד הבודקים.",
  "That tester code isn't right.": "קוד הבודקים לא נכון.",
  "The testers group is full right now. Please contact us.": "קבוצת הבודקים מלאה כרגע. צרו איתנו קשר.",
  "Too many tries. Please wait an hour and try again.": "יותר מדי ניסיונות. המתינו שעה ונסו שוב.",
  "Couldn't add you. Please try again.": "לא הצלחנו להוסיף אתכם. נסו שוב.",
  "You're in, but the sign-in link didn't send. Please try again in a minute.": "נכנסתם, אבל קישור הכניסה לא נשלח. נסו שוב בעוד דקה.",
  "50 presets and 33 LUTs": "50 פריסטים ו־33 LUTs",
  "8 one-click effects and 11 looks": "8 אפקטים בלחיצה ו־11 לוקים",
  "4 guides, 137 lessons": "4 מדריכים, 137 שיעורים",
  "Join our Ambassador Program.": "הצטרפו לתוכנית השגרירים שלנו.",
  "Close": "סגירה",
  "By accepting, you agree to these terms.": "באישור, אתם מסכימים לתנאים האלה.",
  "Read and accept the terms": "לקריאה ואישור התנאים",
  "To join, read and accept the MWP Ambassador Program Terms of Use. Then you'll fill in your details and get your tools.": "כדי להצטרף, קראו ואשרו את תנאי השימוש של תוכנית השגרירים של MWP. אחר כך תמלאו פרטים ותקבלו את הכלים.",
  "Terms of": "תנאי",
  "Use.": "שימוש.",
  "The Ambassador Program is full. Thank you for your interest.": "תוכנית השגרירים מלאה. תודה על ההתעניינות.",
  "Couldn't check the program. Please try again.": "לא הצלחנו לבדוק את התוכנית. נסו שוב.",
  "Facebook": "פייסבוק",
  "Your name or profile link": "השם או הקישור לפרופיל",
  "Please agree to the Ambassador Program terms.": "נא לאשר את תנאי תוכנית השגרירים.",
  "Couldn't save your details. Please try again.": "לא הצלחנו לשמור את הפרטים. נסו שוב.",
  "Couldn't add the tools to your library. Please try again.": "לא הצלחנו להוסיף את הכלים לספרייה. נסו שוב.",
  // My downloads: MWP Panel computers (drafts for Matan)
  "MWP Panel on your computers": "MWP Panel במחשבים שלכם",
  "Computer": "מחשב",
  "Remove": "הסרה",
  "Removing…": "מסירים…",
  "Computer removed. You can now sign in to MWP Panel on another one.": "המחשב הוסר. אפשר עכשיו להתחבר ל-MWP Panel במחשב אחר.",
  "No computers yet. Open MWP Panel in Photoshop and sign in with this email.": "עדיין אין מחשבים. פתחו את MWP Panel בפוטושופ והתחברו עם המייל הזה.",
  "SUBJECT · POP": "SUBJECT · POP",
  "Shoot": "צילום",
  "Finish": "גימור",
  "Scroll": "גללו",
  "Shoot it. Edit it.": "מצלמים. עורכים.",
  "Finish it.": "מסיימים.",
  "/ 03": "/ 03",
  "Every photo by Matan Wild": "כל התמונות של מתן וויילד",
  "Photos by Matan Wild": "תמונות של מתן וויילד",
  "Matan's edit": "העריכה של מתן",
  "One photo by Matan. Try a look, stack a few Panel effects, set the amount, then drag across the photo to compare with the original.": "תמונה אחת של מתן. נסו מראה, הוסיפו כמה אפקטים של הפאנל, כוונו את העוצמה, ואז גררו על התמונה כדי להשוות למקור.",
  "The original photo by Matan Wild": "התמונה המקורית של מתן וויילד",
  "Original": "מקור",
  "Drag to compare with the original": "גררו כדי להשוות למקור",
  "Drag across the photo to compare with the original.": "גררו על התמונה כדי להשוות למקור.",
  "One photo, straight from the camera. Try a look, stack a few Panel effects, set the amount, then drag across the photo to see where it started.": "תמונה אחת, ישר מהמצלמה. נסו מראה, הוסיפו כמה אפקטים של הפאנל, כוונו את העוצמה, ואז גררו על התמונה כדי לראות מאיפה היא התחילה.",
  "The same photo with your edits": "אותה תמונה עם העריכה שלכם",
  "Live preview in your browser. The real presets and plugin go further, with masks, detail and colour work on every frame.": "תצוגה חיה בדפדפן. הפריסטים והפלאגין האמיתיים הולכים רחוק יותר, עם מסכות, פרטים ועבודת צבע בכל פריים.",
  "Looks": "מראות",
  "Edit · tap to stack": "עריכה · אפשר לשלב כמה",
  "The full plugin has 8 one-click effects, 11 looks and 4 painted lights.": "בפלאגין המלא יש 8 אפקטים בקליק, 11 מראות ו-4 תאורות מצוירות.",
  "Start again": "להתחיל מחדש",
  "Golden Hour": "שעת זהב",
  "Cool Dusk": "דמדומים קרים",
  "Matte Earth": "אדמה מט",
  "Deep Contrast": "ניגודיות עמוקה",
  "Soft Light": "אור רך",
  "One photo, straight from the camera. Try a preset or a Panel effect on it, set the amount, then drag across the photo to see where it started.": "תמונה אחת, ישר מהמצלמה. נסו עליה פריסט או אפקט של הפאנל, כוונו את העוצמה, ואז גררו על התמונה כדי לראות מאיפה היא התחילה.",
  "PLACEHOLDER: this look needs Matan's export of the same photo.": "ממלא מקום: למראה הזה צריך את הייצוא של מתן על אותה תמונה.",
  "PLACEHOLDER: Blue Hour here is Matan's finished edit. Replace with the same RAW edited only with the preset before launch.": "ממלא מקום: Blue Hour כאן הוא העריכה הסופית של מתן. לפני ההשקה מחליפים באותו RAW עם הפריסט בלבד.",
  "A few effects are open to try. The full plugin has 8 one-click effects, 11 looks and 4 painted lights.": "כמה אפקטים פתוחים לניסיון. בפלאגין המלא יש 8 אפקטים בקליק, 11 מראות ו-4 תאורות מצוירות.",
  "Previous page": "העמוד הקודם",
  "Next page": "העמוד הבא",
  "PDF": "PDF",
  "Field Guides": "מדריכי השטח",
  "Sample pages": "עמודים לדוגמה",
  "Rule of thirds": "חוק השלישים",
  "Fix white balance first": "קודם איזון לבן",
  "Side light": "אור צידי",
  "Light under the storm": "אור מתוך הסערה",
  "The full set: 4 PDF guides, 137 lessons on 229 pages, in English and Hebrew.": "הסט המלא: 4 מדריכי PDF, ‏137 שיעורים ב-229 עמודים, בעברית ובאנגלית.",
  "Get the Field Guides": "למדריכי השטח",
  "Try it": "נסו בעצמכם",
  "Try the tools": "נסו את הכלים",
  "Try it yourself": "נסו בעצמכם",
  "Get your hands": "הכלים",
  "on the tools.": "בידיים שלכם.",
  "Pick a tool, tap a look and set the amount. Then drag across the photo to see where it started. A small taste of what's inside.": "בחרו כלי, לחצו על מראה וכוונו את העוצמה. אחר כך גררו על התמונה כדי לראות מאיפה היא התחילה. טעימה קטנה ממה שיש בפנים.",
  "The same photo with the selected MWP look": "אותה תמונה עם המראה שנבחר",
  "Drag to compare with the RAW file": "גררו כדי להשוות לקובץ ה-RAW",
  "PLACEHOLDER: the finished frames are Matan's full edits. Replace with the same RAW edited only with the preset or effect before launch.": "ממלא מקום: הפריימים הסופיים הם העריכות המלאות של מתן. לפני ההשקה מחליפים באותו RAW עם הפריסט או האפקט בלבד.",
  "Choose a tool": "בחרו כלי",
  "Lightroom": "לייטרום",
  "Photoshop": "פוטושופ",
  "Light and Scene": "אור וסצנה",
  "Edit": "עריכה",
  "The full pack: 50 Lightroom presets, 50 mobile files and 33 LUTs.": "החבילה המלאה: 50 פריסטים ללייטרום, 50 קבצים לנייד ו-33 קובצי LUT.",
  "Two effects are open to try. The full plugin has 8 one-click effects, 11 looks and 4 painted lights.": "שני אפקטים פתוחים לניסיון. בפלאגין המלא יש 8 אפקטים בקליק, 11 מראות ו-4 תאורות מצוירות.",
  "Amount": "עוצמה",
  "Get MWP Presets": "לפריסטים",
  "Get MWP Panel": "לפאנל",
  "Drag across the photo to compare with the RAW file.": "גררו על התמונה כדי להשוות לקובץ ה-RAW.",
  "Add to cart": "הוספה לעגלה",
  "The edits": "העריכות",
  "See the edits": "לצפייה בעריכות",
  "From RAW to final": "מ-RAW לתמונה הסופית",
  "The RAW file as shot": "קובץ ה-RAW כפי שצולם",
  "The final edit, finished with MWP": "העריכה הסופית עם MWP",
  "FINAL · MWP PRESET": "סופי · פריסט MWP",
  "FINAL · MWP PANEL": "סופי · MWP Panel",
  "Drag to compare the RAW file and the final edit": "גררו כדי להשוות בין קובץ ה-RAW לעריכה הסופית",
  "PLACEHOLDER: the final frame here is Matan's finished edit. Replace with the same RAW edited only with the preset before launch.": "ממלא מקום: הפריים הסופי כאן הוא העריכה של מתן. לפני ההשקה מחליפים באותו RAW עם הפריסט בלבד.",
  "Before and after": "לפני ואחרי",
  "A male lion roaring, photographed by Matan Wild": "אריה שואג, צילום: מתן וויילד",
  "Editing tools": "כלי עריכה",
  "from the field.": "מהשטח.",
  "Lightroom presets, a Photoshop plugin and field guides from wildlife photographer Matan Wild. Instant download, secure checkout.": "פריסטים ללייטרום, פלאגין לפוטושופ ומדריכי שטח מצלם חיות הבר מתן וויילד. הורדה מיידית ותשלום מאובטח.",
  "Shop the collection": "לכל המוצרים",
  "See before and after": "לפני ואחרי",
  "English and Hebrew · Mac and Windows · Download right after payment": "עברית ואנגלית · Mac ו-Windows · הורדה מיד אחרי התשלום",
  "The MWP collection": "הקולקציה של MWP",
  "50 presets · 33 LUTs": "50 פריסטים · 33 קובצי LUT",
  "8 effects · 11 looks": "8 אפקטים · 11 מראות",
  "4 guides · 229 pages": "4 מדריכים · 229 עמודים",
  "In numbers": "במספרים",
  "LUTs for video": "קובצי LUT לווידאו",
  "One-click effects": "אפקטים בקליק",
  "Lessons": "שיעורים",
  "The collection": "הקולקציה",
  "Three tools.": "שלושה כלים.",
  "One workflow.": "תהליך אחד.",
  "Field guides for the shoot. Presets and a plugin for the edit. Use one, or all three.": "מדריכי שטח לצילום. פריסטים ופלאגין לעריכה. אפשר אחד, ואפשר את שלושתם.",
  "MWP Presets box": "הקופסה של MWP Presets",
  "50 Lightroom presets, 12 adaptive": "50 פריסטים ללייטרום, 12 אדפטיביים",
  "50 mobile files and 33 LUTs": "50 קבצים לנייד ו-33 קובצי LUT",
  "Install guide for every program": "מדריך התקנה לכל תוכנה",
  "A tiger, photographed by Matan Wild": "טיגריס, צילום: מתן וויילד",
  "8 one-click effects": "8 אפקטים בקליק",
  "11 looks and 4 painted lights": "11 מראות ו-4 תאורות מצוירות",
  "User manual and install guide": "מדריך משתמש ומדריך התקנה",
  "Mountains at dusk, photographed by Matan Wild": "הרים בדמדומים, צילום: מתן וויילד",
  "4 PDF guides, 137 lessons": "4 מדריכי PDF, ‏137 שיעורים",
  "Composition, colour, light and planning": "קומפוזיציה, צבע, אור ותכנון",
  "English and Hebrew": "עברית ואנגלית",
  "English or Hebrew": "עברית או אנגלית",
  "Your RAW file.": "קובץ ה-RAW שלכם.",
  "In MWP light.": "באור של MWP.",
  "Pick an example and drag the handle: the RAW file on one side, the same photo finished with MWP on the other.": "בחרו דוגמה וגררו את הידית: קובץ ה-RAW בצד אחד, ואותה תמונה אחרי MWP בצד השני.",
  "Before: the RAW file as shot": "לפני: קובץ ה-RAW כפי שצולם",
  "After: finished with MWP": "אחרי: מעובד עם MWP",
  "BEFORE": "לפני",
  "AFTER · MWP PRESET": "אחרי · פריסט MWP",
  "Drag to compare before and after": "גררו כדי להשוות לפני ואחרי",
  "PLACEHOLDER: the \"after\" here is Matan's finished edit. Replace with the same RAW edited only with the preset before launch.": "ממלא מקום: ה\"אחרי\" כאן הוא העריכה הסופית של מתן. לפני ההשקה מחליפים באותו RAW עם הפריסט בלבד.",
  "Drag the handle to compare.": "גררו את הידית כדי להשוות.",
  "Shoot with the guides.": "מצלמים עם המדריכים.",
  "Finish with the tools.": "מסיימים עם הכלים.",
  "MWP Field Guides teach what happens before the click: composition, colour, light and planning, in 4 PDF guides in English or Hebrew. The presets and the Panel carry it on into the edit, in the same look.": "מדריכי השטח של MWP מלמדים מה קורה לפני הקליק: קומפוזיציה, צבע, אור ותכנון, ב-4 מדריכי PDF בעברית או באנגלית. הפריסטים והפאנל ממשיכים מאותה נקודה אל העריכה, באותו מראה.",
  "Edit in Lightroom": "עורכים בלייטרום",
  "Learn it in the field": "לומדים בשטח",
  "All 4 PDF guides, 137 lessons": "כל 4 מדריכי ה־PDF, ‏137 שיעורים",
  "Get the presets": "לפריסטים",
  "Presets + Field Guides": "פריסטים + מדריכי השטח",
  "Shoot it, then edit it": "מצלמים, ואז עורכים",
  "MWP Presets: 50 presets and 33 LUTs": "MWP Presets: ‏50 פריסטים ו-33 קובצי LUT",
  "MWP Field Guides: 4 PDF guides, 137 lessons": "מדריכי השטח: 4 מדריכי PDF, ‏137 שיעורים",
  "Get the bundle": "לחבילה",
  "Lightroom and Photoshop": "לייטרום ופוטושופ",
  "MWP Panel: the Photoshop plugin": "MWP Panel: הפלאגין לפוטושופ",
  "EVERYTHING": "כל המוצרים",
  "The full set": "הסט המלא",
  "From the shot to the share": "מהצילום ועד השיתוף",
  "Get the full set": "לסט המלא",
  "[Bundle prices and discounts: Matan to decide]": "[מחירים והנחות לחבילות: לקביעת מתן]",

  // home and shop, copy rewrite (Oct 2026, drafts for Matan)
  "Lightroom Presets & Photoshop Plugin for Wildlife · MWP": "פריסטים ללייטרום ופלאגין לפוטושופ לצילום חיות בר · MWP",
  "Let the animal": "תנו לחיה",
  "stand out.": "לבלוט.",
  "Lightroom presets, a Photoshop plugin and field guides for wildlife and nature photographers. Built from Matan Wild's own edits and lessons from the field, so your photos pop and still look natural.":
    "פריסטים ללייטרום, פלאגין לפוטושופ ומדריכי שטח לצלמי חיות בר וטבע. נבנו מתוך העריכות והשיעורים של מתן וויילד מהשטח, כדי שהתמונות שלכם יבלטו ועדיין ייראו טבעיות.",
  "Start with the one you need.": "מתחילים מזה שאתם צריכים.",
  "To shoot better, start with the Field Guides. If you edit in Lightroom, MWP Presets. If you finish in Photoshop, MWP Panel.":
    "כדי לצלם טוב יותר, מתחילים במדריכי השטח. אם אתם עורכים בלייטרום, הפריסטים של MWP. אם אתם מסיימים בפוטושופ, הפאנל של MWP.",
  "See the photo before you press the shutter": "לראות את התמונה לפני שלוחצים",
  "137 one-page lessons on composition, colour, light and planning. Each one is a real photo from the field, with a drawing that shows why it works.":
    "137 שיעורים של עמוד אחד על קומפוזיציה, צבע, אור ותכנון. כל שיעור הוא צילום אמיתי מהשטח, עם שרטוט שמראה למה הוא עובד.",
  "Every guide ends with drills, a checklist and a cheat sheet to take on your next shoot.": "בסוף כל מדריך יש תרגילים, צ׳קליסט ודף סיכום שלוקחים לצילום הבא.",
  "Presets that find the animal first": "פריסטים שמוצאים קודם את החיה",
  "50 Lightroom presets built from Matan Wild's wildlife and landscape edits. 12 are adaptive: Lightroom's AI finds the animal, the sky and the background and treats each one on its own.":
    "50 פריסטים ללייטרום, שנבנו מתוך העריכות של מתן וויילד לצילומי חיות בר ונופים. 12 מהם אדפטיביים: ה-AI של לייטרום מוצא את החיה, את השמיים ואת הרקע, ומטפל בכל אחד בנפרד.",
  "So the look fits your photo, on desktop, on your phone and, with 33 LUTs, on video.": "כך המראה מתאים לתמונה שלכם, במחשב, בטלפון, ועם 33 קובצי LUT גם בווידאו.",
  "MWP Presets, Lightroom presets for wildlife photography": "הפריסטים של MWP, פריסטים ללייטרום לצילום חיות בר",
  "The animal brighter. Your original untouched.": "החיה בהירה יותר. המקור נשאר שלם.",
  "Photoshop as simple buttons. Pick the animal, the sky or the background, pick an effect, set how strong. The panel builds the mask and the layer for you.":
    "פוטושופ בכפתורים פשוטים. בוחרים את החיה, את השמיים או את הרקע, בוחרים אפקט וקובעים עוצמה. הפאנל בונה בשבילכם את המסכה ואת השכבה.",
  "Every edit sits on its own layer, and one undo takes back a whole button.": "כל עריכה יושבת בשכבה משלה, וביטול אחד מחזיר כפתור שלם.",
  "The Field Guides teach what happens before the click. MWP Presets and MWP Panel carry the same look into Lightroom and Photoshop. Pick the set that matches how you work.":
    "מדריכי השטח מלמדים מה קורה לפני הקליק. הפריסטים והפאנל של MWP ממשיכים את אותו מראה בלייטרום ובפוטושופ. בחרו את הסט שמתאים לדרך שבה אתם עובדים.",
  "Which one should I start with?": "במה כדאי להתחיל?",
  "If you want to shoot better, start with": "אם אתם רוצים לצלם טוב יותר, התחילו עם",
  ". If you edit in Lightroom,": ". אם אתם עורכים בלייטרום,",
  ". If you finish your photos in Photoshop,": ". אם אתם מסיימים את התמונות בפוטושופ,",
  "Matan Wild founded MW Photo Tours in 2023. He leads wildlife photography expeditions abroad and workshops in Israel, runs the MWP photographers' community and publishes the monthly magazine The Wild Side of Photography.":
    "מתן וויילד ייסד את MW Photo Tours ב-2023. הוא מוביל מסעות צילום חיות בר בחו״ל וסדנאות בישראל, מנהל את קהילת הצלמים של MWP ומוציא את המגזין החודשי דה ווילד סייד אוף פוטוגרפי.",
  "The presets, the panel and the guides come out of that work: the edits and the lessons he shares with photographers in the field, made so you can use them at home.":
    "הפריסטים, הפאנל והמדריכים נולדו מהעבודה הזאת: העריכות והשיעורים שהוא חולק עם צלמים בשטח, בצורה שאפשר להשתמש בה בבית.",
  "Shop Wildlife Lightroom Presets, Photoshop Plugin & Guides · MWP": "חנות: פריסטים ללייטרום, פלאגין לפוטושופ ומדריכים לצילום חיות בר · MWP",
  "Tools for wildlife and nature photographers, from the shoot to the share.": "כלים לצלמי חיות בר וטבע, מהצילום ועד השיתוף.",
  "MWP Presets: Lightroom presets for wildlife photography": "הפריסטים של MWP: פריסטים ללייטרום לצילום חיות בר",
  "MWP Panel: Photoshop plugin for wildlife photo editing": "הפאנל של MWP: פלאגין לפוטושופ לעריכת צילומי חיות בר",
  "MWP Field Guides: nature photography guides in PDF": "מדריכי השטח של MWP: מדריכי צילום טבע ב-PDF",
};

// Text built from numbers or names.
const PATTERNS = [
  [/^1 product$/, () => "מוצר אחד"],
  [/^(\d+) products$/, (m) => `${m[1]} מוצרים`],
  [/^(\d+) presets$/, (m) => `${m[1]} פריסטים`],
  [/^(\d+) pages$/, (m) => `${m[1]} עמודים`],
  [/^([A-Z]{3}), one-time payment$/, (m) => `${m[1]}, תשלום חד־פעמי`],
  [/^Example (\d+)$/, (m) => `דוגמה ${m[1]}`],
  [/^Compare before and after: (.*)$/, (m) => `השוואת לפני ואחרי: ${m[1]}`],
  [/^We've sent a sign-in link to (.+)\. Open it on this device\.$/, (m) => `שלחנו קישור כניסה אל ${m[1]}. פתחו אותו במכשיר הזה.`],
  [/^Nothing matches "(.*)" here\.$/, (m) => `אין תוצאות עבור "${m[1]}" כאן.`],
  [/^Nothing matches here\.$/, () => "אין כאן תוצאות."],
  [/^Version (.+)$/, (m) => `גרסה ${m[1]}`],
  [/^Added (.+)$/, (m) => `נוסף ${m[1]}`],
  [/^Last used (.+)$/, (m) => `שימוש אחרון: ${m[1]}`],
  [/^Your licence is personal: Panel works when you sign in to it with this email\. You can use it on up to (\d+) computers at a time\. Changed computer\? Remove the old one here\.$/,
    (m) => `הרישיון אישי: הפאנל עובד כשמתחברים אליו עם המייל הזה. אפשר להשתמש בו בעד ${m[1]} מחשבים בו־זמנית. החלפתם מחשב? הסירו את הישן כאן.`],
];

const SALES = { "presets/": "presets/he/", "panel/": "panel/he/", "field-guides/": "field-guides/he/" };

function translate(text) {
  const core = text.replace(/\s+/g, " ").trim();
  if (!core) return null;
  let out = HE[core];
  if (out === undefined) {
    for (const [re, fn] of PATTERNS) { const m = core.match(re); if (m) { out = fn(m); break; } }
  }
  if (out === undefined) return null;
  const lead = /^\s/.test(text) ? " " : "";
  // a Hebrew one-letter prefix before a link ("כתבו ל" + <a>תמיכה</a>) joins the next word: no space after it
  const trail = /\s$/.test(text) && !/(^|\s)ו?[בהכלמש]$/.test(out) ? " " : "";
  return lead + out + trail;
}


// Names in Hebrew (Matan: everything in Hebrew, except MWP, which always stays in Latin letters). Same list as tools/he_names.py.
const NAMES = [
  ["MWP - PS Panel", "הפאנל של MWP"],
  ["MWP - Signature Preset Pack", "הפריסטים של MWP"],
  ["MWP Field Guides", "מדריכי השטח של MWP"],
  ["MWP FIELD GUIDES", "מדריכי השטח של MWP"],
  ["MWP Field Guide", "מדריך השטח של MWP"],
  ["MWP FIELD GUIDE", "מדריך השטח של MWP"],
  ["MWP Presets", "הפריסטים של MWP"],
  ["MWP PRESETS", "הפריסטים של MWP"],
  ["MWP Panel", "הפאנל של MWP"],
  ["MWP PANEL", "הפאנל של MWP"],
  ["MW Photo Tours", "אם־דבליו פוטו טורס"],
  ["MW PHOTO TOURS", "אם־דבליו פוטו טורס"],
  ["Matan Wild Photography", "מתן וויילד צילום"],
  ["Matan Wild", "מתן וויילד"],
  ["Lemon Squeezy", "למון סקוויזי"],
  ["Photoshop (Beta)", "פוטושופ (בטא)"],
  ["Photoshop", "פוטושופ"],
  ["PHOTOSHOP", "פוטושופ"],
  ["Lightroom Classic", "לייטרום קלאסיק"],
  ["Lightroom Mobile", "לייטרום מובייל"],
  ["Lightroom", "לייטרום"],
  ["LIGHTROOM", "לייטרום"],
  ["Camera Raw", "קאמרה ראו"],
  ["Premiere Pro", "פרמייר פרו"],
  ["DaVinci Resolve", "דה־וינצ׳י ריזולב"],
  ["Final Cut Pro", "פיינל קאט פרו"],
  ["Adobe", "אדובי"],
  ["Windows", "ווינדוס"],
  ["Mac", "מק"],
  ["Instagram", "אינסטגרם"],
  ["Facebook", "פייסבוק"],
  ["WhatsApp", "וואטסאפ"],
  ["YouTube", "יוטיוב"],
  ["Supabase", "סופאבייס"],
  ["MailerLite", "מיילרלייט"],
  ["Make.com", "מייק"],
  ["monday.com", "מאנדיי"],
].map(([en, he]) => [new RegExp("(?<![A-Za-z0-9@._/])" + en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![A-Za-z0-9])", "g"), he]);
// "ל-Lightroom" → "ללייטרום": a one-letter Hebrew prefix joins the now-Hebrew word.
const PREFIX = /(?<![\u05D0-\u05EA])(ו?[בלכמשה]|ו)[-־](?=[\u05D0-\u05EA])/g;
function names(text) {
  let out = text;
  for (const [re, he] of NAMES) out = out.replace(re, he);
  if (out === text) return text;
  return out.replace(PREFIX, (m, p, i, all) => p + (p.endsWith("ו") && all[i + m.length] === "ו" ? "־" : ""));
}

const ATTRS = ["placeholder", "aria-label", "title", "alt"];
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "TEXTAREA"]);

// Hebrew for one piece of text: the sentence translation if there is one, then every name in Hebrew.
// Everything on the Hebrew site is Hebrew (Matan); only the header logo stays MWP.
function hebrew(text) {
  const t = translate(text);
  return names(t === null ? text : t);
}

// A product name split over two elements ("MWP" + <span class="grad">Presets</span>) becomes
// "הפריסטים של" + <span class="grad">MWP</span>, so the gold stays on the name (MWP stays in Latin letters).
const MWP_HE = "MWP";
function productName(el) {
  // only a short name: some text plus one gold <span class="grad"> word, nothing else inside
  const g = el.children && el.children.length === 1 ? el.children[0] : null;
  if (!g || !g.classList.contains("grad") || g.children.length || el.textContent.length > 60) return false;
  const full = el.textContent.replace(/\s+/g, " ").trim();
  const he = names(full);
  if (he === full || !he.endsWith(MWP_HE)) return false;
  const lead = he.slice(0, -MWP_HE.length);
  const grad = el.querySelector(".grad");
  el.textContent = lead;
  grad.textContent = MWP_HE;
  el.append(grad);
  return true;
}

function walk(root) {
  if (root.nodeType === 3) {
    const el = root.parentElement;
    if (!el || el.closest(".brand, .site-brand, script, style, .only-en")) return;
    const t = hebrew(root.nodeValue);
    if (t !== root.nodeValue) root.nodeValue = t;
    return;
  }
  if (root.nodeType !== 1 && root.nodeType !== 11) return;
  if (root.nodeType === 1) {
    if (SKIP.has(root.tagName)) return;
    if (root.closest(".brand")) {   // the logo: MWP stays, its label is translated
      const v = root.getAttribute("aria-label"); const t = v && translate(v);
      if (t) root.setAttribute("aria-label", t.trim());
      return;
    }
    if (root.closest(".only-en")) return;   // the English copy, hidden on the Hebrew site
    if (productName(root)) return;
    for (const a of ATTRS) {
      const v = root.getAttribute(a);
      if (v) { const t = hebrew(v).trim(); if (t !== v) root.setAttribute(a, t); }
    }
    if (root.tagName === "A") {
      const href = root.getAttribute("href") || "";
      for (const [en, he] of Object.entries(SALES)) {
        if (href === en || href.endsWith("/" + en)) root.setAttribute("href", href.slice(0, href.length - en.length) + he);
      }
    }
  }
  for (const c of Array.from(root.childNodes)) walk(c);
}

function toggleHTML(lang) {
  const en = lang === "en";
  return `<div class="lang-toggle" role="group" aria-label="${en ? "Language" : "שפה"}">
    ${en ? `<span class="on" aria-current="true">EN</span><button type="button" data-lang="he" lang="he">עב</button>`
         : `<button type="button" data-lang="en" lang="en">EN</button><span class="on" aria-current="true">עב</span>`}
  </div>`;
}

export function initI18n() {
  const lang = getLang();
  const header = document.querySelector(".site-header .container");
  if (header && !header.querySelector(".lang-toggle")) {
    const menu = header.querySelector(".nav-menu");   // the phone menu button stays last
    menu ? menu.insertAdjacentHTML("beforebegin", toggleHTML(lang)) : header.insertAdjacentHTML("beforeend", toggleHTML(lang));
    header.querySelector(".lang-toggle").addEventListener("click", (e) => {
      const b = e.target.closest("[data-lang]");
      if (!b) return;
      setLang(b.dataset.lang);
      const other = document.querySelector(`link[rel="alternate"][hreflang="${b.dataset.lang}"]`);   // a page with its own Hebrew address (home, shop)
      if (other) location.href = new URL(other.href).pathname + location.search + location.hash;
      else location.reload();
    });
  }
  if (lang !== "he") { document.documentElement.classList.remove("he-wait"); return; }

  document.documentElement.lang = "he";
  document.documentElement.dir = "rtl";
  if (!document.querySelector('link[data-heebo]')) {
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.dataset.heebo = "";
    l.href = "https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap";
    document.head.appendChild(l);
  }
  document.title = hebrew(document.title).trim();
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.content = hebrew(desc.content).trim();
  walk(document.body);
  document.documentElement.classList.remove("he-wait");   // Hebrew is in: show the page (see LANG_GUARD)
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "characterData") walk(r.target);
      else for (const n of r.addedNodes) walk(n);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}

// For the build (tools/he_static.mjs): the same Hebrew the browser puts in, written into the Hebrew pages ahead of time.
export { hebrew as toHebrew, names as hebrewNames, SALES };
