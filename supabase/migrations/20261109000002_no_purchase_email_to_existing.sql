-- The after-purchase email never goes to existing buyers again (Jeinna, 9 Nov 2026): every order already in the shop
-- counts as done; only new orders get it.
update public.orders set checkin_sent_at = now() where checkin_sent_at is null;
