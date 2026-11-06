"""Lists what's inside each product file (names, sizes, manifest / Info.lua header fields, preset process versions):
structure only, never code or preset values, because this repository's workflow logs are public. Read-only."""
import collections, io, json, os, re, sys, zipfile
import requests

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_KEY"]
S = requests.Session(); S.headers.update({"apikey": KEY, "Authorization": f"Bearer {KEY}"})

def rest(path, **p):
    r = S.get(f"{URL}/rest/v1/{path}", params=p, timeout=60); r.raise_for_status(); return r.json()

def walk(z, depth=0, label=""):
    names = z.namelist()
    exts = collections.Counter(os.path.splitext(n)[1].lower() or "(folder)" for n in names)
    print(f"{'  '*depth}{label} {len(names)} entries; types: {dict(exts.most_common(12))}")
    for n in names:
        low = n.lower()
        if low.endswith(("manifest.json",)):
            m = json.loads(z.read(n))
            keep = {k: m.get(k) for k in ("manifestVersion", "id", "name", "version", "host", "requiredPermissions")}
            keep["entrypoints"] = [{k: e.get(k) for k in ("type", "id")} for e in m.get("entrypoints", [])]
            print(f"{'  '*depth}  {n}: {json.dumps(keep)[:900]}")
        elif low.endswith("info.lua"):
            t = z.read(n).decode("utf-8", "replace")
            fields = dict(re.findall(r"(Lr\w+)\s*=\s*([^,\n]+)", t))
            print(f"{'  '*depth}  {n}: { {k: v.strip()[:60] for k, v in fields.items() if k.startswith(('LrSdk', 'LrToolkit', 'LrPluginName', 'LrPluginInfoUrl')) or k in ('LrExportMenuItems', 'LrLibraryMenuItems', 'LrHelpMenuItems', 'LrExportServiceProvider')} }")
        elif low.endswith((".ccx", ".zxp", ".zip")):
            walk(zipfile.ZipFile(io.BytesIO(z.read(n))), depth + 1, n)
    pvs = collections.Counter()
    for n in names:
        if n.lower().endswith(".xmp"):
            t = z.read(n).decode("utf-8", "replace")
            pv = re.search(r'crs:ProcessVersion\s*=\s*"([^"]+)"|<crs:ProcessVersion>([^<]+)<', t)
            pvs[(pv.group(1) or pv.group(2)) if pv else "none"] += 1
    if pvs: print(f"{'  '*depth}  .xmp process versions: {dict(pvs)}")
    js = [n for n in names if n.endswith(".js")]
    if js: print(f"{'  '*depth}  js files: {len(js)}; total {sum(z.getinfo(n).file_size for n in js)//1024} KB")

for p in rest("products", select="slug,category,product_files(path,version)", order="sort_order"):
    f = p.get("product_files")
    if not f or p["category"] == "bundle": continue
    if p["slug"].startswith("field-guide-") or p["slug"].endswith("-sample"): continue
    print(f"\n== {p['slug']} ({p['category']}) {f['path'].split('/')[-1]} v{f['version']}")
    r = S.get(f"{URL}/storage/v1/object/presets/{f['path']}", timeout=600); r.raise_for_status()
    try: walk(zipfile.ZipFile(io.BytesIO(r.content)), 0, f"{len(r.content)//1024//1024} MB zip:")
    except zipfile.BadZipFile: print("  not a zip")
