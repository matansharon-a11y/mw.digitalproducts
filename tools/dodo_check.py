"""Read-only (workflow "Check Dodo orders"): the latest Dodo orders and webhook deliveries, with no personal data:
when, number, status, test or live, total, discount codes, products, and whether each unlocked a download."""
import json, os, urllib.request

DB, KEY = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}


def get(path):
    with urllib.request.urlopen(urllib.request.Request(f"{DB}/rest/v1/{path}", headers=H), timeout=60) as r:
        return json.loads(r.read())


ev = get("webhook_events?provider=eq.dodo&select=event_id,processed_at,payload->>type&order=processed_at.desc&limit=10")
print(f"## Dodo webhook deliveries ({len(ev)})")
for e in ev:
    print(f"- {e['processed_at'][:19]} · {e.get('type')} · {e['event_id'][:24]}")
orders = get("orders?provider=eq.dodo&select=id,order_number,created_at,status,test_mode,total_cents,currency,discount_code,customer_id,"
             "order_items(price_cents,products(slug))&order=created_at.desc&limit=10")
print(f"\n## Dodo orders ({len(orders)})")
for o in orders:
    items = ", ".join(f"{i['products']['slug']} ${i['price_cents'] / 100:.2f}" for i in o.get("order_items") or [])
    ents = get(f"entitlements?customer_id=eq.{o['customer_id']}&select=products(slug),revoked_at")
    owned = sorted(e["products"]["slug"] for e in ents if not e.get("revoked_at"))
    print(f"- {o['created_at'][:19]} · #{o['order_number']} · {o['status']} · {'TEST' if o['test_mode'] else 'LIVE'} · "
          f"{o['total_cents'] / 100:.2f} {o['currency']} · codes {o.get('discount_code') or '-'}\n  items: {items}\n  this buyer can download: {', '.join(owned) or '(nothing)'}")

# What Dodo itself says about each payment: what the buyer paid (their currency) and what is settled in dollars
key = os.environ.get("DODO_API_KEY", "")
if key:
    base = "https://test.dodopayments.com" if key.startswith("dodo_test_") else "https://live.dodopayments.com"
    print("\n## At Dodo")
    for o in orders:
        pid = o["order_number"]
        try:
            req = urllib.request.Request(f"{base}/payments/{pid}", headers={"Authorization": f"Bearer {key}"})
            with urllib.request.urlopen(req, timeout=30) as r:
                p = json.loads(r.read())
            keep = {k: p.get(k) for k in ("total_amount", "tax", "currency", "settlement_amount", "settlement_tax", "settlement_currency", "status")}
            keep["discounts"] = [{k: d.get(k) for k in ("discount_id", "code", "amount", "type", "restricted_to") if isinstance(d, dict)} for d in (p.get("discounts") or [])]
            keep["product_cart"] = [{k: c.get(k) for k in ("product_id", "quantity", "amount", "price")} for c in (p.get("product_cart") or [])]
            print(f"- {pid}: {json.dumps(keep)}")
        except Exception as e:
            print(f"- {pid}: could not read ({type(e).__name__})")

# The hourly missed-orders check reads these two lists: show that Dodo answers them (counts and statuses only)
if key:
    import datetime, urllib.parse
    since = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=3)).isoformat()
    print("\n## Lists the missed-orders check reads")
    for path in ("/payments", "/refunds"):
        try:
            q = urllib.parse.urlencode({"created_at_gte": since, "page_size": 100, "page_number": 0})
            with urllib.request.urlopen(urllib.request.Request(f"{base}{path}?{q}", headers={"Authorization": f"Bearer {key}"}), timeout=30) as r:
                j = json.loads(r.read())
            items = j.get("items") if isinstance(j.get("items"), list) else j.get("data") or []
            print(f"- {path}: {len(items)} in 3 days, keys {sorted(j.keys())}, statuses {sorted({str(i.get('status')) for i in items})}, item fields {sorted(items[0].keys())[:30] if items else '-'}")
        except Exception as e:
            print(f"- {path}: failed ({e})")
