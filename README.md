# MWP Presets — build and launch guide

The online shop for MWP Lightroom and Photoshop presets: a static site on GitHub Pages, Supabase for the database, sign-in, private file storage and server code, Lemon Squeezy for card payments, and Make.com feeding monday.com and email.

Nothing here goes live, emails a customer or changes a price without approval. Copy and design are approved first, and every money term (prices, refunds, discounts) is Matan's sign-off. See the checklist at the end.

---

## 0. What you're building

```
Visitor ─► Website (GitHub Pages) ─► Checkout (Lemon Squeezy)
   │                                       │ paid / refunded event
   │ magic-link sign-in                    ▼
   └──► My downloads ─► get-download ─► checkout-webhook ─► Database (Supabase)
                          │                                     │
                          ▼                                     ▼
              Private storage (5-minute links)        Make.com ─► monday.com
                                                                └► MailerLite emails
```

Supabase is the system of record. If Make.com or monday.com is down, sales and downloads keep working; the sync catches up.

## 1. Folder structure

```
mwp-presets/
├── index.html            Home: hero, featured packs, before/after, how it works, free sampler, FAQ
├── shop.html             All packs, filter by program
├── product.html          One pack (?p=<slug>): gallery, before/after slider, buy box, SEO data
├── account.html          My downloads: magic-link sign-in and the customer's library
├── support.html          Support form
├── thank-you.html        Checkout redirects here
├── legal.html            Licence, refunds, terms, privacy  (DRAFT, needs approval)
├── 404.html              GitHub Pages serves this for unknown URLs
├── robots.txt · sitemap.xml · .nojekyll · .gitignore
├── assets/
│   ├── css/tokens.css     Design tokens: colours, type, spacing (edit brand values here only)
│   ├── css/styles.css     All site components
│   ├── img/favicon.svg
│   └── js/
│       ├── config.js      Supabase URL + anon key, site URL  ← the only file you edit to connect
│       ├── lib/api.js     Supabase client, catalogue queries, function calls, formatting
│       ├── lib/ui.js      Header, nav, reveal, toasts, before/after slider, product cards, checkout
│       └── pages/*.js     One script per page
├── admin/
│   ├── index.html · admin.css · admin.js   Admin dashboard
└── supabase/
    ├── config.toml
    ├── migrations/        001 schema · 002 security · 003 admin reporting
    └── functions/
        ├── _shared/http.ts        CORS, responses, service client, Make.com forwarding, HMAC
        ├── checkout-webhook/      Paid and refunded orders
        ├── get-download/          5-minute signed download links
        ├── support/               Support requests
        ├── subscribe/             Free sampler sign-ups
        └── .env.example
```

No build step, no framework: every file is served as it is. The HTML pages share a header and footer; when you change one, change it in every page (search and replace across the folder in VS Code).

## 2. HTML structure and layouts

Every page follows the same skeleton: skip link, fixed header, `<main id="main">`, footer, one page script loaded as a module.

| Page | Layout | Data it loads |
| --- | --- | --- |
| Home | Full-bleed hero photo with gradient, numbered sections (01 Collections, 02 Before and after, 03 How it works, 04 Questions), photo band with the sampler form | Featured products; first before/after pair found |
| Shop | Page title, filter chips (only when packs differ in compatibility), 3-column card grid | All live products |
| Product | Two columns: gallery (before/after slider + thumbnails) and a sticky buy box; description below | One product with its media |
| My downloads | Sign-in panel, then the library list | The customer's entitlements |
| Support | Two-column form panel | None (writes a ticket) |

The visual language follows mw.photography: near-black canvas (`#0A0908`), warm off-white type, headlines that pair light words with a bold phrase ("Edits made in the field. **Ready for yours.**"), small numbered eyebrows ("01 · Collections"), captions in the "Title · Place" pattern, and photographs given the full width.

Images on the home and 404 pages currently load from `https://mw.photography/img/…`. Before launch, copy those files into `assets/img/` and change the paths, so the shop doesn't depend on the other site.

## 3. CSS design system

`assets/css/tokens.css` holds every design decision as a variable: colours, fonts, the type scale (fluid with `clamp()`), an 8-point spacing scale, radii and motion. `styles.css` only ever reads those variables.

- **To match the brand book exactly:** change values in `tokens.css` (for example `--c-accent`, `--f-sans`). I couldn't read mw.photography's stylesheet directly, so the font (Inter Tight) and the golden accent are close matches chosen from the site's look; swap them for the brand book v3 values.
- **Components:** buttons (`.btn`, `--accent`, `--ghost`, `--sm`), eyebrow, display and section headings, product card with hover image, before/after slider, buy box, checklist, spec list, FAQ, forms, panels, library rows, toasts.
- **Motion:** elements with `.reveal` fade up as they scroll into view; all motion switches off for visitors who set "reduce motion".
- **Hebrew:** set `<html lang="he" dir="rtl">` on a page and the layout, slider and arrows mirror; Hebrew text uses Heebo (add it to the Google Fonts link).

## 4. JavaScript

- `config.js` – connection settings. `IS_CONFIGURED` lets pages show a clear message instead of failing when keys are missing.
- `lib/api.js` – the only place that talks to Supabase. Products are read straight from the database (row level security only returns live ones); downloads, support and sign-ups go through Edge Functions. Everything inserted into the page passes through `esc()` to prevent script injection.
- `lib/ui.js` – the header turns solid on scroll; the mobile menu opens and closes with focus and Escape handled; the before/after slider works by mouse, touch and keyboard (a hidden range input carries it) and nudges once when first seen; checkout links get the buyer's email and the visit's `utm_source` added, which flows through to monday.com as the order source.
- `pages/*.js` – one per page, each small and readable.

## 5. Database (SQL)

Run the three files in `supabase/migrations/` in order in Supabase → SQL Editor (or `supabase db push` with the CLI).

| Table | Purpose |
| --- | --- |
| `products` | Catalogue: name and bold half, tagline, description, price, currency, includes, compatibility, checkout link and variant ID, images, live/featured flags |
| `product_files` | Where each paid `.zip` lives. Separate so visitors can never read the path |
| `product_media` | Before/after pairs (shared `pair_key`) and gallery images |
| `customers` | One per buyer email; linked to their login on first sign-in |
| `orders`, `order_items` | Written only by the payment webhook |
| `entitlements` | "This customer may download this product"; revoked on full refund |
| `downloads` | Every download, with a salted IP hash (no raw IPs) |
| `support_tickets`, `subscribers`, `webhook_events` | Support, email sign-ups, payment-event log for idempotency |
| `admins` | Users allowed into `/admin/` |

Security (`002_security.sql`): row level security on every table. Visitors read live products and their images; customers read only their own rows; admins (checked by `is_admin()`) manage everything; Edge Functions use the service role. Two storage buckets: `presets` (private, paid zips, admins upload) and `product-media` (public images).

Reporting (`003_admin_reporting.sql`): `admin_stats()` feeds the Overview tab in one call, keeping revenue separate per currency; `admin_orders` and `admin_customers` views feed the tables.

## 6. Authentication and user management

Customers and admins both sign in with a **magic link** (no passwords to leak or reset).

1. Supabase → Authentication → Providers → Email: enabled. Magic links confirm the address by design, so no separate confirmation step is needed.
2. Authentication → URL Configuration: Site URL `https://shop.mw.photography`; Redirect URLs: `https://shop.mw.photography/account.html`, `https://shop.mw.photography/admin/`, and `http://localhost:8000/**` for local testing.
3. Authentication → Emails → SMTP: connect a real sender (MailerLite, Resend or your domain's SMTP). Supabase's built-in sender is rate-limited and meant only for testing.
4. Edit the "Magic Link" email template so it carries the MWP voice and logo.

**How a customer gets access:** they pay with an email → the webhook creates a `customers` row and an entitlement for that email → they sign in with the same email → on first download, the login is linked to their customer row.

**Making an admin:** sign in once at `/admin/` (you'll see "isn't an admin"), then run in SQL Editor:

```sql
insert into public.admins (user_id, email)
select id, email from auth.users where email = 'contact@matanwildphotography.com';
```

Remove an admin with `delete from public.admins where email = '…';`.

## 7. File uploads and image management

All uploads happen in the admin dashboard, Products → Edit.

- **Images** (cover, hover, before/after pairs, gallery) are resized in the browser to 2400 px on the long edge and converted to WebP before upload, so phones get fast pages without you exporting special sizes. Files are stored as `product-media/<slug>/<kind>-<id>.webp` and cached for a year.
- **Image resizing on the fly** uses Supabase image transformations (Pro plan). It's off by default; after upgrading, set `IMAGE_TRANSFORMS: true` in `assets/js/config.js`.
- **Before/after pairs:** upload both images together with alt text and an optional caption ("Kingfisher · Forest shade"). The first pair of a featured pack appears on the home page.
- **Paid zip:** uploaded to the private bucket at `presets/<slug>/v<version>/<file>.zip`. A new version gets a new path; old files are kept so a download in progress never breaks.
- **Upload size:** Supabase's free plan caps a single upload at 50 MB. Preset packs are usually far smaller. If yours is larger, upgrade to Pro and raise the limit in Storage → Settings.

## 8. Admin dashboard

`/admin/` (not linked from the site, blocked in `robots.txt`, and protected by the database whatever the browser does).

| Tab | What you can do |
| --- | --- |
| Overview | Revenue per currency, paid and refunded orders, new customers, sampler sign-ups, downloads, open tickets; a chart of paid orders per day (7, 30 or 90 days); top packs |
| Products | Create and edit packs, upload images and the zip, set featured and live. A pack can't go live without a checkout link, variant ID and zip |
| Orders | Search by email or order number, export CSV |
| Customers | Lifetime value, last order, marketing consent, export CSV |
| Support | Open and all tickets, change status, reply by email. Refund requests are marked for Matan |

Refunds themselves are issued in the Lemon Squeezy dashboard; the webhook then removes access automatically and tells Make.com.

## 9. Backend and integrations

### 9.1 Deploy the Edge Functions

```bash
npm install -g supabase            # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase secrets set --env-file supabase/functions/.env   # after filling it from .env.example
supabase functions deploy checkout-webhook
supabase functions deploy get-download
supabase functions deploy support
supabase functions deploy subscribe
```

`config.toml` turns off gateway JWT checks because each function authenticates its own callers: the webhook by HMAC signature, downloads by the customer's session, the two public forms by validation and rate limits.

| Secret | Value |
| --- | --- |
| `SITE_URL` | `https://shop.mw.photography` |
| `ALLOWED_ORIGINS` | the site URL, plus `http://localhost:8000` while testing |
| `CHECKOUT_WEBHOOK_SECRET` | a long random string; the same one goes into Lemon Squeezy |
| `MAKE_ORDER_WEBHOOK`, `MAKE_SUPPORT_WEBHOOK`, `MAKE_SUBSCRIBE_WEBHOOK` | the three Make.com custom webhook URLs |
| `MAKE_SHARED_SECRET` | random string; Make scenarios reject calls without it in the `x-mwp-secret` header |
| `IP_HASH_SALT` | random string |
| `DOWNLOAD_DAILY_LIMIT` | `5` |

Generate random strings with `openssl rand -hex 32`.

### 9.2 Lemon Squeezy

1. Create the store; keep **Test mode** on until launch.
2. One product per pack. Price it as approved. Do not attach the zip there (delivery is ours).
3. On each product: Confirmation → redirect to `https://shop.mw.photography/thank-you.html`.
4. Copy the product's **checkout link** and **variant ID** into the admin product form.
5. Settings → Webhooks: URL `https://YOUR-PROJECT-REF.supabase.co/functions/v1/checkout-webhook`, signing secret = `CHECKOUT_WEBHOOK_SECRET`, events `order_created` and `order_refunded`.

If the business turns out to be able to use Stripe directly, only `checkout-webhook` and the checkout link change; everything else stays.

### 9.3 Make.com

Each scenario starts with **Webhooks → Custom webhook**, followed by a filter `x-mwp-secret` = your shared secret.

| Webhook | Payload `type` | Scenario |
| --- | --- | --- |
| `MAKE_ORDER_WEBHOOK` | `order` | Find or create the customer in monday.com Preset Customers → create the order in Preset Orders (Status Paid) → add to MailerLite "Buyers" → send the delivery email with `downloads_url` → set Status Delivered |
| | `refund` / `partial_refund` | Find the order by `order_number` → Status Refunded → remove from "Buyers" |
| `MAKE_SUPPORT_WEBHOOK` | `support` | Create the item in Preset Support (owner Amelia, or Matan for `category = refund`) → add `owned` as an update → auto-reply |
| `MAKE_SUBSCRIBE_WEBHOOK` | `subscribe` | Add to the MailerLite "Free sampler" group (its automation sends the presets) → create or update the person in Preset Customers, Segment Free sampler |

Example order payload:

```json
{
  "type": "order",
  "order_id": "6a1f…",
  "order_number": "1042",
  "email": "jane@example.com",
  "name": "Jane Doe",
  "product": "Savanna Golden Hour",
  "product_slug": "savanna-golden-hour",
  "total": 29,
  "currency": "USD",
  "source": "instagram",
  "repeat_customer": false,
  "downloads_url": "https://shop.mw.photography/account.html?email=jane%40example.com",
  "sent_at": "2026-10-10T08:15:00Z"
}
```

## 10. Frontend-to-backend integration, testing and deployment

### 10.1 Connect

1. Create the Supabase project (region nearest your buyers).
2. Run the three migrations.
3. Put the Project URL and anon key in `assets/js/config.js`, and set `SITE_URL`.
4. Deploy the functions and set the secrets (9.1).
5. Make yourself an admin (6), open `/admin/`, create the first product, upload its images and zip.

### 10.2 Run locally

```bash
cd mwp-presets
python3 -m http.server 8000      # then open http://localhost:8000
```

Set `SITE_URL` in `config.js` to `http://localhost:8000` while testing so magic links return to your machine, and change it back before pushing.

### 10.3 Test the whole loop (Lemon Squeezy test mode)

- [ ] Buy with test card `4242 4242 4242 4242`: an order, entitlement and webhook event appear in Supabase; the item appears in monday.com; the delivery email arrives
- [ ] Sign in at My downloads with that email; the pack is listed; the download starts
- [ ] A sixth download the same day is refused with a clear message
- [ ] Refund in Lemon Squeezy: the pack disappears from the library and monday.com shows Refunded
- [ ] Send the same webhook twice (Lemon Squeezy → Webhooks → resend): nothing is duplicated
- [ ] Support form and sampler form create rows and reach Make.com
- [ ] Try `/admin/` with a non-admin email: refused
- [ ] Check every page on a phone

### 10.4 Deploy to GitHub Pages

1. Create the repository `mwp-presets` and push this folder (GitHub Desktop: Add existing repository → Publish).
2. Repository → Settings → Pages → Deploy from branch `main`, folder `/ (root)`.
3. DNS at your domain registrar: a `CNAME` record `presets` → `<your-github-username>.github.io`; then enter the domain in Settings → Pages → Custom domain.
4. Settings → Pages → tick **Enforce HTTPS** once the certificate is issued.
5. Every later change: edit, commit, push; live in about a minute.

### 10.5 Before launch: approvals

- [ ] All site copy (home, product pages, FAQ, emails) approved
- [ ] `legal.html` approved: licence, refunds (14-day draft), terms, privacy
- [ ] Prices and any launch discount approved by Matan
- [ ] Brand values in `tokens.css` checked against brand book v3
- [ ] Images moved into `assets/img/`
- [ ] Lemon Squeezy switched from test to live, live webhook added
- [ ] `SITE_URL` correct in `config.js` and in Supabase secrets
