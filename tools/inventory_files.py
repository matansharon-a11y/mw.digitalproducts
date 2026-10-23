"""Read-only: what each product's uploaded zip actually contains (run by "Inventory product files").
For every product with a file (product_files and product_extra_files): version, size, and inside the zip only the
counts per file type and the top-level folder names, so the public log never lists the paid files themselves."""
import collections, io, json, os, urllib.request, zipfile

DB, KEY = os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}


def get(path, raw=False):
    with urllib.request.urlopen(urllib.request.Request(f"{DB}{path}", headers=H), timeout=120) as r:
        b = r.read()
        return b if raw else json.loads(b)


out = ["## Product files", ""]
prods = {p["id"]: p for p in get("/rest/v1/products?select=id,slug,category,is_active,version")}
rows = [(r, "main") for r in get("/rest/v1/product_files?select=product_id,path,size_bytes,version")]
rows += [(r, r["label"]) for r in get("/rest/v1/product_extra_files?select=product_id,label,path,size_bytes,version")]
for slug in sorted({p["slug"] for p in prods.values()}):
    for r, kind in rows:
        p = prods[r["product_id"]]
        if p["slug"] != slug:
            continue
        out.append(f"### {slug} · {kind} · v{r['version']} · {(r['size_bytes'] or 0) / 1e6:.1f} MB · {p['category']}{'' if p['is_active'] else ' · not active'}")
        try:
            z = zipfile.ZipFile(io.BytesIO(get(f"/storage/v1/object/presets/{r['path']}", raw=True)))
            names = [n for n in z.namelist() if not n.endswith("/") and "__MACOSX" not in n and not n.split("/")[-1].startswith(".")]
            ext = collections.Counter(os.path.splitext(n)[1].lower() or "(none)" for n in names)
            tops = sorted({n.split("/")[0] for n in z.namelist() if "/" in n and "__MACOSX" not in n})
            sub = collections.Counter("/".join(n.split("/")[:2]) for n in names if n.count("/") >= 2)
            out.append(f"- {len(names)} files: " + ", ".join(f"{c} {e}" for e, c in ext.most_common()))
            out.append(f"- top folders: {', '.join(tops) or '(none)'}")
            for s_, c in sorted(sub.items()):
                out.append(f"  - {s_}: {c} files")
        except Exception as e:
            out.append(f"- could not open: {type(e).__name__}")
        out.append("")
for p in prods.values():
    if not any(prods[r["product_id"]]["slug"] == p["slug"] for r, _ in rows):
        out.append(f"### {p['slug']} · no file uploaded")
print("\n".join(out))
if os.environ.get("GITHUB_STEP_SUMMARY"):
    open(os.environ["GITHUB_STEP_SUMMARY"], "a").write("\n".join(out) + "\n")
