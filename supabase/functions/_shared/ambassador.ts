// Making someone an MWP ambassador: what used to happen when they joined on /beta/, now done when the team
// approves their application in monday (scheduler → applications_callback).
// Gives their email MWP Presets, MWP Panel and the Field Guides (the guides to read online only), records
// them in beta_members (terms version and language they accepted), starts their stamped copies and their
// signed-terms PDF, and adds them to Shop Ambassadors through Make.
import { notifyMake, requestPersonalCopies } from "./http.ts";

export const AMBASSADOR_PRODUCTS = ["mwp-presets", "mwp-lightroom-plugin", "mwp-panel", "mwp-field-guides"];

export type NewAmbassador = {
  email: string; name: string; instagram: string | null; facebook: string | null;
  lang: "en" | "he"; termsVersion: string; agreedAt: string; ipHash: string | null;
};

// deno-lint-ignore no-explicit-any
export async function grantAmbassador(db: any, a: NewAmbassador): Promise<{ ok: true; memberId: string } | { full: true }> {
  const { data: customer, error: cErr } = await db.from("customers")
    .upsert({ email: a.email, name: a.name }, { onConflict: "email" }).select("id").single();
  if (cErr) throw cErr;

  const { data: before } = await db.from("beta_members").select("id").eq("customer_id", customer.id).maybeSingle();
  const { data: member, error: mErr } = await db.from("beta_members").upsert(
    { customer_id: customer.id, instagram: a.instagram || null, facebook: a.facebook || null, ip_hash: a.ipHash,
      agreed_at: a.agreedAt, terms_version: a.termsVersion, terms_lang: a.lang },
    { onConflict: "customer_id" }).select("id").single();
  if (mErr) {
    if (/ambassador_program_full/.test(mErr.message)) return { full: true };
    throw mErr;
  }

  const { data: products } = await db.from("products").select("id, slug").in("slug", AMBASSADOR_PRODUCTS);
  for (const p of products ?? []) {
    const { data: owned } = await db.from("entitlements").select("id")
      .eq("customer_id", customer.id).eq("product_id", p.id).maybeSingle();
    if (owned) continue;   // already has it (bought, or joined before); a revoked one stays revoked
    const { error } = await db.from("entitlements").insert({
      customer_id: customer.id, product_id: p.id, view_only: p.slug === "mwp-field-guides" });
    if (error) throw error;
  }

  await requestPersonalCopies();   // their marked copies and the signed-terms PDF

  // Shop Ambassadors. The program runs 12 months from approval; the first 3 months have the content minimums.
  const start = new Date();
  const ends = new Date(start); ends.setFullYear(ends.getFullYear() + 1);
  const firstMonths = new Date(start); firstMonths.setMonth(firstMonths.getMonth() + 3);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  await notifyMake("MAKE_WEBHOOK_URL", {
    type: "ambassador",
    rejoined: Boolean(before),
    name: a.name, email: a.email, instagram: a.instagram ? `@${a.instagram}` : "", facebook: a.facebook ?? "",
    agreed_on: day(start), first_months_end: day(firstMonths), ends_on: day(ends),
    terms_version: a.termsVersion,
    products: "MWP Presets, MWP Panel, MWP Field Guides (read online)",
  });
  return { ok: true, memberId: member.id };
}
