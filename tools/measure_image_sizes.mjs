// Measures how wide every photo really shows on each page, on a phone, a tablet and a computer, and writes
// assets/pages/img/layout.json. tools/image_sizes.py apply turns it into each <img>'s `sizes`, so the browser picks the
// photo size that fits the spot (Lighthouse "Properly size images"). Run it after a layout change or a new page:
//
//   python3 -m http.server 8765 &          (in the repository)
//   node tools/measure_image_sizes.mjs     (needs Playwright with Chromium)
//
// Scripts are switched off while measuring: the widths come from the pages' own CSS, in the order the photos appear in
// the HTML, which is what the apply step walks through.
import { createRequire } from "module";
const { chromium } = createRequire(import.meta.url)("playwright");
import fs from "fs";
import path from "path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BASE = process.env.BASE || "http://localhost:8765";
const SCREENS = [[390, 844], [900, 1000], [1440, 900]];   // phone, tablet, computer: the breakpoints below follow these
const pages = [];
(function find(dir) {
  for (const f of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, f.name);
    if (f.isDirectory()) { if (!/^(\.|node_modules|admin|assets|supabase|tools|docs)/.test(rel)) find(rel); }
    else if (f.name.endsWith(".html") && fs.readFileSync(path.join(ROOT, rel), "utf8").includes("assets/pages/img/")) pages.push(rel);
  }
})("");

const out = {};
const browser = process.env.CHROME_PATH ? await chromium.launch({ executablePath: process.env.CHROME_PATH }) : await chromium.launch();
for (const page of pages.sort()) {
  const widths = [];
  for (const [w, h] of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, javaScriptEnabled: false });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/${page}`, { waitUntil: "domcontentloaded" });
    widths.push(await p.evaluate(() => [...document.querySelectorAll("img")]
      .filter((i) => /assets\/pages\/img\//.test(i.getAttribute("src") || ""))
      .map((i) => Math.ceil(Math.max(i.offsetWidth, i.getBoundingClientRect().width)))));   // the layout width, before any visual scale: never too small
    await ctx.close();
  }
  // one `sizes` per photo: its width as a share of the screen at each breakpoint (vw), so it also holds between them
  out[page] = widths[0].map((_, k) => {
    const [a, b, c] = SCREENS.map(([sw], j) => widths[j][k] ? Math.min(100, Math.ceil(widths[j][k] / sw * 100)) : 0);
    // hidden while measuring (scripts are off) isn't small: use the widest share seen, never 1px (that showed blurry photos)
    const vw = (x) => `${x || Math.max(a, b, c) || 100}vw`;
    return `(max-width: 600px) ${vw(a)}, (max-width: 1100px) ${vw(b)}, ${vw(c)}`;
  });
  console.log(page, out[page].length, "photos");
}
await browser.close();
fs.writeFileSync(path.join(ROOT, "assets/pages/img/layout.json"), JSON.stringify(out, null, 0));
console.log("wrote assets/pages/img/layout.json");
