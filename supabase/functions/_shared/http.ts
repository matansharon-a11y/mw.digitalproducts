// Shared helpers for every Edge Function: CORS, JSON responses, admin client,
// Make.com forwarding, hashing and constant-time comparison.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";   // pinned: the same version as the site (assets/js/vendor)

// Browsers may call these functions only from the shop's own address.
// ALLOWED_ORIGINS is optional: without it, the origin of SITE_URL is used.
function originOf(url: string): string {
  try { return new URL(url).origin; } catch { return ""; }
}
const allowed = (Deno.env.get("ALLOWED_ORIGINS") || originOf(Deno.env.get("SITE_URL") ?? ""))
  .split(",").map((s) => s.trim()).filter(Boolean);

/** CORS headers that echo the caller's origin only if it is on the allow-list. */
export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] ?? "",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "content-type": "application/json; charset=utf-8" },
  });
}

export const fail = (req: Request, error: string, status = 400) => json(req, { error }, status);

/** Service-role client: bypasses RLS. Only ever used server-side. */
export function admin(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Strict on purpose: emails go into JSON that Make builds for monday, where a quote or backslash breaks the run.
export const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Text that Make drops into monday JSON: no quotes, backslashes or line breaks. */
export const plain = (v: unknown) => String(v ?? "").replace(/["\\\r\n]+/g, " ").trim();

/** Escapes text for the HTML body of a monday update. */
export const html = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r?\n/g, "<br>");

/**
 * Sends an event to a Make.com custom webhook. Never throws: Supabase is the
 * system of record, so a Make outage must not fail a sale or a support request.
 * One Make webhook (MAKE_WEBHOOK_URL) receives every event and routes on `type`;
 * the per-event variables still work and take priority if set. The webhook URL
 * is unguessable and kept as a secret; the shared secret also travels in the
 * x-mwp-secret header for an optional extra check in Make.
 */
export async function notifyMake(envName: string, payload: Record<string, unknown>): Promise<boolean> {
  const url = Deno.env.get(envName) || Deno.env.get("MAKE_WEBHOOK_URL");
  if (!url) { console.warn(`${envName} / MAKE_WEBHOOK_URL not set; skipped Make.com notification`); return false; }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-mwp-secret": Deno.env.get("MAKE_SHARED_SECRET") ?? "" },
      body: JSON.stringify({ ...payload, sent_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`${envName} responded ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error(`${envName} failed`, err);
    return false;
  }
}

/**
 * Asks the "Personal copies" GitHub workflow to run now, so a new buyer's personal files are made
 * within a minute or two. Optional: without PERSONALIZE_TOKEN the workflow still runs on its
 * own schedule every few minutes. Never throws.
 */
export async function requestPersonalCopies(): Promise<void> {
  const token = Deno.env.get("PERSONALIZE_TOKEN"), repo = Deno.env.get("PERSONALIZE_REPO");
  if (!token || !repo) return;
  try {
    await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json" },
      body: JSON.stringify({ event_type: "personalize" }),
      signal: AbortSignal.timeout(6000),
    });
  } catch (err) { console.error("personal copies dispatch failed", err); }
}
