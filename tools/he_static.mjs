// Hebrew for a batch of English strings, with exactly the browser's rules (assets/js/i18n.js).
// stdin: JSON {"texts": [...], "names": [...]}; stdout: JSON {"texts": [...], "names": [...], "sales": {...}}.
// "texts" get the full translation (sentence, then names); "names" only the names (product names split over two elements).
import { toHebrew, hebrewNames, SALES } from "../assets/js/i18n.js";
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  const { texts = [], names = [] } = JSON.parse(raw);
  process.stdout.write(JSON.stringify({ texts: texts.map(toHebrew), names: names.map(hebrewNames), sales: SALES }));
});
