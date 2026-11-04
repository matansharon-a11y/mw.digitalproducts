-- Update emails (Jeinna, 4 Nov 2026: "we'll notify them through email").
-- When a product's file gets a new version (admin → product → upload a zip with a new version number), the shop keeps
-- an update notice. The admin shows it on the product with "Email the owners": only that click sends anything (one
-- email per owner: scheduler job update_emails hands Make's "MWP Shop · Update emails" scenario a one-time code, Make
-- fetches the list with it (update_list) and sends each email with Gmail). "No email" closes it without sending, for a
-- small fix nobody needs to hear about. Re-uploading the same version number makes no notice.
-- The Field Guides: the set's pack also feeds the four single guides (their trigger copies the file), so their own
-- notices are never made; the set's notice reaches the owners of the set and of every single guide.
-- The free sample is never announced.

create table public.update_notices (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  version      text not null,
  created_at   timestamptz not null default now(),
  status       text not null default 'new' check (status in ('new', 'sending', 'sent', 'dismissed', 'failed')),
  requested_at timestamptz,
  sent_at      timestamptz,
  recipients   integer,
  unique (product_id, version)
);
alter table public.update_notices enable row level security;
create policy update_notices_admin_read on public.update_notices for select using (public.is_admin());

create or replace function public.product_file_new_version()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_skip boolean;
begin
  if new.version is not distinct from old.version then
    return new;
  end if;
  select (p.guide_key is not null or p.slug like '%-sample') into v_skip from public.products p where p.id = new.product_id;
  if coalesce(v_skip, true) then
    return new;
  end if;
  insert into public.update_notices (product_id, version) values (new.product_id, new.version)
  on conflict (product_id, version) do nothing;
  return new;
end $$;

create trigger product_files_new_version after update of version on public.product_files
  for each row execute function public.product_file_new_version();

-- Who an update reaches: active (not refunded) access to the product, bought or free (ambassadors, testers);
-- for the Field Guides set also the single guides' owners. One row per email.
create or replace function public.update_recipients(p_product uuid)
returns table (email text, name text, lang text)
language sql security definer set search_path = '' stable as $$
  with ids as (
    select p_product as id
    union
    select g.id from public.products g, public.products s
     where s.id = p_product and s.slug = 'mwp-field-guides' and g.guide_key is not null
  ), owners as (
    select distinct on (c.email) c.id, c.email, c.name
      from public.entitlements e join public.customers c on c.id = e.customer_id
     where e.product_id in (select id from ids) and e.revoked_at is null
     order by c.email
  )
  select o.email, coalesce(o.name, ''),
         case when exists (select 1 from public.entitlements e2 where e2.customer_id = o.id and e2.guide_lang = 'he')
                or exists (select 1 from public.beta_members b where b.customer_id = o.id and b.terms_lang = 'he')
                or exists (select 1 from public.subscribers s where s.email = o.email and s.lang = 'he')
              then 'he' else 'en' end
    from owners o;
$$;
revoke all on function public.update_recipients(uuid) from public, anon, authenticated;

-- For the admin: the newest open notice of a product, with how many people it would reach.
create or replace function public.update_notice_for(p_product uuid)
returns table (id uuid, version text, status text, recipients integer, owners integer, created_at timestamptz, sent_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not allowed'; end if;
  return query
    select n.id, n.version, n.status, n.recipients,
           (select count(*)::int from public.update_recipients(p_product)), n.created_at, n.sent_at
      from public.update_notices n
     where n.product_id = p_product and n.status <> 'dismissed'
     order by n.created_at desc limit 1;
end $$;
revoke all on function public.update_notice_for(uuid) from public, anon;
grant execute on function public.update_notice_for(uuid) to authenticated;

-- The admin's click: send it (once) or close it without an email.
create or replace function public.decide_update_notice(p_notice uuid, p_send boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not allowed'; end if;
  if p_send then
    -- a send that never finished (Make didn't pick it up within 15 minutes) can be tried again
    update public.update_notices set status = 'sending', requested_at = now()
     where id = p_notice and (status in ('new', 'failed') or (status = 'sending' and requested_at < now() - interval '15 minutes'));
    if not found then raise exception 'This update email was already sent or closed.'; end if;
    perform public.call_scheduler('update_emails', jsonb_build_object('notice_id', p_notice));
  else
    update public.update_notices set status = 'dismissed' where id = p_notice and status in ('new', 'failed');
  end if;
end $$;
revoke all on function public.decide_update_notice(uuid, boolean) from public, anon;
grant execute on function public.decide_update_notice(uuid, boolean) to authenticated;
