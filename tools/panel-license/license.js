// MWP Panel licence — for the UXP plugin.
//
// The buyer signs in once with the email they bought with: we email them a 6-digit code, they type
// it in, and the shop checks that this email owns MWP Panel (or a bundle with it). Each computer is
// registered to their licence (up to 2 at a time; they can free one in My downloads). After that
// the plugin checks in quietly once a week and keeps working offline for up to 14 days.
//
// Use:
//   const licence = require("./license.js");
//   const s = await licence.status();          // { state: "licensed" | "signed-out" | "expired", licensedTo }
//   await licence.sendCode(email);             // step 1: email a code
//   await licence.verifyCode(email, code);     // step 2: sign in + activate this computer
//   licence.signOut();
//
// manifest.json needs network access to the shop's server:
//   "requiredPermissions": { "network": { "domains": ["https://tkkpxsyioetzexgbmbqy.supabase.co"] } }

const SUPABASE_URL = "https://tkkpxsyioetzexgbmbqy.supabase.co";
// Public "anon" key: safe to ship in the plugin (it only allows what the shop's own pages allow).
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRra3B4c3lpb2V0emV4Z2JtYnF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MTQ1OTYsImV4cCI6MjEwNzE5MDU5Nn0.XvFn_zaT1GasxcFXlOx02rY69WDYTDRkxLaDq2USohQ";
const KEY = "mwp-panel-licence";

const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };
const write = (v) => localStorage.setItem(KEY, JSON.stringify(v));

function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
}

// One id per computer, the same in Photoshop and Photoshop (Beta): each app keeps its own plugin storage,
// so the id is worked out from the computer itself (name, system, user folder) rather than only stored.
function machineId() {
  try {
    const os = require("os");
    const parts = [os.hostname?.(), os.platform?.(), os.arch?.(), os.homedir?.()].filter(Boolean).join("|");
    if (!parts) return null;
    let a = 0x811c9dc5, b = 0x01000193;          // two FNV-1a passes → 16 hex characters
    for (let i = 0; i < parts.length; i++) {
      const c = parts.charCodeAt(i);
      a = Math.imul(a ^ c, 16777619) >>> 0;
      b = Math.imul(b ^ c, 2246822519) >>> 0;
    }
    return `mwp-${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`;
  } catch { return null; }
}

function deviceId() {
  const s = read();
  const id = machineId() || s.deviceId || newId();
  if (s.deviceId !== id) { s.deviceId = id; write(s); }
  return id;
}

function deviceName() {
  try {
    const os = require("os");
    const host = typeof os.hostname === "function" ? os.hostname() : "";
    const plat = os.platform() === "darwin" ? "Mac" : os.platform() === "win32" ? "Windows" : os.platform();
    return host ? `${host} (${plat})` : plat;
  } catch { return "Computer"; }
}

async function post(url, body, token) {
  const res = await fetch(url, {
    method: "POST",
    headers: { apikey: ANON_KEY, authorization: `Bearer ${token || ANON_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.msg || data.error_description || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Step 1: email a 6-digit sign-in code to the buyer. */
async function sendCode(email) {
  await post(`${SUPABASE_URL}/auth/v1/otp`, { email: email.trim().toLowerCase(), create_user: true });
}

/** Step 2: check the code, sign in and activate this computer. */
async function verifyCode(email, code) {
  const session = await post(`${SUPABASE_URL}/auth/v1/verify`,
    { email: email.trim().toLowerCase(), token: String(code).trim(), type: "email" });
  const s = read();
  s.access = session.access_token; s.refresh = session.refresh_token;
  write(s);
  return activate();
}

async function refreshSession() {
  const s = read();
  if (!s.refresh) throw Object.assign(new Error("Please sign in again."), { status: 401 });
  const session = await post(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, { refresh_token: s.refresh });
  s.access = session.access_token; s.refresh = session.refresh_token;
  write(s);
  return s.access;
}

/** Registers this computer and stores who the licence belongs to. */
async function activate() {
  const body = { action: "activate", device_id: deviceId(), device_name: deviceName() };
  let r;
  try {
    r = await post(`${SUPABASE_URL}/functions/v1/license`, body, read().access);
  } catch (e) {
    if (e.status !== 401) throw e;
    r = await post(`${SUPABASE_URL}/functions/v1/license`, body, await refreshSession());
  }
  const s = read();
  s.licensedTo = r.licensed_to;
  s.checkAfter = r.check_again_after;
  s.validUntil = r.valid_offline_until;
  write(s);
  return { state: "licensed", licensedTo: r.licensed_to };
}

/** Call when the panel opens. Checks in once a week; works offline for up to 14 days. */
async function status() {
  const s = read();
  if (!s.refresh || !s.validUntil) return { state: "signed-out" };
  const now = Date.now();
  if (now > Date.parse(s.checkAfter)) {
    try { return await activate(); }
    catch (e) {
      // Refunded, removed from My downloads, or too many computers: lock the panel.
      if (e.status === 401 || e.status === 403 || e.status === 409) {
        delete s.validUntil; write(s);
        return { state: "expired", message: e.message };
      }
      // Offline or server busy: keep working until the grace period ends.
    }
  }
  if (now > Date.parse(s.validUntil)) return { state: "expired", message: "Connect to the internet so MWP Panel can check your licence." };
  return { state: "licensed", licensedTo: s.licensedTo };
}

/** Signs out on this computer (it stays registered until removed in My downloads). */
function signOut() {
  const { deviceId: id } = read();
  write({ deviceId: id });
}

module.exports = { status, sendCode, verifyCode, activate, signOut };
