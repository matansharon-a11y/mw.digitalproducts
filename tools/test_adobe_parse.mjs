// Tests the Adobe release-notes reader (supabase/functions/scheduler/adobe.ts) on saved copies of the real pages.
//   node --experimental-strip-types tools/test_adobe_parse.mjs <folder with the saved .html pages>
import fs from "fs";
import path from "path";
const { parseReleases, latest, findTopics, cmpVersion } = await import("../supabase/functions/scheduler/adobe.ts");
const dir = process.argv[2];
let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log("FAIL", msg); } };
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".html"))) {
  const html = fs.readFileSync(path.join(dir, f), "utf8");
  const rel = parseReleases(html);
  if (!rel.length) continue;
  const top = latest([html]);
  console.log(f, rel.length, "releases; newest", top.version, `(${top.label})`, "text", top.text.length, "chars");
  for (const kind of ["photoshop_plugin", "lightroom_classic_plugin", "presets"]) {
    const t = findTopics(top.text, kind);
    if (t.length) console.log("   ", kind, "→", t.map((x) => `${x.strong ? "STRONG " : ""}${x.label}: "${x.quotes[0].slice(0, 90)}"`).join(" | "));
  }
  ok(rel.every((r) => /^\d+(\.\d+)*$/.test(r.version)), `${f}: versions look like numbers`);
  ok(top.text.length > 50, `${f}: notes text found`);
}
ok(cmpVersion("27.11", "27.9.1") > 0, "27.11 > 27.9.1");
ok(cmpVersion("15.6", "15.6.0") === 0, "15.6 = 15.6.0");
ok(parseReleases("<h2>Nothing</h2>").length === 0, "no versions → empty");
console.log(fail ? `${fail} failed` : "all checks passed");
process.exit(fail ? 1 : 0);
