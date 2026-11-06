// Adobe compatibility monitor: the scheduler's "compat" job (daily, migration 20261106000002; "Check now" in the admin).
// Reads Adobe's release pages (adobe.ts), records new versions, raises alerts for the products that depend on them and
// emails the admin once about new alerts (through the "MWP Shop · Update emails" Make scenario: a one-time code,
// then update_list → compatEmails()). The rules and their reasons are in the migration's header.
import { APPS, cmpVersion, findTopics, latest, major } from "./adobe.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

const ADMIN_URL = "https://shop.mw.photography/admin/#compat";
// The runtime's own default client name (Deno/…): honest, no browser disguise. A custom name ("MWP-Shop-CompatMonitor
// …") was refused by Adobe's site with 403 on 6 Nov 2026, while the default is served normally.
const ERRORS_BEFORE_EMAIL = 3;   // a page that can't be read 3 days in a row is worth one email

async function getPage(url: string): Promise<string> {
  const res = await fetch(url, { headers: { accept: "text/html" }, signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return await res.text();
}

type Alert = { app: string; version: string; product_slug: string; level: string; reason: string; action: string; quotes: string[]; baseline: boolean };

export async function compat(db: Db, manual: boolean, hook: (purpose: string) => Promise<boolean>) {
  const { data: run, error: rErr } = await db.from("compat_runs").insert({ manual }).select("id").single();
  if (rErr) throw rErr;
  const [{ data: apps }, { data: deps }, { data: products }] = await Promise.all([
    db.from("compat_apps").select("*"),
    db.from("compat_deps").select("*"),
    db.from("products").select("slug, name, name_emphasis"),
  ]);
  const productName = (slug: string) => {
    const p = (products ?? []).find((x: { slug: string }) => x.slug === slug);
    return p ? `${p.name}${p.name_emphasis ? " " + p.name_emphasis : ""}` : slug;
  };
  const summary: Record<string, unknown> = {};
  const alerts: Alert[] = [];

  for (const [key, def] of Object.entries(APPS)) {
    const row = (apps ?? []).find((a: { key: string }) => a.key === key);
    if (!row) continue;
    const now = new Date().toISOString();
    try {
      const pages = (await Promise.allSettled(def.urls.map(getPage)))
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled").map((r) => r.value);
      if (!pages.length) throw new Error("Adobe's page couldn't be loaded");
      const rel = latest(pages);
      if (!rel) throw new Error("No release headings found on Adobe's page (its layout may have changed)");
      await db.from("compat_apps").update({ checked_at: now, last_error: null, error_count: 0, error_emailed: false }).eq("key", key);

      const { data: known } = await db.from("compat_versions").select("version").eq("app", key);
      const seen = (known ?? []).map((v: { version: string }) => v.version);
      if (seen.includes(rel.version)) { summary[key] = { version: rel.version, new: false }; continue; }

      const baseline = seen.length === 0;   // first run: record what's there, alert only on real notes, email nothing
      const prev = row.latest_version as string | null;
      const isMajor = !!prev && major(rel.version) > major(prev);
      const appDeps = (deps ?? []).filter((d: { app: string }) => d.app === key);
      const topics = appDeps.map((d: { kind: string }) => ({ kind: d.kind, found: findTopics(rel.text, d.kind) }));
      await db.from("compat_versions").insert({
        app: key, version: rel.version, label: rel.label, is_major: isMajor, baseline,
        topics: topics.flatMap((t: { kind: string; found: unknown[] }) => (t.found as { label: string; strong: boolean; quotes: string[] }[]).map((f) => ({ product_kind: t.kind, ...f }))),
      });
      if (!prev || cmpVersion(rel.version, prev) > 0) {
        await db.from("compat_apps").update({ latest_version: rel.version, latest_label: rel.label, latest_seen_at: now }).eq("key", key);
      }

      for (const d of appDeps) {
        const name = productName(d.product_slug);
        if (isMajor && d.major_alerts) {
          alerts.push({
            app: key, version: rel.version, product_slug: d.product_slug, level: "test", baseline,
            reason: `${def.name} ${rel.version} (${rel.label}) is a new major version; ${name} was made for ${prev ?? "an earlier version"}${d.last_verified_version ? ` and last verified on ${d.last_verified_version}` : ""}.`,
            action: `Install ${def.name} ${rel.version}, open ${name} and run through its main features. If all works, mark it tested on ${rel.version}; if not, mark it Needs update.`,
            quotes: [],
          });
        }
        const strong = findTopics(rel.text, d.kind).filter((t) => t.strong);
        if (strong.length) {
          alerts.push({
            app: key, version: rel.version, product_slug: d.product_slug, level: "investigate", baseline,
            reason: `The ${def.name} ${rel.version} release notes mention ${strong.map((t) => t.label).join(" and ")}, which ${name} is built on.`,
            action: `Read the quoted notes. If ${name} uses that feature, test it on ${def.name} ${rel.version}; otherwise mark it Reviewed.`,
            quotes: strong.flatMap((t) => t.quotes).slice(0, 4),
          });
        }
      }
      summary[key] = { version: rel.version, new: true, major: isMajor, baseline };
    } catch (err) {
      const msg = String((err as Error)?.message ?? err).slice(0, 300);
      await db.from("compat_apps").update({ checked_at: now, last_error: msg, error_count: (row.error_count ?? 0) + 1 }).eq("key", key);
      summary[key] = { error: msg };
    }
  }

  // the same (app, version, product, level) is stored once: a repeat run never raises or emails it again
  let created = 0;
  if (alerts.length) {
    const { data: ins, error } = await db.from("compat_alerts")
      .upsert(alerts, { onConflict: "app,version,product_slug,level", ignoreDuplicates: true }).select("id, baseline");
    if (error) throw error;
    created = (ins ?? []).length;
  }

  const { count: unsent } = await db.from("compat_alerts").select("id", { count: "exact", head: true })
    .is("emailed_at", null).eq("baseline", false);
  const { count: broken } = await db.from("compat_apps").select("key", { count: "exact", head: true })
    .gte("error_count", ERRORS_BEFORE_EMAIL).eq("error_emailed", false);
  let emailed = false;
  if ((unsent ?? 0) > 0 || (broken ?? 0) > 0) emailed = await hook(`compat:${run.id}`);

  const ok = !Object.values(summary).some((s) => (s as { error?: string }).error);
  await db.from("compat_runs").update({ ok, summary: { ...summary, alerts_created: created, email_requested: emailed } }).eq("id", run.id);
  return { ok, summary, alerts_created: created, email_requested: emailed };
}

// ---------------------------------------------------------------- the email (asked for by Make with the one-time code)
const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const LEVEL: Record<string, string> = { test: "Needs testing", investigate: "Worth a look", confirmed: "Confirmed problem" };

export async function compatEmails(db: Db) {
  const { data: alerts } = await db.from("compat_alerts").select("*").is("emailed_at", null).eq("baseline", false).order("created_at");
  const { data: broken } = await db.from("compat_apps").select("*").gte("error_count", ERRORS_BEFORE_EMAIL).eq("error_emailed", false);
  if (!(alerts ?? []).length && !(broken ?? []).length) return [];
  const { data: admins } = await db.from("admin_allowlist").select("email");
  const { data: products } = await db.from("products").select("slug, name, name_emphasis");
  const pname = (slug: string) => {
    const p = (products ?? []).find((x: { slug: string }) => x.slug === slug);
    return p ? `${p.name}${p.name_emphasis ? " " + p.name_emphasis : ""}` : slug;
  };
  const appName = (k: string) => APPS[k]?.name ?? k;

  const items = (alerts ?? []).map((a: Alert & { id: string }) => `
<div style="margin:0 0 18px;padding:14px 16px;border:1px solid #e3d6c3;border-radius:10px">
<p style="margin:0 0 6px"><b>${esc(appName(a.app))} ${esc(a.version)}</b> · ${esc(pname(a.product_slug))} · <b>${esc(LEVEL[a.level] ?? a.level)}</b></p>
<p style="margin:0 0 6px"><b>Why:</b> ${esc(a.reason)}</p>
${(a.quotes ?? []).length ? `<p style="margin:0 0 6px;color:#555"><b>From Adobe's notes:</b><br>${(a.quotes as string[]).map((q) => `“${esc(q)}”`).join("<br>")}</p>` : ""}
<p style="margin:0"><b>What to do:</b> ${esc(a.action)}</p>
</div>`).join("");
  const errs = (broken ?? []).map((b: { key: string; last_error: string; error_count: number }) =>
    `<li>${esc(appName(b.key))}: ${esc(b.last_error)} (${b.error_count} checks in a row)</li>`).join("");
  const n = (alerts ?? []).length;
  const subject = n
    ? `MWP Shop: ${n} product compatibility ${n === 1 ? "alert" : "alerts"} (${[...new Set((alerts ?? []).map((a: Alert) => `${appName(a.app)} ${a.version}`))].join(", ")})`
    : "MWP Shop: the Adobe compatibility check can't read a page";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a;max-width:640px">
<p>Hi,</p>
${n ? `<p>The daily Adobe check found ${n === 1 ? "something" : "things"} worth checking for our products. These are possible risks to test, not confirmed problems.</p>${items}` : ""}
${errs ? `<p><b>The check couldn't read Adobe's release page for:</b></p><ul>${errs}</ul><p>Adobe may have moved or redesigned the page. Until it's fixed, that app isn't being watched.</p>` : ""}
<p><a href="${ADMIN_URL}" style="display:inline-block;padding:10px 18px;border-radius:20px;background:#9A6418;color:#fff;text-decoration:none">Open Compatibility in the admin</a></p>
<p style="color:#777;font-size:13px">Sent once per finding by the MWP Shop compatibility monitor. Mark each one in the admin when you've looked at it.</p>
</div>`;
  const now = new Date().toISOString();
  if (n) await db.from("compat_alerts").update({ emailed_at: now }).in("id", (alerts ?? []).map((a: { id: string }) => a.id));
  if ((broken ?? []).length) await db.from("compat_apps").update({ error_emailed: true }).in("key", (broken ?? []).map((b: { key: string }) => b.key));
  return (admins ?? []).map((a: { email: string }) => ({ email: a.email, subject, body_html: html }));
}
