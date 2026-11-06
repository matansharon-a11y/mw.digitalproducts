-- Adobe compatibility monitor (Jeinna, 6 Nov 2026). Once a day the scheduler (job "compat", compat.ts) reads Adobe's
-- own release pages, records each new version, and raises an alert for the products that depend on that app when
--   * it is a new MAJOR version of an app the product runs in            → level "test"
--   * the release notes name what the product is built on (UXP for the Photoshop panel, the plug-in SDK for the
--     Lightroom Classic plugin, a new process version for the presets)  → level "investigate"
-- Minor releases without such a note are only recorded (no alert, no email). An alert is a reason to check, never proof
-- that something broke: only testing confirms it, and the admin marks it Reviewed / Tested OK / Needs update / Resolved.
-- New alerts (not the first, silent baseline run) are emailed once to the admin; the same version never alerts twice.
-- Everything here is admin-only; the scheduler writes with the service role.

create table public.compat_apps (
  key            text primary key,
  name           text not null,
  latest_version text,
  latest_label   text,            -- "September 2026"
  latest_seen_at timestamptz,     -- when the shop first saw that version
  checked_at     timestamptz,
  last_error     text,
  error_count    integer not null default 0,
  error_emailed  boolean not null default false
);

create table public.compat_versions (
  id          uuid primary key default gen_random_uuid(),
  app         text not null references public.compat_apps(key) on delete cascade,
  version     text not null,
  label       text,
  detected_at timestamptz not null default now(),
  is_major    boolean not null default false,
  topics      jsonb not null default '[]'::jsonb,   -- [{product_kind, label, strong, quotes[]}]
  baseline    boolean not null default false,       -- recorded on the first run (no alert email)
  unique (app, version)
);

create table public.compat_deps (
  product_slug          text not null,
  app                   text not null references public.compat_apps(key) on delete cascade,
  kind                  text not null check (kind in ('photoshop_plugin', 'lightroom_classic_plugin', 'presets')),
  min_version           text,
  major_alerts          boolean not null default true,   -- a new major version of this app asks for a test
  what                  text not null default '',        -- how the product uses the app, in plain words
  last_verified_version text,
  verified_at           timestamptz,
  primary key (product_slug, app)
);

create table public.compat_alerts (
  id           uuid primary key default gen_random_uuid(),
  app          text not null references public.compat_apps(key) on delete cascade,
  version      text not null,
  product_slug text not null,
  level        text not null check (level in ('investigate', 'test', 'confirmed')),
  reason       text not null,
  action       text not null,
  quotes       jsonb not null default '[]'::jsonb,
  status       text not null default 'open' check (status in ('open', 'reviewed', 'tested', 'needs_update', 'resolved')),
  note         text,
  baseline     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  emailed_at   timestamptz,
  unique (app, version, product_slug, level)          -- the same finding is never raised (or emailed) twice
);

create table public.compat_runs (
  id         uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  manual     boolean not null default false,
  ok         boolean,
  summary    jsonb not null default '{}'::jsonb
);

alter table public.compat_apps     enable row level security;
alter table public.compat_versions enable row level security;
alter table public.compat_deps     enable row level security;
alter table public.compat_alerts   enable row level security;
alter table public.compat_runs     enable row level security;
create policy compat_apps_admin     on public.compat_apps     for select using (public.is_admin());
create policy compat_versions_admin on public.compat_versions for select using (public.is_admin());
create policy compat_deps_admin     on public.compat_deps     for select using (public.is_admin());
create policy compat_alerts_admin   on public.compat_alerts   for select using (public.is_admin());
create policy compat_runs_admin     on public.compat_runs     for select using (public.is_admin());

insert into public.compat_apps (key, name) values
  ('photoshop', 'Photoshop'), ('lightroom_classic', 'Lightroom Classic'), ('camera_raw', 'Camera Raw'), ('lightroom', 'Lightroom')
on conflict (key) do nothing;

-- What each product depends on (from the product pages and tools/panel-license/README.md). The Field Guides are PDFs:
-- no Adobe dependency. The LUTs (.cube) work in any app that reads LUTs, so they aren't tied to an Adobe version.
insert into public.compat_deps (product_slug, app, kind, min_version, major_alerts, what) values
  ('mwp-panel', 'photoshop', 'photoshop_plugin', '24.2', true,
   'A UXP plugin panel inside Photoshop (manifest minVersion 24.2.0, no maximum).'),
  ('mwp-lightroom-plugin', 'lightroom_classic', 'lightroom_classic_plugin', '13.0', true,
   'A Lightroom Classic plug-in (Lua SDK), added in File › Plug-in Manager.'),
  ('mwp-presets', 'camera_raw', 'presets', null, true,
   'Lightroom presets (.xmp) and profiles run on the Camera Raw engine, which Lightroom Classic and Photoshop share.'),
  ('mwp-presets', 'lightroom_classic', 'presets', null, false,
   'The presets in Lightroom Classic (a new process version would matter; a new version alone does not).'),
  ('mwp-presets', 'lightroom', 'presets', null, false,
   'The presets (.xmp, and .dng for mobile) in Lightroom desktop and mobile.')
on conflict (product_slug, app) do nothing;

-- ---------------------------------------------------------------- admin functions
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
                       order by (x.status in ('resolved', 'tested')), x.created_at desc)
                       from (select * from compat_alerts order by created_at desc limit 200) x), '[]'::jsonb),
    'versions', coalesce((select jsonb_agg(to_jsonb(v) order by v.detected_at desc, v.app)
                       from (select * from compat_versions order by detected_at desc limit 60) v), '[]'::jsonb),
    'last_run', (select to_jsonb(r) from compat_runs r order by started_at desc limit 1)
  );
end $$;

create or replace function public.compat_set_alert(p_alert uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not authorised' using errcode = '42501'; end if;
  if p_status not in ('open', 'reviewed', 'tested', 'needs_update', 'resolved') then raise exception 'unknown status'; end if;
  update compat_alerts set status = p_status, note = coalesce(nullif(trim(p_note), ''), note), updated_at = now() where id = p_alert;
  if not found then raise exception 'alert not found'; end if;
end $$;

-- "Tested and works on this version": the product's last verified version, and its open "test" / "investigate"
-- alerts for that app up to that version are closed as Tested OK.
create or replace function public.compat_mark_verified(p_product text, p_app text, p_version text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not authorised' using errcode = '42501'; end if;
  if p_version !~ '^\d+(\.\d+){0,3}$' then raise exception 'Enter a version number like 27.11'; end if;
  update compat_deps set last_verified_version = p_version, verified_at = now() where product_slug = p_product and app = p_app;
  if not found then raise exception 'unknown product or app'; end if;
  update compat_alerts set status = 'tested', updated_at = now(),
         note = coalesce(note, 'Marked tested on ' || p_version)
   where product_slug = p_product and app = p_app and status in ('open', 'reviewed')
     and string_to_array(version, '.')::int[] <= string_to_array(p_version, '.')::int[];
end $$;

-- "Check now" in the admin: one manual run at most every 5 minutes.
create or replace function public.compat_check_now()
returns text language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'not authorised' using errcode = '42501'; end if;
  if exists (select 1 from compat_runs where manual and started_at > now() - interval '5 minutes') then
    return 'A check ran in the last 5 minutes. Please wait a moment.';
  end if;
  perform public.call_scheduler('compat', jsonb_build_object('manual', true));
  return 'Checking Adobe now. Results appear in a minute.';
end $$;

revoke all on function public.compat_overview() from public, anon;
revoke all on function public.compat_set_alert(uuid, text, text) from public, anon;
revoke all on function public.compat_mark_verified(text, text, text) from public, anon;
revoke all on function public.compat_check_now() from public, anon;
grant execute on function public.compat_overview() to authenticated;
grant execute on function public.compat_set_alert(uuid, text, text) to authenticated;
grant execute on function public.compat_mark_verified(text, text, text) to authenticated;
grant execute on function public.compat_check_now() to authenticated;

-- Once a day (UTC). The first run is the silent baseline; the admin's Compatibility tab starts it at once if no run
-- has happened yet (the functions are deployed after the migrations, so a call from here would come too early).
select cron.schedule('mwp-compat-check', '41 5 * * *', $$ select public.call_scheduler('compat') $$);
