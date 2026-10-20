"""Connects the shop to Lemon Squeezy (run by .github/workflows/lemonsqueezy.yml, "Connect Lemon Squeezy").

1. Reads the store's products through the Lemon Squeezy API (LEMONSQUEEZY_API_KEY).
2. Matches each one to a shop product by its name (MWP Presets, MWP Panel, MWP Field Guides, the bundles with
   "+", and MWP Full Set) and writes its checkout link and variant ID into the shop's products table.
3. Makes sure the store has the order webhook (order_created, order_refunded) to the shop's checkout-webhook
   function, signed with CHECKOUT_WEBHOOK_SECRET.
Prices are compared, never changed: a product whose Lemon Squeezy price differs from the shop's is reported.
Nothing is switched on or off (is_active stays as it is) and nothing is deleted.
"""
import json, os, re, sys, urllib.error, urllib.parse, urllib.request

LS = "https://api.lemonsqueezy.com/v1"
KEY = os.environ.get("LEMONSQUEEZY_API_KEY", "")
DB = os.environ.get("SUPABASE_URL", "")
SERVICE = os.environ.get("SUPABASE_SERVICE_KEY", "")
HOOK_SECRET = os.environ.get("CHECKOUT_WEBHOOK_SECRET", "")
APPLY = os.environ.get("APPLY", "true") == "true"
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


def ls(path, method="GET", body=None):
    h = {"Accept": "application/vnd.api+json", "Content-Type": "application/vnd.api+json", "Authorization": f"Bearer {KEY}"}
    return call(f"{LS}{path}", method, body, h)


def ls_all(path):
    out, url = [], path
    while url:
        page = ls(url)
        out += page.get("data", [])
        nxt = (page.get("links") or {}).get("next")
        url = nxt.replace(LS, "") if nxt else None
    return out


def db(path, method="GET", body=None):
    h = {"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}", "Content-Type": "application/json", "Prefer": "return=representation"}
    return call(f"{DB}/rest/v1/{path}", method, body, h)


def slug_for(name):
    t = name.lower()
    if "full set" in t or "full-set" in t:
        return "full-set"
    parts = frozenset(p for p, w in (("presets", "preset"), ("panel", "panel"), ("guides", "guide")) if w in t)
    return {frozenset({"presets"}): "mwp-presets", frozenset({"panel"}): "mwp-panel", frozenset({"guides"}): "mwp-field-guides",
            frozenset({"presets", "panel"}): "presets-panel", frozenset({"presets", "guides"}): "presets-field-guides",
            frozenset({"guides", "panel"}): "field-guides-panel"}.get(parts)


def main():
    missing = [n for n, v in (("LEMONSQUEEZY_API_KEY", KEY), ("SUPABASE_URL", DB), ("SUPABASE_SERVICE_KEY", SERVICE)) if not v]
    if missing:
        raise SystemExit(f"::error::Not set: {', '.join(missing)}. Add LEMONSQUEEZY_API_KEY under Settings > Secrets and variables > Actions.")

    stores = ls("/stores")["data"]
    if not stores:
        raise SystemExit("::error::The API key sees no store.")
    store = stores[0]
    mode = "test mode" if ls("/users/me")["meta"].get("test_mode") else "live"
    say(f"## Connect Lemon Squeezy\n\nStore **{store['attributes']['name']}** (id {store['id']}), key in **{mode}**. "
        f"{'Writing to the shop.' if APPLY else 'Dry run: nothing is written.'}\n")

    shop = {p["slug"]: p for p in db("products?select=slug,name,name_emphasis,price_cents,checkout_url,checkout_variant_id,is_active")}
    products = ls_all(f"/products?filter[store_id]={store['id']}&page[size]=100")
    say("| Lemon Squeezy product | Shop product | Variant | LS price | Shop price | Result |")
    say("| --- | --- | --- | --- | --- | --- |")
    found = set()
    for p in products:
        a = p["attributes"]
        slug = slug_for(a["name"])
        if not slug or slug not in shop:
            say(f"| {a['name']} | (no match) | | | | skipped: rename it to match a shop product |")
            continue
        if slug in found:
            say(f"| {a['name']} | {slug} | | | | skipped: a second product with the same name |")
            continue
        variants = ls_all(f"/variants?filter[product_id]={p['id']}")
        live = [v for v in variants if v["attributes"].get("status") == "published"] or variants
        if not live:
            say(f"| {a['name']} | {slug} | | | | skipped: no variant |")
            continue
        v = live[0]
        ls_price, shop_price = v["attributes"].get("price"), shop[slug]["price_cents"]
        url = a.get("buy_now_url")
        note = "connected" if APPLY else "would connect"
        if ls_price != shop_price:
            note += f" · **price differs** (fix it in Lemon Squeezy)"
        if a.get("status") != "published":
            note += f" · product is {a.get('status')} in Lemon Squeezy"
        if APPLY:
            db(f"products?slug=eq.{urllib.parse.quote(slug)}", "PATCH", {"checkout_url": url, "checkout_variant_id": str(v["id"])})
        found.add(slug)
        say(f"| {a['name']} | {slug} | {v['id']} | ${ls_price / 100:.2f} | ${shop_price / 100:.2f} | {note} |")
    for slug in sorted(set(shop) - found):
        say(f"| (none) | {slug} | | | ${shop[slug]['price_cents'] / 100:.2f} | **not in Lemon Squeezy yet** |")

    # the order webhook
    say("")
    hook_url = f"{DB}/functions/v1/checkout-webhook"
    hooks = ls_all(f"/webhooks?filter[store_id]={store['id']}")
    mine = [h for h in hooks if h["attributes"]["url"] == hook_url]
    want = {"order_created", "order_refunded"}
    if mine and want <= set(mine[0]["attributes"]["events"]):
        say(f"Webhook: already there ({hook_url}).")
    elif not HOOK_SECRET:
        say("Webhook: **not created**: CHECKOUT_WEBHOOK_SECRET isn't set in GitHub secrets.")
    elif not APPLY:
        say(f"Webhook: would be {'updated' if mine else 'created'} ({hook_url}).")
    elif mine:
        ls(f"/webhooks/{mine[0]['id']}", "PATCH", {"data": {"type": "webhooks", "id": mine[0]["id"], "attributes": {
            "events": sorted(want | set(mine[0]["attributes"]["events"])), "secret": HOOK_SECRET}}})
        say("Webhook: updated (events and signing secret).")
    else:
        ls("/webhooks", "POST", {"data": {"type": "webhooks", "attributes": {"url": hook_url, "events": sorted(want), "secret": HOOK_SECRET},
                                          "relationships": {"store": {"data": {"type": "stores", "id": str(store["id"])}}}}})
        say(f"Webhook: created ({hook_url}).")

    say("\nStill by hand in Lemon Squeezy (the API can't set it): on each product, Confirmation → redirect to "
        "`https://shop.mw.photography/thank-you/`.")


if __name__ == "__main__":
    try:
        main()
    finally:
        if SUMMARY and lines:
            open(SUMMARY, "a", encoding="utf-8").write("\n".join(lines) + "\n")
