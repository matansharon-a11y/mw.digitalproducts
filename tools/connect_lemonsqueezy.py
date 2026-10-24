"""Connects the shop to Lemon Squeezy (run by .github/workflows/lemonsqueezy.yml, "Connect Lemon Squeezy").

1. Reads the store's products through the Lemon Squeezy API (LEMONSQUEEZY_API_KEY).
2. Matches each one to a shop product by its name (MWP Presets, MWP Photoshop Plugin Panel, MWP Field Guides, the bundles with
   "+", and MWP Full Set) and writes its checkout link and variant ID into the shop's products table.
3. Makes sure the store has the order webhook (order_created, order_refunded) to the shop's checkout-webhook
   function. Its signing secret is made here (40 random letters and digits), set on the function as
   LS_WEBHOOK_SECRET_TEST or LS_WEBHOOK_SECRET_LIVE and given to Lemon Squeezy: no one ever sees or types it.
   A new one is made whenever the webhook is created, or on request (workflow input new_signing_secret).
Prices are compared, never changed: a product whose Lemon Squeezy price differs from the shop's is reported.
Nothing is switched on or off (is_active stays as it is) and nothing is deleted.
"""
import json, os, re, secrets, subprocess, sys, urllib.error, urllib.parse, urllib.request

LS = "https://api.lemonsqueezy.com/v1"
KEY = os.environ.get("LEMONSQUEEZY_API_KEY", "")
DB = os.environ.get("SUPABASE_URL", "")
SERVICE = os.environ.get("SUPABASE_SERVICE_KEY", "")
PROJECT = os.environ.get("SUPABASE_PROJECT_REF", "")
APPLY = os.environ.get("APPLY", "true") == "true"
NEW_SECRET = os.environ.get("NEW_SIGNING_SECRET", "false") == "true"


def new_signing_secret(test):
    """A fresh 40-character secret (Lemon Squeezy's maximum), letters and digits only so no tool reads it
    differently, set on the checkout-webhook function under this mode's name. Returns it for the webhook."""
    s = secrets.token_hex(20)
    print(f"::add-mask::{s}")
    name = "LS_WEBHOOK_SECRET_TEST" if test else "LS_WEBHOOK_SECRET_LIVE"
    r = subprocess.run(["supabase", "secrets", "set", f"{name}={s}", "--project-ref", PROJECT], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"::error::Couldn't set {name} on the functions (supabase secrets set failed).")
    return s, name
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
    # MWP Presets comes with the Lightroom Classic plugin (one purchase), so a name with "preset" is never the plugin
    # (the Photoshop one is "MWP Photoshop Plugin Panel" since 24 Oct 2026: a name with "photoshop" or "panel" is never this one)
    if ("lightroom classic" in t or "plugin" in t) and not any(w in t for w in ("preset", "photoshop", "panel")):
        return "mwp-lightroom-plugin"
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
    # the account has more than one store: connect only the one named (workflow input store_id), never a guess
    want_store = os.environ.get("STORE_ID", "").strip()
    pick = [s for s in stores if s["id"] == want_store] if want_store else (stores if len(stores) == 1 else [])
    if not pick:
        listed = ", ".join(f"{s['attributes']['name']} #{s['id']} ({s['attributes'].get('domain') or s['attributes'].get('slug')})" for s in stores)
        raise SystemExit(f"::error::Choose the store with the store_id input. The key sees: {listed}")
    store = pick[0]
    test = bool(ls("/users/me")["meta"].get("test_mode"))
    mode = "test mode" if test else "live"
    # The shop's products table is the live site: test checkout links never go there (a visitor would get a checkout
    # that only takes test cards and delivers nothing). In test mode the links are listed here to test with instead.
    write = APPLY and not test
    say(f"## Connect Lemon Squeezy\n\nStore **{store['attributes']['name']}** (id {store['id']}), key in **{mode}**. "
        f"{'Writing to the shop.' if write else 'Test mode: the shop is not changed; test with the links below.' if test else 'Dry run: nothing is written.'}\n")

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
        note = "connected" if write else f"test link: {url}" if test else "would connect"
        if ls_price != shop_price:
            note += f" · **price differs** (fix it in Lemon Squeezy)"
        if a.get("status") != "published":
            note += f" · product is {a.get('status')} in Lemon Squeezy"
        if write:
            db(f"products?slug=eq.{urllib.parse.quote(slug)}", "PATCH", {"checkout_url": url, "checkout_variant_id": str(v["id"])})
        elif test and APPLY:
            # the webhook finds the product by its variant ID: test orders need the test variant IDs, which are safe to
            # store (they're not links and unlock nothing on their own); the live run replaces them
            db(f"products?slug=eq.{urllib.parse.quote(slug)}", "PATCH", {"checkout_variant_id": str(v["id"])})
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
    if mine and want <= set(mine[0]["attributes"]["events"]) and not NEW_SECRET:
        say(f"Webhook: already there ({hook_url}).")
    elif not APPLY:
        say(f"Webhook: would be {'updated' if mine else 'created'} with a new signing secret ({hook_url}).")
    elif mine:
        secret, name = new_signing_secret(test)
        ls(f"/webhooks/{mine[0]['id']}", "PATCH", {"data": {"type": "webhooks", "id": mine[0]["id"], "attributes": {
            "events": sorted(want | set(mine[0]["attributes"]["events"])), "secret": secret}}})
        say(f"Webhook: updated (events, and a new signing secret set on the function as {name}).")
    else:
        secret, name = new_signing_secret(test)
        ls("/webhooks", "POST", {"data": {"type": "webhooks", "attributes": {"url": hook_url, "events": sorted(want), "secret": secret, "test_mode": test},
                                          "relationships": {"store": {"data": {"type": "stores", "id": str(store["id"])}}}}})
        say(f"Webhook: created, signing secret set on the function as {name} ({hook_url}).")

    say("\nStill by hand in Lemon Squeezy (the API can't set it): on each product, Confirmation → redirect to "
        "`https://shop.mw.photography/thank-you/`.")


if __name__ == "__main__":
    try:
        main()
    finally:
        if SUMMARY and lines:
            open(SUMMARY, "a", encoding="utf-8").write("\n".join(lines) + "\n")
