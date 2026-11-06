// End-to-end test (and, with LIVE=1 and --allow-net, one real run) of the compatibility monitor job (supabase/functions/scheduler/compat.ts) with saved Adobe pages and
// an in-memory stand-in for the database. Run: deno run --allow-read tools/test_compat_job.ts <folder of saved pages>
// The folder needs the four pages adobe.ts reads, saved under any name (matched by their release headings).
import { compat, compatEmails } from "../supabase/functions/scheduler/compat.ts";
import { APPS } from "../supabase/functions/scheduler/adobe.ts";

// ---- a tiny query builder over arrays: the calls compat.ts uses
type Row = Record<string, unknown>;
const T: Record<string, Row[]> = {};
function table(name: string) { return (T[name] ??= []); }
let ids = 0;
function q(name: string) {
  const rows = table(name);
  const filters: ((r: Row) => boolean)[] = [];
  let op: "select" | "insert" | "update" | "upsert" = "select", payload: unknown = null, single = false, head = false, upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  const api: Record<string, unknown> = {
    select(_c?: string, o?: { head?: boolean }) { head = !!o?.head; return api; },
    insert(p: unknown) { op = "insert"; payload = p; return api; },
    update(p: unknown) { op = "update"; payload = p; return api; },
    upsert(p: unknown, o: typeof upsertOpts) { op = "upsert"; payload = p; upsertOpts = o; return api; },
    eq(c: string, v: unknown) { filters.push((r) => r[c] === v); return api; },
    is(c: string, v: unknown) { filters.push((r) => (r[c] ?? null) === v); return api; },
    gte(c: string, v: number) { filters.push((r) => (r[c] as number) >= v); return api; },
    in(c: string, v: unknown[]) { filters.push((r) => v.includes(r[c])); return api; },
    order() { return api; },
    single() { single = true; return api; },
    maybeSingle() { single = true; return api; },
    then(res: (x: unknown) => void) {
      const match = (r: Row) => filters.every((f) => f(r));
      let data: unknown = null;
      if (op === "insert") { const list = (Array.isArray(payload) ? payload : [payload]) as Row[]; const made = list.map((r) => ({ id: `id${++ids}`, ...r })); rows.push(...made); data = single ? made[0] : made; }
      else if (op === "update") { rows.filter(match).forEach((r) => Object.assign(r, payload)); }
      else if (op === "upsert") {
        const keys = (upsertOpts.onConflict ?? "").split(",");
        const made: Row[] = [];
        for (const r of payload as Row[]) {
          if (rows.some((x) => keys.every((k) => x[k] === r[k]))) { if (upsertOpts.ignoreDuplicates) continue; }
          const n = { id: `id${++ids}`, status: "open", emailed_at: null, ...r }; rows.push(n); made.push(n);
        }
        data = made;
      } else { const found = rows.filter(match); data = single ? found[0] ?? null : found; return res({ data, error: null, count: found.length }); }
      return res({ data, error: null, count: head ? 0 : undefined });
    },
  };
  return api;
}
const db = { from: q };

// ---- seed like the migration
for (const [key, a] of Object.entries(APPS)) table("compat_apps").push({ key, name: a.name, latest_version: null, error_count: 0, error_emailed: false });
table("compat_deps").push(
  { product_slug: "mwp-panel", app: "photoshop", kind: "photoshop_plugin", major_alerts: true },
  { product_slug: "mwp-lightroom-plugin", app: "lightroom_classic", kind: "lightroom_classic_plugin", major_alerts: true },
  { product_slug: "mwp-presets", app: "camera_raw", kind: "presets", major_alerts: true },
  { product_slug: "mwp-presets", app: "lightroom_classic", kind: "presets", major_alerts: false },
  { product_slug: "mwp-presets", app: "lightroom", kind: "presets", major_alerts: false },
);
table("products").push({ slug: "mwp-panel", name: "MWP", name_emphasis: "Photoshop Plugin Panel" }, { slug: "mwp-presets", name: "MWP", name_emphasis: "Presets" }, { slug: "mwp-lightroom-plugin", name: "MWP", name_emphasis: "Lightroom Plugin + Presets" });
table("admin_allowlist").push({ email: "admin@example.com" });

// ---- pages: serve saved copies by URL; "bump" makes Photoshop's newest heading a new major version
const dir = Deno.args[0];
const saved: string[] = [];
for (const f of Deno.readDirSync(dir)) if (f.name.endsWith(".html")) saved.push(Deno.readTextFileSync(`${dir}/${f.name}`));
const pageFor: Record<string, string> = {};
for (const [, a] of Object.entries(APPS)) for (const u of a.urls) {
  const want = { "photoshop-on-desktop-release-notes": "27.11", "whats-new-in-adobe-photoshop": "27.11", "lightroom-classic": "15.6", "camera-raw": "18.7", "lightroom/desktop": "9.6" };
  const k = Object.keys(want).find((x) => u.includes(x))!;
  pageFor[u] = saved.find((h) => h.includes(`(version ${want[k as keyof typeof want]})`) && (k !== "photoshop-on-desktop-release-notes" || h.includes("lacked keyboard focus")))!;
}
let bump = false, broken = false;
const realFetch = globalThis.fetch;
globalThis.fetch = ((url: string) => {
  if (broken && url.includes("camera-raw")) return Promise.resolve(new Response("gone", { status: 503 }));
  let h = pageFor[url];
  if (bump && url.includes("photoshop")) h = h.replace(/September 2026 \(version 27\.11\)/, "October 2026 (version 28.0)");
  return Promise.resolve(new Response(h ?? "", { status: h ? 200 : 404 }));
}) as typeof fetch;

// LIVE=1: one real run against Adobe's live pages (the request the server sends), then stop
if (Deno.env.get("LIVE")) {
  globalThis.fetch = realFetch;
  const r = await compat(db, true, () => Promise.resolve(true));
  console.log(JSON.stringify(r.summary, null, 1));
  console.log("alerts:", table("compat_alerts").map((a) => `${a.app} ${a.version} ${a.product_slug} ${a.level}`));
  Deno.exit(r.ok ? 0 : 1);
}

let fail = 0;
const ok = (c: boolean, m: string) => { console.log(c ? "ok  " : "FAIL", m); if (!c) fail++; };
const hooks: string[] = [];
const hook = (p: string) => { hooks.push(p); return Promise.resolve(true); };

// 1. first run: the baseline. Versions recorded, the Photoshop UXP note raised quietly, no email
let r = await compat(db, false, hook);
ok(r.ok === true, "run 1 reads all four apps");
ok(table("compat_versions").length === 4, "run 1 records 4 versions");
ok(table("compat_apps").find((a) => a.key === "photoshop")!.latest_version === "27.11", "Photoshop latest = 27.11");
const a1 = table("compat_alerts");
ok(a1.length === 1 && a1[0].product_slug === "mwp-panel" && a1[0].level === "investigate" && a1[0].baseline === true, "run 1: one baseline 'investigate' alert for the panel (UXP notes)");
ok(hooks.length === 0, "run 1 sends no email (baseline)");

// 2. same pages again: nothing new, nothing sent
r = await compat(db, false, hook);
ok(table("compat_versions").length === 4 && table("compat_alerts").length === 1 && hooks.length === 0, "run 2: no duplicates, no email");

// 3. Photoshop 28.0 appears: a 'test' alert for the panel (+ investigate: notes still mention UXP), one email
bump = true;
r = await compat(db, false, hook);
const a3 = table("compat_alerts").filter((a) => a.version === "28.0");
ok(a3.some((a) => a.level === "test" && a.product_slug === "mwp-panel"), "run 3: Photoshop 28.0 → 'test' alert for the panel");
ok(!table("compat_alerts").some((a) => a.product_slug === "mwp-presets"), "run 3: presets not flagged by a Photoshop release");
ok(hooks.length === 1, "run 3 asks for one email");
let mails = await compatEmails(db);
ok(mails.length === 1 && /Photoshop 28\.0/.test(mails[0].subject) && /admin\/#compat/.test(mails[0].body_html), "email: subject names Photoshop 28.0, links to the admin");
ok(!/27\.11/.test(mails[0].subject), "email: the quiet baseline alert isn't emailed");
mails = await compatEmails(db);
ok(mails.length === 0, "the same alerts are never emailed twice");

// 4. a page fails 3 days running → one email about it, then silence
broken = true;
for (let i = 0; i < 3; i++) await compat(db, false, hook);
ok(table("compat_apps").find((a) => a.key === "camera_raw")!.error_count === 3, "Camera Raw page failing: counted");
mails = await compatEmails(db);
ok(mails.length === 1 && /can't read/.test(mails[0].subject), "after 3 failures: one email saying the page can't be read");
await compat(db, false, hook);
mails = await compatEmails(db);
ok(mails.length === 0, "…and not again the next day");

console.log(fail ? `${fail} FAILED` : "all compat job checks passed");
Deno.exit(fail ? 1 : 0);
