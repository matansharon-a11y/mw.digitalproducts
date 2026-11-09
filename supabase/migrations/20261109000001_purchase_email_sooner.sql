-- The after-purchase email becomes the "your files are ready" email (Jeinna, 9 Nov 2026): a few minutes after purchase, not an hour.
select cron.unschedule('mwp-checkin-emails') where exists (select 1 from cron.job where jobname = 'mwp-checkin-emails');
select cron.schedule('mwp-checkin-emails', '*/5 * * * *', $$ select public.call_scheduler('checkins') $$);
