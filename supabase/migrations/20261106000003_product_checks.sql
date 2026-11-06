-- Automatic product checks (Jeinna, 6 Nov 2026: "no manual testing"). The "Product checks" workflow (tools/compat/
-- check.py) opens the real product files and checks them against Adobe's current versions; each run leaves one row per
-- product here, and marks each dependency with the Adobe version it was last checked against. The admin's
-- Compatibility tab shows "Passed automatic checks on <version>" from these. Admin read only; the workflow writes.
create table public.compat_checks (
  id           uuid primary key default gen_random_uuid(),
  product_slug text not null,
  file_version text,
  ran_at       timestamptz not null default now(),
  ok           boolean not null,
  checks       jsonb not null default '[]'::jsonb,   -- [{name, ok, level: pass|warn|fail, detail}]
  against      jsonb not null default '{}'::jsonb    -- the latest Adobe versions at the time
);
create index compat_checks_product_idx on public.compat_checks (product_slug, ran_at desc);
alter table public.compat_checks enable row level security;
create policy compat_checks_admin on public.compat_checks for select using (public.is_admin());

alter table public.compat_deps
  add column if not exists auto_checked_version text,
  add column if not exists auto_ok boolean,
  add column if not exists auto_checked_at timestamptz;

-- the overview also carries each product's latest automatic check
create or replace function public.compat_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not authorised' using errcode = '42501'; end if;
  return jsonb_build_object(
    'apps', coalesce((select jsonb_agg(to_jsonb(a) order by a.name) from compat_apps a), '[]'::jsonb),
    'deps', coalesce((select jsonb_agg(to_jsonb(d) || jsonb_build_object(
                         'product_name', coalesce((select p.name || coalesce(' ' || p.name_emphasis, '') from products p where p.slug = d.product_slug), d.product_slug))
                       order by d.product_slug, d.app) from compat_deps d), '[]'::jsonb),
    'alerts', coalesce((select jsonb_agg(to_jsonb(x) || jsonb_build_object(
                         'product_name', coalesce((select p.name || coalesce(' ' || p.name_emphasis, '') from products p where p.slug = x.product_slug), x.product_slug))
                       order by (x.status in ('resolved', 'tested', 'reviewed')), x.created_at desc)
                       from (select * from compat_alerts order by created_at desc limit 200) x), '[]'::jsonb),
    'versions', coalesce((select jsonb_agg(to_jsonb(v) order by v.detected_at desc, v.app)
                       from (select * from compat_versions order by detected_at desc limit 60) v), '[]'::jsonb),
    'checks', coalesce((select jsonb_agg(to_jsonb(c)) from (
                         select distinct on (product_slug) * from compat_checks order by product_slug, ran_at desc) c), '[]'::jsonb),
    'last_run', (select to_jsonb(r) from compat_runs r order by started_at desc limit 1)
  );
end $$;
