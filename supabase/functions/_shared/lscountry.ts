// The buyer's billing country, from Lemon Squeezy (Jeinna, 7 Nov 2026: "all of our traffic should show what countries
// they are from"). An order only names its customer (attributes.customer_id); the customer record has the country the
// buyer gave at checkout (2 letters). Used by checkout-webhook for new orders and by the hourly reconcile job to fill
// in older ones. "" when it can't be read (no key, a test order with the live key, a network hiccup).
export async function lsCustomerCountry(customerId: unknown): Promise<string> {
  const key = Deno.env.get("LEMONSQUEEZY_API_KEY") ?? "";
  const id = String(customerId ?? "");
  if (!key || !/^\d+$/.test(id)) return "";
  try {
    const res = await fetch(`https://api.lemonsqueezy.com/v1/customers/${id}`, {
      headers: { Accept: "application/vnd.api+json", Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const c = String((await res.json())?.data?.attributes?.country ?? "").toUpperCase();
    return /^[A-Z]{2}$/.test(c) ? c : "";
  } catch { return ""; }
}
