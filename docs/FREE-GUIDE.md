# The free Field Guides sample (sign-up gift)

Built and **switched on** 25 Oct 2026 (Matan approved the words, the privacy line and the sample).

## How it works
1. **Pop-up** (`assets/js/lib/gift.js`, styles `assets/css/gift.css`, loaded by `nav.js` only when needed): full name,
   email, phone, and a tick box for marketing by email and WhatsApp (unticked; the guide comes either way). It shows
   after 30 seconds, halfway down a page, or when a desktop visitor heads for the tab bar (never in the first 8
   seconds), at most once every 14 days, never again after signing up, never to someone signed in, and never on My
   downloads, thank-you, legal, support, the ambassador and tester pages, the reader or the admin. `#free-guide`
   opens it from a link. `?gift=preview` shows it on any page, even while it's off.
**monday:** every sign-up is a row on **Shop Leads · Free guide** (Digital Shop workspace, board 5106641452): name, email, phone, language, Marketing OK, Signed up, Status Waiting for email → Confirmed (+ date). The person is also on Shop Customers (new row, or their existing one updated).

2. **Sign-up** (`subscribe`, source `free-guide`): name, phone, language and consent are kept in `subscribers`, and
   monday **Shop Customers** gets the person at once (Free guide = Waiting for email, Phone, Language, Signed up,
   Source = Free guide). Then the page emails a **sign-in link** that works in any browser (`giftSignup` in api.js).
3. **They click the link** → their account is created and confirmed → the database (`grant_free_sample`, migration
   `20261025090001`) gives them the sample, fills their name and phone where empty, records their consent, and the
   scheduler (`lead`) tells Make: Shop Customers → Free guide = Confirmed; **Mailchimp** (audience MW-Photo Tours; English sign-ups also get the audience's own **lang_en** tag, because the newsletters' Hebrew segment is everyone without it; never the welcome_he / welcome_en tags,
   tags **MWP Shop** + **Shop: free guide**); the box is required, so that's everyone.
4. **My downloads** shows "Free sample · MWP Field Guides · free sample", their stamped copy in their language, and
   "Get the full Field Guides" under it. The card steps aside once they own the full guides.

**The email** they get is Supabase's "Confirm signup" template, kept in `supabase/templates/confirmation.html` (+ `confirmation_subject.txt`) and set by the deploy after `tools/check_email_template.go` renders every version: free guide or regular sign-up, Hebrew or English (from the account's metadata: `gift`, `lang`). It never shows the typed name. Someone who already has an account gets the regular sign-in link email instead. Clicking it (or any sign-in afterwards) confirms their sign-up just the same (migration `20261025090005`).

**No consent, no guide (Matan, 25 Oct 2026).** The sample comes with joining the mailing list: the pop-up's box is required (gift.js and the `subscribe` function both refuse without it), and the database gives the sample only to a confirmed free-guide sign-up that ticked it (migration `20261025090007`). Plain accounts (buyers, ambassadors) no longer get it. Accounts that got it before this (the 25 Oct backfill, and test sign-ups) still have it.
Every confirmed sign-up also sends Matan a monday notification (Make modules 172/173).

## The welcome emails (Mailchimp)
Customer Journey **"MWP Shop · Free guide welcome"** (Mailchimp → Automations, builder id 550; built 25 Oct 2026,
**turned on 25 Oct 2026, on Matan's OK**):
- Trigger: tag **Shop: free guide** (only people who ticked the marketing box get it). Entry filter: not tagged
  guide_sample_en / guide_sample_he (those came through the mw-phototours.com pop-up and get that site's own guide email;
  its two journeys skip Shop: free guide in return).
- If tagged **lang_en**: EN 1 → 3 days → EN 2. Otherwise (Hebrew): HE 1 → 3 days → HE 2. Sender "Matan Wild · MWP" /
  "מתן וויילד · MWP", from contact@matanwildphotography.com.
- Content: `tools/build_emails.py` writes `assets/email/<id>.html`; each step imports its page by URL
  (shop.mw.photography/assets/email/…), and Mailchimp fetches it again at send time, so a change to the builder goes
  live with the next deploy. No prices in these emails.
- Test emails of all four went to contact@ on 25 Oct 2026 and arrived (unsubscribe link and address filled in).
- At launch (once the shop takes orders): add emails 3 (`3-tools-*`) and 4 (`4-full-guides-*`) to both branches, a
  few days apart.
- Launch email to the whole audience: Mailchimp drafts **"MWP Shop launch · English / Hebrew (draft, needs Matan's
  OK)"** (`5-launch-*`), copies of the October newsletters' audiences (English = lang_en; Hebrew = everyone else).

## The PDF
`tools/make_guide_sample.py` builds it from the four guides: a cover, "Hi, I'm Matan", then one complete section of
each guide (its opening page + 4 lessons, 16 lessons in all), and a closing page with the link to the full guides.
English and Hebrew, 23 pages each. The cover (the mountains photo, as in the pop-up) and the closing page (the four guide covers and a gold button to the full guides) are designed in the brand style in the script.

| Guide | Section | Pages |
|---|---|---|
| Composition | Where to put it: rule of thirds, horizon low, space to move, look room | 5, 6, 8, 10, 11 |
| Light | Where the light comes from: front, side, from behind, rim | 6–10 |
| Colour | Colour and the subject: what pulls the eye, one accent, background sets the mood, colour in the eyes | 21, 22, 23, 26, 28 |
| Planning | Know the animal: their hours, follow the food, read the trail, read the body | 6–10 |

## Switching it on (done 25 Oct 2026; the steps, for the record)
1. **Upload the PDF**: Actions → **Upload an extra download** → slug `mwp-field-guides-sample`, key `main`, label
   `Free sample`, version `1.0`, file `MWP-Field-Guides-Sample.zip`; Claude sends the zip encrypted
   (tools/upload_extra.py).
2. **Give it to existing accounts**: a migration inserting the sample's entitlement for every confirmed account with a
   customer record (as in `grant_free_sample`).
3. **Privacy page**: add the line about the free-guide form (name, email, phone; the marketing tick box; Mailchimp).
4. **Turn it on**: `GIFT_ON = true` in `assets/js/lib/nav.js`; add "Free guide" (`/#free-guide`) to the footer
   (`FOOTER_LINKS` in tools/brand.py) and rebuild.
5. **Before ads point at it**: the account emails are limited to 30 an hour and Resend's free plan to 100 a day;
   raise both first (Supabase → Authentication → Rate limits; Resend plan).
6. Test once end to end with a real inbox: the email arrives, the link opens My downloads with the sample, monday
   shows Waiting → Confirmed, Mailchimp has the contact with both tags (only when the box was ticked).
