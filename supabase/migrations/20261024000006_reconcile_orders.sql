-- Missed-orders check (24 Oct 2026). Every hour the scheduler compares the last 3 days of Lemon Squeezy orders with
-- the shop's: a paid order the shop doesn't have, or a refund the shop didn't apply, goes to monday once (Shop Orders,
-- status "Not delivered"). The first test order showed why: a refused webhook left a paid customer with nothing, and
-- Lemon Squeezy retries only 3 times.
select cron.schedule('mwp-reconcile-orders', '25 * * * *', $$ select public.call_scheduler('reconcile') $$);
