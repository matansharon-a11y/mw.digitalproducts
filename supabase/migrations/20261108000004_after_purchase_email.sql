-- The after-purchase email (Jeinna, 8 Nov 2026, with Matan): about an hour after each paid order, one HTML email to
-- the buyer (scheduler job "checkins", checkin.ts, sent by Make's "MWP Shop · Update emails" scenario). The three
-- orders from 4–7 Nov 2026 get it once too. Test and refunded orders never do; each order at most once.
alter table public.orders add column if not exists checkin_sent_at timestamptz;
select cron.schedule('mwp-checkin-emails', '*/15 * * * *', $$ select public.call_scheduler('checkins') $$);
