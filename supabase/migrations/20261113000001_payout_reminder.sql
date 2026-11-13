-- Payout invoice reminder (Jeinna, 13 Nov 2026): the day after each Lemon Squeezy payout (the 1st and the 15th), and
-- again 3 days later, the scheduler emails the admin the steps to issue the payout's invoice in Morning, only when
-- that half-month had paid sales and the invoice isn't issued yet (scheduler/payout_reminder.ts). 06:41 UTC = morning in Israel.
select cron.schedule('mwp-payout-reminder', '41 6 2,5,16,19 * *', $$ select public.call_scheduler('payout_reminder') $$);
