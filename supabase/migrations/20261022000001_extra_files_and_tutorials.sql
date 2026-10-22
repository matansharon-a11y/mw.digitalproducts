-- Extra downloads and video tutorials (Oct 2026).
--
-- product_extra_files  a product can carry more than its main zip: MWP Panel has its Photoshop plugin
--                      (product_files) and its Lightroom Classic plugin (file_key 'lightroom-classic').
--                      Like product_files, only admins and the Edge Functions see where the files live;
--                      buyers see the label and version through my_extra_files() and download through
--                      get-download ({ slug, file }).
-- product_tutorials    the video tutorials that come with a product (unlisted YouTube links), one row per
--                      video, with the app it teaches. Only the product's owners read them (My downloads);
--                      they never appear on the public pages.

create table if not exists public.product_extra_files (
  product_id  uuid not null references public.products(id) on delete cascade,
  file_key    text not null check (file_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label       text not null check (length(label) between 1 and 60),   -- the button: "Lightroom Classic"
  path        text not null,                                           -- inside the private 'presets' bucket
  size_bytes  bigint,
  version     text not null default '1.0',
  uploaded_at timestamptz not null default now(),
  primary key (product_id, file_key)
);
alter table public.product_extra_files enable row level security;
create policy "admin: manage extra files" on public.product_extra_files
  for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.product_tutorials (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  app         text not null check (app in ('lightroom', 'lightroom-classic', 'photoshop', 'other')),
  title       text not null check (length(title) between 1 and 120),
  title_he    text check (length(title_he) <= 120),
  url         text not null check (url ~ '^https://(www\.|m\.)?(youtube\.com|youtu\.be)/'),
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now()
);
create index if not exists product_tutorials_product_idx on public.product_tutorials (product_id, sort_order);
alter table public.product_tutorials enable row level security;
create policy "admin: manage tutorials" on public.product_tutorials
  for all using (public.is_admin()) with check (public.is_admin());
create policy "customer: tutorials of owned products" on public.product_tutorials
  for select using (
    exists (
      select 1 from public.entitlements e
      join public.customers c on c.id = e.customer_id
      where e.product_id = product_tutorials.product_id
        and e.revoked_at is null
        and c.auth_user_id = auth.uid())
  );

-- The extra files of the products the signed-in person owns (never the storage path).
create or replace function public.my_extra_files()
returns table (slug text, file_key text, label text, version text, size_bytes bigint)
language sql stable security definer set search_path = public as $$
  select distinct p.slug, x.file_key, x.label, x.version, x.size_bytes
  from public.product_extra_files x
  join public.products p on p.id = x.product_id
  join public.entitlements e on e.product_id = x.product_id and e.revoked_at is null
  join public.customers c on c.id = e.customer_id
  where c.auth_user_id = auth.uid()
  order by p.slug, x.file_key;
$$;
revoke all on function public.my_extra_files() from public;
grant execute on function public.my_extra_files() to authenticated;
