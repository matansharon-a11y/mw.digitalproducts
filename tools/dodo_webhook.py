"""Connect Dodo, step 1 (Jeinna, 26 Nov 2026: leave the least work by hand): makes Dodo's webhook for the shop through
Dodo's API, or finds the one already there, and writes its signing secret to $GITHUB_ENV as DODO_WEBHOOK_SECRET (live
key) or DODO_WEBHOOK_SECRET_TEST (a dodo_test_ key), for the workflow to store in Supabase. The secret is never printed.
API: POST /webhooks {url, filter_types}, GET /webhooks, GET /webhooks/{id}/secret (docs.dodopayments.com)."""
import json, os, urllib.request

KEY = os.environ.get("DODO_API_KEY", "").strip()
if not KEY:
    raise SystemExit("::error::DODO_API_KEY isn't set (GitHub > Settings > Secrets and variables > Actions)")
TEST = KEY.startswith("dodo_test_")
BASE = "https://test.dodopayments.com" if TEST else "https://live.dodopayments.com"
URL = f"https://{os.environ['SUPABASE_PROJECT_REF']}.supabase.co/functions/v1/dodo-webhook"
EVENTS = ["payment.succeeded", "refund.succeeded", "dispute.opened"]


def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        raise SystemExit(f"::error::Dodo answered {e.code} to {method} {path}: {e.read()[:300].decode(errors='replace')}")


found, it = None, None
while True:
    page = call("GET", "/webhooks?limit=100" + (f"&iterator={it}" if it else ""))
    found = next((w for w in page.get("data", []) if w.get("url") == URL), None)
    if found or page.get("done", True) or not page.get("iterator"):
        break
    it = page["iterator"]
mode = "test mode" if TEST else "live"
if found:
    print(f"Webhook already there ({mode}): {found['id']}, events {', '.join(found.get('filter_types') or ['all'])}")
    if found.get("disabled"):
        print("::warning::That webhook is disabled in Dodo: switch it on under Developer > Webhooks")
else:
    found = call("POST", "/webhooks", {"url": URL, "filter_types": EVENTS, "description": "MWP Shop orders, refunds, disputes"})
    print(f"Webhook made ({mode}): {found['id']} -> {URL}")
secret = call("GET", f"/webhooks/{found['id']}/secret").get("secret", "")
if not secret.startswith("whsec_"):
    raise SystemExit("::error::Dodo returned no signing secret")
name = "DODO_WEBHOOK_SECRET_TEST" if TEST else "DODO_WEBHOOK_SECRET"
print(f"::add-mask::{secret}")
with open(os.environ["GITHUB_ENV"], "a") as f:
    f.write(f"WEBHOOK_SECRET_NAME={name}\nWEBHOOK_SECRET_VALUE={secret}\n")
print(f"Signing secret read; it goes to Supabase as {name}")
