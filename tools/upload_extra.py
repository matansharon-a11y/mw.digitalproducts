"""Puts an extra download (product_extra_files, e.g. MWP Panel's Lightroom Classic plugin) into the shop without the
file ever passing through this public repository. Run by .github/workflows/upload-extra.yml ("Upload an extra download").

1. Makes a one-time signed upload link for the private 'presets' bucket (valid 2 hours) and prints it encrypted with
   the public key given to the run (RSA-OAEP for a random AES key, AES-256-CBC for the link), so the public log
   shows nothing usable. Whoever holds the private key decrypts it and PUTs the zip there.
2. Waits up to 20 minutes for the file to arrive, then writes the product_extra_files row (the button in My downloads).
"""
import base64, json, os, subprocess, sys, tempfile, time, urllib.error, urllib.parse, urllib.request

DB = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_KEY"]
SLUG, FILE_KEY, LABEL, VERSION, NAME = (os.environ[k].strip() for k in ("SLUG", "FILE_KEY", "LABEL", "VERSION", "FILE_NAME"))
PUBLIC_KEY = base64.b64decode(os.environ["PUBLIC_KEY_B64"])
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}


def call(path, method="GET", body=None, headers=None):
    req = urllib.request.Request(f"{DB}{path}", method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={**H, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"::error::{method} {path.split('?')[0]} answered {e.code}: {e.read().decode()[:300]}")


for v, pat in ((SLUG, r"^[a-z0-9-]{1,80}$"), (FILE_KEY, r"^[a-z0-9]+(-[a-z0-9]+)*$"), (VERSION, r"^[0-9A-Za-z.]{1,20}$"), (NAME, r"^[A-Za-z0-9._-]{1,120}\.zip$")):
    import re
    if not re.match(pat, v):
        raise SystemExit(f"::error::Not allowed: {v!r}")

product = call(f"/rest/v1/products?slug=eq.{SLUG}&select=id")
if not product:
    raise SystemExit(f"::error::No product {SLUG}")
pid = product[0]["id"]
folder = f"{SLUG}/{FILE_KEY}/v{VERSION}"
path = f"{folder}/{NAME}"

signed = call(f"/storage/v1/object/upload/sign/presets/{urllib.parse.quote(path)}", "POST", {}, {"x-upsert": "true"})
link = f"{DB}/storage/v1{signed['url']}"

with tempfile.TemporaryDirectory() as t:
    open(f"{t}/pub.pem", "wb").write(PUBLIC_KEY)
    aes = os.urandom(32).hex()
    open(f"{t}/aes", "w").write(aes)
    open(f"{t}/link", "w").write(link)
    k = subprocess.run(["openssl", "pkeyutl", "-encrypt", "-pubin", "-inkey", f"{t}/pub.pem", "-in", f"{t}/aes",
                        "-pkeyopt", "rsa_padding_mode:oaep", "-pkeyopt", "rsa_oaep_md:sha256"], capture_output=True, check=True).stdout
    c = subprocess.run(["openssl", "enc", "-aes-256-cbc", "-pbkdf2", "-salt", "-pass", f"file:{t}/aes", "-in", f"{t}/link"],
                       capture_output=True, check=True).stdout
print("SEALED_KEY=" + base64.b64encode(k).decode())
print("SEALED_LINK=" + base64.b64encode(c).decode())
print(f"Waiting for {path} …", flush=True)

size = None
for _ in range(120):
    found = call(f"/storage/v1/object/list/presets", "POST", {"prefix": folder, "search": NAME, "limit": 5})
    hit = [f for f in found or [] if f.get("name") == NAME and f.get("metadata")]
    if hit:
        size = hit[0]["metadata"].get("size")
        break
    time.sleep(10)
if size is None:
    raise SystemExit("::error::The file didn't arrive within 20 minutes. Nothing was changed in the shop.")

call("/rest/v1/product_extra_files?on_conflict=product_id,file_key", "POST",
     {"product_id": pid, "file_key": FILE_KEY, "label": LABEL, "path": path, "size_bytes": size, "version": VERSION,
      "uploaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())},
     {"Prefer": "resolution=merge-duplicates,return=minimal"})
summary = f"Uploaded **{LABEL}** for {SLUG}: `{path}` ({size:,} bytes), version {VERSION}. Owners see it in My downloads now."
print(summary)
if os.environ.get("GITHUB_STEP_SUMMARY"):
    open(os.environ["GITHUB_STEP_SUMMARY"], "a").write(summary + "\n")
