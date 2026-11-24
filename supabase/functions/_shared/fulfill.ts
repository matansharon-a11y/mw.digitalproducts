// ============================================================================
// Fulfilment, the same for every payment provider (24 Nov 2026, getting ready for Dodo Payments). A provider's webhook
// (checkout-webhook for Lemon Squeezy, dodo-webhook for Dodo Payments) checks the signature, turns its payload into a
// PaidOrder or a refund, and calls these. Everything after that is the shop's own: the customer, the order, the
// downloads (bundles unlock their parts), the affiliate's sale, the personal copies and monday.
// Safe to run again for the same order (a provider's retry).
// ============================================================================
import { recordAffiliateSale, voidAffiliateSale } from "./affiliates.ts";
import { admin, notifyMake, plain, requestPersonalCopies } from "./http.ts";

type Db = ReturnType<typeof admin>;
const ALLOW_TEST_ORDERS = Deno.env.get("ALLOW_TEST_ORDERS") === "true";

export type Provider = "lemonsqueezy" | "dodo";

export type PaidOrder = {
  provider: Provider;
  providerOrderId: string;          // orders.checkout_order_id (Dodo's payment ids start "pay_")
  orderNumber: string;              // what people see (Lemon Squeezy's order number; Dodo's payment id)
  email: string;                    // the email paid with
  name: string;
  country: string | null;           // the buyer's billing country (2 letters), when the provider gives it
  subtotalCents: number; taxCents: number; totalCents: number; discountCents: number;
  currency: string;
  createdAt: string;
  receiptUrl: string | null;        // only Lemon Squeezy has a receipt page link (the database checks its address)
  testMode: boolean;
  products: { column: "checkout_variant_id" | "dodo_product_id" | "dodo_test_product_id"; value: string; label: string }[];   // Dodo: a whole cart
  custom: Record<string, string>;   // what the cart sent: user_id, source, vat, ref
  usedCode: string | null;          // the discount code paid with
};

// Bundle slug -> the products it unlocks (slugs as set in the admin). The Lightroom Classic plugin comes with MWP Presets
// included; MWP Presets alone is just the presets (Jeinna, 25 Oct 2026, reversing 23 Oct). Every bundle with the
// plugin includes the presets too. Keep in step with INCLUDES in assets/js/lib/cart.js.
export const BUNDLES: Record<string, string[]> = {
  "mwp-lightroom-plugin": ["mwp-presets"],
  "presets-field-guides": ["mwp-lightroom-plugin", "mwp-presets", "mwp-field-guides"],
  "presets-panel": ["mwp-lightroom-plugin", "mwp-presets", "mwp-panel"],
  "field-guides-panel": ["mwp-field-guides", "mwp-panel"],
  "full-set": ["mwp-lightroom-plugin", "mwp-presets", "mwp-panel", "mwp-field-guides"],
};

// An Israeli phone number: +972 / 00972 / 972…, or a local number starting with 0 (05x-xxxxxxx, 0x-xxxxxxx)
export function isIsraeliPhone(phone: unknown): boolean {
  const d = String(phone ?? "").replace(/[\s().-]/g, "");
  return /^(\+|00)?972\d{8,9}$/.test(d) || /^0\d{8,9}$/.test(d);
}

export async function fulfillPaid(db: Db, o: PaidOrder): Promise<void> {
  // The purchase belongs to the account that started the checkout (cart.js sends its user id), even when the buyer
  // typed another email at checkout; otherwise to the email they paid with.
  let email = o.email.trim().toLowerCase();
  if (/^[0-9a-f-]{36}$/i.test(o.custom.user_id ?? "")) {
    const { data: u } = await db.auth.admin.getUserById(o.custom.user_id);
    const accountEmail = u?.user?.email_confirmed_at ? u.user.email?.trim().toLowerCase() : "";
    if (accountEmail) email = accountEmail;
  }

  if (o.testMode && !ALLOW_TEST_ORDERS) {
    const { data: isAdmin } = await db.from("admin_allowlist").select("email").eq("email", email).maybeSingle();
    if (!isAdmin) { console.warn(`test-mode order ${o.providerOrderId} from ${email}: nothing unlocked`); return; }
  }

  // an old "paid" notice sent again never reopens a refunded order
  const { data: known } = await db.from("orders").select("status").eq("checkout_order_id", o.providerOrderId).maybeSingle();
  if (known?.status === "refunded") { console.warn(`order ${o.providerOrderId} is refunded: paid notice ignored`); return; }

  type Product = { id: string; name: string; name_emphasis: string | null; slug: string; price_cents: number };
  const found: Product[] = [];
  const unmatched: PaidOrder["products"] = [];
  for (const want of o.products) {
    const { data: product, error: pErr } = await db.from("products")
      .select("id, name, name_emphasis, slug, price_cents").eq(want.column, want.value).maybeSingle();
    if (pErr) throw pErr;
    if (product) found.push(product as Product); else unmatched.push(want);
  }

  // the customer's own name (My details) is kept; the checkout name only fills an empty one
  const { data: customer, error: cErr } = await db.from("customers")
    .upsert({ email }, { onConflict: "email" })
    .select("id, email, name, created_at, phone, country").single();
  if (cErr) throw cErr;
  if (!customer.name && o.name) await db.from("customers").update({ name: o.name }).eq("id", customer.id);
  // the billing country the buyer gave at checkout fills an empty profile country
  const country = o.country ? o.country.toUpperCase() : null;
  if (country && !customer.country) await db.from("customers").update({ country }).eq("id", customer.id);

  const { data: order, error: oErr } = await db.from("orders").upsert({
    checkout_order_id: o.providerOrderId,
    order_number: o.orderNumber,
    provider: o.provider,
    customer_id: customer.id,
    subtotal_cents: o.subtotalCents,
    tax_cents: o.taxCents,
    total_cents: o.totalCents,
    currency: o.currency,
    status: "paid",
    test_mode: o.testMode,
    source: o.custom.source?.slice(0, 64) ?? null,
    // Israeli VAT (their price includes 18%): the cart marks an Israeli visitor's checkout (custom vat = "il"), or the
    // account's phone is Israeli (+972 / 0…), or the billing country or My details country is Israel
    vat_rate: o.custom.vat === "il" || isIsraeliPhone(customer.phone) || country === "IL" || String(customer.country ?? "").toUpperCase() === "IL" ? 0.18 : 0,
    ...(country ? { country } : {}),
    receipt_url: o.receiptUrl,   // shown in My downloads → Order history
  }, { onConflict: "checkout_order_id" }).select("id").single();
  if (oErr) throw oErr;

  // The MWP Affiliate Program: the code paid with, and the affiliate link the visit came with (the cart's "ref")
  if (o.usedCode) await db.from("orders").update({ discount_code: o.usedCode }).eq("id", order.id);
  const earned = await recordAffiliateSale(db, {
    orderId: order.id, customerId: customer.id, buyerEmail: email, totalCents: o.totalCents, currency: o.currency,
    orderedAt: o.createdAt, code: o.usedCode, ref: o.custom.ref, testMode: o.testMode,
  });
  if (earned) console.log(`order ${o.providerOrderId}: affiliate ${earned.affiliate} earns ${earned.amount_cents}`);

  // Paid for something the shop doesn't know (a product not linked yet): keep the order and raise it in monday,
  // instead of failing until the retries stop. What the shop does know is still delivered.
  if (unmatched.length) {
    console.error(`order ${o.providerOrderId}: no product for ${unmatched.map((u) => `${u.column} ${u.value}`).join(", ")}`);
    await notifyMake("MAKE_ORDER_WEBHOOK", {
      type: "order", order_id: order.id, checkout_order_id: o.providerOrderId, order_number: o.orderNumber,
      order_date: o.createdAt.slice(0, 10), test_mode: o.testMode,
      status_label: "Not delivered", email, name: plain(o.name),
      product: plain(`UNMATCHED: ${unmatched.map((u) => `${u.label} (${u.value})`).join(", ")}`),
      product_slug: "", subtotal: o.subtotalCents / 100, discount: o.discountCents / 100, tax: o.taxCents / 100,
      total: o.totalCents / 100, currency: o.currency, receipt_url: o.receiptUrl, source: plain(o.custom.source),
      repeat_customer: false, downloads_url: "",
    });
    if (!found.length) return;
  }

  for (const product of found) {
    // one product: what was paid for it; several (a Dodo cart): each at its catalogue price
    const price = found.length === 1 ? o.subtotalCents : product.price_cents;
    const { error: iErr } = await db.from("order_items")
      .upsert({ order_id: order.id, product_id: product.id, price_cents: price }, { onConflict: "order_id,product_id" });
    if (iErr) throw iErr;

    const { error: eErr } = await db.from("entitlements").upsert(
      { customer_id: customer.id, product_id: product.id, order_id: order.id, revoked_at: null, view_only: false },
      { onConflict: "customer_id,product_id" });
    if (eErr) throw eErr;

    // A bundle also unlocks each product in it, so My downloads shows them as separate downloads and only one file
    // per product is ever uploaded. A product the buyer already owns keeps its own order, so refunding the bundle
    // never takes away something bought separately.
    const parts = BUNDLES[product.slug] ?? [];
    if (parts.length) {
      const { data: partRows, error: ppErr } = await db.from("products").select("id, slug").in("slug", parts);
      if (ppErr) throw ppErr;
      for (const part of partRows ?? []) {
        const { data: owned } = await db.from("entitlements").select("id, order_id, revoked_at, view_only")
          .eq("customer_id", customer.id).eq("product_id", part.id).maybeSingle();
        // bought before: it keeps its own order. Free access (ambassador / tester / affiliate) becomes paid access, so
        // ending the program never takes back what they paid for; read-only guides become a download.
        if (owned && owned.order_id && !owned.revoked_at && !owned.view_only) continue;
        const { error: bErr } = await db.from("entitlements").upsert(
          { customer_id: customer.id, product_id: part.id, order_id: order.id, revoked_at: null, view_only: false },
          { onConflict: "customer_id,product_id" });
        if (bErr) throw bErr;
      }
    }
  }

  await requestPersonalCopies();   // start making their marked copies right away

  const { count } = await db.from("orders").select("id", { count: "exact", head: true })
    .eq("customer_id", customer.id).eq("status", "paid");

  await notifyMake("MAKE_ORDER_WEBHOOK", {
    type: "order",
    order_id: order.id,
    checkout_order_id: o.providerOrderId,
    order_number: o.orderNumber,
    order_date: o.createdAt.slice(0, 10),
    test_mode: o.testMode,
    status_label: o.testMode ? "Test order" : "Paid",
    email,
    name: plain(o.name),
    product: plain(found.map((p) => [p.name, p.name_emphasis].filter(Boolean).join(" ")).join(", ")),
    product_slug: found.map((p) => p.slug).join(","),
    subtotal: o.subtotalCents / 100,
    discount: o.discountCents / 100,
    tax: o.taxCents / 100,
    total: o.totalCents / 100,
    currency: o.currency,
    receipt_url: o.receiptUrl,
    source: plain(o.custom.source),
    repeat_customer: (count ?? 1) > 1,
    downloads_url: `${Deno.env.get("SITE_URL")}/account/?email=${encodeURIComponent(email)}`,
  });
}

// A full refund revokes access (and the affiliate's sale); a partial refund (a goodwill partial credit) keeps it.
export async function fulfillRefund(db: Db, r: {
  providerOrderId: string; full: boolean; refundedCents: number; currency: string; testMode: boolean;
}): Promise<void> {
  const { data: order, error } = await db.from("orders")
    .update({ status: r.full ? "refunded" : "partially_refunded", refunded_at: new Date().toISOString() })
    .eq("checkout_order_id", r.providerOrderId).select("id, order_number, customer_id").maybeSingle();
  if (error) throw error;
  if (!order) {
    if (r.testMode) return;   // a test order that unlocked nothing
    throw new Error(`refund for unknown order ${r.providerOrderId}`); // retried until the order exists
  }

  if (r.full) {
    const { error: rErr } = await db.from("entitlements")
      .update({ revoked_at: new Date().toISOString() }).eq("order_id", order.id);
    if (rErr) throw rErr;
    await voidAffiliateSale(db, order.id);   // a refunded sale earns the affiliate nothing
  }

  const { data: customer } = await db.from("customers").select("email").eq("id", order.customer_id).single();
  await notifyMake("MAKE_ORDER_WEBHOOK", {
    type: r.full ? "refund" : "partial_refund", order_id: order.id, checkout_order_id: r.providerOrderId,
    order_number: order.order_number, email: customer?.email, test_mode: r.testMode,
    refunded_amount: r.refundedCents / 100, currency: r.currency,
  });
}
