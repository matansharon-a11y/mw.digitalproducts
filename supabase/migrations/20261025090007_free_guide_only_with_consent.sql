-- The free guide comes with joining the mailing list (Matan, 25 Oct 2026): "nobody gets the product without consent".
-- Before: every confirmed account got the sample, and a pop-up sign-up got it with or without the marketing tick.
-- Now: only a free-guide sign-up that ticked the box (subscribers.consent) gets it, when the emailed link is clicked
-- (or, for someone who already has an account, at their next sign-in). A plain account (a buyer, an ambassador) no
-- longer gets it. Who already has it keeps it until Matan decides otherwise.

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
  select * into v_lead from public.subscribers
   where email = v_email and source = 'free-guide' and confirmed_at is null and consent is true;
  if v_lead.id is null then return new; end if;   -- no waiting sign-up with consent: nothing to give
  -- an account that was already confirmed: only a new sign-in counts
  if not v_new and (tg_op <> 'UPDATE' or new.last_sign_in_at is not distinct from old.last_sign_in_at) then
    return new;
  end if;
  -- only once the sample's file is uploaded
  select p.id into v_product from public.products p join public.product_files f on f.product_id = p.id
   where p.slug = 'mwp-field-guides-sample';
  if v_product is null then return new; end if;

  -- the account and lead events tell monday about this person; the hand-added mirror mustn't add them a second time
  perform set_config('mwp.quiet', '1', true);
  insert into public.customers (email, name, phone, marketing_opt_in, auth_user_id)
  values (v_email, nullif(coalesce(v_lead.name, new.raw_user_meta_data ->> 'name'), ''), v_lead.phone, true, new.id)
  on conflict (email) do update set
    name             = coalesce(nullif(customers.name, ''), excluded.name),
    phone            = coalesce(nullif(customers.phone, ''), excluded.phone),
    marketing_opt_in = true,
    auth_user_id     = coalesce(customers.auth_user_id, excluded.auth_user_id)
  returning id into v_cust;

  insert into public.entitlements (customer_id, product_id, guide_lang)
  values (v_cust, v_product, v_lead.lang)
  on conflict (customer_id, product_id) do update
    set guide_lang = coalesce(entitlements.guide_lang, excluded.guide_lang);   -- their pop-up language, if none chosen yet

  update public.subscribers set confirmed_at = now() where id = v_lead.id;
  begin
    perform public.call_scheduler('lead', jsonb_build_object('email', v_email));
  exception when others then
    raise warning 'grant_free_sample: monday / Mailchimp not told: %', sqlerrm;
  end;
  return new;
exception when others then
  raise warning 'grant_free_sample: %', sqlerrm;   -- never stop a sign-in
  return new;
end $$;
revoke all on function public.grant_free_sample() from public, anon, authenticated;
