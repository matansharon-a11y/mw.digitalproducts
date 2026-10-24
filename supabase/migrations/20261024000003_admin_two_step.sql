-- Two-step sign-in for the admin (launch audit, 24 Oct 2026).
-- Once an admin has a verified authenticator (set up in admin → Two-step sign-in),
-- every admin right needs a session that passed the code (aal2): a stolen password
-- alone opens nothing. An admin without an authenticator keeps working as before,
-- so turning this on can't lock anyone out.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
    and (
      coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
    );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
