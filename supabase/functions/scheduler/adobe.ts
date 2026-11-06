// Adobe release monitoring (Jeinna, 6 Nov 2026). Pure functions only (no Deno APIs), so they can be tested with Node
// on saved copies of the real pages (tools/test_adobe_parse.mjs).
//
// Sources: Adobe's own help pages. Each lists releases as headings "September 2026 (version 27.11)" followed by the
// notes for that release. Checked 6 Nov 2026: Photoshop 27.11, Lightroom Classic 15.6, Camera Raw 18.7, Lightroom 9.6.
// developer.adobe.com's UXP changelog moved (old address 404) and the Lightroom Classic SDK page is empty to a plain
// request, so plugin-interface changes are found in the release notes themselves (keywords below).

export type Release = { version: string; label: string; text: string };

export const APPS: Record<string, { name: string; urls: string[] }> = {
  photoshop: {
    name: "Photoshop",
    // the "What's new" page lists every release; the release notes add the bug fixes (UXP fixes are listed there)
    urls: [
      "https://helpx.adobe.com/photoshop/desktop/whats-new/whats-new-in-adobe-photoshop-on-desktop.html",
      "https://helpx.adobe.com/photoshop/desktop/whats-new/photoshop-on-desktop-release-notes.html",
    ],
  },
  lightroom_classic: {
    name: "Lightroom Classic",
    urls: ["https://helpx.adobe.com/lightroom-classic/desktop/introduction-to-lightroom-classic/whats-new.html"],
  },
  camera_raw: {
    name: "Camera Raw",
    urls: ["https://helpx.adobe.com/camera-raw/desktop/whats-new/whats-new.html"],
  },
  lightroom: {
    name: "Lightroom",
    urls: ["https://helpx.adobe.com/lightroom/desktop/introduction/whats-new.html"],
  },
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", mdash: "—", ndash: "–" };
export function textOf(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") { const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

const HEADING = /<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
const VERSIONED = /^([A-Z][a-z]+ \d{4})\s*\(version (\d+(?:\.\d+){0,3})\)$/;

/** Every release on the page, newest first as the page lists them, with its notes as plain text. */
export function parseReleases(html: string): Release[] {
  const marks: { at: number; end: number; label: string; version: string }[] = [];
  for (const m of html.matchAll(HEADING)) {
    const t = textOf(m[2]);
    const v = t.match(VERSIONED);
    if (v) marks.push({ at: m.index!, end: m.index! + m[0].length, label: v[1], version: v[2] });
  }
  return marks.map((mk, i) => ({
    version: mk.version, label: mk.label,
    text: textOf(html.slice(mk.end, i + 1 < marks.length ? marks[i + 1].at : Math.min(html.length, mk.end + 200000))).slice(0, 60000),
  }));
}

export function cmpVersion(a: string, b: string): number {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] ?? 0) - (y[i] ?? 0); if (d) return d; }
  return 0;
}
export const major = (v: string) => Number(v.split(".")[0]);

/** The newest release over all of an app's pages (notes merged when two pages describe the same version). */
export function latest(pages: string[]): Release | null {
  const all = pages.flatMap(parseReleases);
  if (!all.length) return null;
  const top = all.reduce((a, b) => (cmpVersion(b.version, a.version) > 0 ? b : a));
  const text = all.filter((r) => r.version === top.version).map((r) => r.text).join(" ");
  return { ...top, text };
}

// What in the notes matters to each kind of product. "strong" topics name what the product is built on and raise an
// alert to investigate; "weak" ones are kept in the history only (tested 6 Nov 2026 on the real notes: words like
// "profile" or "removed" match unrelated items, e.g. "profile-guided optimization"). A match is a reason to look,
// never proof that something broke.
export const TOPICS: Record<string, { label: string; re: RegExp; strong: boolean }[]> = {
  photoshop_plugin: [
    { label: "UXP plugins and scripting", re: /\bUXP\b|batchPlay|\bmanifest\b/i, strong: true },
    { label: "plugins and extensions", re: /\bplug-?ins?\b|\bextensions?\b/i, strong: false },
    { label: "removed or deprecated", re: /\bdeprecat\w*|\bno longer (?:supported|available)\b/i, strong: false },
  ],
  lightroom_classic_plugin: [
    { label: "plug-in SDK", re: /\bSDK\b|Plug-in Manager|\bplug-?ins? (?:API|SDK)\b|\bLua\b/i, strong: true },
    { label: "plug-ins", re: /\bplug-?ins?\b/i, strong: false },
    { label: "removed or deprecated", re: /\bdeprecat\w*|\bno longer (?:supported|available)\b/i, strong: false },
  ],
  presets: [
    { label: "process version", re: /process version/i, strong: true },
    { label: "presets and profiles", re: /\bpresets?\b|\bcamera profiles?\b|\bAdobe (?:Color|Standard) profile/i, strong: false },
  ],
};

/** Matching sentences from the notes, at most 3 per topic, each cut to 220 characters. */
export function findTopics(text: string, kind: string): { label: string; strong: boolean; quotes: string[] }[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const out: { label: string; strong: boolean; quotes: string[] }[] = [];
  for (const t of TOPICS[kind] ?? []) {
    const quotes = sentences.filter((s) => t.re.test(s)).slice(0, 3).map((s) => (s.length > 220 ? s.slice(0, 217) + "…" : s));
    if (quotes.length) out.push({ label: t.label, strong: t.strong, quotes });
  }
  return out;
}
