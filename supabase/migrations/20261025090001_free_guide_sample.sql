-- ============================================================================
-- The free Field Guides sample: the shop's sign-up gift (Matan, 25 Oct 2026).
--   * mwp-field-guides-sample: a free product, never sold and never shown in the shop. Its file is a zip with the
--     sample in English and Hebrew (tools/make_guide_sample.py); like the paid guides, each person gets their own
--     stamped copy in their language (entitlements.guide_lang).
--   * The pop-up form (subscribe, source 'free-guide') keeps name, phone, language and marketing consent in
--     subscribers. Nothing is given yet: anyone can type any email.
--   * When an email is confirmed (the sign-in link is clicked, or any new account is confirmed), the person gets the
--     sample, and a waiting free-guide sign-up is applied: their customer record gets the name and phone (only where
--     empty: never overwrites what someone already has) and their marketing consent, and the scheduler ('lead') tells
--     Make, which marks them confirmed in monday and adds them to Mailchimp when they agreed to marketing.
-- ============================================================================

insert into public.products (slug, name, name_emphasis, category, tagline, includes, price_cents, version, item_count, is_active, sort_order)
values ('mwp-field-guides-sample', 'MWP', 'Field Guides · free sample', 'guide', 'Four lessons from each guide, free.',
        array['16 lessons from the four MWP Field Guides', 'Composition, light, colour and planning', 'English or Hebrew'],
        0, '1.0', 1, false, 90)
on conflict (slug) do nothing;

alter table public.subscribers
  add column if not exists name         text check (length(name) <= 120),
  add column if not exists phone        text check (length(phone) <= 40),
  add column if not exists lang         text check (lang in ('en', 'he')),
  add column if not exists confirmed_at timestamptz;

create or replace function public.grant_free_sample()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_email   text := lower(coalesce(new.email, ''));
  v_product uuid;
  v_lead    public.subscribers%rowtype;
  v_cust    uuid;
begin
  if v_email = '' or new.email_confirmed_at is null
     or (tg_op = 'UPDATE' and old.email_confirmed_at is not null) then
    return new;
  end if;
  -- only once the sample's file is uploaded (after Matan approves it): until then nobody gets an empty card
  select p.id into v_product from public.products p join public.product_files f on f.product_id = p.id
   where p.slug = 'mwp-field-guides-sample';
  if v_product is null then return new; end if;
  select * into v_lead from public.subscribers where email = v_email and source = 'free-guide' and confirmed_at is null;

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
  on conflict (customer_id, product_id) do nothing;

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
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.grant_free_sample();

-- Accounts confirmed before the sample's file is uploaded get it when it is: the follow-up migration that
-- switches the gift on gives it to every confirmed account with a customer record.

-- The hand-added mirror (20261013000036) stays quiet for customers created by the shop's own triggers.
create or replace function public.on_customer_added()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if session_user = 'authenticator' or current_setting('mwp.quiet', true) = '1' then return new; end if;
  perform public.call_scheduler('customer_added', jsonb_build_object('customer_id', new.id));
  return new;
exception when others then
  raise warning 'on_customer_added: monday not told: %', sqlerrm;
  return new;
end $$;
revoke all on function public.on_customer_added() from public, anon, authenticated;
