"""Makes the missing personal copies, signed-terms PDFs and online guide pages (run by the "Personal copies" GitHub workflow).

For every active entitlement to a Presets or Field Guides product whose personal copy is missing or
older than the product's current file, it downloads the base zip once, stamps a copy for that person
(personalize.py), uploads it to presets/personal/<entitlement>/<file> and records it in personal_files.
My downloads then serves that copy instead of the base file.

Ambassadors read the Field Guides online only (view-only entitlements get no zip): guide_views() renders
each guide version's pages once, privately (guide-pages bucket), for the guide-view function and the reader page.

Needs SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment. Prints counts only, never emails.
"""
import os, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import requests

sys.path.insert(0, os.path.dirname(__file__))
from personalize import personalize  # noqa: E402

PERSONAL = ("preset", "guide")
URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_KEY"]
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
S = requests.Session()
S.headers.update(H)


def rest(path, **params):
    r = S.get(f"{URL}/rest/v1/{path}", params=params, timeout=60)
    r.raise_for_status()
    return r.json()


def licence_id(entitlement_id):
    return "MWP-" + entitlement_id.replace("-", "")[:8].upper()


def download(path, dest):
    with S.get(f"{URL}/storage/v1/object/presets/{path}", stream=True, timeout=600) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)


def upload(path, src, content_type="application/zip", bucket="presets"):
    for attempt in range(3):
        with open(src, "rb") as f:
            r = S.post(f"{URL}/storage/v1/object/{bucket}/{path}", data=f, timeout=900,
                       headers={"content-type": content_type, "x-upsert": "true", "cache-control": "no-store"})
        if r.ok:
            return
        print(f"  upload failed ({r.status_code}), retrying", flush=True)
        time.sleep(5 * (attempt + 1))
    r.raise_for_status()


def main():
    failed = 0
    # Each part on its own: one failing never stops the others.
    for step in (signed_terms, guide_views, personal_copies):   # in order of who may be waiting
        try:
            failed += step()
        except Exception as err:
            failed += 1
            print(f"{step.__name__} failed: {type(err).__name__}: {str(err)[:300]}", flush=True)
    if failed:
        sys.exit(1)


def personal_copies():
    products = rest("products", select="id,slug,category,product_files(path,version)",
                    category=f"in.({','.join(PERSONAL)})")
    products = {p["id"]: p for p in products if p.get("product_files")}
    if not products:
        print("No Presets or Field Guides files yet."); return 0

    ents = rest("entitlements", select="id,product_id,guide_lang,customers(name,email),personal_files(path,version)",
                revoked_at="is.null", view_only="is.false", product_id=f"in.({','.join(products)})")
    todo = []
    for e in ents:
        pf = products[e["product_id"]]["product_files"]
        pf = pf[0] if isinstance(pf, list) else pf
        mine = e.get("personal_files")
        mine = (mine[0] if isinstance(mine, list) and mine else mine) or {}
        lang = one_lang(products[e["product_id"]], e)
        if lang == "wait":   # a Field Guides buyer who hasn't chosen English or Hebrew yet
            continue
        want = f"{pf['version']}:{lang}" if lang else pf["version"]
        if mine.get("version") != want and e.get("customers", {}).get("email"):
            todo.append((e, pf, mine.get("path"), lang, want))
    print(f"{len(ents)} entitlements, {len(todo)} personal copies to make", flush=True)

    made = failed = 0
    with tempfile.TemporaryDirectory() as tmp:
        bases = {}
        for e, pf, old, lang, want in todo:
            try:
                if pf["path"] not in bases:
                    bases[pf["path"]] = os.path.join(tmp, f"base-{len(bases)}.zip")
                    download(pf["path"], bases[pf["path"]])
                src = bases[pf["path"]]
                if lang:   # only the guides in the buyer's language
                    key = (pf["path"], lang)
                    if key not in bases:
                        bases[key] = os.path.join(tmp, f"base-{len(bases)}.zip")
                        only_lang(src, bases[key], lang)
                    src = bases[key]
                out = os.path.join(tmp, "out.zip")
                c = e["customers"]
                personalize(src, out, (c.get("name") or "").strip(), c["email"].strip(), licence_id(e["id"]))
                stem, ext = os.path.splitext(os.path.basename(pf["path"]))
                dest = f"personal/{e['id']}/{stem}-{lang}{ext}" if lang else f"personal/{e['id']}/{stem}{ext}"
                upload(dest, out)
                r = S.post(f"{URL}/rest/v1/personal_files", params={"on_conflict": "entitlement_id"},
                           headers={"content-type": "application/json", "prefer": "resolution=merge-duplicates"},
                           json={"entitlement_id": e["id"], "path": dest, "version": want,
                                 "size_bytes": os.path.getsize(out), "created_at": datetime.now(timezone.utc).isoformat()}, timeout=60)
                r.raise_for_status()
                if old and old != dest:   # the copy of an older version, no longer served
                    S.delete(f"{URL}/storage/v1/object/presets/{old}", timeout=60)
                os.remove(out)
                made += 1
                print(f"  made {made}/{len(todo)} ({products[e['product_id']]['slug']})", flush=True)
            except Exception as err:  # one bad copy shouldn't stop the rest
                failed += 1
                print(f"  failed one copy: {type(err).__name__}: {str(err)[:200]}", flush=True)
    print(f"Personal copies: {made} made, {failed} failed")
    return failed


def one_lang(product, ent):
    """For Field Guides: 'en' or 'he' (one language), None (the full set, bought before the choice
    existed) or 'wait' (not chosen yet). Other products: None."""
    if product.get("category") != "guide":
        return None
    lang = ent.get("guide_lang")
    return lang if lang in ("en", "he") else (None if lang == "both" else "wait")


def only_lang(src, dst, lang):
    """A copy of the pack with only the PDFs in one language (everything that isn't a PDF stays).
    If no PDF is found in that language, the full pack is kept, so nobody ends up with an empty copy."""
    import pymupdf, shutil, zipfile
    with zipfile.ZipFile(src) as zin:
        drop = set()
        for info in zin.infolist():
            if info.filename.lower().endswith(".pdf"):
                with pymupdf.open(stream=zin.read(info), filetype="pdf") as doc:
                    if guide_lang(info.filename, doc) != lang:
                        drop.add(info.filename)
        pdfs = [i.filename for i in zin.infolist() if i.filename.lower().endswith(".pdf")]
        if not pdfs or len(drop) == len(pdfs):
            print(f"  no {lang} guides found in the pack: keeping all of them", flush=True)
            shutil.copy(src, dst); return
        with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zout:
            for info in zin.infolist():
                if info.filename not in drop:
                    zout.writestr(info, zin.read(info))
    print(f"  {lang} pack: {len(pdfs) - len(drop)} of {len(pdfs)} guides", flush=True)


# ---------------------------------------------------------------- Field Guides to read online
PAGE_WIDTH = 1240   # pixels; sharp on a laptop, small enough to load quickly on a phone


def guide_lang(name, doc):
    """'he' for a Hebrew guide, 'en' otherwise: from the file name if it says, else from the text."""
    import re
    low = os.path.basename(name).lower()
    if re.search(r"[\u0590-\u05FF]|(^|[^a-z])(he|heb|hebrew|ivrit)([^a-z]|$)", low):
        return "he"
    if re.search(r"(^|[^a-z])(en|eng|english)([^a-z]|$)", low):
        return "en"
    text = "".join(doc[i].get_text() for i in range(min(len(doc), 6)))
    hebrew = len(re.findall(r"[\u05D0-\u05EA]", text))
    latin = len(re.findall(r"[A-Za-z]", text))
    return "he" if hebrew > latin else "en"


def guide_title(doc, lang):
    """The guide's own title, in its own language: the PDF's title property, else the biggest text on the
    cover. None when neither looks like a title (the file name is used then)."""
    import re
    script = r"[\u05D0-\u05EA]" if lang == "he" else r"[A-Za-z]"
    ok = lambda t: t and 3 <= len(t) <= 70 and re.search(script, t)
    meta = ((doc.metadata or {}).get("title") or "").strip()
    if ok(meta) and not re.search(r"\.(pdf|indd|docx?)$|untitled", meta, re.I):
        return meta
    try:
        spans = [s for b in doc[0].get_text("dict")["blocks"] for l in b.get("lines", []) for s in l["spans"] if s["text"].strip()]
    except Exception:
        return None
    if not spans:
        return None
    big = max(s["size"] for s in spans)
    text = re.sub(r"\s+", " ", " ".join(s["text"].strip() for s in spans if s["size"] >= big - 0.5)).strip()
    return text if ok(text) else None


def guide_views():
    """Renders each guide product's current version to page images, once: views/<product>/<version>/<g>-<nnn>.jpg.
    The pages are the plain guides; the reader draws each person's name, email and licence ID over them."""
    import re, zipfile
    import pymupdf
    products = rest("products", select="id,slug,product_files(path,version),guide_views(version,guides)", category="eq.guide")
    failed = 0
    for p in products:
        pf = p.get("product_files"); pf = (pf[0] if isinstance(pf, list) and pf else pf) or {}
        gv = p.get("guide_views"); gv = (gv[0] if isinstance(gv, list) and gv else gv) or {}
        # done already: this version, with each guide's language known (English or Hebrew pages)
        if not pf.get("path") or (gv.get("version") == pf["version"] and all("lang" in g and g.get("titled") for g in gv.get("guides") or [{}])):
            continue
        print(f"Rendering {p['slug']} {pf['version']} for reading online", flush=True)
        old = gv.get("version") if gv.get("version") != pf["version"] else None   # same version: pages are replaced in place
        try:
            with tempfile.TemporaryDirectory() as tmp:
                src = os.path.join(tmp, "base")
                download(pf["path"], src)
                pdfs = []
                if zipfile.is_zipfile(src):
                    with zipfile.ZipFile(src) as z:
                        for n in sorted(z.namelist()):
                            if n.lower().endswith(".pdf") and not os.path.basename(n).startswith((".", "_")) and "__MACOSX" not in n:
                                pdfs.append((n, z.read(n)))
                else:
                    pdfs.append((pf["path"], open(src, "rb").read()))
                version = re.sub(r"[^A-Za-z0-9._-]", "-", pf["version"])
                prefix = f"views/{p['id']}/{version}"
                guides = []
                for g, (name, data) in enumerate(pdfs, 1):
                    title = re.sub(r"^\d+\s*", "", re.sub(r"[_-]+", " ", os.path.splitext(os.path.basename(name))[0]).strip())
                    doc = pymupdf.open(stream=data, filetype="pdf")
                    pages, files = [], []
                    for i, page in enumerate(doc, 1):
                        pix = page.get_pixmap(matrix=pymupdf.Matrix(PAGE_WIDTH / page.rect.width, PAGE_WIDTH / page.rect.width), alpha=False)
                        out = os.path.join(tmp, f"{g}-{i:03d}.jpg")
                        pix.save(out, jpg_quality=75)
                        path = f"{prefix}/{g}-{i:03d}.jpg"
                        files.append((path, out))
                        pages.append({"path": path, "w": pix.width, "h": pix.height})
                    # upload many pages at once: one by one, a long guide took many minutes
                    with ThreadPoolExecutor(max_workers=12) as pool:
                        list(pool.map(lambda f: upload(f[0], f[1], "image/jpeg", "guide-pages"), files))
                    lang = guide_lang(name, doc)
                    guides.append({"title": guide_title(doc, lang) or title, "lang": lang, "titled": True, "pages": pages})
                    print(f"  {title} ({guides[-1]['lang']}): {len(pages)} pages", flush=True)
            S.post(f"{URL}/rest/v1/guide_views", params={"on_conflict": "product_id"},
                   headers={"content-type": "application/json", "prefer": "resolution=merge-duplicates"},
                   json={"product_id": p["id"], "version": pf["version"], "guides": guides,
                         "created_at": datetime.now(timezone.utc).isoformat()}, timeout=60).raise_for_status()
            if old:   # the pages of the version no longer shown
                old_prefix = f"views/{p['id']}/{re.sub(r'[^A-Za-z0-9._-]', '-', old)}"
                r = S.post(f"{URL}/storage/v1/object/list/guide-pages", json={"prefix": old_prefix, "limit": 1000}, timeout=60)
                names = [f"{old_prefix}/{o['name']}" for o in (r.json() if r.ok else [])]
                if names:
                    S.delete(f"{URL}/storage/v1/object/guide-pages", json={"prefixes": names}, timeout=60)
        except Exception as err:
            failed += 1
            print(f"  failed to render {p['slug']}: {type(err).__name__}: {str(err)[:200]}", flush=True)
    return failed


# ---------------------------------------------------------------- signed Ambassador Program terms
def signed_terms():
    """A PDF of the terms for each acceptance that doesn't have one yet (or accepted again since), stored
    privately in documents/agreements/, then sent to Make to attach on the Shop Ambassadors row."""
    from terms_pdf import terms_pdf
    from terms_pdf_he import terms_pdf_he
    hook = os.environ.get("MAKE_WEBHOOK_URL", "")
    members = rest("beta_members", select="id,instagram,facebook,agreed_at,terms_version,terms_lang,terms_pdf_path,terms_pdf_at,terms_pdf_made_at,customers(name,email)")
    older = lambda m, k: not m.get(k) or m[k] < (m.get("agreed_at") or "")
    # To do: no stored copy for this acceptance (the download waits for one), or not yet sent to monday.
    todo = [m for m in members if (m.get("customers") or {}).get("email")
            and (not m.get("terms_pdf_path") or older(m, "terms_pdf_made_at") or older(m, "terms_pdf_at"))]
    print(f"{len(members)} ambassadors, {len(todo)} signed-terms PDFs to make", flush=True)
    made = failed = 0
    with tempfile.TemporaryDirectory() as tmp:
        for m in todo:
            try:
                c = m["customers"]
                out = os.path.join(tmp, "terms.pdf")
                make = terms_pdf_he if m.get("terms_lang") == "he" else terms_pdf   # the language they accepted in
                make({**m, "name": (c.get("name") or "").strip() or c["email"], "email": c["email"]}, out)
                path = f"agreements/{m['id']}.pdf"
                with open(out, "rb") as f:
                    r = S.post(f"{URL}/storage/v1/object/documents/{path}", data=f, timeout=120,
                               headers={"content-type": "application/pdf", "x-upsert": "true"})
                r.raise_for_status()
                sent = False
                if not older(m, "terms_pdf_at"):
                    sent = True   # monday already has this acceptance's copy: don't attach it twice
                elif hook:
                    r = S.post(f"{URL}/storage/v1/object/sign/documents/{path}", json={"expiresIn": 3600}, timeout=60)
                    r.raise_for_status()
                    link = URL + "/storage/v1" + r.json()["signedURL"]
                    day = (m.get("agreed_at") or "")[:10]
                    r = requests.post(hook, timeout=30, json={
                        "type": "ambassador_terms_pdf", "email": c["email"], "file_url": link,
                        "file_name": f"MWP Ambassador terms - signed {day}.pdf"},
                        headers={"x-mwp-secret": os.environ.get("MAKE_SHARED_SECRET", "")})
                    sent = r.ok
                patch = {"terms_pdf_path": path, "terms_pdf_made_at": datetime.now(timezone.utc).isoformat()}
                if sent:   # only marked done once monday has it on its way; otherwise the next run tries again
                    patch["terms_pdf_at"] = datetime.now(timezone.utc).isoformat()
                S.patch(f"{URL}/rest/v1/beta_members", params={"id": f"eq.{m['id']}"},
                        headers={"content-type": "application/json"}, json=patch, timeout=60).raise_for_status()
                made += 1
                print(f"  signed terms {made}/{len(todo)}{'' if sent else ' (stored; not sent to monday yet)'}", flush=True)
            except Exception as err:
                failed += 1
                print(f"  failed one signed-terms PDF: {type(err).__name__}: {str(err)[:200]}", flush=True)
    return failed


if __name__ == "__main__":
    main()
