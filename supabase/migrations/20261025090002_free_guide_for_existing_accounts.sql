-- The free Field Guides sample is switched on (Matan, 25 Oct 2026): its file is uploaded, so every confirmed account
-- with a customer record gets it now, like new accounts do from here on (grant_free_sample, 20261025090001). Their
-- language is chosen in My downloads. The card steps aside for owners of the full guides (account.js).
insert into public.entitlements (customer_id, product_id)
select c.id, p.id
  from public.customers c
  join auth.users u on lower(u.email) = c.email and u.email_confirmed_at is not null
  cross join (select p.id from public.products p join public.product_files f on f.product_id = p.id
               where p.slug = 'mwp-field-guides-sample') p
on conflict (customer_id, product_id) do nothing;
