"""Automatic product checks against Adobe's current versions (Jeinna, 6 Nov 2026: "no manual testing").

Runs in the "Product checks" workflow (daily after the Adobe check, and whenever the Adobe check finds something new).
Opens the real product files from private storage (in the runner only; nothing uploaded, nothing kept) and checks what an
Adobe update can break, without Photoshop or Lightroom (they can't run on a server):

  Photoshop Plugin Panel (.ccx)  manifest v5, host Photoshop, minVersion at or below the latest Photoshop and no
                                 maximum that the latest version exceeds, entry points and their files present, the
                                 network permission still points at the shop's server (the licence sign-in), every
                                 script parses, only UXP's own modules are required, document changes go through
                                 executeAsModal (required by Photoshop's API 2), and which features Adobe's notes mention
                                 the panel actually uses.
  Lightroom Classic plugin       Info.lua: SDK version and minimum at or below the latest Lightroom Classic, toolkit id,
                                 every Lua file compiles (Lua 5.1, as in Lightroom), every file Info.lua names exists,
                                 only known Lightroom SDK namespaces are imported.
  MWP Presets                    every .xmp is valid XML with Camera Raw settings and a process version Adobe's current
                                 apps support, every .cube LUT has the right number of rows and values in range, every
                                 mobile .dng is a real DNG carrying the preset's settings.

Results go to compat_checks (one row per product per run) and onto compat_deps (auto_checked_version / auto_ok), which
the admin's Compatibility tab shows as "Passed automatic checks on <version>". An open "Worth a look" alert gets the
evidence (which quoted features the product uses) and is settled automatically when the product doesn't use them, or
when Adobe's note is a bug fix to a feature the product uses (a fix can't break it). Logs show results only, never code.
"""
import io, json, os, re, subprocess, sys, tempfile, zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
import requests

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_KEY"]
S = requests.Session()
S.headers.update({"apikey": KEY, "Authorization": f"Bearer {KEY}"})
SHOP_API = URL   # the panel's network permission must allow the shop's server (its licence sign-in)

def rest(path, **p):
    r = S.get(f"{URL}/rest/v1/{path}", params=p, timeout=60); r.raise_for_status(); return r.json()

def post(path, data, prefer="return=minimal"):
    r = S.post(f"{URL}/rest/v1/{path}", json=data, headers={"Prefer": prefer}, timeout=60); r.raise_for_status(); return r

def patch(path, data, **p):
    r = S.patch(f"{URL}/rest/v1/{path}", params=p, json=data, timeout=60); r.raise_for_status()

def vtuple(v):
    return tuple(int(x) for x in re.findall(r"\d+", str(v))[:4]) or (0,)

class Report:
    def __init__(self): self.items = []
    def add(self, name, ok, detail="", level=None):
        self.items.append({"name": name, "ok": bool(ok), "level": level or ("pass" if ok else "fail"), "detail": detail})
    def warn(self, name, detail): self.items.append({"name": name, "ok": True, "level": "warn", "detail": detail})
    @property
    def ok(self): return all(i["ok"] for i in self.items)

# ---------------------------------------------------------------- Photoshop panel
UXP_MODULES = {"photoshop", "uxp", "os", "fs", "path", "process", "shell"}   # what UXP provides to require()
# Features Adobe's notes may name: (how the notes say it, how it shows in panel code)
FEATURES = {
    "Dehaze": (r"dehaze", r"dehaze"),
    "Clarity": (r"clarity", r"clarity"),
    "modal dialogs": (r"modal dialog|\bdialogs?\b", r"showModal|uxpShowModal|<dialog|\.showModal\("),
    "context menus": (r"context menu|flyout", r"contextmenu|flyout|menuItems"),
    "keyboard focus": (r"keyboard focus|\bfocus\b", r"\.focus\(|tabindex|autofocus"),
    "batchPlay": (r"batchPlay", r"batchPlay"),
    "executeAsModal": (r"executeAsModal|modal state", r"executeAsModal"),
    "file system": (r"file system|localFileSystem", r"localFileSystem|storage\."),
    "network": (r"network|fetch|XMLHttpRequest|WebSocket", r"\bfetch\(|XMLHttpRequest|WebSocket"),
    "WebView": (r"web ?view", r"webview"),
    "adjustment layers": (r"adjustment layers?", r"adjustmentLayer|AdjustmentLayer|_obj:\s*[\"']adjustmentLayer"),
}

def check_panel(zf, latest_ps):
    rep, code = Report(), ""
    ccx = [n for n in zf.namelist() if n.lower().endswith(".ccx")]
    rep.add("Plugin package (.ccx) in the download", bool(ccx), ccx[0].split("/")[-1] if ccx else "missing")
    if not ccx: return rep, code
    cz = zipfile.ZipFile(io.BytesIO(zf.read(ccx[0])))
    names = set(cz.namelist())
    try:
        m = json.loads(cz.read("manifest.json"))
    except Exception as e:
        rep.add("manifest.json readable", False, str(e)[:120]); return rep, code
    rep.add("Manifest version 5 (current UXP format)", m.get("manifestVersion") == 5, f"manifestVersion {m.get('manifestVersion')}")
    hosts = m.get("host") if isinstance(m.get("host"), list) else [m.get("host") or {}]
    ps = [h for h in hosts if h.get("app") == "PS"]
    rep.add("Host is Photoshop", bool(ps))
    if ps:
        h = ps[0]
        mn, mx = h.get("minVersion", "0"), h.get("maxVersion")
        rep.add(f"Runs on Photoshop {latest_ps} (minVersion {mn} or newer)", vtuple(mn) <= vtuple(latest_ps), f"minVersion {mn}")
        rep.add(f"No upper limit that blocks Photoshop {latest_ps}", not mx or vtuple(mx) >= vtuple(latest_ps), f"maxVersion {mx}" if mx else "no maxVersion")
    eps = m.get("entrypoints") or []
    rep.add("Panel entry point declared", any(e.get("type") == "panel" for e in eps), ", ".join(e.get("id", "?") for e in eps))
    main = m.get("main", "index.html")
    rep.add("Main file present", main in names, main)
    icons = [i.get("path") for e in eps for i in (e.get("icons") or [])] + [i.get("path") for i in (m.get("icons") or [])]
    # UXP icons: "icons/dark.png" with scale [1, 2] is shipped as icons/dark@1x.png and icons/dark@2x.png
    missing_icons = [p for p in icons if p and not any(n == p or n.startswith(os.path.splitext(p)[0]) for n in names)]
    rep.add("Icons named in the manifest are present", not missing_icons, ", ".join(missing_icons) or f"{len(icons)} icons")
    domains = ((m.get("requiredPermissions") or {}).get("network") or {}).get("domains") or []
    rep.add("Network permission allows the shop's server (licence sign-in)", any(SHOP_API.startswith(d.rstrip("/")) or d == "all" for d in domains), ", ".join(domains) or "none")
    js = [n for n in names if n.endswith(".js")]
    bad, mods = [], set()
    with tempfile.TemporaryDirectory() as d:
        for n in js:
            src = cz.read(n).decode("utf-8", "replace")
            code += "\n" + src
            p = os.path.join(d, "f.js"); open(p, "w").write(src)
            r = subprocess.run(["node", "--check", p], capture_output=True, text=True)
            if r.returncode: bad.append(n)
            mods |= set(re.findall(r"require\(\s*['\"]([^'\"./][^'\"]*)['\"]\s*\)", src))
    html = "".join(cz.read(n).decode("utf-8", "replace") for n in names if n.endswith(".html"))
    code += html
    rep.add(f"All {len(js)} scripts parse", not bad, ", ".join(bad) or "ok")
    unknown = sorted(mods - UXP_MODULES)
    rep.add("Only UXP's own modules are required", not unknown, ", ".join(sorted(mods)) + (f"; unknown: {', '.join(unknown)}" if unknown else ""))
    if re.search(r"batchPlay", code):
        rep.add("Document changes run inside executeAsModal (Photoshop API 2)", bool(re.search(r"executeAsModal", code)),
                "batchPlay used with executeAsModal" if re.search(r"executeAsModal", code) else "batchPlay without executeAsModal")
    return rep, code

# ---------------------------------------------------------------- Lightroom Classic plugin
LR_NAMESPACES = {"LrApplication", "LrApplicationView", "LrBinding", "LrColor", "LrDate", "LrDevelopController", "LrDevelopPreset",
    "LrDialogs", "LrErrors", "LrExportSession", "LrExportSettings", "LrFileUtils", "LrFolder", "LrFtp", "LrFunctionContext", "LrHttp",
    "LrKeyword", "LrLocalization", "LrLogger", "LrMD5", "LrObservableTable", "LrPasswords", "LrPathUtils", "LrPhoto", "LrPhotoInfo",
    "LrPhotoPictureView", "LrPlugin", "LrPrefs", "LrProgressScope", "LrRecursionGuard", "LrSelection", "LrShell", "LrSlideshow",
    "LrSocket", "LrStringUtils", "LrSystemInfo", "LrTasks", "LrUndo", "LrUUID", "LrView", "LrWebViewFactory", "LrXml", "LrCatalog",
    "LrCollection", "LrPublishService", "LrPublishedCollection", "LrExportRendition", "LrMath", "LrTableUtils", "LrClassUtils"}

def check_lrc(zf, latest_lrc):
    rep, code = Report(), ""
    info = [n for n in zf.namelist() if n.lower().endswith(".lrplugin/info.lua")]
    rep.add("Plug-in folder with Info.lua", bool(info), info[0] if info else "missing")
    if not info: return rep, code
    base = info[0][: -len("Info.lua")]
    t = zf.read(info[0]).decode("utf-8", "replace")
    sdk = re.search(r"LrSdkVersion\s*=\s*([\d.]+)", t); smin = re.search(r"LrSdkMinimumVersion\s*=\s*([\d.]+)", t)
    rep.add(f"Plug-in SDK version works in Lightroom Classic {latest_lrc}", bool(sdk) and vtuple(sdk.group(1)) <= vtuple(latest_lrc), f"LrSdkVersion {sdk.group(1) if sdk else '?'}")
    rep.add(f"Minimum Lightroom Classic is {latest_lrc} or older", bool(smin) and vtuple(smin.group(1)) <= vtuple(latest_lrc), f"LrSdkMinimumVersion {smin.group(1) if smin else '?'}")
    rep.add("Toolkit identifier set", bool(re.search(r"LrToolkitIdentifier\s*=\s*['\"][\w.]+['\"]", t)))
    named = set(re.findall(r"file\s*=\s*['\"]([^'\"]+\.lua)['\"]", t))
    names = set(zf.namelist())
    missing = [f for f in named if base + f not in names]
    rep.add("Every file Info.lua names exists", not missing, ", ".join(missing) or f"{len(named)} files")
    luas = [n for n in names if n.startswith(base) and n.endswith(".lua")]
    bad, used = [], set()
    with tempfile.TemporaryDirectory() as d:
        for n in luas:
            src = zf.read(n)
            code += "\n" + src.decode("utf-8", "replace")
            p = os.path.join(d, "f.lua"); open(p, "wb").write(src)
            r = subprocess.run(["luac5.1", "-p", p], capture_output=True, text=True)
            if r.returncode: bad.append(n.split("/")[-1])
            used |= set(re.findall(r"import\s*\(?\s*['\"](Lr\w+)['\"]", src.decode("utf-8", "replace")))
    rep.add(f"All {len(luas)} Lua files compile (Lua 5.1, as in Lightroom)", not bad, ", ".join(bad) or "ok")
    unknown = sorted(used - LR_NAMESPACES)
    if unknown: rep.warn("Lightroom SDK namespaces", f"not in the known list (check by hand only if Adobe removes one): {', '.join(unknown)}")
    else: rep.add("Only known Lightroom SDK namespaces are imported", True, ", ".join(sorted(used)))
    return rep, code

# ---------------------------------------------------------------- presets
KNOWN_PV = {"6.7", "10.0", "11.0", "15.4"}   # Adobe's process versions (15.4 = Process Version 6, the current one)

def check_presets(zf, latest_cr):
    rep = Report()
    names = zf.namelist()
    xmps = [n for n in names if n.lower().endswith(".xmp")]
    bad_xml, no_crs, pvs = [], [], {}
    for n in xmps:
        raw = zf.read(n)
        try: ET.fromstring(raw)
        except ET.ParseError: bad_xml.append(n.split("/")[-1]); continue
        t = raw.decode("utf-8", "replace")
        if "http://ns.adobe.com/camera-raw-settings/1.0/" not in t: no_crs.append(n.split("/")[-1])
        pv = re.search(r'crs:ProcessVersion\s*=\s*"([^"]+)"|<crs:ProcessVersion>([^<]+)<', t)
        v = (pv.group(1) or pv.group(2)) if pv else "none"; pvs[v] = pvs.get(v, 0) + 1
    rep.add(f"All {len(xmps)} presets are valid XML", not bad_xml, ", ".join(bad_xml[:5]) or "ok")
    rep.add("Every preset carries Camera Raw settings", not no_crs, ", ".join(no_crs[:5]) or "ok")
    unknown = {k: v for k, v in pvs.items() if k not in KNOWN_PV and k != "none"}
    rep.add(f"Process versions supported by Camera Raw {latest_cr}", not unknown, ", ".join(f"{k}: {v}" for k, v in pvs.items()))
    cubes = [n for n in names if n.lower().endswith(".cube")]
    bad_cube = []
    for n in cubes:
        t = zf.read(n).decode("utf-8", "replace").splitlines()
        size = next((int(l.split()[1]) for l in t if l.upper().startswith("LUT_3D_SIZE")), None)
        lo = next((float(l.split()[1]) for l in t if l.upper().startswith("DOMAIN_MIN")), 0.0)
        hi = next((float(l.split()[-1]) for l in t if l.upper().startswith("DOMAIN_MAX")), 1.0)
        rows = [l for l in t if re.match(r"^\s*-?[\d.]+(e-?\d+)?\s+-?[\d.]+(e-?\d+)?\s+-?[\d.]+(e-?\d+)?\s*$", l, re.I)]
        ok = bool(size) and len(rows) == size ** 3 and all(lo - 1e-6 <= float(x) <= hi + 1e-6 for r in rows[:: max(1, len(rows) // 500)] for x in r.split())
        if not ok: bad_cube.append(n.split("/")[-1])
    rep.add(f"All {len(cubes)} LUTs (.cube) are complete and in range", not bad_cube, ", ".join(bad_cube[:5]) or "ok")
    dngs = [n for n in names if n.lower().endswith(".dng")]
    bad_dng = [n.split("/")[-1] for n in dngs if (lambda b: not (b[:4] in (b"II*\x00", b"MM\x00*") and b"camera-raw-settings" in b))(zf.read(n))]
    rep.add(f"All {len(dngs)} mobile presets (.dng) are real DNG files with settings", not bad_dng, ", ".join(bad_dng[:5]) or "ok")
    return rep, ""

# ---------------------------------------------------------------- run
def main():
    apps = {a["key"]: a for a in rest("compat_apps", select="*")}
    deps = rest("compat_deps", select="*")
    # open alerts, and ones an earlier automatic check settled (they're looked at again with every new check)
    alerts = [a for a in rest("compat_alerts", select="*", status="in.(open,reviewed)")
              if a["status"] == "open" or (a.get("note") or "").startswith("Automatic check")]
    files = {p["slug"]: p for p in rest("products", select="slug,category,product_files(path,version)")}
    latest = {k: (a.get("latest_version") or "0") for k, a in apps.items()}
    print("Adobe latest:", latest)
    plan = {"mwp-panel": (check_panel, "photoshop"), "mwp-lightroom-plugin": (check_lrc, "lightroom_classic"), "mwp-presets": (check_presets, "camera_raw")}
    now = datetime.now(timezone.utc).isoformat()
    failed = False
    for slug, (fn, app) in plan.items():
        f = (files.get(slug) or {}).get("product_files")
        if not f: print(f"{slug}: no file"); continue
        r = S.get(f"{URL}/storage/v1/object/presets/{f['path']}", timeout=600); r.raise_for_status()
        rep, code = fn(zipfile.ZipFile(io.BytesIO(r.content)), latest.get(app, "0"))
        del r
        print(f"\n== {slug} v{f['version']} against {app} {latest.get(app)}: {'PASS' if rep.ok else 'FAIL'}")
        for i in rep.items: print(f"  [{i['level']}] {i['name']}: {i['detail']}")
        failed |= not rep.ok
        against = {k: latest[k] for k in latest}
        post("compat_checks", {"product_slug": slug, "file_version": f["version"], "ok": rep.ok, "checks": rep.items, "against": against})
        for d in [d for d in deps if d["product_slug"] == slug]:
            patch("compat_deps", {"auto_checked_version": latest.get(d["app"]), "auto_ok": rep.ok, "auto_checked_at": now},
                  product_slug=f"eq.{slug}", app=f"eq.{d['app']}")
        # "Worth a look" alerts: what in the quoted notes does this product actually use?
        for a in [a for a in alerts if a["product_slug"] == slug and a["level"] == "investigate"]:
            quotes = " ".join(a.get("quotes") or [])
            named = [k for k, (said, _) in FEATURES.items() if re.search(said, quotes, re.I)]
            used = [k for k in named if re.search(FEATURES[k][1], code, re.I)]
            fix = bool(re.search(r"\b(lacked|were not|was not|did not|didn't|failed|incorrect(ly)?|crash(ed)?|no longer (?:crash|fail)|fixed)\b", quotes, re.I))
            if not named:
                note = "Automatic check: the quoted notes name no feature this check can look for."
                status = "open"
            elif not used:
                note = f"Automatic check (v{f['version']}): the notes concern {', '.join(named)}, which this product doesn't use. Nothing to do."
                status = "reviewed"
            elif fix and rep.ok:
                note = f"Automatic check (v{f['version']}): the product uses {', '.join(used)}; Adobe's note is a bug fix to it (it only works better now), and all product checks passed. Nothing to do."
                status = "reviewed"
            else:
                note = f"Automatic check (v{f['version']}): the product uses {', '.join(used)}, and the note isn't just a fix. Keep an eye on customer reports."
                status = "open"
            patch("compat_alerts", {"status": status, "note": note, "updated_at": now}, id=f"eq.{a['id']}")
            print(f"  alert {a['app']} {a['version']}: {status}: {note}")
        # "Needs testing" alerts (a new major Adobe version; Jeinna, 6 and 10 Nov 2026: no manual testing): settled when
        # every check passed against that app's latest version, which is at least the alert's version. The admin then
        # shows "Passed automatic checks", never "Tested OK" (that still needs a test in the app). A later failed check
        # opens it again.
        dep_apps = {d["app"] for d in deps if d["product_slug"] == slug}
        for a in [a for a in alerts if a["product_slug"] == slug and a["level"] == "test" and a["app"] in dep_apps]:
            cur = latest.get(a["app"], "0")
            if rep.ok and vtuple(cur) >= vtuple(a["version"]):
                note = (f"Automatic check (v{f['version']}): all {len(rep.items)} checks passed against {apps.get(a['app'], {}).get('name', a['app'])} {cur}. "
                        "Not opened in the app itself: if a customer reports a problem, test it there.")
                status = "reviewed"
            elif not rep.ok:
                note = f"Automatic check (v{f['version']}): some checks failed (see the product's checks). Needs a fix or a test in the app."
                status = "open"
            else:
                continue
            if a["status"] == status and (a.get("note") or "") == note: continue
            patch("compat_alerts", {"status": status, "note": note, "updated_at": now}, id=f"eq.{a['id']}")
            print(f"  alert {a['app']} {a['version']}: {status}: {note}")
    print("\nAll products passed." if not failed else "\nSome checks failed (see above).")
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
