// ============================================================================
// scheduler — jobs started by the database (see migration 006), plus Make's
// call back with Matan's product approvals. Deploy with JWT verification OFF:
// database calls carry the Vault key (x-cron-key); the approvals call back
// carries a one-time nonce that this function issued a few minutes earlier.
//
// Jobs:
//   ping               → tells Make the wiring works
//   product {id}       → mirrors one product to monday (Shop Products)
//   approvals          → asks Make for Matan's approvals (only if drafts exist)
//   approvals_callback → Make returns the Shop Products board; approved + Live
//                        products go live in the shop, Retired ones come down
//   weekly_summary     → last 7 days of sales for Shop Reports
//   month_close        → last month's totals for Shop Payouts, one per currency
//   account {user_id}  → a newly confirmed account goes to Shop Customers
//   downloaded {entitlement_id} → first download of a bought product: order Delivery = Downloaded
//   ambassador_status {member_id} → an ambassadorship ended in the admin: Shop Ambassadors status
//   tester {tester_id, action}    → a tester added or removed in the admin: Shop Testers, and (added) their
//                                   personal copies are started straight away
//   applications       → every 2 minutes while fresh applications wait (10 for older ones): asks Make for the decisions on
//                        Shop Ambassador Applications (see applications.ts)
//   applications_callback → Make returns that board: Approved → the person becomes an ambassador and gets the
//                        welcome email; Declined → the decline email (both sent by Make)
// ============================================================================
import { admin, notifyMake, plain, requestPersonalCopies } from "../_shared/http.ts";
import { applications, applicationsCallback } from "./applications.ts";

const SITE = Deno.env.get("SITE_URL") ?? "https://shop.mw.photography";
const SELF = `${Deno.env.get("SUPABASE_URL")}/functions/v1/scheduler`;

const CATEGORY_LABEL: Record<string, string> = {
  preset: "Preset pack", plugin: "Plugin", guide: "Guide / PDF", bundle: "Bundle", other: "Other",
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const money = (cents: number) => Math.round(cents) / 100;
const day = (d: Date) => d.toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply({ error: "method not allowed" }, 405);
  let body: Record<string, any>;
  try { body = await req.json(); } catch { return reply({ error: "bad json" }, 400); }

  const db = admin();
  const job = String(body.job ?? "");

  if (job === "approvals_callback") {
    return reply(await approvalsCallback(db, body));
  }
  if (job === "applications_callback") {
    try { return reply(await applicationsCallback(db, body)); }
    catch (err) { console.error(job, err); return reply({ error: "job failed" }, 500); }
  }

  const key = req.headers.get("x-cron-key") ?? "";
  const { data: ok } = await db.rpc("check_cron_key", { p_key: key });
  if (!key || ok !== true) return reply({ error: "unauthorized" }, 401);

  try {
    switch (job) {
      case "ping": await notifyMake("MAKE_WEBHOOK_URL", { type: "ping" }); return reply({ ok: true });
      case "product": return reply(await product(db, String(body.id ?? "")));
      case "approvals": return reply(await approvals(db));
      case "weekly_summary": return reply(await weeklySummary(db));
      case "month_close": return reply(await monthClose(db));
      case "account": return reply(await account(db, String(body.user_id ?? "")));
      case "downloaded": return reply(await downloaded(db, String(body.entitlement_id ?? "")));
      case "ambassador_status": return reply(await ambassadorStatus(db, String(body.member_id ?? "")));
      case "tester": return reply(await tester(db, String(body.tester_id ?? ""), String(body.action ?? "")));
      case "applications": return reply(await applications(db, SELF));
      case "customer_added": return reply(await customerAdded(db, String(body.customer_id ?? "")));
      case "customer_deleted": return reply(await customerDeleted(String(body.email ?? "")));
      default: return reply({ error: `unknown job ${job}` }, 400);
    }
  } catch (err) {
    console.error(job, err);
    return reply({ error: "job failed" }, 500);
  }
});

type Db = ReturnType<typeof admin>;

async function product(db: Db, id: string) {
  const { data: p, error } = await db.from("products")
    .select("slug, name, name_emphasis, category, price_cents, currency, version, item_count, is_active, checkout_variant_id")
    .eq("id", id).maybeSingle();
  if (error) throw error;
  if (!p) return { skipped: "no such product" };
  await notifyMake("MAKE_WEBHOOK_URL", {
    type: "product",
    slug: p.slug,
    name: plain([p.name, p.name_emphasis].filter(Boolean).join(" ")),
    category_label: CATEGORY_LABEL[p.category] ?? "Other",
    price: money(p.price_cents),
    currency: p.currency,
    version: plain(p.version),
    item_count: p.item_count ?? "",
    variant_id: p.checkout_variant_id ?? "",
    is_active: p.is_active,
    status_label: p.is_active ? "Live" : "Awaiting approval",
    shop_url: `${SITE}/product/?p=${encodeURIComponent(p.slug)}`,
  });
  return { ok: true };
}

async function approvals(db: Db) {
  const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("is_active", false);
  if (!count) return { skipped: "no drafts waiting" };
  const nonce = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const { error } = await db.from("sync_nonces").insert({ nonce, purpose: "approvals" });
  if (error) throw error;
  await notifyMake("MAKE_WEBHOOK_URL", { type: "approvals_request", callback_url: SELF, nonce });
  return { ok: true, drafts: count };
}

// Make posts back: { job, nonce, data: <monday GraphQL "data" for the Shop Products board> }
async function approvalsCallback(db: Db, body: Record<string, any>) {
  const nonce = String(body.nonce ?? "");
  if (nonce.length < 32) return { error: "unauthorized" };
  const { data: used, error: nErr } = await db.from("sync_nonces")
    .update({ used_at: new Date().toISOString() })
    .eq("nonce", nonce).eq("purpose", "approvals").is("used_at", null)
    .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
    .select("nonce");
  if (nErr) throw nErr;
  if (!used?.length) return { error: "unauthorized" };

  let data = body.data;
  if (typeof data === "string") { try { data = JSON.parse(data); } catch { data = null; } }
  const items: any[] = data?.boards?.[0]?.items_page?.items ?? [];
  const goLive: string[] = [];
  const takeDown: string[] = [];
  for (const it of items) {
    const cols: Record<string, string> = {};
    for (const c of it.column_values ?? []) cols[c.id] = c.text ?? "";
    // Shop Products columns: Slug, Approved by Matan, Status (see docs/monday-map.json)
    const slug = (cols.text_mm80txve ?? "").trim();
    if (!slug) continue;
    const approved = cols.boolean_mm80an1f === "v" || cols.boolean_mm80an1f === "true";
    const status = cols.color_mm80c109 ?? "";
    if (approved && status === "Live") goLive.push(slug);
    if (status === "Retired") takeDown.push(slug);
  }
  if (goLive.length) {
    // Same rule as the admin page: no checkout link or no download file = cannot go live yet.
    const { data: ready, error: rErr } = await db.from("products")
      .select("slug, product_files(path)").in("slug", goLive).eq("is_active", false)
      .not("checkout_url", "is", null).not("checkout_variant_id", "is", null);
    if (rErr) throw rErr;
    const slugs = (ready ?? []).filter((r: any) => r.product_files).map((r: any) => r.slug);
    if (slugs.length) {
      const { error } = await db.from("products").update({ is_active: true }).in("slug", slugs);
      if (error) throw error;
    }
  }
  if (takeDown.length) {
    const { error } = await db.from("products").update({ is_active: false }).in("slug", takeDown).eq("is_active", true);
    if (error) throw error;
  }
  return { ok: true, live: goLive, retired: takeDown };
}

type OrderRow = {
  checkout_order_id: string; total_cents: number; tax_cents: number; currency: string;
  status: string; created_at: string; refunded_at: string | null; customer_id: string;
  order_items: { products: { name: string; name_emphasis: string | null } | null }[];
};

async function ordersBetween(db: Db, from: Date, to: Date): Promise<OrderRow[]> {
  const { data, error } = await db.from("orders")
    .select("checkout_order_id, total_cents, tax_cents, currency, status, created_at, refunded_at, customer_id, order_items(products(name, name_emphasis))")
    .gte("created_at", from.toISOString()).lt("created_at", to.toISOString())
    .eq("test_mode", false);   // test-mode checkouts aren't sales
  if (error) throw error;
  return (data ?? []) as unknown as OrderRow[];
}

function totals(orders: OrderRow[]) {
  const gross = orders.reduce((s, o) => s + o.total_cents, 0);
  const tax = orders.reduce((s, o) => s + o.tax_cents, 0);
  const refunded = orders.filter((o) => o.status === "refunded").reduce((s, o) => s + o.total_cents, 0);
  return { gross, tax, refunded, net: gross - tax - refunded };
}

async function weeklySummary(db: Db) {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 3600 * 1000);
  const orders = await ordersBetween(db, from, to);

  // Report in the currency most orders used; mention any others.
  const byCurrency = new Map<string, OrderRow[]>();
  for (const o of orders) byCurrency.set(o.currency, [...(byCurrency.get(o.currency) ?? []), o]);
  const ranked = [...byCurrency.entries()].sort((a, b) => b[1].length - a[1].length);
  const [currency, main] = ranked[0] ?? ["USD", []];
  const t = totals(main);

  const counts = new Map<string, number>();
  for (const o of orders) for (const i of o.order_items ?? []) {
    const name = [i.products?.name, i.products?.name_emphasis].filter(Boolean).join(" ");
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  const { count: newCustomers } = await db.from("customers").select("id", { count: "exact", head: true })
    .gte("created_at", from.toISOString()).lt("created_at", to.toISOString());
  const { count: openTickets } = await db.from("support_tickets").select("id", { count: "exact", head: true })
    .neq("status", "resolved");

  const paid = orders.filter((o) => o.status !== "refunded").length;
  const fmt = (c: number) => `${money(c).toFixed(2)} ${currency}`;
  const others = ranked.slice(1).map(([c, os]) => `${os.length} order${os.length === 1 ? "" : "s"} in ${c} (${money(totals(os).gross).toFixed(2)})`);
  const summary_html = [
    `<p><b>Week ${day(from)} to ${day(to)}</b></p>`,
    `<p>Orders: ${orders.length} (${paid} still paid)<br>Gross sales: ${fmt(t.gross)}<br>Tax collected by Lemon Squeezy: ${fmt(t.tax)}<br>`,
    `Fully refunded: ${fmt(t.refunded)}<br><b>Net of tax and refunds: ${fmt(t.net)}</b> (before Lemon Squeezy fees)</p>`,
    others.length ? `<p>Other currencies: ${others.join("; ")}</p>` : "",
    `<p>New customers: ${newCustomers ?? 0}<br>Open support tickets: ${openTickets ?? 0}</p>`,
    top.length ? `<p>Top products: ${top.slice(0, 5).map(([n, c]) => `${plain(n)} (${c})`).join(", ")}</p>` : "<p>No sales this week.</p>",
  ].join("");

  await notifyMake("MAKE_WEBHOOK_URL", {
    type: "weekly_summary",
    title: `Week of ${day(from)}`,
    week_from: day(from), week_to: day(new Date(to.getTime() - 1000)),
    orders: orders.length,
    gross: money(t.gross), refunded: money(t.refunded), net: money(t.net), currency,
    new_customers: newCustomers ?? 0, open_tickets: openTickets ?? 0,
    best_seller: top[0] ? plain(top[0][0]) : "",
    summary_html,
  });
  return { ok: true, orders: orders.length };
}

async function monthClose(db: Db) {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const label = from.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const orders = await ordersBetween(db, from, to);
  if (!orders.length) {
    await notifyMake("MAKE_WEBHOOK_URL", {
      type: "payout", title: `Sales ${label}`, period_from: day(from), period_to: day(new Date(to.getTime() - 1000)),
      currency: "", gross: 0, refunds: 0, orders: 0, checkout_order_ids_gql: "\"none\"",
    });
    return { ok: true, orders: 0 };
  }
  const byCurrency = new Map<string, OrderRow[]>();
  for (const o of orders) byCurrency.set(o.currency, [...(byCurrency.get(o.currency) ?? []), o]);
  for (const [currency, os] of byCurrency) {
    const t = totals(os);
    await notifyMake("MAKE_WEBHOOK_URL", {
      type: "payout",
      title: `Sales ${label}${byCurrency.size > 1 ? ` (${currency})` : ""}`,
      period_from: day(from), period_to: day(new Date(to.getTime() - 1000)),
      currency, gross: money(t.gross), refunds: money(t.refunded), orders: os.length,
      // Lemon Squeezy order ids are numeric; quoted for the monday query.
      checkout_order_ids_gql: os.map((o) => `"${o.checkout_order_id.replace(/[^0-9A-Za-z-]/g, "")}"`).join(","),
    });
  }
  return { ok: true, orders: orders.length, currencies: byCurrency.size };
}

// ---------------------------------------------------------------- new account → Shop Customers
async function account(db: ReturnType<typeof admin>, userId: string) {
  if (!userId) return { skipped: "no user" };
  const { data, error } = await db.auth.admin.getUserById(userId);
  const user = data?.user;
  if (error || !user?.email) return { skipped: "unknown user" };
  const email = user.email.toLowerCase();
  const { data: customer } = await db.from("customers").select("name, beta_members(id)").eq("email", email).maybeSingle();
  const ambassador = Boolean(customer && (Array.isArray(customer.beta_members) ? customer.beta_members.length : customer.beta_members));
  const name = String(customer?.name || user.user_metadata?.name || "").trim();
  await notifyMake("MAKE_WEBHOOK_URL", {
    type: "account", email, name: name || email,
    source: ambassador ? "Ambassador program" : "Account",
    joined_on: day(new Date(user.email_confirmed_at ?? user.created_at)),
  });
  return { ok: true };
}

// ---------------------------------------------------------------- first download → order Delivery
async function downloaded(db: ReturnType<typeof admin>, entitlementId: string) {
  if (!entitlementId) return { skipped: "no entitlement" };
  const { data: ent } = await db.from("entitlements").select("customer_id, product_id").eq("id", entitlementId).maybeSingle();
  if (!ent) return { skipped: "unknown entitlement" };
  // The paid order this product came from (a bundle counts too). Free access (ambassadors) has none.
  const { data: rows } = await db.from("orders")
    .select("checkout_order_id, created_at, order_items!inner(product_id)")
    .eq("customer_id", ent.customer_id).eq("status", "paid")
    .order("created_at", { ascending: false }).limit(20);
  // Bundles list the bundle, not each product in it: then it's their latest paid order.
  const match = (rows ?? []).find((o: any) => (o.order_items ?? []).some((i: any) => i.product_id === ent.product_id))
    ?? (rows ?? [])[0];
  if (!match) return { skipped: "no paid order" };
  await notifyMake("MAKE_WEBHOOK_URL", { type: "downloaded", checkout_order_id: match.checkout_order_id });
  return { ok: true };
}

// ---------------------------------------------------------------- ambassador ended → Shop Ambassadors
const AMBASSADOR_LABEL: Record<string, string> = { active: "Active", ended: "Ended", ended_breach: "Ended, breach" };
async function ambassadorStatus(db: ReturnType<typeof admin>, memberId: string) {
  if (!memberId) return { skipped: "no member" };
  const { data: m } = await db.from("beta_members").select("status, ended_at, customers(email)").eq("id", memberId).maybeSingle();
  const email = (m?.customers as any)?.email;
  if (!m || !email) return { skipped: "unknown member" };
  await notifyMake("MAKE_WEBHOOK_URL", {
    type: "ambassador_status", email,
    status_label: AMBASSADOR_LABEL[m.status] ?? "Active",
    ended_on: m.ended_at ? day(new Date(m.ended_at)) : "",
  });
  return { ok: true };
}

async function tester(db: Db, id: string, action: string) {
  const { data: t, error } = await db.from("testers")
    .select("added_at, removed_at, customers(name, email)").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!t) return { skipped: "no such tester" };
  // deno-lint-ignore no-explicit-any
  const c: any = Array.isArray(t.customers) ? t.customers[0] : t.customers;
  if (action === "added") await requestPersonalCopies();   // their stamped copies, ready before they sign in
  await notifyMake("MAKE_WEBHOOK_URL", {
    type: "tester",
    status_label: t.removed_at ? "Removed" : "Active",
    name: plain(c?.name || c?.email || ""),
    email: c?.email ?? "",
    added_on: day(new Date(t.added_at)),
    removed_on: t.removed_at ? day(new Date(t.removed_at)) : "",
    products: "MWP Presets, MWP Panel, MWP Field Guides",
  });
  return { ok: true };
}

// ---------------------------------------------------------------- Supabase ↔ monday mirror (migration 036)
// A customer added in Supabase (any way) → Shop Customers, unless already there (Make checks by email).
async function customerAdded(db: Db, id: string) {
  if (!id) return { skipped: "no customer" };
  const { data: c } = await db.from("customers").select("email, name, created_at").eq("id", id).maybeSingle();
  if (!c?.email) return { skipped: "unknown customer" };
  await notifyMake("MAKE_WEBHOOK_URL", {
    type: "account", email: c.email, name: plain(c.name || c.email), source: "Shop",
    joined_on: day(new Date(c.created_at)),
  });
  return { ok: true };
}
// A customer deleted in Supabase → their rows on every shop board in monday are deleted (to monday's trash).
async function customerDeleted(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { skipped: "no email" };
  await notifyMake("MAKE_WEBHOOK_URL", { type: "customer_deleted", email });
  return { ok: true };
}
