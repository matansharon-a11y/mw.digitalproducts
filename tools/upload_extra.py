"""Puts an extra download (product_extra_files, e.g. MWP Panel's Lightroom Classic plugin) into the shop without the
file ever being readable in this public repository. Run by .github/workflows/upload-extra.yml ("Upload an extra download").

1. The run makes a key pair; the private key never leaves the runner. It pushes the public key to a temporary branch
   (upload-drop-<run id>).
2. The sender encrypts the zip with a random AES key, encrypts that key with the public key, and pushes both
   (file.enc, key.enc) to the same branch. Without the runner's private key they are useless.
3. The run decrypts them, checks the zip, uploads it to the private 'presets' bucket, writes the product_extra_files row
   (the button in My downloads) and deletes the branch. Nothing arrives within 20 minutes → nothing changes.
"""
import json, os, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request

DB = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_KEY"]
SLUG, FILE_KEY, LABEL, VERSION, NAME = (os.environ[k].strip() for k in ("SLUG", "FILE_KEY", "LABEL", "VERSION", "FILE_NAME"))
BRANCH = f"upload-drop-{os.environ['GITHUB_RUN_ID']}"
W = os.environ.get("RUNNER_TEMP", "/tmp") + "/drop"
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}


def sh(*cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=kw.pop("text", True), **kw).stdout


def call(path, method="GET", body=None, headers=None, raw=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(f"{DB}{path}", method=method, data=data,
                                 headers={**H, "Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            out = r.read()
            return json.loads(out) if out else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"::error::{method} {path.split('?')[0]} answered {e.code}: {e.read().decode()[:300]}")


for v, pat in ((SLUG, r"^[a-z0-9-]{1,80}$"), (FILE_KEY, r"^[a-z0-9]+(-[a-z0-9]+)*$"), (VERSION, r"^[0-9A-Za-z.]{1,20}$"),
               (NAME, r"^[A-Za-z0-9._-]{1,120}\.zip$")):
    if not re.match(pat, v):
        raise SystemExit(f"::error::Not allowed: {v!r}")
product = call(f"/rest/v1/products?slug=eq.{SLUG}&select=id")
if not product:
    raise SystemExit(f"::error::No product {SLUG}")

os.makedirs(W, exist_ok=True)
os.chmod(W, 0o700)
priv, pub = f"{W}/priv.pem", f"{W}/pub.pem"
sh("openssl", "genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:3072", "-out", priv)
sh("openssl", "pkey", "-in", priv, "-pubout", "-out", pub)

# the temporary branch: only the public key at first
repo = f"{W}/repo"
sh("git", "init", "-q", repo)
for c in (["config", "user.name", "github-actions"], ["config", "user.email", "github-actions@users.noreply.github.com"]):
    sh("git", "-C", repo, *c)
sh("git", "-C", repo, "remote", "add", "origin", os.environ["REPO_URL"])
open(f"{repo}/pub.pem", "w").write(open(pub).read())
sh("git", "-C", repo, "add", "pub.pem")
sh("git", "-C", repo, "commit", "-qm", "Upload drop: public key")
sh("git", "-C", repo, "push", "-q", "origin", f"HEAD:refs/heads/{BRANCH}")
print(f"Public key on branch {BRANCH}. Waiting for file.enc and key.enc …", flush=True)

try:
    got = False
    for _ in range(120):
        time.sleep(10)
        subprocess.run(["git", "-C", repo, "fetch", "-q", "origin", BRANCH], capture_output=True)
        files = sh("git", "-C", repo, "ls-tree", "--name-only", "FETCH_HEAD").split()
        if "file.enc" in files and "key.enc" in files:
            got = True
            break
    if not got:
        raise SystemExit("::error::Nothing arrived within 20 minutes. Nothing was changed in the shop.")
    sh("git", "-C", repo, "checkout", "-q", "FETCH_HEAD", "--", "file.enc", "key.enc")
    sh("openssl", "pkeyutl", "-decrypt", "-inkey", priv, "-in", f"{repo}/key.enc", "-out", f"{W}/aes",
       "-pkeyopt", "rsa_padding_mode:oaep", "-pkeyopt", "rsa_oaep_md:sha256")
    zip_path = f"{W}/{NAME}"
    sh("openssl", "enc", "-d", "-aes-256-cbc", "-pbkdf2", "-pass", f"file:{W}/aes", "-in", f"{repo}/file.enc", "-out", zip_path)
    sh("unzip", "-tq", zip_path)   # a real, intact zip
    size = os.path.getsize(zip_path)

    path = f"{SLUG}/{FILE_KEY}/v{VERSION}/{NAME}"
    call(f"/storage/v1/object/presets/{urllib.parse.quote(path)}", "POST", raw=open(zip_path, "rb").read(),
         headers={"Content-Type": "application/zip", "x-upsert": "true"})
    call("/rest/v1/product_extra_files?on_conflict=product_id,file_key", "POST",
         {"product_id": product[0]["id"], "file_key": FILE_KEY, "label": LABEL, "path": path, "size_bytes": size,
          "version": VERSION, "uploaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())},
         {"Prefer": "resolution=merge-duplicates,return=minimal"})
    summary = f"Uploaded **{LABEL}** for {SLUG}: `{path}` ({size:,} bytes), version {VERSION}. Owners see it in My downloads now."
    print(summary)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        open(os.environ["GITHUB_STEP_SUMMARY"], "a").write(summary + "\n")
finally:
    subprocess.run(["git", "-C", repo, "push", "-q", "origin", "--delete", BRANCH], capture_output=True)
    subprocess.run(["rm", "-rf", W])
