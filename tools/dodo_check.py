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
