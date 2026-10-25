# Go-live day: switching MWP Shop to live payments

Store: **MWP Shop, Lemon Squeezy #502637** (checkout.mw.photography). Never use #502636.
Who: **you** = the account owner (Lemon Squeezy, GitHub, bank). **Claude** = everything in the repo, the workflows and the checks.
Time: about 30 minutes, plus one real purchase.

## Before the day (all must be true)
- [ ] Lemon Squeezy approved the store (approval email; the sidebar no longer says "Your application has been received", and the test-mode switch moves).
- [ ] Payouts: bank account set, tax details submitted (no "[Action Required]" banner on Settings → Payouts).
- [x] Lemon Squeezy products renamed (24 Oct 2026): MWP Photoshop Plugin Panel, MWP Presets + Photoshop Plugin Panel, MWP Field Guides + Photoshop Plugin Panel, with their descriptions and the full set's. The shop matches products by variant ID, so names never break anything.
- [ ] Two-step sign-in on your Lemon Squeezy login (the shop admin's has been on since 24 Oct).
- Test orders don't need deleting: they stay as the record of the checks, marked "Test order" in admin → Orders, and every total (Overview, Customers, weekly report) leaves them out.
- [ ] Test-mode checks passed: an admin test order unlocks the product; a test order from any other email unlocks nothing; a test refund removes access (Lemon Squeezy's refunds were failing in test mode on 24 Oct; asked support).
- [ ] Accountant has answered the tax questions; decision made on shekel prices on the Hebrew site.
- [ ] Prices confirmed by Matan (the 7 products: $59.99 Presets, $59.99 Photoshop Plugin Panel, $75.99 Field Guides, $99.99 Presets + Photoshop Plugin Panel, $109.99 Presets + Field Guides, $109.99 Field Guides + Photoshop Plugin Panel, $149.99 Full Set).

## On the day
1. **You** — Lemon Squeezy, bottom left must say **MWP Shop**. Switch **test mode off**.
2. **Claude** — Products (live): check all 7 are there (copied to live on 24 Oct) with the right price, tax category, "Display on storefront" off, confirmation button → `shop.mw.photography/thank-you/`, receipt button → `shop.mw.photography/account/`.
3. **You** — Settings → API → **+** → "MWP Shop live" → create. Copy the key (shown once) straight into GitHub → mw.digitalproducts → Settings → Secrets and variables → Actions → `LEMONSQUEEZY_API_KEY` → Update. Never paste it anywhere else. Tell Claude "live key is in".
4. **Claude** — run Actions → **Deploy** once (any push to main does it): the missed-orders check gets the live key.
5. **Claude** — run Actions → **Connect Lemon Squeezy** with `store_id` 502637, "Write to the shop" ticked. The summary must say: key in **live**, every product **connected** with no "price differs", and "Webhook: created, signing secret set on the function as LS_WEBHOOK_SECRET_LIVE".
6. **Claude** — check Lemon Squeezy → Settings → Webhooks (live) shows the checkout-webhook URL with 2 events.
7. **Claude** — check the live site: every buy button opens a checkout at checkout.mw.photography with the right product and price; English shows dollars; Hebrew shows shekels with the "charged in dollars" note; the cart's Checkout button works signed in, and asks to sign in when signed out.

## First real purchase (proves the money path)
8. **You** — signed in to your own shop account, buy the cheapest product with a real card.
9. **Claude** — check: the Lemon Squeezy order is **not** test mode; webhook delivery 200; the product is in My downloads; the receipt email's button goes to My downloads; monday Shop Orders shows the order as **Paid** (not "Test order").
10. **You** — refund it in Lemon Squeezy (order → ⋯ → Refund payment → full). Lemon Squeezy keeps its fee.
11. **Claude** — check: access is gone from My downloads; monday shows **Refunded**.
12. **You** — leave live mode on. The shop is open.

## The first week
- The missed-orders check runs every hour at :25. Anything red ("Not delivered") in monday Shop Orders needs a person the same day: the customer paid and doesn't have their product (or a refund didn't take access away).
- Raise the account-email limit before traffic: 30 an hour today (Supabase → Authentication → Rate limits, within your Resend plan).
- Watch the first few real orders end to end.

## Marketing launch (after the first real purchase, each on Matan's OK)
1. **Email limits first** (before any ads or the launch email): Resend plan up from the free 100 a day (Matan's purchase), then Supabase → Authentication → Rate limits above 30 an hour.
2. **Welcome series** (Mailchimp "MWP Shop · Free guide welcome", on since 25 Oct 2026): add emails 3 and 4 (`assets/email/3-tools-*`, `4-full-guides-*`) to both branches (docs/FREE-GUIDE.md).
3. **Launch email**: send the Mailchimp drafts "MWP Shop launch · English / Hebrew" (send a test to contact@ first).
4. **Ads**: point them at the free guide (`https://shop.mw.photography/#free-guide`, Hebrew `/he/#free-guide`), Hebrew and English versions.
5. **Watch**: the first English pop-up sign-up gets lang_en in Mailchimp and the English welcome email.

## If something goes wrong
- **Checkout broken or wrong price:** in Lemon Squeezy, unpublish the product (it stops selling at once), then fix and re-run Connect.
- **Orders not arriving ("Not delivered" in monday, or webhook deliveries failing):** re-run Connect Lemon Squeezy with "new signing secret" ticked; then use **Simulate event → order_created** on each affected order in Lemon Squeezy to deliver it again.
- **Need to stop all sales fast:** switch Lemon Squeezy back to test mode, or unpublish the 7 products. The site keeps working; checkout stops.
