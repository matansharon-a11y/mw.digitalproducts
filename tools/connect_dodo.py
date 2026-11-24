"""Connects the shop to Dodo Payments (run by .github/workflows/dodo.yml, "Connect Dodo"; 24 Nov 2026).

1. Every product the shop sells (a price above zero and a Lemon Squeezy checkout today) is made at Dodo once:
   POST /products, a one-time price in USD at the shop's own price, tax included in the price, tax category
   digital_products, the shop's slug in its metadata. Its Dodo id goes into products.dodo_product_id (live key) or
   dodo_test_product_id (a dodo_test_ key: Dodo's separate test catalogue). A product that already has an id is left.
2. Every active affiliate gets their code at Dodo (10% off every product, their agreement's dates), kept in
   affiliates.provider_codes.dodo. A code already made is left.
Nothing is switched: checkout stays on Lemon Squeezy until the admin's switch (admin_set_checkout_provider) says Dodo.
Prices are never changed here; to change one, change it in the admin and at Dodo.
The webhook is set in Dodo's dashboard (see CLAUDE.md), and its secret goes in the DODO_WEBHOOK_SECRET GitHub secret.
"""
import json, os, sys, urllib.error, urllib.parse, urllib.request

KEY = os.environ.get("DODO_API_KEY", "")
DB = os.environ.get("SUPABASE_URL", "")
SERVICE = os.environ.get("SUPABASE_SERVICE_KEY", "")
APPLY = os.environ.get("APPLY", "true") == "true"
TEST = KEY.startswith("dodo_test_")
BASE = "https://test.dodopayments.com" if TEST else "https://live.dodopayments.com"
COL = "dodo_test_product_id" if TEST else "dodo_product_id"
SUMMARY = os.environ.get("GITHUB_STEP_SUMMARY")
lines = []


def say(s=""):
    print(s)
    lines.append(s)


def call(url, method="GET", body=None, headers=None):
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"::error::{method} {url.split('?')[0]} answered {e.code}: {e.read().decode()[:400]}")


def dodo(path, method="GET", body=None):
    return call(f"{BASE}{path}", method, body, {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json", "Accept": "application/json"})


def db(path, method="GET", body=None):
    h = {"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}", "Content-Type": "application/json", "Prefer": "return=representation"}
    return call(f"{DB}/rest/v1/{path}", method, body, h)


def main():
    missing = [n for n, v in (("DODO_API_KEY", KEY), ("SUPABASE_URL", DB), ("SUPABASE_SERVICE_KEY", SERVICE)) if not v]
    if missing:
        raise SystemExit(f"::error::Missing: {', '.join(missing)} (GitHub > Settings > Secrets and variables > Actions)")
    say(f"## Connect Dodo ({'test mode' if TEST else 'live'}{'' if APPLY else ', dry run'})\n")

    products = db("products?select=id,slug,name,name_emphasis,tagline,price_cents,currency,checkout_url,dodo_product_id,dodo_test_product_id&order=sort_order")
    sellable = [p for p in products if (p.get("price_cents") or 0) > 0 and p.get("checkout_url")]
    say(f"**Products** ({len(sellable)} sold today):")
    for p in sellable:
        name = " ".join(x for x in (p["name"], p.get("name_emphasis")) if x)
        if p.get(COL):
            say(f"- {name}: already at Dodo ({p[COL]}).")
            continue
        if (p.get("currency") or "USD") != "USD":
            say(f"- {name}: **skipped**, its currency is {p['currency']} (the shop charges dollars).")
            continue
        if not APPLY:
            say(f"- {name}: would be made at ${p['price_cents'] / 100:.2f}.")
            continue
        made = dodo("/products", "POST", {
            "name": name[:100],
            "description": (p.get("tagline") or name)[:1000],
            "price": {"type": "one_time_price", "price": p["price_cents"], "currency": "USD",
                      "tax_inclusive": True, "purchasing_power_parity": False},
            "tax_category": "digital_products",
            "metadata": {"slug": p["slug"]},
        })
        pid = (made or {}).get("product_id")
        if not pid:
            raise SystemExit(f"::error::Dodo didn't return a product id for {name}.")
        db(f"products?id=eq.{p['id']}", "PATCH", {COL: pid})
        say(f"- {name}: made at ${p['price_cents'] / 100:.2f} ({pid}).")

    affiliates = db("affiliates?select=id,name,code,starts_on,ends_on,provider_codes&status=eq.active")
    say(f"\n**Affiliate codes** ({len(affiliates)} active):")
    for a in affiliates:
        have = (a.get("provider_codes") or {}).get("dodo")
        if have and bool(have.get("test_mode")) == TEST:
            say(f"- {a['code']}: already at Dodo.")
            continue
        if not (a.get("starts_on") and a.get("ends_on")):
            say(f"- {a['code']}: **skipped**, no agreement dates.")
            continue
        if not APPLY:
            say(f"- {a['code']}: would be made (10% off, {a['starts_on']} to {a['ends_on']}).")
            continue
        made = dodo("/discounts", "POST", {"type": "percentage", "amount": 1000, "code": a["code"], "name": f"Affiliate: {a['name']}"[:100],
                                           "starts_at": f"{a['starts_on']}T00:00:00Z", "expires_at": f"{a['ends_on']}T00:00:00Z"})
        codes = dict(a.get("provider_codes") or {})
        codes["dodo"] = {"provider": "dodo", "id": str((made or {}).get("discount_id")), "test_mode": TEST, "reused": False}
        db(f"affiliates?id=eq.{a['id']}", "PATCH", {"provider_codes": codes})
        say(f"- {a['code']}: made.")

    say("\nCheckout stays on Lemon Squeezy until the switch in the admin is set to Dodo.")
    if SUMMARY:
        open(SUMMARY, "a").write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
