-- Remove the three test sign-ups made while switching the free guide on (Matan asked, 25 Oct 2026). Only these exact
-- company test addresses. Deleting the login also removes the customer record and its free access
-- (on_auth_user_deleted, 20261013000036); their monday rows were deleted by hand. Nothing was sent to Mailchimp.
delete from public.subscribers
 where email in ('contact+freeguide-test@matanwildphotography.com',
                 'contact+freeguide-he@matanwildphotography.com',
                 'contact+freeguide-en@matanwildphotography.com');
delete from auth.users
 where lower(email) in ('contact+freeguide-test@matanwildphotography.com',
                        'contact+freeguide-he@matanwildphotography.com',
                        'contact+freeguide-en@matanwildphotography.com');
