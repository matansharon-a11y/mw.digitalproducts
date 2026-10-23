# Customer reviews

Screenshots of real reviews and messages from customers. The review sections on the home page, the shop and the
product pages read `reviews.json` and show them; while the list is empty those sections stay hidden.

## Add reviews
1. Put the screenshots in this folder (PNG, JPEG or WebP, any size or shape).
2. Run `python3 tools/reviews.py`. It makes a light WebP copy of each new screenshot (at most 1400 px wide),
   adds an entry for it to `reviews.json` with its width and height, and lists what still needs filling in.
3. In `reviews.json`, fill in each new entry:
   - `products`: which products the review is about: `presets`, `plugin` (Lightroom Classic plugin), `panel`, `guides`
     (one or more). Product pages show only their own reviews.
   - `alt`: what the screenshot says, in a sentence (for screen readers and search engines).
   - `source`: where it came from, e.g. "Instagram message", "Email", "WhatsApp" (and `source_he` in Hebrew).
   - `lang`: `en` or `he`, the language the review is written in. Each language's pages show their own reviews first.
   - `featured`: `true` for the ones the home page shows (up to 6). With none featured, it shows the first 6.
4. Rebuild nothing: the pages read the file. Push to `main`.

Order: the list order is the order on the page. To remove a review, delete its entry (and its files).

Preview: add `?reviews=preview` to any page address to see the sections with labelled placeholder cards.

## Before you publish a screenshot
Use only real messages, unedited. Hide the person's name, photo and handle unless they agreed to be shown.
