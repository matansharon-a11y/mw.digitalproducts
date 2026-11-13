-- Field Guides: downloads again (Jeinna, 14 Nov 2026: "they should be able to download it"). Online-only reading for
-- buyers was switched on in 20261114000001 and switched off the same day: checkout-webhook no longer sets online_only,
-- and anyone who bought in between gets their PDF download back. The column stays, unused, for a later decision.
update public.entitlements set online_only = false where online_only;
