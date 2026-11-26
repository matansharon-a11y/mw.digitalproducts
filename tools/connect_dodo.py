"""Connects the shop to Dodo Payments (run by .github/workflows/dodo.yml, "Connect Dodo"; 24 Nov 2026).

1. Every product the shop sells (a price above zero and a Lemon Squeezy checkout today) is made at Dodo once:
   POST /products, a one-time price in USD at the shop's own price, tax included in the price, tax category
   digital_products, the shop's slug in its metadata. Its Dodo id goes into products.dodo_product_id (live key) or
   dodo_test_product_id (a dodo_test_ key: Dodo's separate test catalogue). A product that already has an id is left.
2. The sale's codes (assets/js/lib/sale.js, as Connect Lemon Squeezy makes them), each limited to its products and the
   sale's dates, while the sale hasn't ended: the cart sends them with every Dodo checkout, and Dodo refuses a code it
   doesn't know (26 Nov 2026).
3. Every active affiliate gets their code at Dodo (10% off every product, their agreement's dates), kept in
   affiliates.provider_codes.dodo. A code already made is left.
Nothing is switched: checkout stays on Lemon Squeezy until the admin's switch (admin_set_checkout_provider) says Dodo.
Prices are never changed here; to change one, change it in the admin and at Dodo.
The webhook is made by tools/dodo_webhook.py in the step before this one.
"""
import datetime, json, os, re, sys, urllib.error, urllib.parse, urllib.request

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


def sale():
    """The sale as the site has it (assets/js/lib/sale.js): dates, the main rate and code, and the special ones."""
    js = open(os.path.join(os.path.dirname(__file__), "..", "assets", "js", "lib", "sale.js"), encoding="utf-8").read()
    get = lambda pat: re.search(pat, js).group(1)
    special = {m.group(1): (int(m.group(2)), m.group(3)) for m in re.finditer(r'"([a-z0-9-]+)": \{ pct: (\d+), code: "([A-Z0-9]+)" \}', js)}
    return get(r'start: "([^"]+)"'), get(r'end: "([^"]+)"'), int(get(r'pct: (\d+), code:')), get(r'pct: \d+, code: "([A-Z0-9]+)"'), special


def sale_codes(products):
    start, end, pct, code, special = sale()
    if datetime.datetime.fromisoformat(end.replace("Z", "+00:00")) <= datetime.datetime.now(datetime.timezone.utc):
        say(f"\n**Sale codes**: the sale ended {end[:10]}, none made.")
        return
    ids = {p["slug"]: p.get(COL) for p in products if p.get(COL) and p["slug"] != "mwp-field-guides-sample"}
    groups = [(code, pct, [i for s_, i in ids.items() if s_ not in special])]
    groups += [(c, p_, [i for s_, i in ids.items() if s_ == sl]) for sl, (p_, c) in special.items()]
    listed = dodo("/discounts?page_size=100") or {}
    have = {d.get("code") for d in (listed.get("items") or listed.get("data") or [])}
    say(f"\n**Sale codes** ({start[:10]} to {end[:10]}):")
    for c, p_, pids in groups:
        if not pids:
            say(f"- {c} ({p_}%): no matching products at Dodo yet, not made.")
        elif c in have:
            say(f"- {c} ({p_}%): already at Dodo.")
        elif not APPLY:
            say(f"- {c} ({p_}%): would be made for {len(pids)} products.")
        else:
            dodo("/discounts", "POST", {"type": "percentage", "amount": p_ * 100, "code": c, "name": f"November Sale {p_}%",
                                        "restricted_to": pids, "expires_at": end,
                                        **({"starts_at": start} if datetime.datetime.fromisoformat(start) > datetime.datetime.now(datetime.timezone.utc) else {})})
            say(f"- {c} ({p_}%): made, for {len(pids)} product{'' if len(pids) == 1 else 's'}.")


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

    sale_codes(db("products?select=slug,dodo_product_id,dodo_test_product_id"))

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
