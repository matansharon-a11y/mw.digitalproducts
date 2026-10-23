-- Launch audit (24 Oct 2026): Lemon Squeezy test-mode orders are recorded as such. checkout-webhook unlocks nothing
-- for them unless the buyer is the admin (to try the whole flow) or ALLOW_TEST_ORDERS=true, and the reports leave
-- them out, so a test checkout link can never give products away or inflate the sales figures.
alter table public.orders add column if not exists test_mode boolean not null default false;
