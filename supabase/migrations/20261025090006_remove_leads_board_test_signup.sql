-- Remove the test sign-up made while checking the Shop Leads board (Matan asked, 25 Oct 2026). Only this exact company
-- test address; its monday rows were deleted by hand. It never confirmed, so it has no customer record or free access.
delete from public.subscribers where email = 'contact+leadsboard-test@matanwildphotography.com';
delete from auth.users where lower(email) = 'contact+leadsboard-test@matanwildphotography.com';
