// Dodo Payments webhook signatures (Standard Webhooks, Dodo's docs). Kept apart so tests can use them.
import { safeEqual } from "./http.ts";

const TOLERANCE_S = 300;   // older (or newer) than 5 minutes is refused: a replayed notice

function keyBytes(secret: string): Uint8Array<ArrayBuffer> {
  const b64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  try { return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); }
  catch { return new Uint8Array(new TextEncoder().encode(secret)); }
}
export async function sign(secret: string, id: string, ts: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", keyBytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  return btoa(String.fromCharCode(...mac));
}
// "live" / "test" when a v1 signature matches that secret, else null
export async function verify(headers: Headers, body: string, secrets: { live: string; test: string }, now = Date.now()): Promise<"live" | "test" | null> {
  const id = headers.get("webhook-id") ?? "", ts = headers.get("webhook-timestamp") ?? "", sigs = headers.get("webhook-signature") ?? "";
  if (!id || !/^\d+$/.test(ts) || !sigs) return null;
  if (Math.abs(now / 1000 - Number(ts)) > TOLERANCE_S) return null;
  const given = sigs.split(" ").map((s) => s.trim()).filter((s) => s.startsWith("v1,")).map((s) => s.slice(3));
  let mode: "live" | "test" | null = null;
  for (const [m, secret] of [["live", secrets.live], ["test", secrets.test]] as const) {
    if (!secret) continue;
    const want = await sign(secret, id, ts, body);
    for (const g of given) if (safeEqual(want, g) && !mode) mode = m;   // every comparison runs: no timing hint
  }
  return mode;
}
