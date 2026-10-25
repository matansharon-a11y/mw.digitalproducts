-- Fix (25 Oct 2026, Jeinna's sign-up): someone who already has an account and fills in the free-guide pop-up gets a
-- sign-in link, not the confirmation email, and signing in never confirmed their sign-up, so monday stayed on "Waiting
-- for email" and Mailchimp never got them. Now signing in also applies a waiting free-guide sign-up (the link proves the
-- email is theirs, like a confirmation does). And the ones already signed in since they filled the form are applied now.

create or replace function public.grant_free_sample()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_email   text := lower(coalesce(new.email, ''));
  v_product uuid;
  v_lead    public.subscribers%rowtype;
  v_cust    uuid;
  v_new     boolean := new.email_confirmed_at is not null
                       and (tg_op = 'INSERT' or old.email_confirmed_at is null);   -- just confirmed
begin
  if v_email = '' or new.email_confirmed_at is null then return new; end if;
  select * into v_lead from public.subscribers where email = v_email and source = 'free-guide' and confirmed_at is null;
  -- an account that was already confirmed: only a sign-in with a waiting free-guide sign-up counts
  if not v_new and (v_lead.id is null or tg_op <> 'UPDATE' or new.last_sign_in_at is not distinct from old.last_sign_in_at) then
    return new;
  end if;
  -- only once the sample's file is uploaded
  select p.id into v_product from public.products p join public.product_files f on f.product_id = p.id
   where p.slug = 'mwp-field-guides-sample';
  if v_product is null then return new; end if;

  -- the account and lead events tell monday about this person; the hand-added mirror mustn't add them a second time
  perform set_config('mwp.quiet', '1', true);
  insert into public.customers (email, name, phone, marketing_opt_in, auth_user_id)
  values (v_email, nullif(coalesce(v_lead.name, new.raw_user_meta_data ->> 'name'), ''), v_lead.phone,
          coalesce(v_lead.consent, false), new.id)
  on conflict (email) do update set
    name             = coalesce(nullif(customers.name, ''), excluded.name),
    phone            = coalesce(nullif(customers.phone, ''), excluded.phone),
    marketing_opt_in = customers.marketing_opt_in or excluded.marketing_opt_in,
    auth_user_id     = coalesce(customers.auth_user_id, excluded.auth_user_id)
  returning id into v_cust;

  insert into public.entitlements (customer_id, product_id, guide_lang)
  values (v_cust, v_product, v_lead.lang)
  on conflict (customer_id, product_id) do update
    set guide_lang = coalesce(entitlements.guide_lang, excluded.guide_lang);   -- their pop-up language, if none chosen yet

  if v_lead.id is not null then
    update public.subscribers set confirmed_at = now() where id = v_lead.id;
    begin
      perform public.call_scheduler('lead', jsonb_build_object('email', v_email));
    exception when others then
      raise warning 'grant_free_sample: monday / Mailchimp not told: %', sqlerrm;
    end;
  end if;
  return new;
exception when others then
  raise warning 'grant_free_sample: %', sqlerrm;   -- never stop a sign-in
  return new;
end $$;
revoke all on function public.grant_free_sample() from public, anon, authenticated;

drop trigger if exists on_auth_user_free_sample on auth.users;
create trigger on_auth_user_free_sample
  after insert or update of email_confirmed_at, last_sign_in_at on auth.users
  for each row execute function public.grant_free_sample();

-- Waiting sign-ups whose account has signed in since they filled the form: apply them now (customer details where
-- empty, consent, the sample in their language), then the scheduler tells monday and Mailchimp.
do $$
declare
  r record;
  v_product uuid;
  v_cust uuid;
begin
  select p.id into v_product from public.products p join public.product_files f on f.product_id = p.id
   where p.slug = 'mwp-field-guides-sample';
  if v_product is null then return; end if;
  perform set_config('mwp.quiet', '1', true);
  for r in
    select s.*, u.id as uid from public.subscribers s
      join auth.users u on lower(u.email) = s.email
     where s.source = 'free-guide' and s.confirmed_at is null
       and u.email_confirmed_at is not null and u.last_sign_in_at > s.created_at
  loop
    insert into public.customers (email, name, phone, marketing_opt_in, auth_user_id)
    values (r.email, nullif(r.name, ''), r.phone, coalesce(r.consent, false), r.uid)
    on conflict (email) do update set
      name             = coalesce(nullif(customers.name, ''), excluded.name),
      phone            = coalesce(nullif(customers.phone, ''), excluded.phone),
      marketing_opt_in = customers.marketing_opt_in or excluded.marketing_opt_in,
      auth_user_id     = coalesce(customers.auth_user_id, excluded.auth_user_id)
    returning id into v_cust;
    insert into public.entitlements (customer_id, product_id, guide_lang)
    values (v_cust, v_product, r.lang)
    on conflict (customer_id, product_id) do update set guide_lang = coalesce(entitlements.guide_lang, excluded.guide_lang);
    update public.subscribers set confirmed_at = now() where id = r.id;
    perform public.call_scheduler('lead', jsonb_build_object('email', r.email));
  end loop;
end $$;
