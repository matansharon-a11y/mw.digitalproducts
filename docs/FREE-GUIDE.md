# The free Field Guides sample (sign-up gift)

Built 25 Oct 2026, **switched off** until Matan approves the words and the PDF.

## How it works
1. **Pop-up** (`assets/js/lib/gift.js`, styles `assets/css/gift.css`, loaded by `nav.js` only when needed): full name,
   email, phone, and a tick box for marketing by email and WhatsApp (unticked; the guide comes either way). It shows
   after 30 seconds, halfway down a page, or when a desktop visitor heads for the tab bar (never in the first 8
   seconds), at most once every 14 days, never again after signing up, never to someone signed in, and never on My
   downloads, thank-you, legal, support, the ambassador and tester pages, the reader or the admin. `#free-guide`
   opens it from a link. `?gift=preview` shows it on any page, even while it's off.
2. **Sign-up** (`subscribe`, source `free-guide`): name, phone, language and consent are kept in `subscribers`, and
   monday **Shop Customers** gets the person at once (Free guide = Waiting for email, Phone, Language, Signed up,
   Source = Free guide). Then the page emails a **sign-in link** that works in any browser (`giftSignup` in api.js).
3. **They click the link** → their account is created and confirmed → the database (`grant_free_sample`, migration
   `20261025090001`) gives them the sample, fills their name and phone where empty, records their consent, and the
   scheduler (`lead`) tells Make: Shop Customers → Free guide = Confirmed; **Mailchimp** (audience MW-Photo Tours,
   tags **MWP Shop** + **Shop: free guide**) only when they ticked the marketing box.
4. **My downloads** shows "Free sample · MWP Field Guides · free sample", their stamped copy in their language, and
   "Get the full Field Guides" under it. The card steps aside once they own the full guides.

Every new account gets the sample too (not only pop-up sign-ups), once its file is uploaded.

## The PDF
`tools/make_guide_sample.py` builds it from the four guides: a cover, "Hi, I'm Matan", then one complete section of
each guide (its opening page + 4 lessons, 16 lessons in all), and a closing page with the link to the full guides.
English and Hebrew, 23 pages each. The cover and closing page are simple placeholders until Ksenia designs them.

| Guide | Section | Pages |
|---|---|---|
| Composition | Where to put it: rule of thirds, horizon low, space to move, look room | 5, 6, 8, 10, 11 |
| Light | Where the light comes from: front, side, from behind, rim | 6–10 |
| Colour | Colour and the subject: what pulls the eye, one accent, background sets the mood, colour in the eyes | 21, 22, 23, 26, 28 |
| Planning | Know the animal: their hours, follow the food, read the trail, read the body | 6–10 |

## To switch it on (after Matan approves)
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
