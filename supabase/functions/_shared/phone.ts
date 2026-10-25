// Phone numbers for monday's Phone column, which needs the number with its country (ISO code). From the free-guide
// pop-up: "+972 50…", "050…" on the Hebrew site (Israel), "+1 555…". Unknown country → the number stays as typed
// and monday's Phone column is left empty (the number is still in Supabase and in Mailchimp).
const CODES: [string, string][] = [   // longest prefixes first
  ["972", "IL"], ["970", "PS"], ["971", "AE"], ["966", "SA"], ["962", "JO"], ["961", "LB"], ["420", "CZ"], ["421", "SK"],
  ["351", "PT"], ["353", "IE"], ["354", "IS"], ["358", "FI"], ["359", "BG"], ["370", "LT"], ["371", "LV"], ["372", "EE"],
  ["380", "UA"], ["385", "HR"], ["386", "SI"], ["852", "HK"], ["886", "TW"], ["254", "KE"], ["255", "TZ"], ["256", "UG"],
  ["260", "ZM"], ["263", "ZW"], ["264", "NA"], ["267", "BW"], ["230", "MU"], ["212", "MA"], ["20", "EG"], ["27", "ZA"],
  ["30", "GR"], ["31", "NL"], ["32", "BE"], ["33", "FR"], ["34", "ES"], ["36", "HU"], ["39", "IT"], ["40", "RO"],
  ["41", "CH"], ["43", "AT"], ["44", "GB"], ["45", "DK"], ["46", "SE"], ["47", "NO"], ["48", "PL"], ["49", "DE"],
  ["51", "PE"], ["52", "MX"], ["54", "AR"], ["55", "BR"], ["56", "CL"], ["57", "CO"], ["60", "MY"], ["61", "AU"],
  ["62", "ID"], ["63", "PH"], ["64", "NZ"], ["65", "SG"], ["66", "TH"], ["81", "JP"], ["82", "KR"], ["84", "VN"],
  ["86", "CN"], ["90", "TR"], ["91", "IN"], ["94", "LK"], ["7", "RU"], ["1", "US"],
];

/** { e164: "+972501234567", country: "IL" }, or country "" when it can't be told. */
export function parsePhone(raw: string, lang: string): { e164: string; country: string } {
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (!digits.startsWith("+")) {
    // a local Israeli number (05…, 02…) from the Hebrew site
    if (lang === "he" && /^0\d{8,9}$/.test(digits)) return { e164: "+972" + digits.slice(1), country: "IL" };
    return { e164: raw.trim(), country: "" };
  }
  const n = digits.slice(1);
  const hit = CODES.find(([code]) => n.startsWith(code));
  return hit ? { e164: "+" + n, country: hit[1] } : { e164: "+" + n, country: "" };
}

/** The monday column value for the Phone column, as a ready JSON fragment ending in a comma, or "" (unknown). */
export function mondayPhone(column: string, raw: string, lang: string): string {
  const { e164, country } = parsePhone(raw, lang);
  return country ? `"${column}":{"phone":"${e164.replace(/[^\d+]/g, "")}","countryShortName":"${country}"},` : "";
}
