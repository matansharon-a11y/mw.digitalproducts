// Ambassadors who are signed in start at My downloads when they come back to the site.
// Only when they arrive (a new visit, not when they click around the site), so the home page is still
// one click away. An ambassador is someone whose Field Guides are read-only (entitlements.view_only).
// A small script in the page's <head> (tools/landing_guard.py) keeps the page invisible while we check,
// so a signed-in ambassador never sees it flash before the jump; show() brings it back otherwise.
import { supabase, currentUser, myLibrary } from "./api.js";

const show = () => { document.documentElement.style.visibility = ""; };

export async function ambassadorLanding() {
  try {
    if (sessionStorage.getItem("mwp_landed")) return show();   // once per visit
    sessionStorage.setItem("mwp_landed", "1");
  } catch { return show(); }
  try {
    if (document.referrer && new URL(document.referrer).origin === location.origin) return show();   // moving around the site
  } catch { /* odd referrer: treat as arriving */ }
  if (!supabase) return show();
  try {
    const user = await currentUser().catch(() => null);
    if (!user) return show();
    // their own products only (myLibrary): the admin can read everyone's, and was sent away like an ambassador
    if ((await myLibrary()).some((i) => i.view_only)) { location.replace("/account/"); return; }
  } catch { /* show the page */ }
  show();
}
